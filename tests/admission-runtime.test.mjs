import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

// Stage 6 trust-boundary audit — Development Admission Gate tests.
// Scenarios A–H mirror docs/governance/DEVELOPMENT-ADMISSION.md; CHECK A–E
// mirror the trust-boundary audit (missing-record, authorization provenance,
// spec-readiness provenance, CRITICAL preparation ownership, Workout V2).

const root = process.cwd();
const checker = path.join(root, 'scripts/governance-runtime.mjs');
const CANONICAL_TASKS = 'docs/TASKS.md'; // canonical owner-authorization artifact containing seeded TASK_IDs
const SEEDED_TASK_ID = 'SPECKIT-PILOT-01'; // present in docs/TASKS.md (merged pilot)
function run(...args) { return execFileSync(process.execPath, [checker, ...args], { cwd: root, encoding: 'utf8' }); }
function recordFile(value) {
  const file = path.join(os.tmpdir(), `admission-${Date.now()}-${Math.random()}.json`);
  fs.writeFileSync(file, JSON.stringify(value));
  return file;
}
function baseStandard(overrides = {}) {
  return {
    TASK_ID: SEEDED_TASK_ID,
    TASK_CLASS: 'STANDARD',
    SCOPE_SUMMARY: 'Feature behavior change with a READY controlling specification.',
    SPEC_REQUIRED: 'YES',
    SPEC_FIND_BEFORE_CREATE: 'REUSED_EXISTING_SPEC',
    SPEC_PATH: 'docs/specs/0001-workout-experience/spec.md',
    SPEC_STATUS: 'READY',
    BLOCKING_OWNER_DECISIONS: 'NONE',
    IMPLEMENTATION_AUTHORIZATION: 'OWNER_AUTHORIZED',
    AUTHORIZATION_SOURCE: CANONICAL_TASKS,
    ...overrides,
  };
}
function baseCritical(overrides = {}) {
  return baseStandard({
    TASK_ID: SEEDED_TASK_ID,
    TASK_CLASS: 'CRITICAL',
    ARCHITECTURE_PLAN_REQUIRED: 'YES',
    ARCHITECTURE_PLAN_PATH: 'docs/specs/0001-workout-experience/plan.md',
    ARCHITECTURE_PLAN_STATUS: 'READY',
    WORK_PACKAGES_PATH: 'docs/specs/0001-workout-experience/tasks.md',
    WORK_PACKAGES_STATUS: 'READY',
    DEPENDENCY_ANALYSIS_STATUS: 'READY',
    AUTHORIZATION_SOURCE: 'docs/governance/OWNER_DECISION_GATE.md', // canonical owner decision record (references SPECKIT-PILOT-01 via the D2 row)
    ...overrides,
  });
}
function tmpSpecDir(content) {
  // Temporary controlling spec under docs/specs/ (cleaned up by the caller).
  const dir = path.join(root, 'docs/specs/zzz-test-fixture');
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'spec.md'), content);
  return 'docs/specs/zzz-test-fixture/spec.md';
}
function rmSpecDir() { fs.rmSync(path.join(root, 'docs/specs/zzz-test-fixture'), { recursive: true, force: true }); }

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

// --- SCENARIO B — STANDARD with a READY spec + canonical authorization ---
test('SCENARIO B — STANDARD with READY spec + canonical authorization passes', () => {
  const out = run('admission', recordFile(baseStandard()));
  assert.match(out, /ADMISSION_GRANTED SPECKIT-PILOT-01/);
});

// --- SCENARIO C — STANDARD without a spec fails closed ---
test('SCENARIO C — STANDARD without a controlling spec fails closed', () => {
  const file = recordFile(baseStandard({ SPEC_PATH: undefined }));
  assert.throws(() => run('admission', file), /ADMISSION_INVALID: missing required field: SPEC_PATH/);
});
test('SCENARIO C2 — STANDARD with NOT_READY spec record is denied', () => {
  const file = recordFile(baseStandard({ SPEC_STATUS: 'NOT_READY' }));
  assert.throws(() => run('admission', file), /ADMISSION_DENIED: SPEC_NOT_READY/);
});
test('SCENARIO C3 — spec file that does not exist fails closed', () => {
  const file = recordFile(baseStandard({ SPEC_PATH: 'docs/specs/9999-ghost/spec.md' }));
  assert.throws(() => run('admission', file), /ADMISSION_INVALID: SPEC_PATH points to a missing file/);
});

// --- trust-boundary CHECK C — spec readiness provenance ---
test('CHECK C — spec without canonical readiness marker is INVALID', () => {
  const specPath = tmpSpecDir('# Ghost spec\n\nNo markers here.\n');
  try {
    const file = recordFile(baseStandard({ SPEC_PATH: specPath }));
    assert.throws(() => run('admission', file), /ADMISSION_INVALID: controlling spec lacks a canonical `SPEC_READINESS/);
  } finally { rmSpecDir(); }
});
test('CHECK C — spec marker NOT_READY overrides a self-declared READY record', () => {
  const specPath = tmpSpecDir('SPEC_READINESS: NOT_READY\nBLOCKING_OWNER_DECISIONS: NONE\n');
  try {
    const file = recordFile(baseStandard({ SPEC_PATH: specPath }));
    assert.throws(() => run('admission', file), /ADMISSION_DENIED: SPEC_NOT_READY/);
  } finally { rmSpecDir(); }
});
test('CHECK C — blocking-decision mismatch between record and spec is denied', () => {
  const specPath = tmpSpecDir('SPEC_READINESS: READY\nBLOCKING_OWNER_DECISIONS: U-13 conversion thresholds\n');
  try {
    const file = recordFile(baseStandard({ SPEC_PATH: specPath }));
    assert.throws(() => run('admission', file), /BLOCKING_OWNER_DECISIONS mismatch: canonical spec marker is/);
  } finally { rmSpecDir(); }
});

// --- SCENARIO D — CRITICAL with READY spec but no implementation authorization ---
test('SCENARIO D — CRITICAL READY spec without implementation authorization fails closed', () => {
  const file = recordFile(baseCritical({ IMPLEMENTATION_AUTHORIZATION: 'NOT_AUTHORIZED' }));
  assert.throws(() => run('admission', file), /ADMISSION_DENIED: IMPLEMENTATION_NOT_AUTHORIZED/);
});
test('CHECK B — canonical gate provenance grants a CRITICAL admission (positive path)', () => {
  const out = run('admission', recordFile(baseCritical()));
  assert.match(out, /ADMISSION_GRANTED SPECKIT-PILOT-01 \(CRITICAL\)/);
});

// --- trust-boundary CHECK B — authorization provenance ---
test('CHECK B — self-declared authorization string fails (non-canonical source)', () => {
  const file = recordFile(baseCritical({
    TASK_ID: 'SELF-AUTH-ATTEMPT-01',
    IMPLEMENTATION_AUTHORIZATION: 'OWNER_AUTHORIZED',
    AUTHORIZATION_SOURCE: 'N/A — agent declares itself authorized',
  }));
  assert.throws(() => run('admission', file), /ADMISSION_INVALID: CRITICAL AUTHORIZATION_SOURCE must be docs\/governance\/OWNER_DECISION_GATE\.md/);
});
test('CHECK B — TASKS.md mention does NOT authorize a CRITICAL task', () => {
  const file = recordFile(baseCritical({
    TASK_ID: 'WORKOUT-V2-IMPL-01',
    IMPLEMENTATION_AUTHORIZATION: 'OWNER_AUTHORIZED',
    AUTHORIZATION_SOURCE: CANONICAL_TASKS,
  }));
  assert.throws(() => run('admission', file), /ADMISSION_INVALID: CRITICAL AUTHORIZATION_SOURCE must be docs\/governance\/OWNER_DECISION_GATE\.md/);
});
test('CHECK B — canonical gate source without the TASK_ID fails provenance', () => {
  const file = recordFile(baseCritical({
    TASK_ID: 'SELF-AUTH-ATTEMPT-03',
    IMPLEMENTATION_AUTHORIZATION: 'OWNER_AUTHORIZED',
    AUTHORIZATION_SOURCE: 'docs/governance/OWNER_DECISION_GATE.md',
  }));
  assert.throws(() => run('admission', file), /AUTHORIZATION_PROVENANCE_FAILURE — docs\/governance\/OWNER_DECISION_GATE\.md does not reference TASK_ID SELF-AUTH-ATTEMPT-03/);
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

// --- trust-boundary CHECK D — CRITICAL preparation ownership ---
test('CHECK D — missing WORK_PACKAGES_PATH fails closed', () => {
  const file = recordFile(baseCritical({ WORK_PACKAGES_PATH: undefined }));
  assert.throws(() => run('admission', file), /ADMISSION_INVALID: missing required field: WORK_PACKAGES_PATH/);
});
test('CHECK D — work packages outside the controlling spec directory fail (ownership)', () => {
  const file = recordFile(baseCritical({ WORK_PACKAGES_PATH: 'docs/TASKS.md' }));
  assert.throws(() => run('admission', file), /ADMISSION_INVALID: WORK_PACKAGES_PATH must live in the controlling spec directory/);
});
test('CHECK D — non-existent work packages fail closed', () => {
  const file = recordFile(baseCritical({ WORK_PACKAGES_PATH: 'docs/specs/0001-workout-experience/never.md' }));
  assert.throws(() => run('admission', file), /ADMISSION_INVALID: WORK_PACKAGES_PATH points to a missing file/);
});
test('CHECK D — architecture plan outside the spec directory fails (ownership)', () => {
  const file = recordFile(baseCritical({ ARCHITECTURE_PLAN_PATH: 'docs/governance/DEVELOPMENT-ADMISSION.md' }));
  assert.throws(() => run('admission', file), /ADMISSION_INVALID: ARCHITECTURE_PLAN_PATH must live in the controlling spec directory/);
});
test('CHECK D — dependency analysis reference must exist when present', () => {
  const file = recordFile(baseCritical({ DEPENDENCY_ANALYSIS_PATH: 'docs/specs/0001-workout-experience/never.md' }));
  assert.throws(() => run('admission', file), /ADMISSION_INVALID: DEPENDENCY_ANALYSIS_PATH points to a missing file/);
});

// --- SCENARIO H — WORKOUT V2 canonical state ---
test('SCENARIO H — WORKOUT V2 canonical record is GRANTED (owner-authorized 2026-09-15)', () => {
  const record = JSON.parse(fs.readFileSync(path.join(root, 'docs/admissions/WORKOUT-V2-IMPL-01.admission.json'), 'utf8'));
  assert.equal(record.SPEC_STATUS, 'READY');
  assert.equal(record.BLOCKING_OWNER_DECISIONS, 'NONE');
  assert.equal(record.IMPLEMENTATION_AUTHORIZATION, 'OWNER_AUTHORIZED');
  assert.equal(record.AUTHORIZATION_SOURCE, 'docs/governance/OWNER_DECISION_GATE.md');
  assert.match(run('admission', recordFile(record)), /ADMISSION_GRANTED WORKOUT-V2-IMPL-01/);
});
test('SCENARIO H1 — the same CRITICAL shape WITHOUT authorization still fails closed', () => {
  const record = JSON.parse(fs.readFileSync(path.join(root, 'docs/admissions/WORKOUT-V2-IMPL-01.admission.json'), 'utf8'));
  record.IMPLEMENTATION_AUTHORIZATION = 'NOT_AUTHORIZED';
  assert.throws(() => run('admission', recordFile(record)), /ADMISSION_DENIED: IMPLEMENTATION_NOT_AUTHORIZED/);
});
test('SCENARIO H2 — WORKOUT V2: TASKS.md mention does not authorize a CRITICAL task', () => {
  const record = JSON.parse(fs.readFileSync(path.join(root, 'docs/admissions/WORKOUT-V2-IMPL-01.admission.json'), 'utf8'));
  record.IMPLEMENTATION_AUTHORIZATION = 'OWNER_AUTHORIZED';
  record.AUTHORIZATION_SOURCE = CANONICAL_TASKS; // mentions the TASK_ID via a handoff note — NOT a CRITICAL authorization source
  assert.throws(() => run('admission', recordFile(record)), /ADMISSION_INVALID: CRITICAL AUTHORIZATION_SOURCE must be docs\/governance\/OWNER_DECISION_GATE\.md/);
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

// --- trust-boundary CHECK A — missing admission record (receipt/report linkage) ---
test('CHECK A — STANDARD receipt without an admission record fails closed', () => {
  const file = recordFile({ TASK_ID: SEEDED_TASK_ID, TASK_PROFILE: 'CODE_NO_DEPLOY', READ_FILES: ['AGENTS.md', 'docs/INDEX.md'] });
  assert.throws(() => run('receipt', file), /RECEIPT: ADMISSION_PATH is required for CODE_NO_DEPLOY work/);
});
test('CHECK A — STANDARD receipt with a GRANTED admission record passes', () => {
  const adm = recordFile(baseStandard({ TASK_ID: SEEDED_TASK_ID }));
  const file = recordFile({ TASK_ID: SEEDED_TASK_ID, TASK_PROFILE: 'CODE_NO_DEPLOY', ADMISSION_PATH: adm, READ_FILES: ['AGENTS.md', 'docs/INDEX.md'] });
  assert.match(run('receipt', file), /GOVERNANCE_PASS/);
});
test('CHECK A — CRITICAL profile without an admission record fails closed', () => {
  const file = recordFile({ TASK_ID: SEEDED_TASK_ID, TASK_PROFILE: 'PRODUCTION_BOUND', READ_FILES: ['AGENTS.md', 'docs/INDEX.md'] });
  assert.throws(() => run('receipt', file), /RECEIPT: ADMISSION_PATH is required for PRODUCTION_BOUND work/);
});
test('CHECK A — receipt pointing at a DENIED admission record fails closed', () => {
  const adm = recordFile(baseCritical({ TASK_ID: SEEDED_TASK_ID, IMPLEMENTATION_AUTHORIZATION: 'NOT_AUTHORIZED' }));
  const file = recordFile({ TASK_ID: SEEDED_TASK_ID, TASK_PROFILE: 'PRODUCTION_BOUND', ADMISSION_PATH: adm, READ_FILES: ['AGENTS.md'] });
  assert.throws(() => run('receipt', file), /RECEIPT: ADMISSION_GATE: ADMISSION_DENIED: IMPLEMENTATION_NOT_AUTHORIZED/);
});
test('CHECK A — admission record TASK_ID must match the receipt TASK_ID', () => {
  const adm = recordFile(baseStandard({ TASK_ID: SEEDED_TASK_ID }));
  const file = recordFile({ TASK_ID: 'SOME-OTHER-TASK', TASK_PROFILE: 'CODE_NO_DEPLOY', ADMISSION_PATH: adm, READ_FILES: ['AGENTS.md'] });
  assert.throws(() => run('receipt', file), /RECEIPT: admission record TASK_ID mismatch/);
});
test('CHECK A — CRITICAL report without an admission record fails closed (close-out)', () => {
  const file = recordFile({
    TASK_ID: SEEDED_TASK_ID, TASK_TYPE: 'PRODUCTION_BOUND', SOURCE_SHA: 'abc', CURRENT_STATE: 'HUMAN_GATE', NEXT_STATE: 'PLANNED', NEXT_ACTION: 'x', NEXT_ACTION_AUTONOMOUS: 'NO', HUMAN_DECISION_REQUIRED: 'NO', BLOCKER: 'NONE', PRODUCTION_BOUND: 'NO', PRODUCTION_DEPLOYED: 'NO', PRODUCTION_ACCEPTANCE: 'N/A', MAIN_INTEGRATED: 'NO', MAIN_CI: 'N/A', BRANCH_RETIRED: 'NO', TASK_STATUS: 'ACTIVE',
    UI_CHANGED: 'NO', UI_CONFORMANCE: 'N/A', UI_CONFORMANCE_DECISION: 'N/A', UI_CONFORMANCE_EVIDENCE: 'N/A',
    REPORT_PERSISTED: 'NO', REPORT_VALIDATED: 'NO', REPORT_DELIVERED: 'N/A', REPORT_PATH: 'N/A', OWNER_REPORT_PATH: 'N/A',
  });
  assert.throws(() => run('report', file), /REPORT: ADMISSION_PATH is required for PRODUCTION_BOUND work/);
});

// --- bulk structural validation (CI lane) ---
test('admissions bulk: valid records pass and GRANTED records do not fail the repo check', () => {
  const out = run('admissions', 'docs/admissions');
  assert.match(out, /ADMISSIONS_PASS \d+ records/);
  assert.match(out, /ADMISSION_GRANTED WORKOUT-V2-IMPL-01/);
  assert.match(out, /ADMISSION_GRANTED WP-06/);
  assert.match(out, /ADMISSION_GRANTED WP-07/);
  assert.match(out, /granted: 18/); // parent + admitted Workout V2 work packages + correction cycle + governed Beta capability + storage hygiene
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
