/**
 * Canonical Exercise-domain contracts (S02-A — Architecture Stabilization).
 *
 * Durable identity + display metadata for exercises, plus the pure resolver
 * model and classification states, per GATE A (GA-01..GA-04/GA-08, APPROVED
 * 2026-08-27). See `docs/architecture/S02-EXERCISE-IDENTITY-GATE-A.md`.
 *
 * This module is PURE — no Prisma, React, services, environment, or runtime
 * side effects. It only dictates identity/reference shapes.
 *
 * Identity model:
 *   - `ExerciseId`  — opaque durable identity (the existing DB cuid row id is
 *     the current identity source; the encoding algorithm is NOT defined here).
 *   - `ExerciseSlug` — canonical, source-controlled alias. The slug is an
 *     identifier that anchors deterministic resolution and fixtures; it is NOT
 *     the durable identity (GA-01: names/slugs are never the durable key).
 *   - `name`/localized names — display metadata only.
 */

/** Opaque durable exercise identity. Branded to distinguish it from a slug. */
export type ExerciseId = string & { readonly __exerciseId: unique symbol };

/** Canonical source-controlled exercise alias used for resolution + fixtures. */
export type ExerciseSlug = string & { readonly __exerciseSlug: unique symbol };

/** A normalized name string (trimmed/case-folded/collapsed) used by the resolver. */
export type NormalizedExerciseName = string;

/**
 * A single source-controlled system-catalog entry. Only fields justified by
 * the GATE A scope; media/coaching/cadence metadata intentionally omitted.
 */
export interface ExerciseCatalogEntry {
  /** Canonical slug (the resolution anchor for the system catalog). */
  slug: ExerciseSlug;
  /** Canonical display name (English today; never a durable identity). */
  name: string;
  /** Confidently-equivalent historical/variant names (case-insensitive). */
  aliases?: readonly string[];
  /** Canonical Persian display name. ABSENT/undefined until a source corpus
   * exists — GATE A found no Persian exercise-name corpus in the repo, so no
   * names are invented here. */
  faName?: string;
  /** Extra optional display metadata (informational). */
  originalName?: string;
}

/**
 * A normalized reference to an exercise usable by future Program/Workout
 * layers. It allows compatibility cases where only a name is known — no
 * canonical id is required for legacy/unresolved inputs (GA-08, name fallback).
 */
export type ExerciseReference =
  | { kind: 'id'; id: ExerciseId }
  | { kind: 'slug'; slug: ExerciseSlug }
  | {
      kind: 'name';
      name: string;
      /** Normalized form, when provided by the caller. */
      normalized?: string;
    };

/** Explicit resolution outcomes (GA-04) — never silently guessed. */
export type ResolverResultStatus = 'RESOLVED' | 'UNRESOLVED' | 'AMBIGUOUS';

/** The reason a resolution failed, when not RESOLVED. */
export type ResolutionFailureReason = 'NO_MATCH' | 'AMBIGUOUS';

/**
 * Strict resolver result. On RESOLVED the matched catalog entry is returned;
 * on AMBIGUOUS the candidate matches are exposed; on UNRESOLVED the original
 * input is preserved (never dropped). `LEGACY_FALLBACK` semantics are a
 * persistence-layer concern (GA-08 name fallback) and deliberately NOT modeled
 * here — this is the pure resolver model only.
 */
export interface ResolverResult {
  status: ResolverResultStatus;
  /** Matched entry on RESOLVED; undefined otherwise. */
  entry?: ExerciseCatalogEntry;
  /** Ambiguous candidate slugs on AMBIGUOUS (order is NOT significant). */
  ambiguous?: ExerciseSlug[];
  /** Why resolution failed (NO_MATCH or AMBIGUOUS). */
  failureReason?: ResolutionFailureReason;
  /** The normalized input form used for the lookup. */
  normalizedInput: NormalizedExerciseName;
}