import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const root = process.cwd();
const checker = path.join(root, 'scripts/governance-runtime.mjs');
function run(...args) { return execFileSync(process.execPath, [checker, ...args], { cwd: root, encoding: 'utf8' }); }
function tempJson(value) { const file = path.join(os.tmpdir(), `governance-${Date.now()}-${Math.random()}.json`); fs.writeFileSync(file, JSON.stringify(value)); return file; }

test('known profile and docs route pass', () => { assert.match(run('profile', 'CODE_NO_DEPLOY'), /GOVERNANCE_PASS/); assert.match(run('docs'), /GOVERNANCE_PASS/); });
test('unknown profile fails closed', () => { assert.throws(() => run('profile', 'UNKNOWN')); });
test('valid context receipt passes', () => { const file = tempJson({ TASK_ID: 'T', TASK_PROFILE: 'DOCS_ONLY', READ_FILES: ['AGENTS.md', 'docs/INDEX.md'] }); assert.match(run('receipt', file), /GOVERNANCE_PASS/); });
test('receipt with missing file fails', () => { const file = tempJson({ TASK_ID: 'T', TASK_PROFILE: 'DOCS_ONLY', READ_FILES: ['missing-governance.md'] }); assert.throws(() => run('receipt', file)); });
test('closed report requires terminal state', () => { const file = tempJson({ TASK_ID: 'T', TASK_TYPE: 'DOCS_ONLY', SOURCE_SHA: 'abc', CURRENT_STATE: 'ACTIVE', NEXT_STATE: 'CLOSED', NEXT_ACTION: 'x', NEXT_ACTION_AUTONOMOUS: 'YES', HUMAN_DECISION_REQUIRED: 'NO', BLOCKER: 'NONE', PRODUCTION_BOUND: 'NO', PRODUCTION_DEPLOYED: 'NO', PRODUCTION_ACCEPTANCE: 'N/A', MAIN_INTEGRATED: 'NO', MAIN_CI: 'N/A', BRANCH_RETIRED: 'NO', TASK_STATUS: 'CLOSED' }); assert.throws(() => run('report', file)); });
test('invalid report state fails', () => { const file = tempJson({ TASK_ID: 'T', TASK_TYPE: 'X', SOURCE_SHA: 'abc', CURRENT_STATE: 'INVALID', NEXT_STATE: 'NONE', NEXT_ACTION: 'x', NEXT_ACTION_AUTONOMOUS: 'NO', HUMAN_DECISION_REQUIRED: 'NO', BLOCKER: 'x', PRODUCTION_BOUND: 'NO', PRODUCTION_DEPLOYED: 'NO', PRODUCTION_ACCEPTANCE: 'N/A', MAIN_INTEGRATED: 'NO', MAIN_CI: 'N/A', BRANCH_RETIRED: 'NO', TASK_STATUS: 'BLOCKED' }); assert.throws(() => run('report', file)); });

// --- UI Conformance Gate + Report Delivery contract (2026-09-01) ---
function tempPath(content = 'x') { const file = path.join(os.tmpdir(), `report-${Date.now()}-${Math.random()}.md`); fs.writeFileSync(file, content); return file; }
function baseReport(overrides = {}) {
  return {
    TASK_ID: 'T', TASK_TYPE: 'DOCS_ONLY', SOURCE_SHA: 'abc', CURRENT_STATE: 'HUMAN_GATE', NEXT_STATE: 'PLANNED', NEXT_ACTION: 'x', NEXT_ACTION_AUTONOMOUS: 'NO', HUMAN_DECISION_REQUIRED: 'NO', BLOCKER: 'NONE', PRODUCTION_BOUND: 'NO', PRODUCTION_DEPLOYED: 'NO', PRODUCTION_ACCEPTANCE: 'N/A', MAIN_INTEGRATED: 'NO', MAIN_CI: 'N/A', BRANCH_RETIRED: 'NO', TASK_STATUS: 'ACTIVE',
    UI_CHANGED: 'NO', UI_CONFORMANCE: 'N/A', UI_CONFORMANCE_DECISION: 'N/A', UI_CONFORMANCE_EVIDENCE: 'N/A',
    REPORT_PERSISTED: 'YES', REPORT_VALIDATED: 'YES', REPORT_DELIVERED: 'NO', REPORT_PATH: 'reports/example.md', OWNER_REPORT_PATH: 'N/A',
    ...overrides,
  };
}
test('REPORT_DELIVERED=YES requires an exported Owner-path file', () => {
  const file = tempJson(baseReport({ REPORT_DELIVERED: 'YES', OWNER_REPORT_PATH: 'N/A', REPORT_PATH: tempPath() }));
  assert.throws(() => run('report', file), /OWNER_REPORT_PATH/);
});
test('persisted via Owner-path export only passes and delivers', () => {
  const ownerFile = tempPath();
  const file = tempJson(baseReport({ REPORT_PATH: 'N/A', OWNER_REPORT_PATH: ownerFile, REPORT_DELIVERED: 'YES' }));
  assert.match(run('report', file), /GOVERNANCE_PASS/);
});
test('REPORT_PERSISTED=NO requires both paths N/A', () => {
  const file = tempJson(baseReport({ REPORT_PERSISTED: 'NO', REPORT_PATH: tempPath(), OWNER_REPORT_PATH: 'N/A' }));
  assert.throws(() => run('report', file));
});
test('REPORT_DELIVERED=YES with missing OWNER_REPORT_PATH file fails', () => {
  const file = tempJson(baseReport({ REPORT_DELIVERED: 'YES', OWNER_REPORT_PATH: '/tmp/never-exported-owner-report.md', REPORT_PATH: tempPath() }));
  assert.throws(() => run('report', file), /OWNER_REPORT_PATH/);
});
test('valid non-UI report with delivery fields passes', () => {
  const reportFile = tempPath();
  const file = tempJson(baseReport({ REPORT_PATH: reportFile }));
  assert.match(run('report', file), /GOVERNANCE_PASS/);
});
test('UI_CHANGED=YES without conformance evidence fails closed', () => {
  const file = tempJson(baseReport({ UI_CHANGED: 'YES', UI_CONFORMANCE: 'PASS', UI_CONFORMANCE_DECISION: 'REUSE', UI_CONFORMANCE_EVIDENCE: 'does-not-exist.md' }));
  assert.throws(() => run('report', file));
});
test('UI_CHANGED=YES with PASS+decision+evidence passes', () => {
  const evidence = tempPath();
  const reportFile = tempPath();
  const file = tempJson(baseReport({ UI_CHANGED: 'YES', UI_CONFORMANCE: 'PASS', UI_CONFORMANCE_DECISION: 'EXTEND', UI_CONFORMANCE_EVIDENCE: evidence, REPORT_PATH: reportFile }));
  assert.match(run('report', file), /GOVERNANCE_PASS/);
});
test('REPORT_PERSISTED=YES without existing REPORT_PATH fails', () => {
  const file = tempJson(baseReport({ REPORT_PATH: 'reports/never-written.md' }));
  assert.throws(() => run('report', file));
});
test('REPORT_DELIVERED=YES without persisted file fails', () => {
  const file = tempJson(baseReport({ REPORT_DELIVERED: 'YES', REPORT_PATH: 'reports/never-written.md' }));
  assert.throws(() => run('report', file));
});
function tmpSourceTree() { const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ui-scan-')); fs.mkdirSync(path.join(dir, 'app'), { recursive: true }); return dir; }
test('ui scan passes on clean target', () => {
  const dir = tmpSourceTree();
  fs.writeFileSync(path.join(dir, 'app', 'ok.tsx'), 'import {Button} from "./platform";');
  assert.match(run('ui', dir), /GOVERNANCE_PASS/);
});
test('ui scan fails closed on MUI import outside allowlist', () => {
  const dir = tmpSourceTree();
  fs.writeFileSync(path.join(dir, 'app', 'bad.tsx'), 'import {Button} from "@mui/material";');
  assert.throws(() => run('ui', dir), /MUI import outside allowlist/);
});
test('ui scan fails closed on unregistered UI kit directory', () => {
  const dir = tmpSourceTree();
  fs.mkdirSync(path.join(dir, 'components'), { recursive: true });
  fs.mkdirSync(path.join(dir, 'components', 'ui', 'mykit'), { recursive: true });
  assert.throws(() => run('ui', dir), /unregistered UI kit directory/);
});
