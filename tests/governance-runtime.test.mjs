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
