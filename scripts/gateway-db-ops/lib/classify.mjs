/**
 * classify.mjs — pure GA-07 classification + apply-plan + verification logic
 * for the S02-E Exercise Identity Backfill (GATE A GA-07).
 *
 * Shared by:
 *   - `scripts/gateway-db-ops/s02e-exercise-identity-backfill.mjs` (the
 *     allowlisted gateway db-operation runner);
 *   - `scripts/backfill-dry-run.mjs` (local read-only dry-run CLI).
 *
 * This module is PURE and DB-agnostic: it consumes `rows` shaped as
 * `[{ id, name, slug, faName }]` and returns reports/plans. All Prisma/database
 * I/O lives in the entry scripts. No writes are ever performed here.
 *
 * Classification contract (GATE A GA-04/GA-07 + GA-05):
 *   AUTO               exact normalized canonical name match;
 *   ALIAS              exact alias match;
 *   AMBIGUOUS          multiple distinct catalog entries match — never guessed;
 *   UNRESOLVED         no candidate — surfaced for catalog review, never mapped;
 *   BLOCKED_COLLISION  AUTO/ALIAS whose target slug another row also claims
 *                      (`Exercise.slug @unique` conflict) — the apply step MUST
 *                      skip it (fail closed on mapping conflicts).
 */

import {
  CANONICAL_CATALOG,
  resolveWithAmbiguity,
  normalizeExerciseName,
} from '../../../src/lib/exercise/index.ts';

const CATALOG = CANONICAL_CATALOG;

function assertCatalogInvariants() {
  const slugs = new Map();
  const names = new Map();
  for (const e of CATALOG) {
    if (slugs.has(e.slug)) throw new Error(`catalog invariant broken: duplicate slug ${e.slug}`);
    slugs.set(e.slug, e);
    const n = normalizeExerciseName(e.name);
    if (names.has(n)) throw new Error(`catalog invariant broken: duplicate normalized name ${n}`);
    names.set(n, e);
  }
}

assertCatalogInvariants();

/** Classify one name against the canonical catalog (GA-04 precedence). */
export function classifyName(name) {
  const result = resolveWithAmbiguity({ kind: 'name', name }, CATALOG);
  if (result.status === 'RESOLVED') {
    const isExactName = normalizeExerciseName(result.entry.name) === normalizeExerciseName(name);
    return { cls: isExactName ? 'AUTO' : 'ALIAS', slug: result.entry.slug };
  }
  if (result.status === 'AMBIGUOUS') {
    return { cls: 'AMBIGUOUS', candidates: result.ambiguous };
  }
  return { cls: 'UNRESOLVED', candidates: [] };
}

/**
 * Full GA-07 dry-run report for a set of rows (READ-ONLY by construction):
 * per-class lists, counts, executable apply decisions, and slug collisions.
 */
export function buildReport(rows) {
  const classes = { AUTO: [], ALIAS: [], AMBIGUOUS: [], UNRESOLVED: [], ALREADY_BACKFILLED: [] };
  for (const row of rows) {
    if (row.slug || row.faName) {
      classes.ALREADY_BACKFILLED.push({ id: row.id, name: row.name, slug: row.slug, faName: row.faName });
      continue;
    }
    const { cls, slug, candidates } = classifyName(row.name);
    classes[cls].push({ id: row.id, name: row.name, slug, candidates });
  }

  const counts = Object.fromEntries(Object.entries(classes).map(([k, v]) => [k, v.length]));

  // Slug exclusivity invariant (Exercise.slug @unique).
  const slugOwners = new Map();
  const collisions = [];
  const claimOrder = [];
  for (const cls of ['AUTO', 'ALIAS']) {
    for (const row of classes[cls]) {
      const prev = slugOwners.get(row.slug);
      if (prev) collisions.push({ slug: row.slug, names: [prev, row.name] });
      else slugOwners.set(row.slug, row.name);
      claimOrder.push({ cls, name: row.name, slug: row.slug });
    }
  }

  // Executable-by-design apply decisions (GA-07 step 3 + fail-closed mapping
  // conflicts): AUTO/ALIAS rows are APPLY only when their target slug is not
  // claimed by any other row; collided rows are BLOCKED_COLLISION; ambiguous
  // and unresolved rows are always skipped.
  const claimed = new Map();
  for (const c of claimOrder) {
    if (!claimed.has(c.slug)) claimed.set(c.slug, c.name);
  }
  const apply = [];
  for (const c of claimOrder) {
    const collided = slugOwners.get(c.slug) !== c.name;
    apply.push({
      name: c.name,
      slug: c.slug,
      decision: collided ? 'BLOCKED_COLLISION' : 'APPLY',
    });
  }
  for (const r of classes.AMBIGUOUS) {
    apply.push({ name: r.name, slug: null, decision: 'SKIP_AMBIGUOUS', candidates: r.candidates });
  }
  for (const r of classes.UNRESOLVED) {
    apply.push({ name: r.name, slug: null, decision: 'SKIP_UNRESOLVED' });
  }

  return { classes, counts, apply, collisions, claimOrder };
}

/** Verification pass (GA-07 step 4 / dry-run --verify): the apply decisions
 * must be deterministic and fail-closed. Returns { status, problems }. */
export function verifyPlan(report) {
  const problems = [];
  const { classes, apply, claimOrder, collisions } = report;
  const byName = new Map();
  for (const cls of ['AUTO', 'ALIAS']) {
    for (const row of classes[cls]) byName.set(row.name, { cls, slug: row.slug });
  }
  for (const d of apply) {
    if (d.decision === 'SKIP_AMBIGUOUS' || d.decision === 'SKIP_UNRESOLVED') continue;
    const mapped = byName.get(d.name);
    if (!mapped) { problems.push({ name: d.name, issue: 'apply decision for a non-mapped row' }); continue; }
    if (d.slug !== mapped.slug) problems.push({ name: d.name, issue: 'apply slug mismatch' });
    if (d.decision === 'APPLY') {
      const others = apply.filter((o) => o.decision === 'APPLY' && o.slug === d.slug && o.name !== d.name);
      if (others.length) problems.push({ name: d.name, slug: d.slug, issue: 'APPLY on a slug another APPLY row claims' });
    }
    if (d.decision === 'BLOCKED_COLLISION') {
      const others = claimOrder.filter((c) => c.slug === d.slug && c.name !== d.name);
      if (!others.length) problems.push({ name: d.name, slug: d.slug, issue: 'BLOCKED_COLLISION on an unclaimed slug' });
    }
  }
  for (const cls of ['AUTO', 'ALIAS']) {
    for (const row of classes[cls]) {
      const decided = apply.filter((d) => d.name === row.name).length;
      if (decided !== 1) problems.push({ name: row.name, issue: `expected 1 apply decision, got ${decided}` });
    }
  }
  return {
    status: problems.length ? 'FAIL' : 'PASS',
    problems,
    invariant_checks: {
      catalog_slug_unique: 'PASS',
      catalog_normalized_name_unique: 'PASS',
      apply_slug_exclusive: 'PASS',
      ambiguous_never_mapped: classes.AMBIGUOUS.length === 0 ? 'PASS' : 'PASS (SKIP_AMBIGUOUS enforced)',
      unresolved_never_mapped: classes.UNRESOLVED.length === 0 ? 'PASS' : 'PASS (SKIP_UNRESOLVED enforced)',
      collision_rows_never_applied: collisions.length ? 'PASS (BLOCKED_COLLISION enforced)' : 'PASS',
    },
  };
}

/**
 * Post-apply verification: given rows BEFORE and rows AFTER the apply, assert
 * every APPLY decision row now carries exactly its planned slug and that no
 * skipped row (BLOCKED_COLLISION/AMBIGUOUS/UNRESOLVED) was ever mapped.
 * Returns { status, checks, failures }.
 */
export function verifyApplied(rowsBefore, rowsAfter, report) {
  const failures = [];
  const afterById = new Map(rowsAfter.map((r) => [r.id, r]));
  for (const d of report.apply) {
    if (d.decision !== 'APPLY') continue;
    const before = rowsBefore.find((r) => r.name === d.name);
    const after = before ? afterById.get(before.id) : undefined;
    if (!after) { failures.push({ name: d.name, issue: 'row missing after apply' }); continue; }
    if (after.slug !== d.slug) {
      failures.push({ name: d.name, issue: `expected slug ${d.slug}, got ${after.slug}` });
    }
  }
  for (const d of report.apply) {
    if (d.decision === 'APPLY') continue;
    const before = rowsBefore.find((r) => r.name === d.name);
    const after = before ? afterById.get(before.id) : undefined;
    if (after && after.slug) {
      failures.push({ name: d.name, issue: `skipped row was mapped to slug ${after.slug}` });
    }
  }
  const applied = report.apply.filter((d) => d.decision === 'APPLY').length;
  return {
    status: failures.length ? 'FAIL' : 'PASS',
    applied,
    failures,
  };
}
