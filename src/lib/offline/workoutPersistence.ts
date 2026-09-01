/**
 * Workout snapshot persistence mapping.
 *
 * Bridges the canonical Session State contract and the IndexedDB
 * `workoutStates` records in `./db`:
 *
 *   - `buildWorkoutStateRecord()`  — session state → record (persist on
 *     `onStateChange`),
 *   - `matchesPlan()` / `hydrateFromRecord()` — validate a saved record
 *     against the currently loaded plan and produce the `hydrate()` input.
 *
 * S-04: types come from the canonical `sessionContracts` module (the hook's
 * `Workout*` aliases ARE these types — structurally identical), and the pure
 * plan helper from `../workout/plan`. This module never imports from the
 * React hook, keeping the persistence layer UI-framework-free.
 *
 * All functions are pure and framework-agnostic so they can be unit-tested
 * in Node without React, IndexedDB or a DOM.
 */

import {clampSets} from '../workout/plan';
import type {SessionExercise, SessionHydrateInput, SessionState} from '../workout/sessionContracts';
import type { OfflineExercise, WorkoutStateRecord } from './db';
import {SNAPSHOT_VERSION} from './snapshotVersion';

/**
 * Maps a plan to the `OfflineExercise` array stored in a workout snapshot.
 * `completed` is derived from the engine position: every exercise before the
 * current one is done; the current one counts only once the workout is
 * COMPLETED (RESTING-after-last-set nuance is cosmetic and skipped here).
 */
export function toOfflineExercises(
  exercises: SessionExercise[],
  position: Pick<SessionState, 'currentExerciseIndex' | 'phase'>
): OfflineExercise[] {
  return exercises.map((ex, i) => ({
    id: ex.id,
    name: ex.name,
    sets: clampSets(ex.sets),
    reps: ex.reps ?? null,
    durationSeconds: ex.durationSeconds ?? null,
    restSeconds: ex.restSeconds ?? null,
    completed:
      i < position.currentExerciseIndex ||
      (i === position.currentExerciseIndex && position.phase === 'COMPLETED'),
    actualSets: null,
    actualReps: null,
  }));
}

/**
 * Builds the persistable portion of a `WorkoutStateRecord` from a live engine
 * snapshot. `workoutKey`/`userId`/`dateKey`/`updatedAt` are filled in by the
 * db layer.
 */
export function buildWorkoutStateRecord(
  exercises: SessionExercise[],
  state: SessionState
): Omit<WorkoutStateRecord, 'workoutKey' | 'userId' | 'dateKey' | 'updatedAt'> {
  return {
    programId: null,
    exercises: toOfflineExercises(exercises, state),
    phase: state.phase,
    currentExerciseIndex: state.currentExerciseIndex,
    currentSet: state.currentSet,
    completedSets: state.completedSets,
    totalSets: state.totalSets,
    phaseElapsedSeconds: state.phaseElapsedSeconds,
    totalElapsedSeconds: state.totalElapsedSeconds,
    isRunning: state.isRunning,
    startedAt: state.startedAt,
    completedAt: state.completedAt,
    isComplete: state.phase === 'COMPLETED',
    // S-05: stamp the snapshot FORMAT version (distinct from the db layer's
    // `version` write counter). Legacy rows without it read as 0.
    snapshotVersion: SNAPSHOT_VERSION,
  };
}

/**
 * True when a saved snapshot belongs to the same plan as the one currently
 * loaded (same exercise ids and set counts, same order). Restoring a
 * snapshot for a different/changed plan would corrupt the session, so the
 * player refuses to hydrate it.
 */
export function matchesPlan(record: WorkoutStateRecord, exercises: SessionExercise[]): boolean {
  if (record.exercises.length !== exercises.length) return false;
  for (let i = 0; i < exercises.length; i++) {
    const saved = record.exercises[i];
    const plan = exercises[i];
    if (!saved || saved.id !== plan.id || saved.sets !== clampSets(plan.sets)) return false;
  }
  return true;
}

/**
 * Validates a saved workout snapshot against the currently loaded plan and
 * produces the input for the session core's HYDRATE command (consumed by
 * `useWorkoutEngine.hydrate()`).
 *
 * Returns `null` (caller should start fresh) when:
 *   - the record was never started (`phase === 'READY'`), or
 *   - the saved plan no longer matches the loaded exercises.
 *
 * Note: the engine always restores the timer paused — the user resumes
 * explicitly, so a half-done countdown never silently elapses while the app
 * was closed.
 */
export function hydrateFromRecord(
  record: WorkoutStateRecord,
  exercises: SessionExercise[]
): SessionHydrateInput | null {
  if (record.phase === 'READY') return null;
  if (!matchesPlan(record, exercises)) return null;
  return {
    phase: record.phase,
    currentExerciseIndex: record.currentExerciseIndex,
    currentSet: record.currentSet,
    phaseElapsedSeconds: record.phaseElapsedSeconds,
    totalElapsedSeconds: record.totalElapsedSeconds,
    startedAt: record.startedAt,
    completedAt: record.completedAt,
    isComplete: record.isComplete,
  };
}
