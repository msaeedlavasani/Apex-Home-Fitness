#!/usr/bin/env node
/**
 * Bounded Beta-only QA Program data operation.
 *
 * The gateway supplies BETA_QA_PHONES from the protected Beta environment and
 * mounts only ahf_beta_db. The operation never prints the phone, user id, or
 * database contents. It ensures the repository's canonical persisted QA
 * Program is available to that authenticated account; Workout code remains
 * unaware of the account identity.
 */

import {PrismaClient} from '@prisma/client';
import {
  QA_PROGRAM_DESCRIPTION,
  QA_PROGRAM_EXERCISES,
  QA_PROGRAM_NAME,
  QA_PROGRAM_WEEKLY_SCHEDULE,
} from '../../src/lib/program/qaProgram.ts';
import {normalizePhone} from '../../src/lib/auth/phone.ts';

const mode = process.env.DB_OPERATION_MODE;
const phones = [...new Set((process.env.BETA_QA_PHONES ?? '')
  .split(',')
  .map((value) => normalizePhone(value.trim()))
  .filter((value) => value !== null))];
if (!['dry-run', 'apply'].includes(mode)) {
  console.error('DB_OPERATION_MODE must be dry-run or apply');
  process.exit(2);
}
if (phones.length === 0) {
  console.error('BETA_QA_PHONES is required by the protected Beta configuration');
  process.exit(2);
}

const prisma = new PrismaClient();
const names = QA_PROGRAM_EXERCISES.map((exercise) => exercise.name);

function sameJson(left, right) {
  return JSON.stringify(left) === JSON.stringify(right);
}

async function inspect() {
  const users = await prisma.user.findMany({where: {phone: {in: phones}}, select: {id: true}});
  const user = users.length === 1 ? users[0] : null;
  const exercises = await prisma.exercise.findMany({
    where: {name: {in: names}},
    select: {id: true, name: true},
  });
  const exerciseByName = new Map(exercises.map((exercise) => [exercise.name, exercise]));
  const program = await prisma.program.findUnique({
    where: {name: QA_PROGRAM_NAME},
    include: {exercises: {orderBy: {order: 'asc'}, include: {exercise: {select: {name: true}}}}},
  });

  const shapeValid = Boolean(program) &&
    program.description === QA_PROGRAM_DESCRIPTION &&
    sameJson(program.weeklySchedule, QA_PROGRAM_WEEKLY_SCHEDULE) &&
    program.exercises.length === QA_PROGRAM_EXERCISES.length &&
    program.exercises.every((entry, index) => {
      const expected = QA_PROGRAM_EXERCISES[index];
      return entry.exercise.name === expected.name && entry.order === index + 1 &&
        entry.sets === expected.sets && entry.reps === expected.reps &&
        entry.restSeconds === expected.restSeconds;
    });

  const report = {
    operation: 'beta-qa-program-assign',
    mode,
    qa_account_found: users.length === 1,
    qa_account_ambiguous: users.length > 1,
    canonical_exercises_present: exercises.length === names.length,
    program_present: Boolean(program),
    program_shape_valid: shapeValid,
    owner_matches: Boolean(user && program && program.ownerId === user.id),
    planned_change: user && exercises.length === names.length && (!program || shapeValid)
      ? (program ? (program.ownerId === user.id ? 'NONE' : 'ASSIGN_EXISTING_PROGRAM') : 'CREATE_AND_ASSIGN_PROGRAM')
      : 'BLOCKED_INVALID_CANONICAL_DATA',
  };

  if (!report.qa_account_found || !report.canonical_exercises_present || (!report.program_present && mode === 'dry-run' && !report.canonical_exercises_present)) {
    report.verification = {status: 'FAIL', reason: report.qa_account_ambiguous ? 'multiple protected QA accounts are persisted' : 'required Beta QA data is unavailable'};
    return {report, user, exerciseByName, program, shapeValid};
  }
  if (program && !shapeValid) {
    report.verification = {status: 'FAIL', reason: 'existing QA Program shape differs from canonical seed'};
    return {report, user, exerciseByName, program, shapeValid};
  }
  report.verification = {status: 'PASS', reason: mode === 'dry-run' ? 'plan is valid' : 'not yet applied'};
  return {report, user, exerciseByName, program, shapeValid};
}

try {
  const before = await inspect();
  if (before.report.verification.status !== 'PASS' || mode === 'dry-run') {
    console.log(JSON.stringify(before.report));
    process.exitCode = before.report.verification.status === 'PASS' ? 0 : 1;
  } else {
    const {user, exerciseByName, program} = before;
    if (!user) throw new Error('QA account disappeared during bounded operation');
    if (program) {
      if (program.ownerId !== user.id) {
        await prisma.program.update({where: {id: program.id}, data: {ownerId: user.id}});
      }
    } else {
      const created = await prisma.program.create({
        data: {
          name: QA_PROGRAM_NAME,
          description: QA_PROGRAM_DESCRIPTION,
          level: 'BEGINNER',
          durationWeeks: 1,
          sessionsPerWeek: 1,
          restDays: [],
          weeklySchedule: QA_PROGRAM_WEEKLY_SCHEDULE,
          ownerId: user.id,
          exercises: {
            create: QA_PROGRAM_EXERCISES.map((exercise, index) => ({
              order: index + 1,
              sets: exercise.sets,
              reps: exercise.reps,
              restSeconds: exercise.restSeconds,
              exercise: {connect: {id: exerciseByName.get(exercise.name).id}},
            })),
          },
        },
      });
      if (!created.id) throw new Error('QA Program creation returned no id');
    }
    const after = await inspect();
    const verified = after.report.verification.status === 'PASS' && after.report.owner_matches;
    console.log(JSON.stringify({
      ...after.report,
      mode: 'apply',
      changed: before.report.planned_change !== 'NONE',
      verification: {status: verified ? 'PASS' : 'FAIL', owner_matches: after.report.owner_matches, program_shape_valid: after.report.program_shape_valid},
    }));
    process.exitCode = verified ? 0 : 1;
  }
} catch (error) {
  console.error(String(error?.message ?? error));
  process.exit(1);
} finally {
  await prisma.$disconnect();
}
