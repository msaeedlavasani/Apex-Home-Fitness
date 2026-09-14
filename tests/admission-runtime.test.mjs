import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

// Stage 6 — Development Admission Gate scenario tests (Phase 13).
// Each scenario mirrors docs/governance/DEVELOPMENT-ADMISSION.md.

const root = process.cwd();
const checker = path.join(root, 'scripts/governance-runtime.mjs');
function run(...args) { return execFileSync(process.execPath, [checker, ...args], { cwd: root, encoding: 'utf8' }); }
function recordFile(value) {
  const file = path.join(os.tmpdir(), `admission-${Date.now()}-${Math.random()}.json`);
  fs.writeFileSync(file, JSON.stringify(value));
  return file;
}
function baseStandard(overrides = {}) {
  return {
    TASK_ID: 'STANDARD-TEST-01',
    TASK_CLASS: 'STANDARD',
    SCOPE_SUMMARY: 'Feature behavior change with a READY controlling specification.',
    SPEC_REQUIRED: 'YES',
    SPEC_FIND_BEFORE_CREATE: 'REUSED_EXISTING_SPEC',
    SPEC_PATH: 'docs/specs/0001-workout-experience/spec.md',
    SPEC_STATUS: 'READY',
    BLOCKING_OWNER_DECISIONS: 'NONE',
    IMPLEMENTATION_AUTHORIZATION: 'OWNER_AUTHORIZED',
    AUTHORIZATION_SOURCE: 'docs/TASKS.md → STANDARD-TEST-01 (owner-authorized)',
    ...overrides,
  };
}
function baseCritical(overrides = {}) {
  return baseStandard({
    TASK_ID: 'CRITICAL-TEST-01',
    TASK_CLASS: 'CRITICAL',
    ARCHITECTURE_PLAN_REQUIRED: 'YES',
    ARCHITECTURE_PLAN_PATH: 'docs/specs/0001-workout-experience/plan.md',
    ARCHITECTURE_PLAN_STATUS: 'READY',
    WORK_PACKAGES_STATUS: 'READY',
    DEPENDENCY_ANALYSIS_STATUS: 'READY',
    ...overrides,
  });
}

// --- SCENARIO A — LIGHT: no unnecessary Spec Kit ceremony ---
test('SCENARIO A — LIGHT isolated-local change is admitted without a spec', () => {
  const out = run('admission', recordFile({
    TASK_ID: 'LIGHT-TEST-01',
    TASK_CLASS: 'LIGHT',
    SCOPE_SUMMARY: 'Typo fix inside one localized message.',
    LIGHT_SCOPE: 'ISOLATED_LOCAL',
  }));
  assert.match(out, /ADMISSION_GRANTED LIGHT-TEST-01/);
});

// --- SCENARIO B — STANDARD with a READY spec is admitted ---
test('SCENARIO B — STANDARD with READY spec + authorization passes', () => {
  const out = run('admission', recordFile(baseStandard()));
  assert.match(out, /ADMISSION_GRANTED STANDARD-TEST-01/);
});

// --- SCENARIO C — STANDARD without a spec fails closed ---
test('SCENARIO C — STANDARD without a controlling spec fails closed', () => {
  const file = recordFile(baseStandard({ SPEC_PATH: undefined }));
  assert.throws(() => run('admission', file), /ADMISSION_INVALID: missing required field: SPEC_PATH/);
});
test('SCENARIO C2 — STANDARD with NOT_READY spec is denied', () => {
  const file = recordFile(baseStandard({ SPEC_STATUS: 'NOT_READY' }));
  assert.throws(() => run('admission', file), /ADMISSION_DENIED: SPEC_NOT_READY/);
});
test('SCENARIO C3 — spec file that does not exist fails closed', () => {
  const file = recordFile(baseStandard({ SPEC_PATH: 'docs/specs/9999-ghost/spec.md' }));
  assert.throws(() => run('admission', file), /ADMISSION_INVALID: SPEC_PATH points to a missing file/);
});

// --- SCENARIO D — CRITICAL with READY spec but no implementation authorization ---
test('SCENARIO D — CRITICAL READY spec without implementation authorization fails closed', () => {
  const file = recordFile(baseCritical({ IMPLEMENTATION_AUTHORIZATION: 'NOT_AUTHORIZED' }));
  assert.throws(() => run('admission', file), /ADMISSION_DENIED: IMPLEMENTATION_NOT_AUTHORIZED/);
});

// --- SCENARIO E — CRITICAL with a blocking owner decision ---
test('SCENARIO E — CRITICAL with blocking owner decisions fails closed', () => {
  const file = recordFile(baseCritical({ BLOCKING_OWNER_DECISIONS: 'U-13 conversion thresholds unresolved' }));
  assert.throws(() => run('admission', file), /ADMISSION_DENIED: BLOCKING_OWNER_DECISIONS/);
});

// --- SCENARIO F — prototype/code path cannot satisfy the spec gate ---
test('SCENARIO F — SPEC_PATH outside docs/specs is rejected (prototype is not a spec)', () => {
  const file = recordFile(baseStandard({ SPEC_PATH: 'prototype/workout-layout-blueprint/src/app/[locale]/prototype/workout/page.tsx' }));
  assert.throws(() => run('admission', file), /ADMISSION_INVALID: SPEC_PATH must point at a docs\/specs\/<dir>\/spec\.md contract/);
});
test('SCENARIO F2 — arbitrary docs file is not a specification contract', () => {
  const file = recordFile(baseStandard({ SPEC_PATH: 'docs/CURRENT_STATE.md' }));
  assert.throws(() => run('admission', file), /ADMISSION_INVALID: SPEC_PATH must point at a docs\/specs\/<dir>\/spec\.md contract/);
});

// --- SCENARIO G — LIGHT scope expansion forces reclassification ---
test('SCENARIO G — LIGHT claiming shared/cross-module scope is denied for reclassification', () => {
  const file = recordFile({
    TASK_ID: 'LIGHT-TEST-02',
    TASK_CLASS: 'LIGHT',
    SCOPE_SUMMARY: 'Started as visual cleanup; now changes shared workout progression.',
    LIGHT_SCOPE: 'CROSS_MODULE_OR_SHARED',
  });
  assert.throws(() => run('admission', file), /ADMISSION_DENIED: RECLASSIFICATION_REQUIRED/);
});
test('SCENARIO G2 — LIGHT declaring SPEC_REQUIRED=YES is invalid (must reclassify)', () => {
  const file = recordFile({
    TASK_ID: 'LIGHT-TEST-03',
    TASK_CLASS: 'LIGHT',
    SCOPE_SUMMARY: 'Cleanup that grew a spec.',
    LIGHT_SCOPE: 'ISOLATED_LOCAL',
    SPEC_REQUIRED: 'YES',
  });
  assert.throws(() => run('admission', file), /ADMISSION_INVALID: LIGHT cannot declare SPEC_REQUIRED=YES/);
});

// --- SCENARIO H — WORKOUT V2 handoff state ---
test('SCENARIO H — WORKOUT V2 (spec READY, implementation NOT authorized) fails closed', () => {
  const record = JSON.parse(fs.readFileSync(path.join(root, 'docs/admissions/WORKOUT-V2-IMPL-01.admission.json'), 'utf8'));
  assert.equal(record.SPEC_STATUS, 'READY');
  assert.equal(record.BLOCKING_OWNER_DECISIONS, 'NONE');
  assert.equal(record.IMPLEMENTATION_AUTHORIZATION, 'NOT_AUTHORIZED');
  assert.throws(() => run('admission', recordFile(record)), /ADMISSION_DENIED: IMPLEMENTATION_NOT_AUTHORIZED/);
});
test('SCENARIO H2 — WORKOUT V2 becomes admissible only after explicit authorization', () => {
  const record = JSON.parse(fs.readFileSync(path.join(root, 'docs/admissions/WORKOUT-V2-IMPL-01.admission.json'), 'utf8'));
  record.IMPLEMENTATION_AUTHORIZATION = 'OWNER_AUTHORIZED';
  record.AUTHORIZATION_SOURCE = 'docs/TASKS.md → WORKOUT-V2-IMPL-01 (future explicit owner authorization)';
  const out = run('admission', recordFile(record));
  assert.match(out, /ADMISSION_GRANTED WORKOUT-V2-IMPL-01/);
});

// --- CRITICAL gate details ---
test('CRITICAL without architecture plan fails closed', () => {
  const file = recordFile(baseCritical({ ARCHITECTURE_PLAN_REQUIRED: 'NO' }));
  assert.throws(() => run('admission', file), /ADMISSION_INVALID: CRITICAL requires ARCHITECTURE_PLAN_REQUIRED=YES/);
});
test('CRITICAL with missing architecture plan file fails closed', () => {
  const file = recordFile(baseCritical({ ARCHITECTURE_PLAN_PATH: 'docs/specs/0001-workout-experience/never.md' }));
  assert.throws(() => run('admission', file), /ADMISSION_INVALID: ARCHITECTURE_PLAN_PATH points to a missing file/);
});
test('CRITICAL with NOT_READY work packages fails closed', () => {
  const file = recordFile(baseCritical({ WORK_PACKAGES_STATUS: 'NOT_READY' }));
  assert.throws(() => run('admission', file), /ADMISSION_DENIED: WORK_PACKAGES_NOT_READY/);
});

// --- bulk structural validation (CI lane) ---
test('admissions bulk: valid records pass and DENIED records do not fail the repo check', () => {
  const out = run('admissions', 'docs/admissions');
  assert.match(out, /ADMISSIONS_PASS \d+ records/);
  assert.match(out, /denied: 1/); // WORKOUT-V2-IMPL-01 (spec READY, implementation NOT authorized)
});
test('admissions bulk: malformed record fails closed', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'admissions-'));
  fs.writeFileSync(path.join(dir, 'broken.admission.json'), JSON.stringify({ TASK_ID: 'X', TASK_CLASS: 'STANDARD' }));
  assert.throws(() => run('admissions', dir), /ADMISSION_INVALID: missing required field: SCOPE_SUMMARY/);
});
test('admissions bulk: missing directory passes (no records yet)', () => {
  const out = run('admissions', 'docs/admissions-does-not-exist');
  assert.match(out, /ADMISSIONS_PASS 0 records/);
});
