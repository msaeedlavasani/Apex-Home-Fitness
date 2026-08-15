import assert from 'node:assert/strict';
import test from 'node:test';
import {
  buildWorkoutStateRecord,
  hydrateFromRecord,
  matchesPlan,
  toOfflineExercises,
} from '../src/lib/offline/workoutPersistence';
import type { WorkoutEngineState, WorkoutExercise } from '../src/components/workout/useWorkoutEngine';
import type { WorkoutStateRecord } from '../src/lib/offline/db';

const PLAN: WorkoutExercise[] = [
  { id: 'ex-1', name: 'Squats', sets: 3, reps: 12, durationSeconds: 30, restSeconds: 45 },
  { id: 'ex-2', name: 'Plank', sets: 2, reps: null, durationSeconds: 60, restSeconds: 30 },
  { id: 'ex-3', name: 'Burpees', sets: 1, reps: 10, durationSeconds: 20, restSeconds: null },
];

function state(overrides: Partial<WorkoutEngineState> = {}): WorkoutEngineState {
  return {
    phase: 'EXERCISING',
    currentExerciseIndex: 1,
    currentSet: 2,
    completedSets: 3,
    totalSets: 6,
    phaseElapsedSeconds: 12,
    totalElapsedSeconds: 340,
    isRunning: true,
    startedAt: 1_700_000_000_000,
    completedAt: null,
    ...overrides,
  };
}

function record(overrides: Partial<WorkoutStateRecord> = {}): WorkoutStateRecord {
  return {
    workoutKey: 'u1:2026-08-15',
    userId: 'u1',
    dateKey: '2026-08-15',
    programId: null,
    exercises: toOfflineExercises(PLAN, state()),
    phase: 'EXERCISING',
    currentExerciseIndex: 1,
    currentSet: 2,
    completedSets: 3,
    totalSets: 6,
    phaseElapsedSeconds: 12,
    totalElapsedSeconds: 340,
    isRunning: true,
    startedAt: 1_700_000_000_000,
    completedAt: null,
    isComplete: false,
    updatedAt: 1_700_000_000_100,
    ...overrides,
  };
}

test('toOfflineExercises derives completion from the engine position', () => {
  const exercises = toOfflineExercises(PLAN, { currentExerciseIndex: 1, phase: 'EXERCISING' });
  assert.deepEqual(
    exercises.map((e) => e.completed),
    [true, false, false]
  );
  // COMPLETED → every exercise including the last one is done.
  const done = toOfflineExercises(PLAN, {
    currentExerciseIndex: 2,
    phase: 'COMPLETED',
  });
  assert.deepEqual(done.map((e) => e.completed), [true, true, true]);
  // Fields mirror the plan; clamped sets never go below 1.
  assert.equal(exercises[0].sets, 3);
  assert.equal(exercises[0].reps, 12);
  assert.equal(exercises[1].durationSeconds, 60);
  assert.equal(exercises[2].restSeconds, null);
});

test('buildWorkoutStateRecord maps every engine field', () => {
  const s = state();
  const out = buildWorkoutStateRecord(PLAN, s);
  assert.equal(out.phase, 'EXERCISING');
  assert.equal(out.currentExerciseIndex, 1);
  assert.equal(out.currentSet, 2);
  assert.equal(out.completedSets, 3);
  assert.equal(out.totalSets, 6);
  assert.equal(out.phaseElapsedSeconds, 12);
  assert.equal(out.totalElapsedSeconds, 340);
  assert.equal(out.isRunning, true);
  assert.equal(out.startedAt, 1_700_000_000_000);
  assert.equal(out.completedAt, null);
  assert.equal(out.isComplete, false);
  assert.equal(out.exercises.length, 3);

  const finished = buildWorkoutStateRecord(PLAN, state({ phase: 'COMPLETED', completedAt: 42 }));
  assert.equal(finished.isComplete, true);
  assert.equal(finished.completedAt, 42);
});

test('matchesPlan accepts the same plan and rejects any change', () => {
  assert.equal(matchesPlan(record(), PLAN), true);
  // Different exercise id → reject.
  assert.equal(
    matchesPlan(record({ exercises: toOfflineExercises([{ ...PLAN[0], id: 'other' }], state()) }), PLAN),
    false
  );
  // Different set count → reject.
  const fewerSets = PLAN.map((ex, i) => (i === 1 ? { ...ex, sets: ex.sets + 1 } : ex));
  assert.equal(
    matchesPlan(record({ exercises: toOfflineExercises(fewerSets, state()) }), PLAN),
    false
  );
  // Different plan length → reject.
  assert.equal(
    matchesPlan(record({ exercises: toOfflineExercises(PLAN.slice(0, 2), state()) }), PLAN),
    false
  );
});

test('hydrateFromRecord returns null for never-started or mismatched plans', () => {
  assert.equal(hydrateFromRecord(record({ phase: 'READY', startedAt: null }), PLAN), null);
  const otherPlan: WorkoutExercise[] = [{ id: 'x', name: 'X', sets: 1 }];
  assert.equal(
    hydrateFromRecord(record({ exercises: toOfflineExercises(otherPlan, state()) }), PLAN),
    null
  );
});

test('hydrateFromRecord maps a valid mid-workout snapshot', () => {
  const input = hydrateFromRecord(record(), PLAN);
  assert.deepEqual(input, {
    phase: 'EXERCISING',
    currentExerciseIndex: 1,
    currentSet: 2,
    phaseElapsedSeconds: 12,
    totalElapsedSeconds: 340,
    startedAt: 1_700_000_000_000,
    completedAt: null,
    isComplete: false,
  });
});

test('hydrateFromRecord passes through a completed snapshot', () => {
  const finished = record({
    phase: 'COMPLETED',
    isComplete: true,
    completedAt: 1_700_000_000_200,
  });
  const input = hydrateFromRecord(finished, PLAN);
  assert.equal(input?.phase, 'COMPLETED');
  assert.equal(input?.isComplete, true);
  assert.equal(input?.completedAt, 1_700_000_000_200);
});

test('hydrateFromRecord tolerates pre-v2 records without the new fields', () => {
  // Old records lack phaseElapsedSeconds/isRunning — treat as undefined.
  const { phaseElapsedSeconds, isRunning, ...legacy } = record();
  const legacyRow = legacy as unknown as WorkoutStateRecord; // simulated pre-v2 row
  const input = hydrateFromRecord(legacyRow, PLAN);
  assert.equal(input?.phaseElapsedSeconds, undefined);
  assert.equal(input != null, true);
});
