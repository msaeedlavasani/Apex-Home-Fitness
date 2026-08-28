/**
 * Exercise domain public entry point (S02-A).
 *
 * Exposes only intentional public contracts and functions of the exercise
 * domain. Implementation helpers (e.g. the normalization internals) are kept
 * in `resolver.ts` and are importable directly, but the recommended surface is
 * here.
 *
 * This domain is PURE and framework-independent — no Prisma, React, services,
 * network/browser side effects.
 */

export type {
  ExerciseId,
  ExerciseSlug,
  NormalizedExerciseName,
  ExerciseCatalogEntry,
  ExerciseReference,
  ResolverResult,
  ResolverResultStatus,
  ResolutionFailureReason,
} from './contracts';

export {
  CANONICAL_CATALOG,
  SEED_CATALOG,
  RULES_CATALOG,
  LIBRARY_CATALOG,
  exerciseCatalogIndex,
  slugifyName,
} from './catalog';

export {
  normalizeExerciseName,
  indexCatalogEntries,
  resolveExercise,
  resolveWithAmbiguity,
  collectAmbiguousMatches,
} from './resolver';