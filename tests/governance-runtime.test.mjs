import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const root = process.cwd();
const checker = path.join(root, 'scripts/governance-runtime.mjs');
function run(...args) { return execFileSync(process.execPath, [checker, ...args], { cwd: root, encoding: 'utf8' }); }
function runWithEnv(args, overrides) { return execFileSync(process.execPath, [checker, ...args], { cwd: root, encoding: 'utf8', env: {...process.env, ...overrides} }); }
function tempJson(value) { const file = path.join(os.tmpdir(), `governance-${Date.now()}-${Math.random()}.json`); fs.writeFileSync(file, JSON.stringify(value)); return file; }
function tempText(value) { const file = path.join(os.tmpdir(), `governance-${Date.now()}-${Math.random()}.md`); fs.writeFileSync(file, value); return file; }
function readTaggedJson(file, tag) {
  const content = fs.readFileSync(file, 'utf8');
  const match = content.match(new RegExp('<!-- ' + tag + ':BEGIN -->\\s*```json\\s*([\\s\\S]*?)```\\s*<!-- ' + tag + ':END -->'));
  assert.ok(match, `missing ${tag}`);
  return {content, value: JSON.parse(match[1])};
}
function replaceTaggedJson(content, tag, value) {
  const pattern = new RegExp('(<!-- ' + tag + ':BEGIN -->\\s*```json\\s*)[\\s\\S]*?(\\s*```\\s*<!-- ' + tag + ':END -->)');
  return content.replace(pattern, `$1${JSON.stringify(value, null, 2)}$2`);
}

test('known profile and docs route pass', () => { assert.match(run('profile', 'CODE_NO_DEPLOY'), /GOVERNANCE_PASS/); assert.match(run('docs'), /GOVERNANCE_PASS/); });
test('Workout V2 ready-work selection is repository-driven and selection-only', () => {
  const output = run('workout-v2-ready');
  const result = JSON.parse(output.replace(/\nGOVERNANCE_PASS\s*$/, ''));
  assert.deepEqual(result.readyTasks.map((task) => task.id), ['WP-14', 'WP-09', 'WP-10', 'WP-13']);
  assert.deepEqual(result.readyTasks.map((task) => task.eligibility), ['READY_DERIVED', 'READY_DERIVED', 'READY_DERIVED', 'READY_DERIVED']);
  assert.ok(result.readyTasks.every((task) => task.eligibilityDerivedAutomatically === true));
  assert.deepEqual(result.nextAdmissionCandidates, ['WP-14', 'WP-09', 'WP-10', 'WP-13']);
  assert.equal(result.ownerPromptRequiredToSelectNextTask, 'NO');
  assert.equal(result.selectionOnly, true);
  const blocked = new Map(result.blockedWork.map((item) => [item.id, item.blockers]));
  assert.ok(blocked.get('WP-08')?.includes('DEPENDENCIES_UNSATISFIED=WP-14'));
  assert.ok(blocked.get('WP-08')?.includes('CAPABILITIES_UNSATISFIED=V2_SESSION_CONTROL_ACTIONS_V1,V2_DEFERRED_SKIPPED_STATE_V1,V2_COMPLETION_ELIGIBILITY_V1,V2_EXIT_ORCHESTRATION_ACTION_V1'));
  assert.ok(blocked.get('WP-12')?.some((blocker) => blocker.startsWith('DEPENDENCIES_UNSATISFIED=WP-13')));
  assert.ok(blocked.get('WP-12')?.includes('DEPENDENCIES_UNSATISFIED=WP-13,WP-14'));
  assert.ok(!blocked.get('WP-12')?.some((blocker) => blocker.startsWith('AUTONOMOUS_ELIGIBILITY=')));
  assert.ok(!blocked.get('GATE-01')?.some((blocker) => blocker.startsWith('AUTONOMOUS_ELIGIBILITY=')));
  assert.ok(blocked.get('GATE-01')?.includes('DEPENDENCIES_UNSATISFIED=WP-12'));
  assert.ok(blocked.get('RUN-5-OWNER-ACCEPTANCE')?.includes('COMPLETE_FLOW_OWNER_GATE'));
});
test('WP-08 cannot become READY when its provider is closed but the capability is absent', () => {
  const stateSource = readTaggedJson(path.join(root, 'docs/TASKS.md'), 'WORKOUT_V2_AUTONOMOUS_STATE');
  const dagSource = readTaggedJson(path.join(root, 'docs/specs/0001-workout-experience/dependencies.md'), 'WORKOUT_V2_AUTONOMOUS_DAG');
  const state = structuredClone(stateSource.value);
  const wp14State = state.items.find((item) => item.id === 'WP-14');
  assert.ok(wp14State);
  wp14State.status = 'CLOSED';
  wp14State.frozen = true;
  const dag = structuredClone(dagSource.value);
  const wp14Node = dag.nodes.find((node) => node.id === 'WP-14');
  assert.ok(wp14Node);
  wp14Node.providesCapabilities = [];
  const stateFile = tempText(replaceTaggedJson(stateSource.content, 'WORKOUT_V2_AUTONOMOUS_STATE', state));
  const dagFile = tempText(replaceTaggedJson(dagSource.content, 'WORKOUT_V2_AUTONOMOUS_DAG', dag));
  assert.throws(
    () => runWithEnv(['workout-v2-ready'], {WORKOUT_V2_STATE_FILE: stateFile, WORKOUT_V2_DAG_FILE: dagFile}),
    /capability V2_SESSION_CONTROL_ACTIONS_V1 is not provided by declared provider WP-14/,
  );
});
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
