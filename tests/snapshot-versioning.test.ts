import assert from 'node:assert/strict';
import test from 'node:test';

import {compareWorkoutStates, mergeWorkoutStates} from '../src/lib/offline/conflictPolicy';
import {
  SNAPSHOT_VERSION,
  SNAPSHOT_VERSIONING_CONTRACT,
  canOverwriteSnapshot,
  isUnknownNewerSnapshot,
  snapshotVersionOf,
} from '../src/lib/offline/snapshotVersion';
import {buildWorkoutStateRecord, hydrateFromRecord, toOfflineExercises} from '../src/lib/offline/workoutPersistence';
import type {WorkoutStateRecord} from '../src/lib/offline/db';
import type {SessionExercise, SessionState} from '../src/lib/workout/sessionContracts';

const PLAN: SessionExercise[] = [
  {id: 'ex-1', name: 'Squats', sets: 3, reps: 12, durationSeconds: 30, restSeconds: 45},
];

function state(overrides: Partial<SessionState> = {}): SessionState {
  return {
    phase: 'EXERCISING',
    currentExerciseIndex: 0,
    currentSet: 1,
    completedSets: 1,
    totalSets: 3,
    phaseElapsedSeconds: 10,
    totalElapsedSeconds: 100,
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
    currentExerciseIndex: 0,
    currentSet: 1,
    completedSets: 1,
    totalSets: 3,
    phaseElapsedSeconds: 10,
    totalElapsedSeconds: 100,
    isRunning: true,
    startedAt: 1_700_000_000_000,
    completedAt: null,
    isComplete: false,
    updatedAt: 1_700_000_000_100,
    version: 3,
    snapshotVersion: SNAPSHOT_VERSION,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Contract constants
// ---------------------------------------------------------------------------

test('S-05 contract documents additive evolution + refuse-overwrite', () => {
  assert.equal(SNAPSHOT_VERSIONING_CONTRACT.evolution, 'additive');
  assert.equal(SNAPSHOT_VERSIONING_CONTRACT.unknownNewerRead, 'additiveRead');
  assert.equal(SNAPSHOT_VERSIONING_CONTRACT.unknownNewerWrite, 'refuseOverwrite');
  assert.equal(SNAPSHOT_VERSIONING_CONTRACT.legacyDefault, 0);
});

// ---------------------------------------------------------------------------
// Version classification
// ---------------------------------------------------------------------------

test('legacy rows without snapshotVersion read as 0 and are overwritable', () => {
  const legacy = record({snapshotVersion: undefined});
  assert.equal(snapshotVersionOf(legacy), 0);
  assert.equal(isUnknownNewerSnapshot(legacy), false);
  assert.equal(canOverwriteSnapshot(legacy), true);
});

test('current version rows are overwritable', () => {
  const current = record({snapshotVersion: SNAPSHOT_VERSION});
  assert.equal(snapshotVersionOf(current), SNAPSHOT_VERSION);
  assert.equal(isUnknownNewerSnapshot(current), false);
  assert.equal(canOverwriteSnapshot(current), true);
});

test('unknown-newer rows (version > SNAPSHOT_VERSION) are readable but not overwritable', () => {
  const newer = record({snapshotVersion: SNAPSHOT_VERSION + 1});
  assert.equal(snapshotVersionOf(newer), SNAPSHOT_VERSION + 1);
  assert.equal(isUnknownNewerSnapshot(newer), true);
  assert.equal(canOverwriteSnapshot(newer), false);
});

// ---------------------------------------------------------------------------
// Serialization
// ---------------------------------------------------------------------------

test('buildWorkoutStateRecord stamps the current snapshot version', () => {
  const out = buildWorkoutStateRecord(PLAN, state());
  assert.equal(out.snapshotVersion, SNAPSHOT_VERSION);
});

// ---------------------------------------------------------------------------
// Hydration: old-shape vs new-shape
// ---------------------------------------------------------------------------

test('legacy (v0) and current (v1) records hydrate identically', () => {
  const legacy = record({snapshotVersion: undefined});
  const current = record({snapshotVersion: SNAPSHOT_VERSION});
  const fromLegacy = hydrateFromRecord(legacy, PLAN);
  const fromCurrent = hydrateFromRecord(current, PLAN);
  assert.deepEqual(fromCurrent, fromLegacy);
  assert.equal(fromCurrent?.phase, 'EXERCISING');
  assert.equal(fromCurrent?.currentExerciseIndex, 0);
  assert.equal(fromCurrent?.phaseElapsedSeconds, 10);
});

test('unknown-newer records still hydrate the known fields (additive-read)', () => {
  const newer = record({snapshotVersion: SNAPSHOT_VERSION + 1});
  const hydrated = hydrateFromRecord(newer, PLAN);
  assert.equal(hydrated?.phase, 'EXERCISING');
  assert.equal(hydrated?.currentExerciseIndex, 0);
});

// ---------------------------------------------------------------------------
// Merge + ordering: format version honored, ordering contract unchanged
// ---------------------------------------------------------------------------

test('mergeWorkoutStates preserves the highest snapshot format version (never downgrades)', () => {
  const v0 = record({snapshotVersion: undefined, version: 1, updatedAt: 1});
  const v1 = record({snapshotVersion: SNAPSHOT_VERSION, version: 2, updatedAt: 2});
  const merged = mergeWorkoutStates(v0, v1);
  assert.equal(snapshotVersionOf(merged), SNAPSHOT_VERSION);

  const v2 = record({snapshotVersion: SNAPSHOT_VERSION + 1, version: 3, updatedAt: 3});
  const mergedUp = mergeWorkoutStates(v1, v2);
  assert.equal(snapshotVersionOf(mergedUp), SNAPSHOT_VERSION + 1);
});

test('ordering still uses the write counter, not the snapshot format version', () => {
  // Same updatedAt + same write-counter version → falls to the canonical
  // payload tie-break; the FORMAT version must not reorder writers.
  const a = record({updatedAt: 100, version: 1, snapshotVersion: 1});
  const b = record({updatedAt: 100, version: 1, snapshotVersion: 2});
  // Comparison stays total + antisymmetric and never throws.
  const ab = compareWorkoutStates(a, b);
  assert.equal(compareWorkoutStates(b, a), -ab);
});

test('write-counter semantics are untouched by snapshot versioning', () => {
  const a = record({updatedAt: 100, version: 1, snapshotVersion: undefined});
  const b = record({updatedAt: 100, version: 2, snapshotVersion: SNAPSHOT_VERSION});
  // The higher write counter wins regardless of format versions.
  assert.ok(compareWorkoutStates(a, b) < 0);
});
