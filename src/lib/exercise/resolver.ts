/**
 * Pure, strict exercise resolver (S02-A).
 *
 * Deterministic resolution of an exercise reference against a supplied
 * catalog, with the approved precedence (GA-04):
 *
 *   1. exact canonical ExerciseId — only when an id→entry index is supplied
 *   2. exact slug
 *   3. exact normalized canonical name
 *   4. known alias (case-insensitive)
 *   5. UNRESOLVED — no silent guessing
 *
 * Multiple matches at any step → AMBIGUOUS (matches exposed, never
 * auto-chosen). No fuzzy matching / Levenshtein / ordering bias — catalog
 * array order never determines identity.
 *
 * This module is PURE: no Prisma, React, services, network, or browser
 * storage. It consumes the catalog passed in and never mutates it.
 */

import type {
  ExerciseCatalogEntry,
  ExerciseId,
  ExerciseReference,
  NormalizedExerciseName,
  ResolverResult,
} from './contracts';

// --- normalization ---------------------------------------------------------

/**
 * Deterministic normalization for name/alias lookups:
 *   - trim;
 *   - lowercase;
 *   - collapse internal whitespace runs to a single space;
 *   - normalize mixed punctuation to a canonical separator form (replace runs
 *     of apostrophes/quotes with a plain apostrophe and normalize any
 *     hyphen/underscore/space around a separator to a single space, except
 *     that a hyphen separator is preserved as a literal hyphen so that
 *     "Push-Up" vs "Push Up" do NOT silently conflate).
 *
 * The goal is deterministic, explainable normalization — explicitly NOT
 * fuzzy matching. It is unit-tested.
 */
export function normalizeExerciseName(input: string): NormalizedExerciseName {
  return input
    .trim()
    .toLowerCase()
    .replace(/[\u2018\u2019'’]/g, "'")
    .replace(/[–—]/g, '-')
    .replace(/[ \t]+/g, ' ')
    // collapse whitespace-only separator to a single space, but preserve a
    // literal hyphen that is the canonical punctuation of a slug/name.
    .replace(/ +- +/g, ' - ')
    .trim();
}

/** Compares two normalized names for equality. */
function normEq(a: NormalizedExerciseName, b: NormalizedExerciseName): boolean {
  return a === b;
}

// --- lookup indexes ----------------------------------------------------------

/**
 * Builds lookup indexes from a catalog:
 *   - `byNormalizedName` — canonical names + aliases keyed by normalized form;
 *   - `bySlug` — entry keyed by slug (exact slug lookup, GA-04 step 2).
 *
 * Maps make existence checks O(1) and order-independent. Aliases never
 * overwrite an earlier canonical name silently on the same normalized key; a
 * colliding duplicate alias is surfaced by the ambiguity path / preconditions.
 */
export interface CatalogLookupIndex {
  byNormalizedName: Map<string, ExerciseCatalogEntry>;
  bySlug: Map<string, ExerciseCatalogEntry>;
}

export function indexCatalogEntries(
  catalog: readonly ExerciseCatalogEntry[],
): CatalogLookupIndex {
  const byNormalizedName = new Map<string, ExerciseCatalogEntry>();
  const bySlug = new Map<string, ExerciseCatalogEntry>();
  for (const entry of catalog) {
    bySlug.set(entry.slug, entry);
    if (!byNormalizedName.has(normalizeExerciseName(entry.name))) {
      byNormalizedName.set(normalizeExerciseName(entry.name), entry);
    }
    for (const alias of entry.aliases ?? []) {
      const n = normalizeExerciseName(alias);
      if (!byNormalizedName.has(n)) {
        byNormalizedName.set(n, entry);
      }
    }
  }
  return { byNormalizedName, bySlug };
}

/**
 * Resolves an exercise reference against `index`. Returns the strict result.
 *
 * `idIndex` is an optional id→entry map. S02-A has no DB access, so an id
 * lookup only succeeds when the caller explicitly supplies an index (e.g. a
 * hydrated source-controlled `ExerciseId`→entry map). The resolver never
 * invents canonical ids.
 */
export function resolveExercise(
  ref: ExerciseReference,
  index: CatalogLookupIndex,
  idIndex?: ReadonlyMap<ExerciseId, ExerciseCatalogEntry>,
): ResolverResult {
  // 1) exact id — only via an explicitly supplied index.
  if (ref.kind === 'id') {
    if (idIndex) {
      const entry = idIndex.get(ref.id);
      if (entry) {
        return { status: 'RESOLVED', entry, normalizedInput: normalizeExerciseName(entry.name) };
      }
    }
    return {
      status: 'UNRESOLVED',
      failureReason: 'NO_MATCH',
      normalizedInput: ref.id,
    };
  }

  if (ref.kind === 'slug') {
    const matched = index.bySlug.get(ref.slug);
    if (!matched) {
      return { status: 'UNRESOLVED', failureReason: 'NO_MATCH', normalizedInput: ref.slug };
    }
    // Slugs are unique within a catalog, so an exact slug hit is a single
    // RESOLVED entry.
    return { status: 'RESOLVED', entry: matched, normalizedInput: ref.slug };
  }

  // kind === 'name'
  const normalized = normalizeExerciseName(ref.name);
  const directName = index.byNormalizedName.get(normalized);

  // 3) exact normalized canonical name or 4) alias — both resolved via the
  // name/alias index; ambiguity on names+aliases collapses to one entry.
  if (directName) {
    return { status: 'RESOLVED', entry: directName, normalizedInput: normalized };
  }

  return { status: 'UNRESOLVED', failureReason: 'NO_MATCH', normalizedInput: normalized };
}

/**
 * Returns every catalog entry whose normalized canonical name OR alias
 * matches `ref` (used to detect AMBIGUOUS across distinct entries that could
 * share an alias). This is the explicit ambiguity-check path; `resolveExercise`
 * returns a single RESOLVED entry on the first normalized hit, so callers that
 * need full ambiguity detection should use `resolveWithAmbiguity`.
 */
export function collectAmbiguousMatches(
  ref: ExerciseReference,
  catalog: readonly ExerciseCatalogEntry[],
): ExerciseCatalogEntry[] {
  if (ref.kind === 'id' || ref.kind === 'slug') return [];
  const normalized = normalizeExerciseName(ref.name);
  const matches: ExerciseCatalogEntry[] = [];
  for (const entry of catalog) {
    if (normalizeExerciseName(entry.name) === normalized) {
      matches.push(entry);
      continue;
    }
    for (const alias of entry.aliases ?? []) {
      if (normalizeExerciseName(alias) === normalized) {
        matches.push(entry);
        break;
      }
    }
  }
  return matches;
}

/**
 * Strict resolver wrapper that surfaces AMBIGUOUS explicitly:
 *   - runs the precedence; on a name/alias hit that resolves to exactly one
 *     entry → RESOLVED;
 *   - if more than one distinct catalog entry matches the same normalized
 *     name/alias → AMBIGUOUS (candidates exposed);
 *   - else UNRESOLVED.
 *
 * This is the canonical public resolver for the S02-A domain.
 */
export function resolveWithAmbiguity(
  ref: ExerciseReference,
  catalog: readonly ExerciseCatalogEntry[],
  idIndex?: ReadonlyMap<ExerciseId, ExerciseCatalogEntry>,
): ResolverResult {
  const index = indexCatalogEntries(catalog);
  const base = resolveExercise(ref, index, idIndex);

  if (base.status === 'RESOLVED') {
    // Confirm the hit is unambiguous: if two different entries resolve the
    // same normalized input, return AMBIGUOUS instead.
    if (ref.kind === 'name') {
      const multiple = collectAmbiguousMatches(ref, catalog);
      if (multiple.length > 1) {
        return {
          status: 'AMBIGUOUS',
          ambiguous: multiple.map((e) => e.slug),
          failureReason: 'AMBIGUOUS',
          normalizedInput: base.normalizedInput,
        };
      }
    }
    return base;
  }

  if (base.status === 'UNRESOLVED') {
    // Only reachable for kind 'name' here (id/slug handled above). Return the
    // original normalized input preserved in the result.
    return base;
  }

  return base;
}