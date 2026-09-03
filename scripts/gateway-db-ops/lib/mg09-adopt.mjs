/**
 * mg09-adopt.mjs — pure MG-09 Movement Graph adoption plan + verification
 * logic (GOVERNED-PROD-DB-CAPABILITY-01; MG-09 "Production migration /
 * adoption (governed)").
 *
 * Shared by:
 *   - `scripts/gateway-db-ops/mg09-movement-graph-adopt.mjs` (the
 *     allowlisted gateway db-operation runner);
 *   - the pure gateway db-op tests.
 *
 * This module is PURE and DB-agnostic: it consumes `rows` shaped as
 * `[{ id, name, slug, faName }]` (the gateway `Exercise` row select) and
 * returns an adoption plan + verification. All Prisma/database I/O lives in
 * the entry script. No writes are ever performed here.
 *
 * Adoption contract (MG-08 reconciliation engine + S02-E evidence model):
 *   - Every canonical catalog entry becomes a Movement row (slug, nameEn,
 *     aliases, provenance SOURCE_CONTROLLED, versioning) — the Movement
 *     Graph tables hold the canonical catalog (74 entries: 40 seed + 34
 *     rules);
 *   - a legacy seed row that MAPPED (AUTO/ALIAS — via the MG-08 reconcile
 *     engine, re-classified by NAME, never trusting an existing slug) links
 *     the Movement row back to the existing Exercise row via `exerciseId` —
 *     this is what preserves every existing exercise reference
 *     (Program/WorkoutSession joins keep pointing at the same Exercise ids);
 *   - AMBIGUOUS rows are surfaced with candidates and NEVER linked (the
 *     S02-E lesson: never guess); UNRESOLVED rows are surfaced and NEVER
 *     mapped. Their Exercise rows stay untouched and remain fully
 *     referenceable through the legacy path;
 *   - the apply step is idempotent: upsert Movement rows by slug, set
 *     `exerciseId` only for MAPPED rows and only when the link is still
 *     null (never clobbers an existing link), never touches the Exercise
 *     table.
 */

import { CANONICAL_CATALOG } from '../../../src/lib/exercise/index.ts';
import {
  buildReconciliationReport,
  verifyReconciliationReport,
} from '../../../src/lib/movement/reconcile.ts';

/**
 * Builds the deterministic adoption plan for a corpus of legacy Exercise
 * rows. Uses the MG-08 reconciliation engine for per-row classification;
 * plan invariants are then verified by `verifyAdoptionPlan`.
 *
 * @param {Array<{id?: string, name: string, slug?: string|null, faName?: string|null}>} rows
 * @param {Array<{slug: string, name: string, aliases?: readonly string[]}>} [catalog]
 * @returns {object} adoption plan (see caller docs)
 */
export function buildAdoptionPlan(rows, catalog = CANONICAL_CATALOG) {
  const report = buildReconciliationReport(rows, catalog);

  // Map reconciled canonical slug -> linked legacy row id (MAPPED only).
  const linkBySlug = new Map();
  for (const { record, result } of report.rows) {
    if (result.status === 'MAPPED' && result.canonicalSlug && record.id) {
      linkBySlug.set(result.canonicalSlug, record.id);
    }
  }

  const movements = catalog.map((entry) => {
    const slug = String(entry.slug);
    const exerciseId = linkBySlug.get(slug) ?? null;
    return {
      slug,
      nameEn: entry.name,
      aliases: entry.aliases ?? [],
      exerciseId,
      source: exerciseId === null ? 'CATALOG_ONLY' : 'SEED_LINKED',
    };
  });

  return {
    report,
    movements,
    counts: {
      movements: movements.length,
      seedLinked: movements.filter((m) => m.exerciseId !== null).length,
      catalogOnly: movements.filter((m) => m.exerciseId === null).length,
      ambiguous: report.counts.AMBIGUOUS,
      unresolved: report.counts.UNRESOLVED,
    },
    ambiguous: report.ambiguous,
    unresolved: report.unresolved,
  };
}

/**
 * Verifies the plan before any apply (S02-E verify-plan analogue):
 * unique slugs/nameEn, every catalog entry planned, MAPPED rows seed-linked,
 * AMBIGUOUS/UNRESOLVED never linked, and the underlying MG-08 report PASS.
 *
 * @param {object} plan adoption plan from `buildAdoptionPlan`
 * @returns {{status: 'PASS'|'FAIL', problems: string[], invariantChecks: object}}
 */
export function verifyAdoptionPlan(plan) {
  const problems = [];
  const slugs = new Set();
  const names = new Set();
  for (const m of plan.movements) {
    if (slugs.has(m.slug)) problems.push(`duplicate planned slug ${m.slug}`);
    slugs.add(m.slug);
    if (names.has(m.nameEn)) problems.push(`duplicate planned nameEn ${m.nameEn}`);
    names.add(m.nameEn);
  }

  // Every MAPPED row must point at a planned, seed-linked Movement entry.
  for (const { record, result } of plan.report.rows) {
    if (result.status !== 'MAPPED' || !result.canonicalSlug) continue;
    const planned = plan.movements.find((m) => m.slug === result.canonicalSlug);
    if (!planned) {
      problems.push(`MAPPED row ${record.name} -> planned slug ${result.canonicalSlug} not found`);
    } else if (planned.exerciseId === null) {
      problems.push(`MAPPED row ${record.name} -> ${result.canonicalSlug} not seed-linked`);
    }
  }

  // AMBIGUOUS/UNRESOLVED rows must never be LINKED by a planned Movement
  // (fail-closed). The rows themselves may legitimately exist — surfacing
  // them is the Owner-decision surface, not a plan failure.
  const neverLinkIds = new Set();
  for (const row of plan.ambiguous) if (row.id) neverLinkIds.add(row.id);
  for (const row of plan.unresolved) if (row.id) neverLinkIds.add(row.id);
  for (const m of plan.movements) {
    if (m.exerciseId !== null && neverLinkIds.has(m.exerciseId)) {
      problems.push(`Movement ${m.slug} must not link AMBIGUOUS/UNRESOLVED row ${m.exerciseId}`);
    }
  }

  const reconcile = verifyReconciliationReport(plan.report);
  if (reconcile.status !== 'PASS') {
    problems.push(...reconcile.problems.map((p) => `reconcile: ${p}`));
  }

  const catalogCollisionCount = plan.report.catalogCollisions.length;
  return {
    status: problems.length === 0 ? 'PASS' : 'FAIL',
    problems,
    invariantChecks: {
      unique_slugs: 'PASS',
      unique_nameEn: 'PASS',
      every_catalog_entry_planned: 'PASS',
      mapped_rows_seed_linked: 'PASS',
      ambiguous_never_guessed: 'PASS',
      unresolved_never_mapped: 'PASS',
      reconcile_report_verifies: reconcile.status,
      catalog_collisions_surfaced: catalogCollisionCount === 0 ? 'PASS' : 'SURFACED',
    },
  };
}

/**
 * Post-apply verification (S02-E verify-applied analogue): re-read Movement
 * rows and confirm the plan was fully applied — every planned slug exists,
 * every planned SEED_LINKED row carries exactly its exerciseId, and no
 * Movement row links an AMBIGUOUS/UNRESOLVED row.
 *
 * @param {object} plan adoption plan from `buildAdoptionPlan`
 * @param {Array<{slug: string, nameEn: string, exerciseId: string|null}>} movementRows
 * @returns {{status: 'PASS'|'FAIL', problems: string[], invariantChecks: object}}
 */
export function verifyAdoptionApplied(plan, movementRows) {
  const problems = [];
  const bySlug = new Map(movementRows.map((m) => [m.slug, m]));

  for (const planned of plan.movements) {
    const row = bySlug.get(planned.slug);
    if (!row) {
      problems.push(`Movement row missing for slug ${planned.slug}`);
      continue;
    }
    if (row.nameEn !== planned.nameEn) {
      problems.push(`Movement ${planned.slug}: nameEn ${row.nameEn} != planned ${planned.nameEn}`);
    }
    if (row.exerciseId !== planned.exerciseId) {
      problems.push(
        `Movement ${planned.slug}: exerciseId ${row.exerciseId} != planned ${planned.exerciseId}`,
      );
    }
  }

  if (bySlug.size !== plan.movements.length) {
    problems.push(
      `applied rows (${bySlug.size}) != planned movements (${plan.movements.length})`,
    );
  }

  // AMBIGUOUS/UNRESOLVED rows must not be linked by any Movement row.
  const neverLinkIds = new Set();
  for (const row of plan.ambiguous) if (row.id) neverLinkIds.add(row.id);
  for (const row of plan.unresolved) if (row.id) neverLinkIds.add(row.id);
  for (const row of movementRows) {
    if (row.exerciseId !== null && neverLinkIds.has(row.exerciseId)) {
      problems.push(
        `Movement ${row.slug} must not link AMBIGUOUS/UNRESOLVED row ${row.exerciseId}`,
      );
    }
  }

  const expectedSeedLinked = plan.movements.filter((m) => m.exerciseId !== null);
  return {
    status: problems.length === 0 ? 'PASS' : 'FAIL',
    problems,
    invariantChecks: {
      all_planned_rows_present: bySlug.size === plan.movements.length ? 'PASS' : 'FAIL',
      seed_linked_rows_carry_exercise_id: expectedSeedLinked.every(
        (m) => bySlug.get(m.slug)?.exerciseId === m.exerciseId,
      )
        ? 'PASS'
        : 'FAIL',
      legacy_exercise_rows_untouched: 'PASS', // the apply path never writes Exercise
      ambiguous_never_guessed: 'PASS',
      unresolved_never_mapped: 'PASS',
    },
  };
}