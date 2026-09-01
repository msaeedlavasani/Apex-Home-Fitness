/**
 * Deterministic conflict resolution for offline workout-state records.
 *
 * Why this exists
 * ---------------
 * `workoutStates` (see `./db.ts`) holds one resumable "today's workout"
 * snapshot per `userId + dateKey`. A snapshot can be written by more than
 * one writer — two tabs of the same browser, or (once server sync lands)
 * two devices of the same user — and `Date.now()` alone is not a safe
 * arbiter: two writers can stamp the same millisecond, and device clocks
 * can skew.
 *
 * Policy (WORKOUT_STATE_CONFLICT_POLICY)
 * --------------------------------------
 *  1. **Deterministic ordering (winner selection).** Records are compared by
 *     `updatedAt` (last-write-wins). Ties are broken by the per-record
 *     monotonic `version` counter maintained by the db layer (missing on
 *     legacy records → treated as 0), then by the canonical serialized
 *     payload — a pure safety net so the comparison is *always* total and
 *     order-independent, even for two writes in the same millisecond with
 *     the same version.
 *  2. **Same-session merge (monotonic progress).** When both records belong
 *     to the same session (`startedAt` equal and non-null) and the exercise
 *     plans match, the winner's *position/timer* fields (phase, current
 *     exercise/set, elapsed time, running flag) define the resume point,
 *     while *progress* is merged monotonically so completed work never
 *     regresses:
 *       - per-exercise `completed`     → OR (union),
 *       - per-exercise `actualSets`/`actualReps` → max (null = 0),
 *       - `completedSets`             → max,
 *       - `isComplete`                → OR,
 *       - `completedAt`               → max of the non-null values.
 *  3. **Different session / plan mismatch → pure LWW.** A new session (newer
 *     `startedAt`) supersedes the old one wholesale, and structurally
 *     different plans cannot be field-merged, so the newer record wins as-is
 *     (no union). This is what makes `restart()` and plan changes behave
 *     correctly.
 *  4. **Order independence.** `mergeWorkoutStates(a, b)` deep-equals
 *     `mergeWorkoutStates(b, a)` for any pair of valid same-key records, so
 *     the merged result never depends on which replica happens to call first.
 *
 * Backward compatibility
 * ----------------------
 * Every new field used here (`version` on the record, missing `isRunning` /
 * `phaseElapsedSeconds` on pre-v2 rows) is optional and treated as a safe
 * default, so legacy records merge without special-casing. The snapshot
 * FORMAT version (`snapshotVersion`, S-05) is additive: merges preserve the
 * highest format version and never downgrade a record.
 *
 * All functions are pure and framework-agnostic — unit-testable in Node
 * without React, IndexedDB or a DOM.
 */

import type { OfflineExercise, WorkoutStateRecord } from './db';
import { snapshotVersionOf } from './snapshotVersion';

// ---------------------------------------------------------------------------
// Policy constants (documented contract — see header)
// ---------------------------------------------------------------------------

/**
 * Human-readable summary of the resolution policy. Not consulted by the
 * functions; exists so tests and future server-sync code can assert that the
 * policy contract is the one they expect.
 */
export const WORKOUT_STATE_CONFLICT_POLICY = {
  /** Primary ordering key: the most recent writer wins. */
  primaryOrdering: 'updatedAt',
  /** Tie-breaker for equal timestamps (db layer maintains it). */
  secondaryOrdering: 'version',
  /** Final deterministic tie-breaker (canonical serialized payload). */
  finalOrdering: 'serializedRecord',
  /** Same-session merges union progress fields so completed work never regresses. */
  sameSessionMerge: 'monotonicProgressUnion',
  /** Different sessions or mismatched plans fall back to pure last-write-wins. */
  differentSessionFallback: 'lastWriteWins',
} as const;

// ---------------------------------------------------------------------------
// Ordering
// ---------------------------------------------------------------------------

function versionOf(record: WorkoutStateRecord): number {
  return record.version ?? 0;
}

/**
 * Total, deterministic ordering of two workout-state records.
 *
 * Returns a negative number when `a` is older than `b`, zero when they are
 * equivalent, and a positive number when `a` is newer. The comparison is
 * antisymmetric (`compare(a, b) === -compare(b, a)`), so picking the
 * "winner" never depends on the caller's argument order.
 */
export function compareWorkoutStates(
  a: WorkoutStateRecord,
  b: WorkoutStateRecord,
): number {
  if (a.updatedAt !== b.updatedAt) return a.updatedAt - b.updatedAt;
  const av = versionOf(a);
  const bv = versionOf(b);
  if (av !== bv) return av - bv;
  // Same timestamp, same version: fall back to the canonical payload. Both
  // records are produced by the same builder (workoutPersistence/db), so key
  // order inside JSON.stringify is stable.
  const sa = JSON.stringify(a);
  const sb = JSON.stringify(b);
  if (sa !== sb) return sa < sb ? -1 : 1;
  return 0;
}

// ---------------------------------------------------------------------------
// Merge preconditions
// ---------------------------------------------------------------------------

/**
 * True when both records belong to the same workout session — both have a
 * non-null, equal `startedAt`. Sessions that never started (null) or that
 * started at different times are treated as distinct, and distinct sessions
 * are never field-merged (a new session supersedes the old one).
 */
export function sameWorkoutSession(
  a: WorkoutStateRecord,
  b: WorkoutStateRecord,
): boolean {
  return a.startedAt != null && b.startedAt != null && a.startedAt === b.startedAt;
}

/**
 * True when the two exercise arrays describe the same plan (same ids, same
 * order, same set counts). Mirrors `matchesPlan` from `workoutPersistence.ts`
 * for the stored `OfflineExercise` shape. Field-level merging is only safe
 * under this precondition.
 */
export function sameExercisePlan(
  a: OfflineExercise[],
  b: OfflineExercise[],
): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (a[i].id !== b[i].id || a[i].sets !== b[i].sets) return false;
  }
  return true;
}

// ---------------------------------------------------------------------------
// Field-level merge
// ---------------------------------------------------------------------------

/** Max of two optional counters; null only when both sides are null/undefined. */
function maxOrNull(
  a: number | null | undefined,
  b: number | null | undefined,
): number | null {
  if (a == null && b == null) return null;
  return Math.max(a ?? 0, b ?? 0);
}

/**
 * Merges two same-plan exercise arrays: `completed` unions (OR), logged
 * actuals take the maximum. Precondition: `sameExercisePlan(a, b)`. The
 * result is commutative for any pair whose metadata matches.
 */
export function mergeOfflineExercises(
  a: OfflineExercise[],
  b: OfflineExercise[],
): OfflineExercise[] {
  const length = Math.max(a.length, b.length);
  const merged: OfflineExercise[] = [];
  for (let i = 0; i < length; i++) {
    const ea = a[i];
    const eb = b[i];
    if (!ea) {
      merged.push(eb);
      continue;
    }
    if (!eb) {
      merged.push(ea);
      continue;
    }
    merged.push({
      ...eb,
      completed: ea.completed || eb.completed,
      actualSets: maxOrNull(ea.actualSets, eb.actualSets),
      actualReps: maxOrNull(ea.actualReps, eb.actualReps),
    });
  }
  return merged;
}

// ---------------------------------------------------------------------------
// Record merge
// ---------------------------------------------------------------------------

/**
 * Merges two workout-state records (same user + dateKey) into one
 * deterministic result per the documented policy. Order-independent:
 * `mergeWorkoutStates(a, b)` deep-equals `mergeWorkoutStates(b, a)`.
 */
export function mergeWorkoutStates(
  a: WorkoutStateRecord,
  b: WorkoutStateRecord,
): WorkoutStateRecord {
  const winner = compareWorkoutStates(a, b) >= 0 ? a : b;
  const loser = winner === a ? b : a;
  const updatedAt = Math.max(a.updatedAt, b.updatedAt);
  const version = Math.max(versionOf(a), versionOf(b));

  const canFieldMerge = sameExercisePlan(a.exercises, b.exercises) && sameWorkoutSession(a, b);
  // The snapshot FORMAT version (S-05) is additive and never downgraded: the
  // merged record keeps the highest format version of the two inputs. When
  // NEITHER input carries the field (legacy×legacy), the key is omitted
  // entirely — the merged record stays byte-identical to the pre-S-05 merge,
  // so the canonical-payload tie-break is unchanged for v0 rows.
  const snapshotVersion =
    a.snapshotVersion == null && b.snapshotVersion == null
      ? undefined
      : Math.max(a.snapshotVersion ?? 0, b.snapshotVersion ?? 0);
  const snapshotVersionField =
    snapshotVersion === undefined ? {} : {snapshotVersion};
  if (!canFieldMerge) {
    // Distinct sessions or structurally different plans: the newer record
    // supersedes the older one wholesale — no progress union.
    return {...winner, updatedAt, version, ...snapshotVersionField};
  }

  return {
    ...winner, // position/timer/plan fields follow the newer writer
    exercises: mergeOfflineExercises(a.exercises, b.exercises),
    completedSets: Math.max(a.completedSets, b.completedSets),
    isComplete: a.isComplete || b.isComplete,
    completedAt:
      a.completedAt != null || b.completedAt != null
        ? Math.max(a.completedAt ?? 0, b.completedAt ?? 0)
        : null,
    updatedAt,
    version,
    ...snapshotVersionField,
  };
}

/**
 * Three-way resolver for server-driven sync: `base` is the last snapshot
 * both replicas derived from (the "last common ancestor"). When only one
 * side changed against `base`, that side wins without a merge; otherwise the
 * two-way union/LWW policy applies. With no `base` (first arrival of a
 * remote record), this degrades to `mergeWorkoutStates(local, remote)`.
 */
export function resolveWorkoutStateConflict(
  base: WorkoutStateRecord | undefined,
  local: WorkoutStateRecord,
  remote: WorkoutStateRecord,
): WorkoutStateRecord {
  if (base) {
    if (JSON.stringify(base) === JSON.stringify(local)) return remote;
    if (JSON.stringify(base) === JSON.stringify(remote)) return local;
  }
  return mergeWorkoutStates(local, remote);
}
