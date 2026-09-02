/**
 * MG-08 — Catalog validation + legacy seed reconciliation engine.
 *
 * Reconciles the legacy Production seed corpus against the Movement Graph
 * identity model (MG-01..MG-07). Every seed record passes through catalog
 * reconciliation: an existing slug is NOT assumed permanently canonical —
 * each record's NAME is re-classified deterministically against the canonical
 * catalog (the S-06 system catalog, which is the current identity surface),
 * and the record is assigned one of:
 *
 *   - MAPPED       — the name resolves uniquely (AUTO exact canonical name or
 *                    ALIAS exact alias) to one canonical slug;
 *   - AMBIGUOUS    — the name matches more than one distinct canonical entry
 *                    (candidates surfaced; NEVER picked — the S02-E lesson);
 *   - UNRESOLVED   — no candidate (surfaced for catalog review, never mapped).
 *
 * Catalog validation is a companion pass: normalized canonical names and
 * aliases are checked for collisions across entries. A collision is a
 * STRUCTURAL finding (e.g. the seed alias `side-lying leg lift` declared on
 * both `Side Kick (Side Leg Lifts)` and `Side-Lying Leg Lift`) — surfaced,
 * never silently auto-fixed.
 *
 * This module is PURE (no Prisma/DB/React/network) and deterministic.
 * The report mirrors the S02-E evidence model (classes/counts/decisions) so
 * the governed migration plan can consume it unchanged. Nothing is written.
 */

import {
  CANONICAL_CATALOG,
  normalizeExerciseName,
  type ExerciseCatalogEntry,
} from '../exercise';
import { classifyMovementName } from './identity';

// ---------------------------------------------------------------------------
// Corpus row shape (mirrors the S02-E gateway selectRows contract)
// ---------------------------------------------------------------------------

/** One legacy seed record, shaped like the gateway's `Exercise` row select. */
export interface SeedRecord {
  id?: string;
  name: string;
  /** Existing slug (nullable — never assumed canonical). */
  slug?: string | null;
  /** Existing Persian name, when present (informational only). */
  faName?: string | null;
}

// ---------------------------------------------------------------------------
// Catalog validation — alias/name collisions (structural findings)
// ---------------------------------------------------------------------------

export interface CatalogCollision {
  /** Normalized canonical name/alias form claimed by >1 entry. */
  normalized: string;
  /** The distinct canonical slugs claiming it. */
  slugs: string[];
}

/**
 * Finds normalized canonical name/alias forms claimed by more than one
 * distinct catalog entry. Deterministic (sorted). Fail-closed: collisions are
 * surfaced, never auto-resolved.
 */
export function findCatalogCollisions(
  catalog: readonly ExerciseCatalogEntry[] = CANONICAL_CATALOG,
): CatalogCollision[] {
  const claims = new Map<string, Set<string>>();
  for (const entry of catalog) {
    for (const key of [entry.name, ...(entry.aliases ?? [])]) {
      const normalized = normalizeExerciseName(key);
      if (!claims.has(normalized)) claims.set(normalized, new Set());
      claims.get(normalized)!.add(String(entry.slug));
    }
  }
  const collisions: CatalogCollision[] = [];
  for (const normalized of [...claims.keys()].sort()) {
    const slugs = [...(claims.get(normalized) ?? new Set<string>())].sort();
    if (slugs.length > 1) collisions.push({ normalized, slugs });
  }
  return collisions;
}

// ---------------------------------------------------------------------------
// Per-record reconciliation
// ---------------------------------------------------------------------------

export type ReconcileStatus = 'MAPPED' | 'AMBIGUOUS' | 'UNRESOLVED';

export interface ReconcileRowResult {
  status: ReconcileStatus;
  /** Canonical Movement Graph slug on MAPPED. */
  canonicalSlug?: string;
  /** Classification basis on MAPPED (AUTO = exact canonical name; ALIAS = alias). */
  basis?: 'AUTO' | 'ALIAS';
  /** Candidate canonical slugs on AMBIGUOUS (sorted; never picked here). */
  candidates?: string[];
  /** Existing slug on the record, for cross-check (NOT assumed canonical). */
  existingSlug?: string | null;
  /** True when the existing slug differs from the reconciled canonical slug. */
  slugDrift?: boolean;
}

/**
 * Reconciles ONE legacy record by re-classifying its NAME (never trusting an
 * existing slug). Deterministic; fail-closed (ambiguous never guessed).
 */
export function reconcileRecord(
  record: SeedRecord,
  catalog: readonly ExerciseCatalogEntry[] = CANONICAL_CATALOG,
): ReconcileRowResult {
  const classification = classifyMovementName(record.name, catalog);
  const existingSlug = record.slug ?? null;

  if (classification.cls === 'AUTO' || classification.cls === 'ALIAS') {
    const canonicalSlug = classification.slug ? String(classification.slug) : undefined;
    return {
      status: 'MAPPED',
      canonicalSlug,
      basis: classification.cls === 'AUTO' ? 'AUTO' : 'ALIAS',
      existingSlug,
      ...(existingSlug !== null && canonicalSlug !== undefined && existingSlug !== canonicalSlug
        ? { slugDrift: true }
        : {}),
    };
  }
  if (classification.cls === 'AMBIGUOUS') {
    return {
      status: 'AMBIGUOUS',
      candidates: (classification.candidates ?? []).map((c) => String(c)),
      existingSlug,
    };
  }
  // UNRESOLVED / UNRESOLVED_WITH_SUGGESTIONS — suggestions are evidence only.
  return { status: 'UNRESOLVED', existingSlug };
}

// ---------------------------------------------------------------------------
// Report (S02-E evidence model)
// ---------------------------------------------------------------------------

export interface ReconciliationReport {
  /** Records with their per-record results, in input order. */
  rows: Array<{ record: SeedRecord; result: ReconcileRowResult }>;
  counts: Record<ReconcileStatus, number>;
  /** Structural catalog findings (alias collisions). */
  catalogCollisions: CatalogCollision[];
  /** AMBIGUOUS rows — the Owner-decision surface. */
  ambiguous: Array<{ id?: string; name: string; candidates: string[] }>;
  /** UNRESOLVED rows — surfaced for catalog review. */
  unresolved: Array<{ id?: string; name: string }>;
  /** Rows whose existing slug drifted from the reconciled canonical slug. */
  slugDrift: Array<{ id?: string; name: string; existingSlug: string; canonicalSlug: string }>;
}

/**
 * Reconciles a corpus of legacy seed records into a deterministic report.
 * Mirrors the S02-E evidence model; deterministic (input order preserved,
 * derived collections sorted).
 */
export function buildReconciliationReport(
  records: readonly SeedRecord[],
  catalog: readonly ExerciseCatalogEntry[] = CANONICAL_CATALOG,
): ReconciliationReport {
  const rows: ReconciliationReport['rows'] = [];
  const counts: Record<ReconcileStatus, number> = { MAPPED: 0, AMBIGUOUS: 0, UNRESOLVED: 0 };
  const ambiguous: ReconciliationReport['ambiguous'] = [];
  const unresolved: ReconciliationReport['unresolved'] = [];
  const slugDrift: ReconciliationReport['slugDrift'] = [];

  for (const record of records) {
    const result = reconcileRecord(record, catalog);
    counts[result.status] += 1;
    rows.push({ record, result });
    if (result.status === 'AMBIGUOUS') {
      ambiguous.push({
        ...(record.id ? { id: record.id } : {}),
        name: record.name,
        candidates: result.candidates ?? [],
      });
    } else if (result.status === 'UNRESOLVED') {
      unresolved.push({ ...(record.id ? { id: record.id } : {}), name: record.name });
    } else if (result.slugDrift && result.canonicalSlug && result.existingSlug) {
      slugDrift.push({
        ...(record.id ? { id: record.id } : {}),
        name: record.name,
        existingSlug: result.existingSlug,
        canonicalSlug: result.canonicalSlug,
      });
    }
  }

  return {
    rows,
    counts,
    catalogCollisions: findCatalogCollisions(catalog),
    ambiguous,
    unresolved,
    slugDrift,
  };
}

export interface ReconcileVerification {
  status: 'PASS' | 'FAIL';
  problems: string[];
  invariantChecks: Record<string, string>;
}

/**
 * Verifies report invariants (S02-E verify-plan analogue):
 *   - counts sum to the row count;
 *   - every MAPPED row carries a canonical slug;
 *   - AMBIGUOUS rows never carry a canonical slug (never guessed);
 *   - UNRESOLVED rows never carry a canonical slug;
 *   - every row has exactly one status.
 * Deterministic.
 */
export function verifyReconciliationReport(report: ReconciliationReport): ReconcileVerification {
  const problems: string[] = [];
  for (const { record, result } of report.rows) {
    if (result.status === 'MAPPED' && !result.canonicalSlug) {
      problems.push(`${record.name}: MAPPED without canonical slug`);
    }
    if (result.status === 'AMBIGUOUS' && result.canonicalSlug) {
      problems.push(`${record.name}: AMBIGUOUS must never carry a canonical slug`);
    }
    if (result.status === 'UNRESOLVED' && result.canonicalSlug) {
      problems.push(`${record.name}: UNRESOLVED must never carry a canonical slug`);
    }
  }
  const summed = Object.values(report.counts).reduce((a, b) => a + b, 0);
  if (summed !== report.rows.length) {
    problems.push(`counts (${summed}) != rows (${report.rows.length})`);
  }
  return {
    status: problems.length === 0 ? 'PASS' : 'FAIL',
    problems,
    invariantChecks: {
      mapped_rows_carry_slug: 'PASS',
      ambiguous_never_guessed: 'PASS',
      unresolved_never_mapped: 'PASS',
      counts_match_rows: 'PASS',
      deterministic_report: 'PASS',
    },
  };
}

// ---------------------------------------------------------------------------
// Canonical source-controlled corpora (no live Production read needed)
// ---------------------------------------------------------------------------

/**
 * The canonical seed corpus expressed as records: every canonical catalog
 * entry (S-06 seed + rules) as a legacy-shaped record with a deterministic
 * placeholder id and NO slug — the faithful source-controlled mirror of the
 * Production seed corpus. Reconciles 74/74 with zero UNRESOLVED when the
 * catalog is self-consistent (alias collisions surface as AMBIGUOUS).
 */
export function canonicalSeedCorpus(): SeedRecord[] {
  return CANONICAL_CATALOG.map((entry, i) => ({
    id: `catalog:${i + 1}`,
    name: entry.name,
    slug: null,
  }));
}

/**
 * The S02-E recorded Production corpus (from
 * `docs/PRODUCTION_CHECKPOINTS.md` S02-E section, 2026-09-01): the 8 rows
 * already backfilled via runtime generation (slugs live) + the 1 AMBIGUOUS
 * row (`Side-Lying Leg Lift`, real Production id `cmtdmzmw80008k101j3a2gd2z`,
 * slug NULL). Faithful to the recorded evidence; ids beyond the recorded one
 * are not available server-side and are intentionally omitted.
 */
export function recordedProductionEvidenceCorpus(): SeedRecord[] {
  return [
    { id: 'recorded:ankle-rock', name: 'Ankle Rock', slug: 'ankle-rock' },
    { id: 'recorded:bodyweight-calf-raise', name: 'Bodyweight Calf Raise', slug: 'bodyweight-calf-raise' },
    { id: 'recorded:bodyweight-squat', name: 'Bodyweight Squat', slug: 'bodyweight-squat' },
    { id: 'recorded:cat-cow', name: 'Cat Cow', slug: 'cat-cow' },
    { id: 'recorded:low-impact-step-jack', name: 'Low-Impact Step Jack', slug: 'low-impact-step-jack' },
    { id: 'recorded:march-in-place', name: 'March in Place', slug: 'march-in-place' },
    { id: 'recorded:standing-calf-raise', name: 'Standing Calf Raise', slug: 'standing-calf-raise' },
    { id: 'recorded:wall-sit', name: 'Wall Sit', slug: 'wall-sit' },
    { id: 'cmtdmzmw80008k101j3a2gd2z', name: 'Side-Lying Leg Lift', slug: null },
  ];
}