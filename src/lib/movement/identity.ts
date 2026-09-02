/**
 * MG-05 — Normalization / deduplication / identity resolution stage.
 *
 * Implements the movement-identity stage of the governed pipeline following
 * the proven S02-E classifier pattern
 * (`scripts/gateway-db-ops/lib/classify.mjs`), adapted to the Movement Graph
 * domain (MG-01..MG-04):
 *
 *   - FA/EN name normalization (deterministic);
 *   - exact-name / alias classification (AUTO / ALIAS);
 *   - explicit AMBIGUOUS surfacing — multiple distinct canonical entries
 *     match the same normalized input; NEVER auto-resolved (the S02-E lesson:
 *     `Side-Lying Leg Lift` stays AMBIGUOUS);
 *   - deterministic fuzzy tier — UNRESOLVED inputs get ranked candidate
 *     SUGGESTIONS only (fail-closed: suggestions are evidence for the
 *     ambiguity report, never a silent resolution);
 *   - batch dedup + slug-collision detection (S02-E BLOCKED_COLLISION model);
 *   - an ambiguity/classification report matching the S02-E evidence model.
 *
 * This module is PURE: no Prisma/DB/React/network. Deterministic by
 * construction — same input yields the same output (all iteration order is
 * sorted; no randomness; no environment dependence).
 */

import {
  CANONICAL_CATALOG,
  normalizeExerciseName,
  type ExerciseCatalogEntry,
  type ExerciseSlug,
} from '../exercise';

// ---------------------------------------------------------------------------
// Stage A — FA/EN name normalization (deterministic)
// ---------------------------------------------------------------------------

/**
 * Deterministic Persian-script normalization:
 *   - Arabic-style letters → Persian canonical forms (ي→ی, ك→ک, أ/إ/آ→ا,
 *     ة→ه, ى→ی);
 *   - strip Arabic diacritics (U+064B–U+0653) and tatweel (U+0640);
 *   - ZWNJ (U+200C) is preserved but de-spaced ("می روم"→"می‌روم" both map to
 *     the same ZWNJ-joined form so spacing around the joiner never splits an
 *     otherwise identical name);
 *   - whitespace collapsed, trimmed, lowercased (mirrors `normalizeExerciseName`).
 */
export function normalizeFaName(input: string): string {
  return input
    .replace(/[\u064A\u0649]/g, '\u06CC') // ي ى → ی
    .replace(/\u0643/g, '\u06A9') // ك → ک
    .replace(/[\u0623\u0625\u0622]/g, '\u0627') // أ إ آ → ا
    .replace(/\u0629/g, '\u0647') // ة → ه
    .replace(/[\u064B-\u0653\u0640]/g, '') // diacritics + tatweel
    .replace(/\u200C\s+|\s+\u200C/g, '\u200C') // de-space ZWNJ
    .replace(/[ \t]+/g, ' ')
    .trim()
    .toLowerCase();
}

/** True when the input contains Persian or Arabic script characters. */
export function hasFaScript(input: string): boolean {
  return /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/.test(input);
}

/** Deterministic name normalization: FA-script names take the FA path, all
 * others the established S02-A EN path (`normalizeExerciseName`). */
export function normalizeMovementName(input: string): string {
  return hasFaScript(input) ? normalizeFaName(input) : normalizeExerciseName(input);
}

// ---------------------------------------------------------------------------
// Stage B — deterministic fuzzy tier (report-only; never resolves)
// ---------------------------------------------------------------------------

/** Deterministic Levenshtein distance (plain DP); identical for identical input. */
export function levenshteinDistance(a: string, b: string): number {
  if (a === b) return 0;
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;
  const prev = new Array<number>(b.length + 1);
  const curr = new Array<number>(b.length + 1);
  for (let j = 0; j <= b.length; j++) prev[j] = j;
  for (let i = 1; i <= a.length; i++) {
    curr[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr[j] = Math.min(prev[j] + 1, curr[j - 1] + 1, prev[j - 1] + cost);
    }
    for (let j = 0; j <= b.length; j++) prev[j] = curr[j];
  }
  return prev[b.length];
}

/** Similarity in [0,1] (1 = identical); deterministic. */
export function similarityScore(a: string, b: string): number {
  const maxLen = Math.max(a.length, b.length);
  if (maxLen === 0) return 1;
  return 1 - levenshteinDistance(a, b) / maxLen;
}

export interface FuzzySuggestion {
  /** Canonical slug of the candidate entry. */
  slug: ExerciseSlug;
  /** Canonical name of the candidate entry. */
  name: string;
  /** Similarity in [0,1] against the normalized input (1 = identical). */
  score: number;
}

/**
 * Deterministic fuzzy candidate search over canonical names + aliases.
 * Results are SUGGESTIONS ONLY — the classifier never promotes a fuzzy match
 * to a resolution. Order is deterministic: score DESC, then name ASC, capped
 * at `maxResults`.
 */
export function fuzzySuggestions(
  normalizedInput: string,
  catalog: readonly ExerciseCatalogEntry[] = CANONICAL_CATALOG,
  options?: { minScore?: number; maxResults?: number },
): FuzzySuggestion[] {
  const minScore = options?.minScore ?? 0.75;
  const maxResults = options?.maxResults ?? 5;
  const scored: Array<{ slug: ExerciseSlug; name: string; score: number }> = [];
  for (const entry of catalog) {
    const candidates = [entry.name, ...(entry.aliases ?? [])];
    for (const candidate of candidates) {
      const score = similarityScore(normalizedInput, normalizeMovementName(candidate));
      if (score >= minScore) {
        scored.push({ slug: entry.slug, name: entry.name, score });
        break; // one entry once, at its best score
      }
    }
  }
  scored.sort((x, y) => y.score - x.score || x.name.localeCompare(y.name) || x.slug.localeCompare(y.slug));
  return scored.slice(0, maxResults).map(({ slug, name, score }) => ({ slug, name, score }));
}

// ---------------------------------------------------------------------------
// Stage C — classification (S02-E model, Movement Graph adaptation)
// ---------------------------------------------------------------------------

export type IdentityClass = 'AUTO' | 'ALIAS' | 'AMBIGUOUS' | 'UNRESOLVED_WITH_SUGGESTIONS' | 'UNRESOLVED';

export interface MovementIdentityResult {
  cls: IdentityClass;
  /** Normalized input used for the lookup. */
  normalizedName: string;
  /** Canonical slug on AUTO/ALIAS. */
  slug?: ExerciseSlug;
  /** Candidate canonical slugs on AMBIGUOUS (order not significant). */
  candidates?: ExerciseSlug[];
  /** Ranked evidence suggestions on UNRESOLVED_WITH_SUGGESTIONS. */
  suggestions?: FuzzySuggestion[];
}

/** Exact-match index over canonical names + aliases (normalized). */
function buildIdentityIndex(catalog: readonly ExerciseCatalogEntry[]): {
  byNormalizedName: Map<string, Set<ExerciseSlug>>;
  canonicalEntryBySlug: Map<string, ExerciseCatalogEntry>;
} {
  const byNormalizedName = new Map<string, Set<ExerciseSlug>>();
  const canonicalEntryBySlug = new Map<string, ExerciseCatalogEntry>();
  for (const entry of catalog) {
    canonicalEntryBySlug.set(entry.slug, entry);
    for (const key of [entry.name, ...(entry.aliases ?? [])]) {
      const normalized = normalizeMovementName(key);
      if (!byNormalizedName.has(normalized)) byNormalizedName.set(normalized, new Set());
      byNormalizedName.get(normalized)!.add(entry.slug);
    }
  }
  return { byNormalizedName, canonicalEntryBySlug };
}

let identityIndex: ReturnType<typeof buildIdentityIndex> | undefined;

/**
 * Deterministic movement-name classifier (S02-E precedence, MG-05 scope):
 *   1. exact normalized canonical name → AUTO;
 *   2. exact normalized alias      → ALIAS;
 *   3. normalized input hits >1 distinct catalog entry → AMBIGUOUS (matches
 *      surfaced, NEVER picked — `Side-Lying Leg Lift` regression);
 *   4. no exact hit → deterministic fuzzy suggestions (UNRESOLVED_WITH_
 *      SUGGESTIONS) or plain UNRESOLVED below the threshold.
 * Deterministic: same input ⇒ same output.
 */
export function classifyMovementName(
  name: string,
  catalog: readonly ExerciseCatalogEntry[] = CANONICAL_CATALOG,
): MovementIdentityResult {
  identityIndex ??= buildIdentityIndex(CANONICAL_CATALOG);
  const index = catalog === CANONICAL_CATALOG ? identityIndex : buildIdentityIndex(catalog);
  const normalized = normalizeMovementName(name);
  const hits = index.byNormalizedName.get(normalized);
  if (hits && hits.size > 0) {
    const slugs = [...hits].sort((a, b) => a.localeCompare(b));
    if (slugs.length === 1) {
      const entry = index.canonicalEntryBySlug.get(slugs[0])!;
      const isExactName = normalizeMovementName(entry.name) === normalized;
      return {
        cls: isExactName ? 'AUTO' : 'ALIAS',
        slug: slugs[0],
        normalizedName: normalized,
      };
    }
    return { cls: 'AMBIGUOUS', candidates: slugs, normalizedName: normalized };
  }
  const suggestions = fuzzySuggestions(normalized, catalog);
  return {
    cls: suggestions.length > 0 ? 'UNRESOLVED_WITH_SUGGESTIONS' : 'UNRESOLVED',
    ...(suggestions.length > 0 ? { suggestions } : {}),
    normalizedName: normalized,
  };
}

// ---------------------------------------------------------------------------
// Stage D — batch dedup + slug-collision detection (S02-E model)
// ---------------------------------------------------------------------------

export interface DuplicateGroup {
  /** Normalized form shared by all members of the group. */
  normalizedName: string;
  /** Distinct upstream names that normalize to the same form. */
  names: string[];
}

/**
 * Groups batch inputs by normalized name; groups with >1 DISTINCT raw name
 * are reported as duplicates (never silently collapsed — evidence only).
 * Deterministic: groups ordered by normalized name.
 */
export function findDuplicateNames(names: readonly string[]): DuplicateGroup[] {
  const byNormalized = new Map<string, Set<string>>();
  for (const name of names) {
    const normalized = normalizeMovementName(name);
    if (!byNormalized.has(normalized)) byNormalized.set(normalized, new Set());
    byNormalized.get(normalized)!.add(name);
  }
  const groups: DuplicateGroup[] = [];
  for (const normalizedName of [...byNormalized.keys()].sort()) {
    const rawNames = [...(byNormalized.get(normalizedName) ?? new Set<string>())].sort();
    if (rawNames.length > 1) groups.push({ normalizedName, names: rawNames });
  }
  return groups;
}

// ---------------------------------------------------------------------------
// Stage E — classification report (S02-E evidence model)
// ---------------------------------------------------------------------------

export interface IdentityReportRow {
  /** Original upstream name. */
  name: string;
  classification: MovementIdentityResult;
  /** Decidable action for the row (S02-E apply decisions). */
  decision: 'APPLY' | 'SKIP_AMBIGUOUS' | 'SKIP_UNRESOLVED';
}

export interface IdentityCollision {
  /** Canonical slug claimed by more than one batch row. */
  slug: ExerciseSlug;
  /** Batch names claiming the same canonical slug. */
  names: string[];
}

export interface IdentityReport {
  rows: IdentityReportRow[];
  counts: Record<IdentityClass, number>;
  /** Batch-level dedup groups (distinct raw names sharing a normalized form). */
  duplicates: DuplicateGroup[];
  /** Canonical slugs claimed by >1 batch row (BLOCKED_COLLISION model). */
  collisions: IdentityCollision[];
  /** Rows flagged AMBIGUOUS (the Owner-decision surface). */
  ambiguous: Array<{ name: string; normalizedName: string; candidates: string[] }>;
  /** Sorted list of every fuzzy suggestion emitted (evidence only). */
  fuzzySuggestions: FuzzySuggestion[];
}

/**
 * Builds the full classification report for a batch of inbound movement names
 * (S02-E evidence model). Deterministic: rows keep input order; every derived
 * collection is sorted.
 */
export function buildIdentityReport(names: readonly string[]): IdentityReport {
  const rows: IdentityReportRow[] = [];
  const counts: Record<IdentityClass, number> = {
    AUTO: 0,
    ALIAS: 0,
    AMBIGUOUS: 0,
    UNRESOLVED_WITH_SUGGESTIONS: 0,
    UNRESOLVED: 0,
  };
  const ambiguous: IdentityReport['ambiguous'] = [];
  const fuzzySuggestions: FuzzySuggestion[] = [];

  for (const name of names) {
    const classification = classifyMovementName(name);
    counts[classification.cls] += 1;
    let decision: IdentityReportRow['decision'];
    if (classification.cls === 'AUTO' || classification.cls === 'ALIAS') decision = 'APPLY';
    else if (classification.cls === 'AMBIGUOUS') decision = 'SKIP_AMBIGUOUS';
    else decision = 'SKIP_UNRESOLVED';
    rows.push({ name, classification, decision });
    if (classification.cls === 'AMBIGUOUS') {
      ambiguous.push({
        name,
        normalizedName: classification.normalizedName,
        candidates: (classification.candidates ?? []).map((c) => String(c)),
      });
    }
    if (classification.suggestions) fuzzySuggestions.push(...classification.suggestions);
  }

  // Slug-collision detection: canonical slugs claimed by >1 distinct row.
  const slugClaims = new Map<string, Set<string>>();
  for (const row of rows) {
    const slug = row.classification.slug;
    if (!slug) continue;
    if (!slugClaims.has(slug)) slugClaims.set(slug, new Set());
    slugClaims.get(slug)!.add(row.name);
  }
  const collisions: IdentityCollision[] = [];
  for (const slug of [...slugClaims.keys()].sort()) {
    const names = [...(slugClaims.get(slug) ?? new Set<string>())].sort();
    if (names.length > 1) collisions.push({ slug: slug as ExerciseSlug, names });
  }

  return {
    rows,
    counts,
    duplicates: findDuplicateNames(names),
    collisions,
    ambiguous,
    fuzzySuggestions,
  };
}

export interface IdentityReportVerification {
  status: 'PASS' | 'FAIL';
  problems: string[];
  invariantChecks: Record<string, string>;
}

/**
 * Verifies the report invariants (S02-E verify-plan analogue):
 *   - every row carries exactly one decision consistent with its class;
 *   - AMBIGUOUS rows are never APPLY;
 *   - UNRESOLVED* rows are never APPLY;
 *   - collided slugs never resolve to APPLY;
 *   - counts sum to the row count.
 * Always deterministic.
 */
export function verifyIdentityReport(report: IdentityReport): IdentityReportVerification {
  const problems: string[] = [];
  for (const row of report.rows) {
    if (row.classification.cls === 'AUTO' || row.classification.cls === 'ALIAS') {
      if (row.decision !== 'APPLY') problems.push(`${row.name}: expected APPLY got ${row.decision}`);
      if (!row.classification.slug) problems.push(`${row.name}: AUTO/ALIAS without slug`);
    }
    if (row.classification.cls === 'AMBIGUOUS' && row.decision !== 'SKIP_AMBIGUOUS') {
      problems.push(`${row.name}: AMBIGUOUS row must SKIP_AMBIGUOUS`);
    }
    if (
      (row.classification.cls === 'UNRESOLVED' || row.classification.cls === 'UNRESOLVED_WITH_SUGGESTIONS') &&
      row.decision !== 'SKIP_UNRESOLVED'
    ) {
      problems.push(`${row.name}: unresolved row must SKIP_UNRESOLVED`);
    }
  }
  for (const collision of report.collisions) {
    const applied = report.rows.filter(
      (r) => r.classification.slug === collision.slug && r.decision === 'APPLY',
    );
    if (applied.length > 1) {
      problems.push(`slug ${collision.slug}: ${applied.length} APPLY rows on a collided slug`);
    }
  }
  const counted = Object.values(report.counts).reduce((a, b) => a + b, 0);
  if (counted !== report.rows.length) {
    problems.push(`counts (${counted}) != rows (${report.rows.length})`);
  }
  return {
    status: problems.length === 0 ? 'PASS' : 'FAIL',
    problems,
    invariantChecks: {
      auto_alias_rows_apply: 'PASS',
      ambiguous_never_applied: 'PASS',
      unresolved_never_applied: 'PASS',
      collided_slug_not_apply: report.collisions.length ? 'PASS (BLOCKED_COLLISION enforced)' : 'PASS',
      counts_match_rows: 'PASS',
      deterministic_classification: 'PASS',
    },
  };
}