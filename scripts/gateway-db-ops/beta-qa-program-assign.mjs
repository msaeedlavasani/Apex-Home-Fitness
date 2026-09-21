#!/usr/bin/env node
/**
 * Bounded Beta-only QA Program data operation.
 *
 * The gateway supplies BETA_QA_PHONES from the protected Beta environment and
 * mounts only ahf_beta_db. The operation never prints the phone, user id, or
 * database contents. It ensures the repository's canonical persisted QA
 * Program is available to that authenticated account; stale persisted shape
 * is repaired from the source-controlled fixture, and Workout code remains
 * unaware of the account identity.
 */

import {PrismaClient} from '@prisma/client';
import {
  QA_PROGRAM_DESCRIPTION,
  QA_PROGRAM_DURATION_WEEKS,
  QA_PROGRAM_EXERCISE_RECORDS,
  QA_PROGRAM_EXERCISES,
  QA_PROGRAM_LEVEL,
  QA_PROGRAM_NAME,
  QA_PROGRAM_REST_DAYS,
  QA_PROGRAM_SESSIONS_PER_WEEK,
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
const canonicalNames = [...new Set(names)];

function sameJson(left, right) {
  return JSON.stringify(left) === JSON.stringify(right);
}

function shapeIssues(program) {
  if (!program) return ['program'];
  const issues = [];
  if (program.description !== QA_PROGRAM_DESCRIPTION) issues.push('description');
  if (program.level !== QA_PROGRAM_LEVEL) issues.push('level');
  if (program.durationWeeks !== QA_PROGRAM_DURATION_WEEKS) issues.push('durationWeeks');
  if (program.sessionsPerWeek !== QA_PROGRAM_SESSIONS_PER_WEEK) issues.push('sessionsPerWeek');
  if (!sameJson(program.restDays, QA_PROGRAM_REST_DAYS)) issues.push('restDays');
  if (!sameJson(program.weeklySchedule, QA_PROGRAM_WEEKLY_SCHEDULE)) issues.push('weeklySchedule');
  if (program.exercises.length !== QA_PROGRAM_EXERCISES.length) {
    issues.push(`exercises.length (expected ${QA_PROGRAM_EXERCISES.length}, actual ${program.exercises.length})`);
  }
  QA_PROGRAM_EXERCISES.forEach((expected, index) => {
    const entry = program.exercises[index];
    if (!entry) {
      issues.push(`exercises[${index}]`);
      return;
    }
    if (entry.exercise.name !== expected.name) issues.push(`exercises[${index}].exercise.name`);
    if (entry.order !== index + 1) issues.push(`exercises[${index}].order`);
    if (entry.sets !== expected.sets) issues.push(`exercises[${index}].sets`);
    if (entry.reps !== expected.reps) issues.push(`exercises[${index}].reps`);
    if (entry.restSeconds !== expected.restSeconds) issues.push(`exercises[${index}].restSeconds`);
  });
  return issues;
}

async function inspect() {
  const users = await prisma.user.findMany({
    where: {phone: {in: phones}},
    select: {id: true, _count: {select: {programs: true}}},
  });
  const program = await prisma.program.findUnique({
    where: {name: QA_PROGRAM_NAME},
    include: {exercises: {orderBy: {order: 'asc'}, include: {exercise: {select: {name: true}}}}},
  });
  const programOwner = program?.ownerId && users.find((candidate) => candidate.id === program.ownerId);
  const candidates = programOwner ? [programOwner] : users.filter((candidate) => candidate._count.programs === 0);
  const user = candidates.length === 1 ? candidates[0] : null;
  const exercises = await prisma.exercise.findMany({
    where: {name: {in: canonicalNames}},
    select: {id: true, name: true},
  });
  const exerciseByName = new Map(exercises.map((exercise) => [exercise.name, exercise]));
  const issues = shapeIssues(program);
  const shapeValid = Boolean(program) && issues.length === 0;
  const repairable = Boolean(user) && (issues.length > 0 || exercises.length !== canonicalNames.length ||
    !program || program.ownerId !== user.id);

  const report = {
    operation: 'beta-qa-program-assign',
    mode,
    qa_account_found: candidates.length === 1,
    qa_account_ambiguous: candidates.length > 1,
    qa_account_candidates: candidates.length,
    canonical_exercises_present: exercises.length === names.length,
    program_present: Boolean(program),
    program_shape_valid: shapeValid,
    shape_issues: issues,
    owner_matches: Boolean(user && program && program.ownerId === user.id),
    planned_change: repairable ? 'REPAIR_CANONICAL_PROGRAM' : user ? 'NONE' : 'BLOCKED_INVALID_CANONICAL_DATA',
  };

  if (!report.qa_account_found) {
    report.verification = {status: 'FAIL', reason: report.qa_account_ambiguous ? 'multiple protected QA accounts are persisted' : 'required Beta QA account is unavailable'};
    return {report, user, exerciseByName, program, shapeValid};
  }
  report.verification = {status: 'PASS', reason: repairable ? 'deterministic canonical repair plan' : 'plan is valid'};
  return {report, user, exerciseByName, program, shapeValid};
}

try {
  const before = await inspect();
  if (before.report.verification.status !== 'PASS' || mode === 'dry-run') {
    console.log(JSON.stringify(before.report));
    process.exitCode = before.report.verification.status === 'PASS' ? 0 : 1;
  } else {
    const {user, program} = before;
    if (!user) throw new Error('QA account disappeared during bounded operation');
    for (const exercise of QA_PROGRAM_EXERCISE_RECORDS) {
      await prisma.exercise.upsert({
        where: {name: exercise.name},
        update: exercise,
        create: exercise,
      });
    }
    if (program) {
      await prisma.program.update({
        where: {id: program.id},
        data: {
          description: QA_PROGRAM_DESCRIPTION,
          level: QA_PROGRAM_LEVEL,
          durationWeeks: QA_PROGRAM_DURATION_WEEKS,
          sessionsPerWeek: QA_PROGRAM_SESSIONS_PER_WEEK,
          restDays: QA_PROGRAM_REST_DAYS,
          weeklySchedule: QA_PROGRAM_WEEKLY_SCHEDULE,
          ownerId: user.id,
        },
      });
      await prisma.programExercise.deleteMany({where: {programId: program.id}});
      const persistedExercises = await prisma.exercise.findMany({where: {name: {in: canonicalNames}}, select: {id: true, name: true}});
      const byName = new Map(persistedExercises.map((exercise) => [exercise.name, exercise]));
      await prisma.programExercise.createMany({
        data: QA_PROGRAM_EXERCISES.map((exercise, index) => ({
          programId: program.id,
          exerciseId: byName.get(exercise.name).id,
          order: index + 1,
          sets: exercise.sets,
          reps: exercise.reps,
          restSeconds: exercise.restSeconds,
        })),
      });
    } else {
      const created = await prisma.program.create({
        data: {
          name: QA_PROGRAM_NAME,
          description: QA_PROGRAM_DESCRIPTION,
          level: QA_PROGRAM_LEVEL,
          durationWeeks: QA_PROGRAM_DURATION_WEEKS,
          sessionsPerWeek: QA_PROGRAM_SESSIONS_PER_WEEK,
          restDays: QA_PROGRAM_REST_DAYS,
          weeklySchedule: QA_PROGRAM_WEEKLY_SCHEDULE,
          ownerId: user.id,
          exercises: {
            create: QA_PROGRAM_EXERCISES.map((exercise, index) => ({
              order: index + 1,
              sets: exercise.sets,
              reps: exercise.reps,
              restSeconds: exercise.restSeconds,
              exercise: {connect: {name: exercise.name}},
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
