/**
 * Movement Graph runtime store (MG-09 — runtime switchover).
 *
 * The governed adoption path is: additive migration (new tables) → data
 * migration (Movement rows linked to existing Exercise rows) → runtime
 * switchover. This service is the switchover seam:
 *
 *   - `isMovementGraphAdopted()` — fail-safe adoption gate. True only when
 *     the `Movement` table EXISTS and holds rows. A missing table (migration
 *     not yet applied) reads as NOT adopted, so the runtime keeps serving
 *     from the legacy catalog — zero behavior change before adoption.
 *   - `resolveWorkoutExercises()` — the workout session's exercise
 *     resolution. When adopted, canonical names resolve through the Movement
 *     Graph (nameEn → the linked legacy Exercise id, preserving every
 *     existing exercise reference); names the graph doesn't know (e.g.
 *     AI-generated program exercises that are not canonical catalog entries)
 *     fall back to the exact legacy lookup. When NOT adopted, the legacy path
 *     is used unchanged.
 *
 * No writes, no schema knowledge beyond the adoption probe; the probe is
 * read-only and fail-closed (any error → not adopted).
 */

import {prisma} from '@/lib/prisma';

/** The exercise reference the workout session needs: durable Exercise id + display name. */
export interface WorkoutExerciseRef {
  id: string;
  name: string;
}

/** Normalize request values without collapsing repeated prescribed entries. */
export function normalizeRequestedExerciseNames(value: unknown): string[] {
  return Array.isArray(value)
    ? value
      .filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
      .map((item) => item.trim())
    : [];
}

/**
 * True when the Movement Graph tables exist AND hold rows. Fail-safe: any
 * error (missing table, DB unavailable) returns false.
 */
export async function isMovementGraphAdopted(): Promise<boolean> {
  try {
    const tables = await prisma.$queryRaw<Array<{name: string}>>`
      SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'Movement'
    `;
    if (tables.length === 0) return false;
    const count = await prisma.movement.count();
    return count > 0;
  } catch {
    return false; // fail-closed: never break the workout path
  }
}

/** The exact legacy resolution path (current behavior, unchanged). */
async function resolveLegacy(
  names: string[],
  programId: string | null,
): Promise<WorkoutExerciseRef[]> {
  return prisma.exercise.findMany({
    where: {
      name: {in: names},
      ...(programId ? {programExercises: {some: {programId}}} : {}),
    },
    select: {id: true, name: true},
  });
}

/** Re-expands unique resolver rows to the ordered prescribed entry list. */
export function preserveRequestedEntryOrder(
  names: readonly string[],
  resolved: readonly WorkoutExerciseRef[],
): WorkoutExerciseRef[] {
  const byName = new Map(resolved.map((exercise) => [exercise.name, exercise]));
  return names.flatMap((name) => {
    const exercise = byName.get(name);
    return exercise ? [{...exercise, name}] : [];
  });
}

/**
 * Resolves workout exercise names for session creation. When the Movement
 * Graph is adopted, canonical names resolve through the graph's linked
 * Exercise rows; every other name uses the legacy path. Input order is
 * preserved for determinism.
 */
export async function resolveWorkoutExercises(
  names: string[],
  programId: string | null,
): Promise<WorkoutExerciseRef[]> {
  if (names.length === 0) return [];
  if (!(await isMovementGraphAdopted())) {
    const resolved = await resolveLegacy([...new Set(names)], programId);
    return preserveRequestedEntryOrder(names, resolved);
  }

  const movements = await prisma.movement.findMany({
    where: {nameEn: {in: names}},
    select: {nameEn: true, exerciseId: true},
  });
  const byNameEn = new Map(movements.map((m) => [m.nameEn, m.exerciseId]));

  const resolved: WorkoutExerciseRef[] = [];
  const legacyNames: string[] = [];
  const graphIds: string[] = [];
  for (const name of names) {
    const exerciseId = byNameEn.get(name);
    if (exerciseId) {
      // Graph-resolved: the linked legacy Exercise row IS the durable id.
      graphIds.push(exerciseId);
    } else {
      // Not a canonical entry (or not yet linked) → legacy lookup.
      legacyNames.push(name);
    }
  }

  if (graphIds.length > 0) {
    // Apply the same program-membership filter the legacy path applies, so
    // the two paths cannot diverge on program scoping.
    const graphRows = await prisma.exercise.findMany({
      where: {
        id: {in: graphIds},
        ...(programId ? {programExercises: {some: {programId}}} : {}),
      },
      select: {id: true, name: true},
    });
    const kept = new Set(graphRows.map((r) => r.id));
    for (const name of names) {
      const exerciseId = byNameEn.get(name);
      if (exerciseId && kept.has(exerciseId)) {
        resolved.push({id: exerciseId, name});
      }
    }
  }

  if (legacyNames.length > 0) {
    const legacy = await resolveLegacy([...new Set(legacyNames)], programId);
    const legacyByName = new Map(legacy.map((exercise) => [exercise.name, exercise]));
    for (const name of names) {
      if (legacyByName.has(name)) resolved.push({...legacyByName.get(name)!, name});
    }
  }
  return preserveRequestedEntryOrder(names, resolved);
}
