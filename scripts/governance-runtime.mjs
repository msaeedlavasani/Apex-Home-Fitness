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
// Base lifecycle fields (unchanged) — UI conformance and report-delivery fields
// below are the extended contract (see docs/governance/UI-CONFORMANCE-GATE.md
// and docs/governance/REPORT-DELIVERY-CONTRACT.md).
const fields = ['TASK_ID', 'TASK_TYPE', 'SOURCE_SHA', 'CURRENT_STATE', 'NEXT_STATE', 'NEXT_ACTION', 'NEXT_ACTION_AUTONOMOUS', 'HUMAN_DECISION_REQUIRED', 'BLOCKER', 'PRODUCTION_BOUND', 'PRODUCTION_DEPLOYED', 'PRODUCTION_ACCEPTANCE', 'MAIN_INTEGRATED', 'MAIN_CI', 'BRANCH_RETIRED', 'TASK_STATUS',
  // UI Conformance Gate contract
  'UI_CHANGED', 'UI_CONFORMANCE', 'UI_CONFORMANCE_DECISION', 'UI_CONFORMANCE_EVIDENCE',
  // Report Delivery contract
  'REPORT_PERSISTED', 'REPORT_VALIDATED', 'REPORT_DELIVERED', 'REPORT_PATH', 'OWNER_REPORT_PATH'];
const enums = {
  UI_CHANGED: ['YES', 'NO'],
  UI_CONFORMANCE: ['PASS', 'N/A'],
  UI_CONFORMANCE_DECISION: ['REUSE', 'EXTEND', 'AUTHORIZED_PARALLEL'],
  REPORT_PERSISTED: ['YES', 'NO'],
  REPORT_VALIDATED: ['YES', 'NO'],
  REPORT_DELIVERED: ['YES', 'NO', 'N/A'],
};
// Static UI-conformance guard allowlists (KIT-FIRST; changes require owner
// authorization in review — see docs/governance/UI-CONFORMANCE-GATE.md).
const UI_KIT_ALLOWLIST = ['platform']; // dirs permitted under src/components/ui
const MUI_ALLOWLIST = ['src/components/providers/MuiProvider.tsx', 'src/lib/ui/muiTheme.ts'];
const UI_GATE_DOCS = ['docs/governance/UI-CONFORMANCE-GATE.md', 'docs/governance/REPORT-DELIVERY-CONTRACT.md'];

function fail(message) { console.error(`GOVERNANCE_FAIL: ${message}`); process.exitCode = 1; }
function readJson(file) { return JSON.parse(fs.readFileSync(path.resolve(file), 'utf8')); }
function checkProfile(profile) {
  const config = profiles[profile];
  if (!config) { fail(`unknown TASK_PROFILE: ${profile}`); return; }
  for (const file of config.requiredDocs) if (!fs.existsSync(path.join(root, file))) fail(`required governance document missing: ${file}`);
}
function checkEnum(report, field, values) {
  if (!values.includes(report[field])) fail(`${field} must be one of ${values.join('|')}`);
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
  // --- UI Conformance Gate (machine-enforced part) ---
  checkEnum(report, 'UI_CHANGED', enums.UI_CHANGED);
  checkEnum(report, 'UI_CONFORMANCE', enums.UI_CONFORMANCE);
  if (report.UI_CHANGED === 'YES') {
    checkEnum(report, 'UI_CONFORMANCE_DECISION', enums.UI_CONFORMANCE_DECISION);
    if (report.UI_CONFORMANCE !== 'PASS') fail('UI_CHANGED=YES requires UI_CONFORMANCE=PASS');
    if (!report.UI_CONFORMANCE_EVIDENCE || !fs.existsSync(path.resolve(report.UI_CONFORMANCE_EVIDENCE))) {
      fail('UI_CHANGED=YES requires UI_CONFORMANCE_EVIDENCE pointing to an existing file (REUSE/EXTEND justification)');
    }
  } else {
    if (!['N/A', 'PASS'].includes(report.UI_CONFORMANCE)) fail('UI_CHANGED=NO requires UI_CONFORMANCE=N/A or PASS');
    if (report.UI_CONFORMANCE_DECISION !== 'N/A') fail('UI_CONFORMANCE_DECISION=N/A required when UI_CHANGED=NO');
  }
  // --- Report Delivery contract (machine-enforced part) ---
  // Owner report destination is change-protected (see
  // docs/governance/REPORT-DELIVERY-CONTRACT.md): REPORT_PATH is the
  // repo-local runtime/temporary path; OWNER_REPORT_PATH is the absolute
  // exported path in the Owner report destination. REPORT_DELIVERED=YES
  // requires a successful Owner-path export.
  checkEnum(report, 'REPORT_PERSISTED', enums.REPORT_PERSISTED);
  checkEnum(report, 'REPORT_VALIDATED', enums.REPORT_VALIDATED);
  checkEnum(report, 'REPORT_DELIVERED', enums.REPORT_DELIVERED);
  if (!report.REPORT_PATH) fail('REPORT_PATH is required (repo runtime path; N/A when none)');
  if (!report.OWNER_REPORT_PATH) fail('OWNER_REPORT_PATH is required (Owner report destination export; N/A when none)');
  const runtimePathOk = report.REPORT_PATH !== 'N/A' && fs.existsSync(path.resolve(report.REPORT_PATH));
  const ownerPathOk = report.OWNER_REPORT_PATH !== 'N/A' && fs.existsSync(path.resolve(report.OWNER_REPORT_PATH));
  if (report.REPORT_PERSISTED === 'YES') {
    if (!runtimePathOk && !ownerPathOk) fail('REPORT_PERSISTED=YES requires REPORT_PATH or OWNER_REPORT_PATH pointing to an existing report file');
  } else {
    if (report.REPORT_PATH !== 'N/A' || report.OWNER_REPORT_PATH !== 'N/A') fail('REPORT_PERSISTED=NO requires REPORT_PATH=N/A and OWNER_REPORT_PATH=N/A');
  }
  if (report.REPORT_DELIVERED === 'YES') {
    if (report.REPORT_PERSISTED !== 'YES') fail('REPORT_DELIVERED=YES requires REPORT_PERSISTED=YES');
    if (!ownerPathOk) fail('REPORT_DELIVERED=YES requires OWNER_REPORT_PATH pointing to the exported Owner-destination report file');
  }
}
function checkReceipt(file) {
  const receipt = readJson(file);
  if (!receipt.TASK_ID || !receipt.TASK_PROFILE || !Array.isArray(receipt.READ_FILES) || receipt.READ_FILES.length === 0) fail('context receipt requires TASK_ID, TASK_PROFILE, and READ_FILES');
  checkProfile(receipt.TASK_PROFILE);
  for (const filePath of receipt.READ_FILES ?? []) if (!fs.existsSync(path.resolve(filePath))) fail(`receipt references missing file: ${filePath}`);
}
/**
 * Static UI-conformance guard (KIT-FIRST). Scans a target dir (default: src)
 * and fails closed when:
 *  - a file imports @mui/material outside the MUI allowlist; or
 *  - a new top-level kit directory appears under src/components/ui outside
 *    the registered UI kit allowlist (a parallel/competing visual system).
 * Authorized exceptions require an explicit allowlist change reviewed by the
 * Owner (visible in the task diff); there is no runtime escape hatch.
 */
function checkUi(target = 'src') {
  for (const doc of UI_GATE_DOCS) if (!fs.existsSync(path.join(root, doc))) fail(`UI conformance governance document missing: ${doc}`);
  const srcRoot = path.resolve(root, target);
  if (!fs.existsSync(srcRoot)) { fail(`UI scan target missing: ${target}`); return; }
  const walk = (dir) => fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = path.join(dir, e.name);
    return e.isDirectory() ? walk(p) : [p];
  });
  for (const file of walk(srcRoot)) {
    if (!/\.(ts|tsx|js|jsx|mjs)$/.test(file)) continue;
    const rel = path.relative(root, file).split(path.sep).join('/');
    if (rel.startsWith('node_modules')) continue;
    const text = fs.readFileSync(file, 'utf8');
    if (/from\s*['"]@mui\/material['"]/.test(text) && !MUI_ALLOWLIST.includes(rel)) {
      fail(`MUI import outside allowlist (KIT-FIRST): ${rel} — record a documented unmet requirement and allowlist change instead`);
    }
  }
  const uiDir = path.join(srcRoot, 'components/ui');
  if (fs.existsSync(uiDir)) {
    for (const entry of fs.readdirSync(uiDir, { withFileTypes: true })) {
      if (entry.isDirectory() && !UI_KIT_ALLOWLIST.includes(entry.name)) {
        fail(`unregistered UI kit directory (parallel visual system fails closed): ${entry.name}`);
      }
    }
  }
}
const [command, arg] = process.argv.slice(2);
if (command === 'profile') checkProfile(arg);
else if (command === 'report') checkReport(arg);
else if (command === 'receipt') checkReceipt(arg);
else if (command === 'ui') checkUi(arg);
else if (command === 'docs') {
  const index = fs.readFileSync(path.join(root, 'docs/INDEX.md'), 'utf8');
  for (const file of ['AGENTS.md', 'docs/governance/DOCUMENTATION-GOVERNANCE.md', 'docs/AI_CHANGE_TEMPLATE.md', 'docs/PITFALL_GUARDRAILS.md']) if (!index.includes(file.replace('docs/', ''))) fail(`INDEX missing governance route: ${file}`);
} else { fail('usage: governance-runtime.mjs profile <PROFILE> | report <JSON> | receipt <JSON> | docs | ui [TARGET]'); }
if (!process.exitCode) console.log('GOVERNANCE_PASS');