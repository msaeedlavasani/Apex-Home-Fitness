#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const profiles = {
  DOCS_ONLY: { productionBound: false, requiredDocs: ['AGENTS.md', 'docs/INDEX.md', 'docs/governance/DOCUMENTATION-GOVERNANCE.md', 'docs/AI_CHANGE_TEMPLATE.md'] },
  CODE_NO_DEPLOY: { productionBound: false, requiredDocs: ['AGENTS.md', 'docs/INDEX.md', 'docs/governance/DOCUMENTATION-GOVERNANCE.md', 'docs/CI.md'] },
  PRODUCTION_BOUND: { productionBound: true, requiredDocs: ['AGENTS.md', 'docs/INDEX.md', 'docs/RELEASE_POLICY.md', 'docs/FEATURE_TO_PRODUCTION.md', 'docs/PITFALL_GUARDRAILS.md'] },
  INCIDENT: { productionBound: true, requiredDocs: ['AGENTS.md', 'docs/INDEX.md', 'docs/PRODUCTION_INCIDENT_LEDGER.md', 'docs/PITFALL_GUARDRAILS.md'] },
  AUDIT: { productionBound: false, requiredDocs: ['AGENTS.md', 'docs/INDEX.md', 'docs/governance/DOCUMENTATION-GOVERNANCE.md'] },
  RELEASE: { productionBound: true, requiredDocs: ['AGENTS.md', 'docs/INDEX.md', 'docs/RELEASE_POLICY.md', 'docs/FEATURE_TO_PRODUCTION.md', 'docs/RELEASING.md'] },
  HOTFIX: { productionBound: true, requiredDocs: ['AGENTS.md', 'docs/INDEX.md', 'docs/RELEASE_POLICY.md', 'docs/PRODUCTION_CHECKPOINTS.md'] },
  DB_CHANGE: { productionBound: true, requiredDocs: ['AGENTS.md', 'docs/INDEX.md', 'docs/RELEASE_POLICY.md', 'docs/ENVIRONMENT_CONTRACT.md', 'docs/PRODUCTION_CHECKPOINTS.md'] },
};
const states = new Set(['PLANNED', 'ACTIVE', 'SOURCE_VALIDATED', 'BRANCH_CI_PASS', 'READY_FOR_PRODUCTION', 'DEPLOYED', 'PRODUCTION_PASS', 'MAINLINE_INTEGRATED', 'CLOSED', 'BLOCKED', 'HUMAN_GATE']);
const fields = ['TASK_ID', 'TASK_TYPE', 'SOURCE_SHA', 'CURRENT_STATE', 'NEXT_STATE', 'NEXT_ACTION', 'NEXT_ACTION_AUTONOMOUS', 'HUMAN_DECISION_REQUIRED', 'BLOCKER', 'PRODUCTION_BOUND', 'PRODUCTION_DEPLOYED', 'PRODUCTION_ACCEPTANCE', 'MAIN_INTEGRATED', 'MAIN_CI', 'BRANCH_RETIRED', 'TASK_STATUS'];
function fail(message) { console.error(`GOVERNANCE_FAIL: ${message}`); process.exitCode = 1; }
function readJson(file) { return JSON.parse(fs.readFileSync(path.resolve(file), 'utf8')); }
function checkProfile(profile) {
  const config = profiles[profile];
  if (!config) { fail(`unknown TASK_PROFILE: ${profile}`); return; }
  for (const file of config.requiredDocs) if (!fs.existsSync(path.join(root, file))) fail(`required governance document missing: ${file}`);
}
function checkReport(file) {
  const report = readJson(file);
  for (const field of fields) if (!(field in report)) fail(`report field missing: ${field}`);
  if (report.CURRENT_STATE && !states.has(report.CURRENT_STATE)) fail(`invalid CURRENT_STATE: ${report.CURRENT_STATE}`);
  if (report.NEXT_STATE && report.NEXT_STATE !== 'NONE' && !states.has(report.NEXT_STATE)) fail(`invalid NEXT_STATE: ${report.NEXT_STATE}`);
  if (!['YES', 'NO'].includes(report.NEXT_ACTION_AUTONOMOUS)) fail('NEXT_ACTION_AUTONOMOUS must be YES or NO');
  if (!['YES', 'NO'].includes(report.HUMAN_DECISION_REQUIRED)) fail('HUMAN_DECISION_REQUIRED must be YES or NO');
  if (report.TASK_STATUS === 'CLOSED' && (report.CURRENT_STATE !== 'CLOSED' || report.NEXT_STATE !== 'NONE')) fail('CLOSED report must have CURRENT_STATE=CLOSED and NEXT_STATE=NONE');
  if (report.PRODUCTION_BOUND === 'NO' && report.PRODUCTION_DEPLOYED !== 'NO' && report.PRODUCTION_DEPLOYED !== 'N/A') fail('non-production task cannot be deployed');
}
function checkReceipt(file) {
  const receipt = readJson(file);
  if (!receipt.TASK_ID || !receipt.TASK_PROFILE || !Array.isArray(receipt.READ_FILES) || receipt.READ_FILES.length === 0) fail('context receipt requires TASK_ID, TASK_PROFILE, and READ_FILES');
  checkProfile(receipt.TASK_PROFILE);
  for (const filePath of receipt.READ_FILES ?? []) if (!fs.existsSync(path.resolve(filePath))) fail(`receipt references missing file: ${filePath}`);
}
const [command, arg] = process.argv.slice(2);
if (command === 'profile') checkProfile(arg);
else if (command === 'report') checkReport(arg);
else if (command === 'receipt') checkReceipt(arg);
else if (command === 'docs') {
  const index = fs.readFileSync(path.join(root, 'docs/INDEX.md'), 'utf8');
  for (const file of ['AGENTS.md', 'docs/governance/DOCUMENTATION-GOVERNANCE.md', 'docs/AI_CHANGE_TEMPLATE.md', 'docs/PITFALL_GUARDRAILS.md']) if (!index.includes(file.replace('docs/', ''))) fail(`INDEX missing governance route: ${file}`);
} else { fail('usage: governance-runtime.mjs profile <PROFILE> | report <JSON> | receipt <JSON> | docs'); }
if (!process.exitCode) console.log('GOVERNANCE_PASS');
