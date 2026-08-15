import assert from 'node:assert/strict';
import test from 'node:test';
import {
  WORKOUT_STATE_CONFLICT_POLICY,
  compareWorkoutStates,
  mergeOfflineExercises,
  mergeWorkoutStates,
  resolveWorkoutStateConflict,
  sameExercisePlan,
  sameWorkoutSession,
} from '../src/lib/offline/conflictPolicy';
import {
  MAX_SYNC_ATTEMPTS,
  shouldRetryExerciseLog,
  type WorkoutStateRecord,
} from '../src/lib/offline/db';
import { classifySyncError, toSupabaseRow } from '../src/services/syncService';
import { hydrateFromRecord, matchesPlan } from '../src/lib/offline/workoutPersistence';
import type { WorkoutExercise } from '../src/components/workout/useWorkoutEngine';
import type { ExerciseLogRecord } from '../src/lib/offline/db';

// ---------------------------------------------------------------------------
// Factories
// ---------------------------------------------------------------------------

const PLAN: WorkoutExercise[] = [
  { id: 'ex-1', name: 'Squats', sets: 3, reps: 12, durationSeconds: 30, restSeconds: 45 },
  { id: 'ex-2', name: 'Plank', sets: 2, reps: null, durationSeconds: 60, restSeconds: 30 },
];

function record(overrides: Partial<WorkoutStateRecord> = {}): WorkoutStateRecord {
  return {
    workoutKey: 'u1:2026-08-15',
    userId: 'u1',
    dateKey: '2026-08-15',
    programId: null,
    exercises: [
      {
        id: 'ex-1',
        name: 'Squats',
        sets: 3,
        reps: 12,
        durationSeconds: 30,
        restSeconds: 45,
        completed: true,
        actualSets: 3,
        actualReps: 36,
      },
      {
        id: 'ex-2',
        name: 'Plank',
        sets: 2,
        reps: null,
        durationSeconds: 60,
        restSeconds: 30,
        completed: false,
        actualSets: null,
        actualReps: null,
      },
    ],
    phase: 'EXERCISING',
    currentExerciseIndex: 1,
    currentSet: 1,
    completedSets: 3,
    totalSets: 5,
    phaseElapsedSeconds: 4,
    totalElapsedSeconds: 300,
    isRunning: true,
    startedAt: 1_700_000_000_000,
    completedAt: null,
    isComplete: false,
    updatedAt: 1_700_000_000_100,
    version: 1,
    ...overrides,
  };
}

function log(overrides: Partial<ExerciseLogRecord> = {}): ExerciseLogRecord {
  return {
    id: 'log-1',
    userId: 'u1',
    sessionId: 's1',
    exerciseId: 'ex-1',
    exerciseName: 'Squats',
    exerciseOrder: 0,
    setNumber: 1,
    actualSets: 1,
    actualReps: 12,
    durationSeconds: 30,
    completedAt: 1_700_000_000_000,
    synced: 0,
    syncAttempts: 0,
    lastSyncError: null,
    syncedAt: null,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Deterministic ordering
// ---------------------------------------------------------------------------

test('compareWorkoutStates orders by updatedAt (last-write-wins)', () => {
  const older = record({ updatedAt: 100 });
  const newer = record({ updatedAt: 200 });
  assert.ok(compareWorkoutStates(newer, older) > 0);
  assert.ok(compareWorkoutStates(older, newer) < 0);
  assert.equal(compareWorkoutStates(newer, older), -compareWorkoutStates(older, newer));
});

test('compareWorkoutStates breaks updatedAt ties by version', () => {
  const v1 = record({ updatedAt: 100, version: 1 });
  const v3 = record({ updatedAt: 100, version: 3 });
  assert.ok(compareWorkoutStates(v3, v1) > 0);
  assert.ok(compareWorkoutStates(v1, v3) < 0);
  // Legacy rows without version read as 0.
  const legacy = record({ updatedAt: 100 });
  delete (legacy as Partial<WorkoutStateRecord>).version;
  assert.ok(compareWorkoutStates(legacy, v1) < 0);
});

test('compareWorkoutStates is total even on identical timestamp+version (payload tie-break)', () => {
  const a = record({ updatedAt: 100, version: 1, completedSets: 3 });
  const b = record({ updatedAt: 100, version: 1, completedSets: 5 });
  const left = compareWorkoutStates(a, b);
  assert.notEqual(left, 0); // never "equal" for different payloads
  assert.equal(compareWorkoutStates(a, b), -compareWorkoutStates(b, a));
  // Identical records compare equal.
  assert.equal(compareWorkoutStates(a, { ...a }), 0);
});

// ---------------------------------------------------------------------------
// Same-session merge
// ---------------------------------------------------------------------------

test('sameWorkoutSession requires equal non-null startedAt', () => {
  const base = record();
  assert.equal(sameWorkoutSession(base, { ...base }), true);
  assert.equal(
    sameWorkoutSession(base, record({ startedAt: base.startedAt! + 1 })),
    false
  );
  assert.equal(
    sameWorkoutSession(record({ startedAt: null }), record({ startedAt: null })),
    false
  );
});

test('mergeWorkoutStates is commutative and deterministic', () => {
  const a = record({
    updatedAt: 200,
    version: 2,
    exercises: [
      { id: 'ex-1', name: 'Squats', sets: 3, reps: 12, durationSeconds: 30, restSeconds: 45, completed: true, actualSets: 3, actualReps: 36 },
      { id: 'ex-2', name: 'Plank', sets: 2, reps: null, durationSeconds: 60, restSeconds: 30, completed: false, actualSets: null, actualReps: null },
    ],
    completedSets: 3,
  });
  const b = record({
    updatedAt: 100,
    version: 1,
    exercises: [
      { id: 'ex-1', name: 'Squats', sets: 3, reps: 12, durationSeconds: 30, restSeconds: 45, completed: false, actualSets: 2, actualReps: 24 },
      { id: 'ex-2', name: 'Plank', sets: 2, reps: null, durationSeconds: 60, restSeconds: 30, completed: true, actualSets: 2, actualReps: 20 },
    ],
    completedSets: 2,
  });
  assert.deepEqual(mergeWorkoutStates(a, b), mergeWorkoutStates(b, a));
  // Calling twice yields the identical record.
  assert.deepEqual(mergeWorkoutStates(a, b), mergeWorkoutStates(a, b));
});

test('same-session merge unions progress and keeps the newer writer position', () => {
  const newer = record({
    updatedAt: 200,
    version: 2,
    phase: 'RESTING',
    currentExerciseIndex: 1,
    currentSet: 2,
    phaseElapsedSeconds: 7,
    totalElapsedSeconds: 400,
  });
  const older = record({
    updatedAt: 100,
    version: 1,
    exercises: [
      { id: 'ex-1', name: 'Squats', sets: 3, reps: 12, durationSeconds: 30, restSeconds: 45, completed: true, actualSets: 3, actualReps: 36 },
      { id: 'ex-2', name: 'Plank', sets: 2, reps: null, durationSeconds: 60, restSeconds: 30, completed: true, actualSets: 2, actualReps: 20 },
    ],
    phase: 'EXERCISING',
    currentExerciseIndex: 0,
    currentSet: 1,
    completedSets: 4,
    totalElapsedSeconds: 250,
  });

  const merged = mergeWorkoutStates(newer, older);

  // Position/timer follows the newer writer.
  assert.equal(merged.phase, 'RESTING');
  assert.equal(merged.currentExerciseIndex, 1);
  assert.equal(merged.currentSet, 2);
  assert.equal(merged.phaseElapsedSeconds, 7);
  assert.equal(merged.totalElapsedSeconds, 400);
  // Progress never regresses: completed exercises union, counters take max.
  assert.deepEqual(
    merged.exercises.map((e) => e.completed),
    [true, true]
  );
  assert.equal(merged.exercises[1].actualSets, 2);
  assert.equal(merged.completedSets, 4); // max(3, 4)
  assert.equal(merged.updatedAt, 200);
  assert.equal(merged.version, 2);
});

test('same-session merge ORs completion and takes max completedAt', () => {
  const winner = record({ updatedAt: 300, version: 3, isComplete: false, completedAt: null });
  const completer = record({
    updatedAt: 100,
    version: 1,
    phase: 'COMPLETED',
    isComplete: true,
    completedAt: 1_700_000_000_999,
    exercises: [
      { id: 'ex-1', name: 'Squats', sets: 3, reps: 12, durationSeconds: 30, restSeconds: 45, completed: true, actualSets: 3, actualReps: 36 },
      { id: 'ex-2', name: 'Plank', sets: 2, reps: null, durationSeconds: 60, restSeconds: 30, completed: true, actualSets: 2, actualReps: 20 },
    ],
  });
  const merged = mergeWorkoutStates(winner, completer);
  assert.equal(merged.isComplete, true);
  assert.equal(merged.completedAt, 1_700_000_000_999);
  assert.deepEqual(merged.exercises.map((e) => e.completed), [true, true]);
});

// ---------------------------------------------------------------------------
// Fallbacks: different session / plan mismatch → pure LWW
// ---------------------------------------------------------------------------

test('a new session supersedes the old one wholesale (no progress union)', () => {
  const oldSession = record({
    startedAt: 1_000,
    updatedAt: 100,
    version: 1,
    exercises: [
      { id: 'ex-1', name: 'Squats', sets: 3, reps: 12, durationSeconds: 30, restSeconds: 45, completed: true, actualSets: 3, actualReps: 36 },
      { id: 'ex-2', name: 'Plank', sets: 2, reps: null, durationSeconds: 60, restSeconds: 30, completed: true, actualSets: 2, actualReps: 20 },
    ],
    isComplete: true,
    completedSets: 5,
  });
  const freshSession = record({
    startedAt: 2_000,
    updatedAt: 200,
    version: 2,
    isComplete: false,
    completedSets: 0,
  });
  const merged = mergeWorkoutStates(freshSession, oldSession);
  // The fresh session's record wins unchanged — the old completion is NOT
  // unioned in (it belongs to a different session).
  assert.equal(merged.isComplete, false);
  assert.equal(merged.completedSets, 0);
  assert.deepEqual(merged.exercises.map((e) => e.completed), [true, false]);
  assert.equal(merged.startedAt, 2_000);
});

test('plan mismatch falls back to pure LWW', () => {
  const planA = record({ updatedAt: 100, version: 1 });
  const planB = record({
    updatedAt: 200,
    version: 2,
    exercises: [
      { id: 'ex-other', name: 'Other', sets: 5, reps: 10, durationSeconds: 20, restSeconds: 10, completed: true, actualSets: 5, actualReps: 50 },
      { id: 'ex-2', name: 'Plank', sets: 2, reps: null, durationSeconds: 60, restSeconds: 30, completed: false, actualSets: null, actualReps: null },
    ],
  });
  assert.equal(sameExercisePlan(planA.exercises, planB.exercises), false);
  const merged = mergeWorkoutStates(planA, planB);
  // Newer record wins as-is; no field union (planB's only exercise is
  // completed but planA's plan is unrelated).
  assert.deepEqual(merged, { ...planB });
});

// ---------------------------------------------------------------------------
// Backward compatibility with legacy records
// ---------------------------------------------------------------------------

test('legacy records (no version / no v2 fields) merge without special-casing', () => {
  const legacy = record({
    updatedAt: 150,
    exercises: [
      { id: 'ex-1', name: 'Squats', sets: 3, reps: 12, durationSeconds: 30, restSeconds: 45, completed: true, actualSets: 3, actualReps: 36 },
      { id: 'ex-2', name: 'Plank', sets: 2, reps: null, durationSeconds: 60, restSeconds: 30, completed: false, actualSets: null, actualReps: null },
    ],
  });
  delete (legacy as Partial<WorkoutStateRecord>).version;
  const { phaseElapsedSeconds, isRunning, ...preV2 } = legacy;
  const legacyRow = preV2 as unknown as WorkoutStateRecord; // simulated pre-v2 row

  const merged = mergeWorkoutStates(legacyRow, record({ updatedAt: 100, version: 1 }));
  // version defaults to 0 → legacy row (updatedAt 150) still wins ordering.
  assert.equal(merged.updatedAt, 150);
  assert.equal(merged.version, 1); // max(0, 1)
  assert.deepEqual(merged.exercises.map((e) => e.completed), [true, false]);
});

// ---------------------------------------------------------------------------
// Three-way resolver
// ---------------------------------------------------------------------------

test('resolveWorkoutStateConflict: no base → plain merge', () => {
  const local = record({ updatedAt: 200, version: 2 });
  const remote = record({ updatedAt: 100, version: 1 });
  assert.deepEqual(
    resolveWorkoutStateConflict(undefined, local, remote),
    mergeWorkoutStates(local, remote)
  );
});

test('resolveWorkoutStateConflict: single-sided changes win without merge', () => {
  const base = record({ updatedAt: 100, version: 1 });
  const remote = record({ updatedAt: 200, version: 2, completedSets: 4 });
  // local unchanged → remote wins as-is.
  assert.deepEqual(resolveWorkoutStateConflict(base, { ...base }, remote), remote);
  // remote unchanged → local wins as-is.
  const local = record({ updatedAt: 250, version: 3, phase: 'COMPLETED' });
  assert.deepEqual(resolveWorkoutStateConflict(base, local, { ...base }), local);
});

test('resolveWorkoutStateConflict: both sides changed → union + LWW', () => {
  const base = record({ updatedAt: 100, version: 1 });
  const local = record({
    updatedAt: 200,
    version: 2,
    phase: 'RESTING',
    currentSet: 2,
  });
  const remote = record({
    updatedAt: 150,
    version: 1,
    completedSets: 4,
    exercises: [
      { id: 'ex-1', name: 'Squats', sets: 3, reps: 12, durationSeconds: 30, restSeconds: 45, completed: true, actualSets: 3, actualReps: 36 },
      { id: 'ex-2', name: 'Plank', sets: 2, reps: null, durationSeconds: 60, restSeconds: 30, completed: true, actualSets: 2, actualReps: 20 },
    ],
  });
  const resolved = resolveWorkoutStateConflict(base, local, remote);
  // Position from the newer writer (local), progress unioned from remote.
  assert.equal(resolved.phase, 'RESTING');
  assert.equal(resolved.currentSet, 2);
  assert.deepEqual(resolved.exercises.map((e) => e.completed), [true, true]);
  assert.equal(resolved.completedSets, 4);
});

// ---------------------------------------------------------------------------
// Integration: merged records stay usable by the workout player
// ---------------------------------------------------------------------------

test('merged record still matches the plan and hydrates (player compatibility)', () => {
  const a = record({ updatedAt: 200, version: 2 });
  const b = record({ updatedAt: 100, version: 1 });
  const merged = mergeWorkoutStates(a, b);
  assert.equal(matchesPlan(merged, PLAN), true);
  const input = hydrateFromRecord(merged, PLAN);
  assert.ok(input);
  assert.equal(input.phase, 'EXERCISING');
  assert.equal(input.currentExerciseIndex, 1);
});

test('WORKOUT_STATE_CONFLICT_POLICY documents the expected contract', () => {
  assert.equal(WORKOUT_STATE_CONFLICT_POLICY.primaryOrdering, 'updatedAt');
  assert.equal(WORKOUT_STATE_CONFLICT_POLICY.secondaryOrdering, 'version');
  assert.equal(WORKOUT_STATE_CONFLICT_POLICY.sameSessionMerge, 'monotonicProgressUnion');
  assert.equal(WORKOUT_STATE_CONFLICT_POLICY.differentSessionFallback, 'lastWriteWins');
});

// ---------------------------------------------------------------------------
// Outbox retry policy (pure part of db.ts)
// ---------------------------------------------------------------------------

test('shouldRetryExerciseLog caps attempts and respects giveUp', () => {
  assert.equal(shouldRetryExerciseLog({ syncAttempts: 0 }), true);
  assert.equal(shouldRetryExerciseLog({ syncAttempts: MAX_SYNC_ATTEMPTS - 1 }), true);
  assert.equal(shouldRetryExerciseLog({ syncAttempts: MAX_SYNC_ATTEMPTS }), false);
  assert.equal(shouldRetryExerciseLog({ syncAttempts: MAX_SYNC_ATTEMPTS + 5 }), false);
  // Permanent rejection stops retries regardless of attempts.
  assert.equal(shouldRetryExerciseLog({ syncAttempts: 0, giveUp: true }), false);
  // Legacy rows without giveUp default to retryable.
  const legacy = log({ syncAttempts: 1 });
  assert.equal(shouldRetryExerciseLog(legacy), true);
});

// ---------------------------------------------------------------------------
// Sync error classification (network errors / HTTP / Postgres codes)
// ---------------------------------------------------------------------------

test('classifySyncError marks network and transport failures retryable', () => {
  const cases: unknown[] = [
    new TypeError('Failed to fetch'),
    { message: 'Failed to fetch' },
    { message: 'fetch failed' },
    { message: 'NetworkError when attempting to fetch resource.' },
    { message: 'The operation was aborted due to timeout' },
    { message: 'socket hang up (ECONNRESET)' },
    new Error('AbortError'),
    { status: 500, message: 'internal' },
    { status: 503, message: 'unavailable' },
    { status: 429, message: 'rate limited' },
    { status: 408, message: 'timeout' },
    { code: '08P01', message: 'protocol violation' },
    { code: '53P01', message: 'disk full' },
  ];
  for (const c of cases) {
    const cls = classifySyncError(c);
    assert.equal(cls.retryable, true, `expected retryable: ${JSON.stringify(c)}`);
    assert.equal(cls.kind, 'retryable');
  }
  // Unknown errors default to retryable — the outbox never drops data silently.
  assert.equal(classifySyncError('something weird').retryable, true);
  assert.equal(classifySyncError(new Error('boom')).retryable, true);
});

test('classifySyncError marks permanent rejections non-retryable', () => {
  const cases: unknown[] = [
    { status: 400, message: 'bad request' },
    { status: 401, message: 'unauthorized' },
    { status: 403, message: 'forbidden' },
    { status: 404, message: 'not found' },
    { status: 422, message: 'unprocessable' },
    { code: '23505', message: 'duplicate key value violates unique constraint' },
    { code: '22P02', message: 'invalid text representation' },
    { code: '28P01', message: 'password authentication failed' },
    { code: '42501', message: 'permission denied for table' },
    { code: '3D000', message: 'database does not exist' },
  ];
  for (const c of cases) {
    const cls = classifySyncError(c);
    assert.equal(cls.retryable, false, `expected permanent: ${JSON.stringify(c)}`);
    assert.equal(cls.kind, 'permanent');
  }
});

test('classifySyncError is deterministic and preserves a readable message', () => {
  const err = { status: 503, message: 'backend is warming up' };
  const first = classifySyncError(err);
  const second = classifySyncError(err);
  assert.deepEqual(first, second);
  assert.equal(first.message, 'backend is warming up');
  assert.equal(first.retryable, true);
});

// ---------------------------------------------------------------------------
// Idempotency mapping
// ---------------------------------------------------------------------------

test('toSupabaseRow maps deterministically and carries the idempotency key', () => {
  const row = log({
    id: 'log-abc',
    completedAt: 1_700_000_000_123,
  });
  const out = toSupabaseRow(row);
  assert.equal(out.id, 'log-abc'); // upsert onConflict:'id' dedupes retries
  assert.equal(out.user_id, 'u1');
  assert.equal(out.session_id, 's1');
  assert.equal(out.exercise_id, 'ex-1');
  assert.equal(out.exercise_name, 'Squats');
  assert.equal(out.exercise_order, 0);
  assert.equal(out.set_number, 1);
  assert.equal(out.actual_sets, 1);
  assert.equal(out.actual_reps, 12);
  assert.equal(out.duration_seconds, 30);
  assert.equal(out.completed_at, new Date(1_700_000_000_123).toISOString());
  // Same input → identical output (deterministic retries).
  assert.deepEqual(toSupabaseRow(row), out);
});
