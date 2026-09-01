/**
 * Workout plan normalization helpers (S-04).
 *
 * Pure, framework-independent utilities shared by the session adapter
 * (`useWorkoutEngine`) and the persistence bridge
 * (`src/lib/offline/workoutPersistence.ts`). Moved here from the React hook
 * so lib consumers never need to import from a component module; the hook
 * re-exports `clampSets` for backward compatibility.
 *
 * No React, no browser APIs, no side effects.
 */

/**
 * Normalizes a plan item's declared set count to a positive integer.
 * Missing/invalid values resolve to 1 (a plan item always has at least one
 * working set); fractional values floor down.
 */
export function clampSets(sets: number | null | undefined): number {
  return Math.max(1, Math.floor(sets ?? 1));
}
