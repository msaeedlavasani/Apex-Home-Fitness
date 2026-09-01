/**
 * S02-D2 — client/workout canonical exercise identity adoption.
 *
 * Verifies the workout-plan construction flow that S02-D2 wires: build the
 * step plan from the weekly schedule + relational ProgramExercise→Exercise
 * payload through the S02-D1 seam, preserving the step's `id` and adding ONLY
 * optional canonical `exerciseId`/`slug`. Also proves snapshot and log safety:
 * the IndexedDB snapshot serializer projects to a fixed field set and does NOT
 * pick up the new optional identity fields, and the session/log path never
 * reads `WorkoutExercise.id` as a canonical id.
 */
import assert from 'node:assert/strict';
import test from 'node:test';

import {
  enrichScheduleExercises,
  exerciseIdentityIndex,
  generatedExerciseDefaults,
  type PersistedScheduleExercise,
  type RelationalExercise,
} from '../src/lib/programSchedule';
import { toOfflineExercises } from '../src/lib/offline/workoutPersistence';
import type { SessionExercise } from '../src/lib/workout/sessionContracts';

// Relational payload as returned by GET /api/program/current (S02-C resolves
// slugs; S02-D2 propagates the persisted Exercise.id).
const RELATIONAL: RelationalExercise[] = [
  {order: 1, exercise: {id: 'clx_deadbug_1', name: 'Dead Bug', slug: 'dead-bug'}},
  {order: 2, exercise: {id: 'clx_pushup_1', name: 'Push-Up', slug: 'push-up'}},
];

/** Simulates the workout-page plan build (base step + S02-D1 enrichment). */
function planFromSchedule(
  scheduleExercises: PersistedScheduleExercise[],
  relational: RelationalExercise[],
): SessionExercise[] {
  const identityIndex = exerciseIdentityIndex(relational);
  const enriched = enrichScheduleExercises(scheduleExercises, identityIndex);
  return scheduleExercises.map((raw, index) => {
    const base = generatedExerciseDefaults(raw, index);
    const identity = enriched[index];
    return identity?.exerciseId || identity?.slug
      ? {...base, exerciseId: identity.exerciseId, slug: identity.slug}
      : base;
  });
}

test('canonical match adds exerciseId/slug while the step id stays unchanged', () => {
  const plan = planFromSchedule([{id: 'EX-101', name: 'Dead Bug', sets: 3}], RELATIONAL);
  assert.equal(plan.length, 1);
  const step = plan[0]!;
  assert.equal(step.id, 'EX-101', 'step id must be the original legacy id');
  assert.equal(step.exerciseId, 'clx_deadbug_1');
  assert.equal(step.slug, 'dead-bug');
  assert.equal(step.name, 'Dead Bug');
  assert.equal(step.sets, 3);
});

test('no canonical match leaves the canonical fields undefined (legacy step stays usable)', () => {
  const plan = planFromSchedule([{id: 'EX-900', name: 'Totally-Unknown-Movement', sets: 3}], RELATIONAL);
  assert.equal(plan[0]!.id, 'EX-900');
  assert.equal(plan[0]!.exerciseId, undefined);
  assert.equal(plan[0]!.slug, undefined);
  assert.equal(plan[0]!.name, 'Totally-Unknown-Movement');
});

test('legacy program (no relational payload) yields an identical legacy-only plan', () => {
  const schedule: PersistedScheduleExercise[] = [{id: 'EX-1', name: 'Squat', sets: 3}, {id: 'EX-2', name: 'Flow', sets: 2, duration_seconds: 30}];
  const plan = planFromSchedule(schedule, []);
  assert.deepEqual(
    plan.map((s) => ({id: s.id, name: s.name, sets: s.sets, reps: s.reps ?? null, durationSeconds: s.durationSeconds ?? null, restSeconds: s.restSeconds ?? null, exerciseId: s.exerciseId, slug: s.slug})),
    [
      {id: 'EX-1', name: 'Squat', sets: 3, reps: null, durationSeconds: null, restSeconds: 30, exerciseId: undefined, slug: undefined},
      {id: 'EX-2', name: 'Flow', sets: 2, reps: null, durationSeconds: 30, restSeconds: 30, exerciseId: undefined, slug: undefined},
    ],
  );
});

test('the same canonical exercise as multiple steps stays distinct steps with distinct ids', () => {
  const plan = planFromSchedule(
    [{id: 'EX-201', name: 'Dead Bug', sets: 3}, {id: 'EX-202', name: 'Dead Bug', sets: 3}],
    RELATIONAL,
  );
  assert.equal(plan.length, 2);
  assert.equal(plan[0]!.id, 'EX-201');
  assert.equal(plan[1]!.id, 'EX-202');
  assert.equal(plan[0]!.exerciseId, 'clx_deadbug_1');
  assert.equal(plan[1]!.exerciseId, 'clx_deadbug_1', 'same movement identity, distinct steps');
  // No state collision: step identity is id (not exerciseId).
  assert.notEqual(plan[0]!.id, plan[1]!.id);
});

test('alias collapse maps different schedule names to one canonical id without dropping steps', () => {
  // "pushups" (slug hint) and "Push-Up" both resolve to the canonical Push-Up row.
  const plan = planFromSchedule(
    [{id: 'EX-301', name: 'pushups', slug: 'push-up', sets: 3}, {id: 'EX-302', name: 'Push-Up', sets: 3}],
    RELATIONAL,
  );
  assert.equal(plan.length, 2, 'no array item may disappear under alias collapse');
  assert.equal(plan[0]!.id, 'EX-301');
  assert.equal(plan[1]!.id, 'EX-302');
  assert.equal(plan[0]!.exerciseId, 'clx_pushup_1');
  assert.equal(plan[1]!.exerciseId, 'clx_pushup_1');
  assert.equal(plan[0]!.sets, 3);
  assert.equal(plan[1]!.sets, 3, 'set/order info preserved');
});

test('snapshot payload is unchanged: toOfflineExercises does NOT carry exerciseId/slug', () => {
  const plan = planFromSchedule([{id: 'EX-1', name: 'Dead Bug', sets: 3}], RELATIONAL);
  assert.equal(plan[0]!.exerciseId, 'clx_deadbug_1', 'plan carries canonical identity at runtime');

  const offline = toOfflineExercises(plan, {currentExerciseIndex: 1, phase: 'EXERCISING'});
  assert.equal(offline.length, 1);
  const snapshot = offline[0]!;
  // Projected fixed field set — canonical identity must NOT leak into IndexedDB.
  assert.ok(!('exerciseId' in snapshot), 'exerciseId must not be persisted');
  assert.ok(!('slug' in snapshot), 'slug must not be persisted');
  // Step identity preserved.
  assert.equal(snapshot.id, 'EX-1');
  assert.equal(snapshot.name, 'Dead Bug');
  assert.equal(snapshot.sets, 3);
});

test('the session/log start payload stays name-based (WorkoutExercise.id is not sent as a canonical id)', () => {
  // Mirrors workout page: it sends exercise NAMES to POST /api/workout/session,
  // not the step id and not exerciseId. The server resolves canonical DB ids.
  const step = planFromSchedule([{id: 'EX-101', name: 'Dead Bug', sets: 3}], RELATIONAL)[0]!;
  const payload = {programId: 'p1', exerciseNames: [step.name]};
  assert.deepEqual(payload.exerciseNames, ['Dead Bug']);
  assert.ok(!('exerciseId' in payload));
  assert.ok(!(step.id === 'clx_deadbug_1'), 'step id remains step-local, not the canonical id');
});