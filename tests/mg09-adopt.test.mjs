/**
 * mg09-adopt.test.mjs — pure tests for the MG-09 Movement Graph adoption
 * plan/verify logic. No database access: rows are plain fixtures, exactly
 * like `gateway-db-op.test.mjs`.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  buildAdoptionPlan,
  verifyAdoptionPlan,
  verifyAdoptionApplied,
} from '../scripts/gateway-db-ops/lib/mg09-adopt.mjs';
import { canonicalSeedCorpus, recordedProductionEvidenceCorpus } from '../src/lib/movement/reconcile.ts';
import { CANONICAL_CATALOG } from '../src/lib/exercise/index.ts';

function rows(names) {
  return names.map((name, i) => ({ id: `row-${i}`, name, slug: null, faName: null }));
}

test('canonical seed corpus: 74 movements planned, 72 seed-linked, plan verifies PASS', () => {
  const plan = buildAdoptionPlan(canonicalSeedCorpus());
  assert.equal(plan.counts.movements, 74);
  assert.equal(plan.counts.seedLinked, 72, 'the canonical corpus mirrors all 74 catalog entries; the 2 structurally ambiguous entries cannot self-link');
  assert.equal(plan.counts.catalogOnly, 2, 'the 2 AMBIGUOUS catalog entries (side-lying leg lift, glute bridge) stay catalog-only');
  assert.equal(plan.counts.ambiguous, 2);
  const verify = verifyAdoptionPlan(plan);
  assert.equal(verify.status, 'PASS', JSON.stringify(verify.problems));
});

test('recorded S02-E Production corpus: 8 MAPPED linked, Side-Lying AMBIGUOUS never linked', () => {
  const plan = buildAdoptionPlan(recordedProductionEvidenceCorpus());
  assert.equal(plan.counts.ambiguous, 1, 'Side-Lying Leg Lift stays AMBIGUOUS');
  assert.equal(plan.counts.unresolved, 0);
  assert.equal(plan.ambiguous.length, 1);
  assert.match(plan.ambiguous[0].name, /Side-Lying/i);
  assert.ok(plan.ambiguous[0].candidates.length > 1, 'candidates surfaced, never picked');
  const verify = verifyAdoptionPlan(plan);
  assert.equal(verify.status, 'PASS', JSON.stringify(verify.problems));
});

test('AMBIGUOUS and UNRESOLVED rows are never auto-linked in the plan', () => {
  // "Glute Bridge" collides (glute-bridge-hold vs glute-bridge seed alias);
  // "Quantum Leap" is unknown.
  const plan = buildAdoptionPlan(rows(['Glute Bridge', 'Quantum Leap']));
  assert.equal(plan.counts.ambiguous, 1);
  assert.equal(plan.counts.unresolved, 1);
  // The linked slug set must not contain an exerciseId from either row.
  for (const m of plan.movements) {
    assert.equal(m.exerciseId, null, `AMBIGUOUS/UNRESOLVED row must not link ${m.slug}`);
  }
  const verify = verifyAdoptionPlan(plan);
  assert.equal(verify.status, 'PASS');
});

test('dry-run report: unique slugs/names, every catalog entry planned exactly once', () => {
  const plan = buildAdoptionPlan(rows(['Burpee', 'Push-Up']));
  const slugs = plan.movements.map((m) => m.slug);
  assert.equal(new Set(slugs).size, slugs.length);
  assert.equal(plan.movements.length, CANONICAL_CATALOG.length);
  const names = plan.movements.map((m) => m.nameEn);
  assert.equal(new Set(names).size, names.length);
});

test('verifyAdoptionApplied: PASS when all planned rows present with exact links', () => {
  const plan = buildAdoptionPlan(canonicalSeedCorpus());
  const applied = plan.movements.map((m) => ({
    slug: m.slug,
    nameEn: m.nameEn,
    exerciseId: m.exerciseId,
  }));
  const verify = verifyAdoptionApplied(plan, applied);
  assert.equal(verify.status, 'PASS', JSON.stringify(verify.problems));
});

test('verifyAdoptionApplied: FAIL when a planned row is missing or link is wrong', () => {
  const plan = buildAdoptionPlan(rows(['Burpee', 'Push-Up']));
  const seedLinked = plan.movements.find((m) => m.exerciseId !== null);
  assert.ok(seedLinked, 'expected at least one seed-linked movement');
  // Drop one row + corrupt the link of another.
  const applied = plan.movements
    .filter((m) => m.slug !== seedLinked.slug)
    .map((m) => ({ slug: m.slug, nameEn: m.nameEn, exerciseId: m.exerciseId }));
  applied[0] = {...applied[0], exerciseId: 'wrong-id'};
  const verify = verifyAdoptionApplied(plan, applied);
  assert.equal(verify.status, 'FAIL');
  assert.ok(verify.problems.some((p) => /missing/.test(p)));
  assert.ok(verify.problems.some((p) => /exerciseId/.test(p)));
});

test('verifyAdoptionApplied: FAIL when a Movement row links an AMBIGUOUS row', () => {
  const plan = buildAdoptionPlan(rows(['Side-Lying Leg Lift']));
  const applied = plan.movements.map((m) => ({
    slug: m.slug,
    nameEn: m.nameEn,
    exerciseId: m.exerciseId,
  }));
  applied[0] = {...applied[0], exerciseId: 'row-0'}; // illegal link to the ambiguous row
  const verify = verifyAdoptionApplied(plan, applied);
  assert.equal(verify.status, 'FAIL');
  assert.ok(verify.problems.some((p) => /AMBIGUOUS\/UNRESOLVED/.test(p)));
});