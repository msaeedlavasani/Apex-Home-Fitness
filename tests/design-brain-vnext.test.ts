import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {test} from 'node:test';

const read = (path: string) => readFileSync(path, 'utf8');
const contract = read('docs/architecture/AHF-DESIGN-BRAIN-VNEXT-P0.md');
const designSystem = read('docs/DESIGN_SYSTEM.md');
const uiGate = read('docs/governance/UI-CONFORMANCE-GATE.md');

for (const className of ['Compact Portrait', 'Compact / Short Landscape', 'Medium', 'Expanded / Desktop']) {
  test(`design brain vNext registers layout class: ${className}`, () => {
    assert.ok(contract.includes(className));
  });
}

test('composition map contract is canonical and complete', () => {
  for (const field of [
    'semantic regions', 'primary visual anchor', 'primary CTA/action',
    'initial-viewport priority', 'grouping rationale', 'responsive reflow',
    'invariant visual anchor', 'persistent versus contextual controls',
    'camera/body-safe regions',
  ]) assert.match(contract, new RegExp(field.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i'));
  assert.match(designSystem, /Composition Map requirement/);
  assert.match(uiGate, /Composition Map for material\/specialized UI/);
});

test('FocusSessionShell has single ownership and no Product implementation claim', () => {
  for (const owner of ['session utility/exit', 'session state + exercise identity', 'primary movement / mentor / camera surface', 'contextual coach / compare layer', 'compact HUD', 'exception controls']) assert.ok(contract.includes(owner));
  assert.match(contract, /design contract, not an implementation request/);
});

test('component registry and prototype acceptance contracts are present', () => {
  for (const field of ['name', 'path', 'responsibility', 'contracts', 'consumers', 'maturity', 'evaluationEvidence', 'surface']) assert.ok(contract.includes(field));
  for (const field of ['Experience State map', 'layout-class viewport matrix', 'Owner visual/UX gate', 'rejected findings and supersession linkage']) assert.ok(contract.includes(field));
});

test('AHF-only safety/privacy contracts remain explicitly preserved', () => {
  for (const rule of ['Apex Coral semantic visual system', 'CP-04 consent/privacy/C1 boundary', 'CP-06 no-camera fallback and revocation', 'CP-07 uncertainty-preserving runtime']) assert.ok(contract.includes(rule));
});
