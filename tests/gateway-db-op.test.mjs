/**
 * gateway-db-op.test.mjs — pure tests for the governed db-operation
 * classifier/apply-plan/verification logic (GOVERNED-PROD-DB-CAPABILITY-01,
 * GATE A GA-07). No database access: rows are plain fixtures.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';

import { buildReport, verifyPlan, verifyApplied, classifyName } from '../scripts/gateway-db-ops/lib/classify.mjs';

const SEED_NAMES = ['Burpee', 'Cat-Cow', 'Push-Up', 'Plank Hold', 'Glute Bridge Hold'];

function rows(names, withSlug = new Set()) {
  return names.map((name, i) => ({ id: `row-${i}`, name, slug: withSlug.has(name) ? `slug-${i}` : null, faName: null }));
}

test('classifyName: exact canonical name is AUTO', () => {
  assert.equal(classifyName('Burpee').cls, 'AUTO');
  assert.equal(classifyName('Burpee').slug, 'burpee');
});

test('classifyName: variant alias resolves as ALIAS', () => {
  const r = classifyName('Burpees');
  assert.equal(r.cls, 'ALIAS');
  assert.equal(r.slug, 'burpee');
});

test('classifyName: ambiguous name is surfaced, never guessed', () => {
  const r = classifyName('Glute Bridge'); // rules name + seed alias both match
  assert.equal(r.cls, 'AMBIGUOUS');
  assert.ok(r.candidates.length > 1);
});

test('classifyName: unknown name is UNRESOLVED', () => {
  assert.equal(classifyName('Quantum Leap').cls, 'UNRESOLVED');
});

test('dry-run report: seed corpus is 100% AUTO APPLY with no collisions', () => {
  const report = buildReport(rows(SEED_NAMES));
  assert.equal(report.counts.AUTO, 5);
  assert.equal(report.counts.ALIAS, 0);
  assert.equal(report.counts.AMBIGUOUS, 0);
  assert.equal(report.counts.UNRESOLVED, 0);
  assert.deepEqual(report.collisions, []);
  assert.equal(report.apply.filter((d) => d.decision === 'APPLY').length, 5);
  assert.equal(verifyPlan(report).status, 'PASS');
});

test('dry-run report: variant rows that collide with canonical rows are BLOCKED_COLLISION', () => {
  const report = buildReport(rows(['Burpee', 'Burpees', 'Cat-Cow', 'Cat Cow']));
  const decisions = Object.fromEntries(report.apply.map((d) => [d.name, d.decision]));
  assert.equal(decisions['Burpee'], 'APPLY');
  assert.equal(decisions['Cat-Cow'], 'APPLY');
  assert.equal(decisions['Burpees'], 'BLOCKED_COLLISION');
  assert.equal(decisions['Cat Cow'], 'BLOCKED_COLLISION');
  assert.equal(report.collisions.length, 2);
  assert.equal(verifyPlan(report).status, 'PASS'); // fail-closed is the safe outcome
});

test('dry-run report: ambiguous and unresolved rows are never mapped', () => {
  const report = buildReport(rows(['Glute Bridge', 'Quantum Leap']));
  const decisions = Object.fromEntries(report.apply.map((d) => [d.name, d.decision]));
  assert.equal(decisions['Glute Bridge'], 'SKIP_AMBIGUOUS');
  assert.equal(decisions['Quantum Leap'], 'SKIP_UNRESOLVED');
  assert.equal(verifyPlan(report).status, 'PASS');
});

test('verifyApplied: every APPLY row carries its slug; skipped rows stay unmapped', () => {
  const before = rows(['Burpee', 'Burpees', 'Glute Bridge', 'Quantum Leap']);
  const report = buildReport(before);
  const after = before.map((r) =>
    report.apply.find((d) => d.name === r.name)?.decision === 'APPLY'
      ? { ...r, slug: report.apply.find((d) => d.name === r.name).slug }
      : r,
  );
  const v = verifyApplied(before, after, report);
  assert.equal(v.status, 'PASS');
  assert.equal(v.applied, 1);
  assert.equal(after.find((r) => r.name === 'Burpee').slug, 'burpee');
  assert.equal(after.find((r) => r.name === 'Burpees').slug, null);
  assert.equal(after.find((r) => r.name === 'Glute Bridge').slug, null);
  assert.equal(after.find((r) => r.name === 'Quantum Leap').slug, null);
});

test('verifyApplied: FAIL when a skipped row was mapped', () => {
  const before = rows(['Glute Bridge']); // AMBIGUOUS → never mapped
  const report = buildReport(before);
  assert.equal(report.apply[0].decision, 'SKIP_AMBIGUOUS');
  const after = before.map((r) => ({ ...r, slug: 'glute-bridge' })); // wrongly mapped
  const v = verifyApplied(before, after, report);
  assert.equal(v.status, 'FAIL');
  assert.ok(v.failures.length > 0);
});

test('verifyApplied: FAIL when an APPLY row is missing its slug', () => {
  const before = rows(['Burpee']);
  const report = buildReport(before);
  const after = before; // unchanged
  const v = verifyApplied(before, after, report);
  assert.equal(v.status, 'FAIL');
});

test('already-backfilled rows are classified, not re-mapped', () => {
  const report = buildReport(rows(['Burpee'], new Set(['Burpee'])));
  assert.equal(report.counts.ALREADY_BACKFILLED, 1);
  assert.equal(report.counts.AUTO, 0);
});
