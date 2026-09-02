/**
 * MG-08 — Catalog validation + legacy seed reconciliation tests.
 *
 * Proves:
 *   - catalog validation surfaces alias/name collisions structurally (the
 *     `side-lying leg lift` and `glute bridge` seed collisions);
 *   - every canonical seed record reconciles (MAPPED / AMBIGUOUS, zero
 *     UNRESOLVED — the catalog is self-consistent modulo known collisions);
 *   - the S02-E recorded Production corpus reconciles deterministically:
 *     8 recorded rows MAPPED (slugs live via runtime generation) and
 *     `Side-Lying Leg Lift` AMBIGUOUS with both candidates (never guessed);
 *   - an existing slug is NOT assumed canonical — slug drift is reported;
 *   - ambiguous rows never resolve; unresolved rows never map; report is
 *     deterministic and verifies PASS.
 */

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  buildReconciliationReport,
  canonicalSeedCorpus,
  findCatalogCollisions,
  reconcileRecord,
  recordedProductionEvidenceCorpus,
  verifyReconciliationReport,
  type SeedRecord,
} from '../src/lib/movement/index';

describe('MG-08 catalog validation', () => {
  it('surfaces the two recorded alias collisions structurally', () => {
    const collisions = findCatalogCollisions();
    const byNormalized = new Map(collisions.map((c) => [c.normalized, c.slugs]));
    assert.deepEqual(byNormalized.get('side-lying leg lift'), [
      'side-kick-side-leg-lifts',
      'side-lying-leg-lift',
    ]);
    assert.deepEqual(byNormalized.get('glute bridge'), ['glute-bridge', 'glute-bridge-hold']);
  });

  it('collisions are deterministic (sorted)', () => {
    const a = findCatalogCollisions();
    const b = findCatalogCollisions();
    assert.deepEqual(b, a);
  });
});

describe('MG-08 canonical seed corpus reconciliation', () => {
  it('every canonical catalog record reconciles with zero UNRESOLVED', () => {
    const report = buildReconciliationReport(canonicalSeedCorpus());
    assert.equal(report.rows.length, canonicalSeedCorpus().length);
    assert.equal(report.counts.UNRESOLVED, 0, 'canonical catalog must be self-consistent');
    assert.ok(report.counts.MAPPED >= report.rows.length - report.counts.AMBIGUOUS);
  });

  it('reconciliation verification PASSes on the canonical corpus', () => {
    const report = buildReconciliationReport(canonicalSeedCorpus());
    const v = verifyReconciliationReport(report);
    assert.equal(v.status, 'PASS', JSON.stringify(v.problems));
  });
});

describe('MG-08 S02-E recorded Production corpus', () => {
  it('the 8 recorded backfilled rows reconcile MAPPED', () => {
    const corpus = recordedProductionEvidenceCorpus();
    const report = buildReconciliationReport(corpus);
    assert.equal(report.counts.AMBIGUOUS, 1);
    assert.equal(report.counts.UNRESOLVED, 0);
    const mapped = report.rows.filter((r) => r.result.status === 'MAPPED');
    assert.equal(mapped.length, 8);
    for (const { result } of mapped) assert.ok(result.canonicalSlug);
  });

  it('Side-Lying Leg Lift stays AMBIGUOUS with both candidates (S02-E regression)', () => {
    const report = buildReconciliationReport(recordedProductionEvidenceCorpus());
    const row = report.rows.find((r) => r.record.name === 'Side-Lying Leg Lift')!;
    assert.equal(row.result.status, 'AMBIGUOUS');
    assert.equal(row.result.canonicalSlug, undefined, 'ambiguous must never resolve');
    assert.deepEqual(row.result.candidates, ['side-kick-side-leg-lifts', 'side-lying-leg-lift']);
    assert.equal(report.ambiguous[0].id, 'cmtdmzmw80008k101j3a2gd2z');
  });

  it('verification PASSes on the recorded corpus', () => {
    const report = buildReconciliationReport(recordedProductionEvidenceCorpus());
    const v = verifyReconciliationReport(report);
    assert.equal(v.status, 'PASS', JSON.stringify(v.problems));
  });
});

describe('MG-08 per-record reconciliation (fail-closed)', () => {
  it('exact canonical name → MAPPED AUTO', () => {
    const r = reconcileRecord({ name: 'Bodyweight Squat', slug: null });
    assert.equal(r.status, 'MAPPED');
    assert.equal(r.basis, 'AUTO');
    assert.equal(r.canonicalSlug, 'bodyweight-squat');
  });

  it('alias name → MAPPED ALIAS', () => {
    const r = reconcileRecord({ name: 'Pushups', slug: null });
    assert.equal(r.status, 'MAPPED');
    assert.equal(r.basis, 'ALIAS');
    assert.equal(r.canonicalSlug, 'push-up');
  });

  it('unknown name → UNRESOLVED (never mapped)', () => {
    const r = reconcileRecord({ name: 'Zero-G Unknown Movement 3000' });
    assert.equal(r.status, 'UNRESOLVED');
    assert.equal(r.canonicalSlug, undefined);
  });

  it('existing slug is NOT assumed canonical — drift is reported', () => {
    // The record claims slug `squat` (non-canonical for this name).
    const r = reconcileRecord({ name: 'Bodyweight Squat', slug: 'squat' });
    assert.equal(r.status, 'MAPPED');
    assert.equal(r.canonicalSlug, 'bodyweight-squat');
    assert.equal(r.slugDrift, true);
  });

  it('a matching existing slug does not drift', () => {
    const r = reconcileRecord({ name: 'Bodyweight Squat', slug: 'bodyweight-squat' });
    assert.equal(r.status, 'MAPPED');
    assert.equal(r.slugDrift, undefined);
  });

  it('report is deterministic across runs', () => {
    const corpus = [...recordedProductionEvidenceCorpus(), { name: 'Zero-G X 3000' }];
    const a = buildReconciliationReport(corpus);
    const b = buildReconciliationReport(corpus);
    assert.deepEqual(b, a);
  });

  it('slug drift surfaces in the report', () => {
    const rows: SeedRecord[] = [{ id: 'r1', name: 'Bodyweight Squat', slug: 'squat' }];
    const report = buildReconciliationReport(rows);
    assert.equal(report.slugDrift.length, 1);
    assert.equal(report.slugDrift[0].existingSlug, 'squat');
    assert.equal(report.slugDrift[0].canonicalSlug, 'bodyweight-squat');
  });
});