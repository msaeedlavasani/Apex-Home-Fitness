/**
 * Retry-path regression for rest-day enforcement.
 *
 * The route enforces the rest-day invariant BEFORE persistence, so the
 * replayable idempotency payload is always the enforced program — a retry
 * (same `Idempotency-Key`) serves exactly that payload and can never surface
 * a workout on a selected rest day. This test drives the full service chain
 * (enforce → persist-with-idempotency → replay) against a REAL scratch
 * SQLite database, mirroring `tests/idempotency.test.ts`'s proven pattern.
 *
 * No secrets, no real user data. Runs offline (`db push` against a local file).
 */
import assert from 'node:assert/strict';
import {after, before, test} from 'node:test';
import {execFileSync} from 'node:child_process';
import {mkdtempSync, rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {PrismaClient} from '@prisma/client';

import {
  enforceRestDays,
  isRestDaySession,
  weekdayOf,
} from '../src/lib/ai/restDays';
import type {AiExercise, AiGeneratedProgram} from '../src/services/programService';

// ---------------------------------------------------------------------------
// Scratch database setup (must precede any Prisma-constructing import).
// ---------------------------------------------------------------------------

const tmpDir = mkdtempSync(join(tmpdir(), 'rest-days-retry-'));
const dbUrl = `file:${join(tmpDir, 'rest-days-retry.db')}`;
process.env.DATABASE_URL = dbUrl;

let client: PrismaClient;
let services: typeof import('../src/services/generationIdempotency');
let programService: typeof import('../src/services/programService');
let userId: string;

before(async () => {
  const prismaCli = join(process.cwd(), 'node_modules', 'prisma', 'build', 'index.js');
  execFileSync(process.execPath, [prismaCli, 'db', 'push', '--skip-generate'], {
    env: {...process.env, DATABASE_URL: dbUrl},
    stdio: 'pipe',
    timeout: 60_000,
  });

  services = await import('../src/services/generationIdempotency');
  programService = await import('../src/services/programService');
  client = new PrismaClient();

  const user = await client.user.create({
    data: {
      email: `restdays-retry-${Date.now()}@test.local`,
      name: 'Rest Days Retry Tester',
      passwordHash: 'test-only',
    },
  });
  userId = user.id;
});

after(async () => {
  await client?.$disconnect();
  rmSync(tmpDir, {recursive: true, force: true});
});

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const baseExercise: AiExercise = {
  id: 'EX-001',
  name: 'Goblet Squat',
  method: 'strength',
  equipment: 'dumbbell',
  sets: 3,
  reps: '8-10',
  rest_seconds: 90,
  tempo: '3-1-1',
  rpe: 7,
  instruction_cue: 'Brace core, drive through mid-foot.',
  alternatives: [],
  contraindicated_for: [],
};

function exercise(name: string): AiExercise {
  return {...baseExercise, id: `EX-${name.replace(/\s/g, '_')}`, name};
}

/** A schema-conformant AI program that violates the rest-day rule on Thursday and Friday. */
function programWithViolations(programId: string): AiGeneratedProgram {
  return {
    mode: 'general',
    program_id: programId,
    method_mix: {
      strength_pct: 40,
      hypertrophy_pct: 20,
      cardio_pct: 15,
      mobility_pct: 10,
      pilates_pct: 5,
      bodyweight_pct: 5,
      isometric_pct: 5,
    },
    weekly_schedule: [
      {day: 1, day_name: 'Monday', focus: 'Full body', warmup: [], exercises: [exercise('Goblet Squat')], cooldown: [], notes: 'Day 1'},
      // Violations: Thursday and Friday are the user's rest days.
      {day: 4, day_name: 'Thursday', focus: 'Upper body', warmup: [], exercises: [exercise('Bench Press')], cooldown: [], notes: 'Day 4'},
      {day: 5, day_name: 'Friday', focus: 'Lower body', warmup: [], exercises: [exercise('Deadlift')], cooldown: [], notes: 'Day 5'},
    ],
    progression_plan: {
      weeks_1_2: 'Adaptation',
      weeks_3_5: 'Overload',
      week_6: 'Deload',
      overload_variables: ['load'],
    },
    warnings: [],
    notes: 'Retry-path test program',
    disclaimer: 'Test disclaimer.',
  };
}

// ---------------------------------------------------------------------------
// Retry path: replay serves the enforced program, never a rest-day workout
// ---------------------------------------------------------------------------

test('retry (idempotency replay) serves the enforced program — no workout on a rest day', async () => {
  const restDays = ['thursday', 'friday'];
  const key = `rd-retry-${Date.now()}`;
  const body = {
    level: 'beginner',
    goal: 'strength',
    equipment: ['dumbbells', 'bench'],
    limitations: [],
    limitationsDetails: '',
    restDays,
  };

  // 1) First generation: the route enforces BEFORE persistence.
  const enforced = enforceRestDays(programWithViolations('prog-retry'), restDays);
  assert.deepEqual(enforced.rest_days, restDays);

  // 2) Persist with idempotency — the enforced output becomes the replayable
  //    responsePayload (what a retry will be served).
  const first = await services.beginIdempotentGeneration(userId, key, body, {client});
  assert.equal(first.kind, 'claimed');
  if (first.kind !== 'claimed') return;
  const persisted = await programService.persistProgramForUserWithIdempotency(
    userId,
    {
      program: enforced,
      level: 'beginner',
      goal: 'strength',
      restDays,
      idempotencyRecordId: first.record.id,
    },
    client,
  );

  // 3) Retry with the same key → replay of the exact stored 200 body.
  const retry = await services.beginIdempotentGeneration(userId, key, body, {client});
  assert.equal(retry.kind, 'replay');
  if (retry.kind !== 'replay') return;

  const payload = retry.responsePayload as unknown as {
    program: {id: string};
    generated: AiGeneratedProgram;
  };
  assert.equal(payload.program.id, persisted.id);

  // The replayed `generated` program carries the enforced rest-day contract:
  // every entry whose weekday is a selected rest day is an explicit rest
  // entry with NO warmup/exercises/cooldown; every other entry still trains.
  assert.deepEqual(payload.generated.rest_days, restDays);
  assert.equal(payload.generated.weekly_schedule.length, 3);
  for (const session of payload.generated.weekly_schedule) {
    const weekday = weekdayOf(session);
    if (weekday !== null && restDays.includes(weekday)) {
      assert.equal(
        isRestDaySession(session),
        true,
        `${weekday} must be an explicit rest entry in the replayed payload`,
      );
      assert.deepEqual(session.exercises, [], `${weekday} must carry no exercises`);
      assert.deepEqual(session.warmup, [], `${weekday} must carry no warmup`);
      assert.deepEqual(session.cooldown, [], `${weekday} must carry no cooldown`);
    } else {
      assert.equal(isRestDaySession(session), false, 'training days stay training days');
      assert.ok(session.exercises.length > 0);
    }
  }

  // 4) The persisted Program row: no exercise link comes from a rest day and
  //    the canonical rest-day ids are stored on the row.
  const stored = await client.program.findUniqueOrThrow({
    where: {id: persisted.id},
    include: {exercises: {include: {exercise: true}}},
  });
  assert.equal(stored.sessionsPerWeek, 1); // only Monday trains
  assert.deepEqual(stored.exercises.map((row) => row.exercise.name), ['Goblet Squat']);
  assert.deepEqual(stored.restDays, restDays);
});
