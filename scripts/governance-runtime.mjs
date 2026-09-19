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

// --- Development Admission Gate linkage (Stage 6, trust-boundary CHECK A) ---
// Executable (code-class) tasks MUST carry a GRANTED admission record; its
// absence fails the receipt (task start) and the report (task close-out).
// Exempt profiles: DOCS_ONLY (docs work), AUDIT (read-only), INCIDENT
// (urgent incident response must not be blocked by spec admission).
const ADMISSION_REQUIRED_PROFILES = ['CODE_NO_DEPLOY', 'PRODUCTION_BOUND', 'DB_CHANGE', 'HOTFIX', 'RELEASE'];
function checkAdmissionLinkage(record, kind) {
  if (!ADMISSION_REQUIRED_PROFILES.includes(record.TASK_PROFILE || record.TASK_TYPE)) return;
  if (typeof record.ADMISSION_PATH !== 'string' || !record.ADMISSION_PATH.trim())
    fail(`${kind}: ADMISSION_PATH is required for ${record.TASK_PROFILE || record.TASK_TYPE} work (STANDARD/CRITICAL executable tasks must pass the Development Admission Gate — see docs/governance/DEVELOPMENT-ADMISSION.md)`);
  else {
    const file = path.resolve(root, record.ADMISSION_PATH);
    if (!fs.existsSync(file)) fail(`${kind}: ADMISSION_PATH points to a missing admission record: ${record.ADMISSION_PATH}`);
    else {
      let adm;
      try { adm = readJson(file); } catch { fail(`${kind}: unreadable admission record: ${record.ADMISSION_PATH}`); }
      if (adm) {
        try { validateAdmission(adm); } catch (err) { fail(`${kind}: ADMISSION_GATE: ${String(err.message || err)}`); }
        if (process.exitCode !== 1 && adm.TASK_ID !== record.TASK_ID)
          fail(`${kind}: admission record TASK_ID mismatch: ${adm.TASK_ID} != ${record.TASK_ID}`);
      }
    }
  }
}
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
  checkAdmissionLinkage(report, 'REPORT');
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
  checkAdmissionLinkage(receipt, 'RECEIPT');
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
/**
 * Development Admission Gate (Stage 6, 2026-09-14).
 *
 * Fail-closed admission validation for STANDARD / CRITICAL implementation work:
 * no STANDARD/CRITICAL implementation may begin unless its controlling spec
 * exists, is READY, carries no blocking owner decisions, has the required
 * architecture/work-package preparation (CRITICAL), and is explicitly
 * implementation-authorized. LIGHT records only declare an isolated local scope
 * (anything else must be reclassified).
 *
 * Commands:
 *   admission <file>    validate ONE record; prints ADMISSION_GRANTED (exit 0),
 *                       ADMISSION_DENIED: <reason> (exit 1 — structurally valid
 *                       but gates unmet, e.g. awaiting owner authorization), or
 *                       ADMISSION_INVALID: <reason> (exit 1, malformed record).
 *   admissions [dir]    bulk STRUCTURAL validation of every *.admission.json in
 *                       dir (default docs/admissions). Used by CI: any INVALID
 *                       record fails the run. DENIED records are valid task states
 *                       (e.g. spec READY but implementation not yet authorized) and
 *                       do not fail CI.
 *
 * See docs/governance/DEVELOPMENT-ADMISSION.md for the contract.
 */
function admissionInvalid(reason) { const e = new Error(`ADMISSION_INVALID: ${reason}`); e.kind = 'INVALID'; throw e; }
function admissionDenied(reason) { const e = new Error(`ADMISSION_DENIED: ${reason}`); e.kind = 'DENIED'; throw e; }
function admissionRequireString(value, field) { if (typeof value !== 'string' || !value.trim()) admissionInvalid(`missing required field: ${field}`); }
function admissionRequireEnum(value, field, values) { admissionRequireString(value, field); if (!values.includes(value)) admissionInvalid(`${field} must be one of ${values.join('|')}`); }
function admissionRequireExistingRepoFile(value, field) { admissionRequireString(value, field); if (!fs.existsSync(path.resolve(root, value))) admissionInvalid(`${field} points to a missing file: ${value}`); }
function validateAdmission(record) {
  admissionRequireString(record.TASK_ID, 'TASK_ID');
  admissionRequireEnum(record.TASK_CLASS, 'TASK_CLASS', ['LIGHT', 'STANDARD', 'CRITICAL']);
  admissionRequireString(record.SCOPE_SUMMARY, 'SCOPE_SUMMARY');

  if (record.TASK_CLASS === 'LIGHT') {
    // LIGHT is only for isolated, low-risk, local changes. Anything shared,
    // cross-module or architectural must be reclassified before it can proceed.
    admissionRequireEnum(record.LIGHT_SCOPE, 'LIGHT_SCOPE', ['ISOLATED_LOCAL', 'CROSS_MODULE_OR_SHARED']);
    if (record.LIGHT_SCOPE !== 'ISOLATED_LOCAL') admissionDenied('RECLASSIFICATION_REQUIRED — LIGHT scope violation: shared/cross-module change must run STANDARD/CRITICAL admission');
    if (record.SPEC_REQUIRED === 'YES') admissionInvalid('LIGHT cannot declare SPEC_REQUIRED=YES — reclassify to STANDARD/CRITICAL');
    return `ADMISSION_GRANTED ${record.TASK_ID} (LIGHT, isolated local scope)`;
  }

  // STANDARD / CRITICAL: specification admission is mandatory and fail-closed.
  admissionRequireEnum(record.SPEC_REQUIRED, 'SPEC_REQUIRED', ['YES', 'NO']);
  if (record.SPEC_REQUIRED !== 'YES') admissionInvalid('STANDARD/CRITICAL cannot waive SPEC_REQUIRED');
  admissionRequireEnum(record.SPEC_FIND_BEFORE_CREATE, 'SPEC_FIND_BEFORE_CREATE', ['REUSED_EXISTING_SPEC', 'EVOLVED_EXISTING_SPEC', 'NEW_SPEC_JUSTIFIED']);
  if (record.SPEC_FIND_BEFORE_CREATE === 'NEW_SPEC_JUSTIFIED') admissionRequireString(record.NEW_SPEC_JUSTIFICATION, 'NEW_SPEC_JUSTIFICATION');
  admissionRequireString(record.SPEC_PATH, 'SPEC_PATH');
  if (!/^docs\/specs\/[^/]+\/spec\.md$/.test(record.SPEC_PATH)) admissionInvalid(`SPEC_PATH must point at a docs/specs/<dir>/spec.md contract (got: ${record.SPEC_PATH}) — prototype files, docs and code are not specifications`);
  admissionRequireExistingRepoFile(record.SPEC_PATH, 'SPEC_PATH');
  // Canonical spec cross-check (trust-boundary CHECK C): readiness/blocking must
  // match the controlling spec's own machine markers, not the record's claim.
  const specContent = fs.readFileSync(path.resolve(root, record.SPEC_PATH), 'utf8');
  const specMarker = (key) => { const m = specContent.match(new RegExp('^' + key + ':\\s*(.+)$', 'm')); return m ? m[1].trim() : null; };
  const specReadiness = specMarker('SPEC_READINESS');
  if (!specReadiness || !['READY', 'NOT_READY'].includes(specReadiness)) admissionInvalid('controlling spec lacks a canonical `SPEC_READINESS: READY|NOT_READY` marker');
  if (specReadiness !== 'READY') admissionDenied('SPEC_NOT_READY — controlling spec marker is NOT_READY');
  const specBlocking = specMarker('BLOCKING_OWNER_DECISIONS');
  if (specBlocking === null) admissionInvalid('controlling spec lacks a canonical `BLOCKING_OWNER_DECISIONS:` marker');
  if (specBlocking !== 'NONE') admissionDenied(`BLOCKING_OWNER_DECISIONS mismatch: canonical spec marker is "${specBlocking}"`);
  admissionRequireEnum(record.SPEC_STATUS, 'SPEC_STATUS', ['READY', 'NOT_READY']);
  if (record.SPEC_STATUS !== 'READY') admissionDenied('SPEC_NOT_READY — controlling specification is not READY');
  admissionRequireString(record.BLOCKING_OWNER_DECISIONS, 'BLOCKING_OWNER_DECISIONS');
  if (record.BLOCKING_OWNER_DECISIONS !== 'NONE') admissionDenied(`BLOCKING_OWNER_DECISIONS remain: ${record.BLOCKING_OWNER_DECISIONS}`);
  admissionRequireEnum(record.IMPLEMENTATION_AUTHORIZATION, 'IMPLEMENTATION_AUTHORIZATION', ['NOT_AUTHORIZED', 'OWNER_AUTHORIZED']);
  if (record.IMPLEMENTATION_AUTHORIZATION === 'NOT_AUTHORIZED') admissionDenied('IMPLEMENTATION_NOT_AUTHORIZED — specification readiness is not implementation authorization');
  // Canonical authorization linkage (trust-boundary CHECK B): the source must be
  // an EXISTING repository artifact that names this task. The trust root is the
  // Owner-reviewed merge of that artifact — an agent cannot conjure it by
  // editing its own admission JSON.
  // Canonical authorization provenance (trust-boundary CHECK B): the source
  // must be the class-specific canonical owner-authorization artifact AND it
  // must actually reference the TASK_ID. TASKS.md is the canonical task
  // authority for STANDARD work; OWNER_DECISION_GATE.md is the canonical owner
  // decision record for CRITICAL work. A mere mention of the TASK_ID in an
  // unrelated context (e.g. a handoff record) does NOT authorize.
  const CANONICAL_TASK_AUTH = 'docs/TASKS.md';
  const CANONICAL_GATE_AUTH = 'docs/governance/OWNER_DECISION_GATE.md';
  admissionRequireString(record.AUTHORIZATION_SOURCE, 'AUTHORIZATION_SOURCE');
  if (record.TASK_CLASS === 'STANDARD') {
    if (record.AUTHORIZATION_SOURCE !== CANONICAL_TASK_AUTH) admissionInvalid(`STANDARD AUTHORIZATION_SOURCE must be ${CANONICAL_TASK_AUTH} (the canonical owner-authorized task record)`);
    if (!fs.readFileSync(path.resolve(root, CANONICAL_TASK_AUTH), 'utf8').includes(record.TASK_ID)) admissionDenied(`AUTHORIZATION_PROVENANCE_FAILURE — ${CANONICAL_TASK_AUTH} does not reference TASK_ID ${record.TASK_ID}`);
  } else {
    if (record.AUTHORIZATION_SOURCE !== CANONICAL_GATE_AUTH) admissionInvalid(`CRITICAL AUTHORIZATION_SOURCE must be ${CANONICAL_GATE_AUTH} (the canonical owner decision record)`);
    if (!fs.readFileSync(path.resolve(root, CANONICAL_GATE_AUTH), 'utf8').includes(record.TASK_ID)) admissionDenied(`AUTHORIZATION_PROVENANCE_FAILURE — ${CANONICAL_GATE_AUTH} does not reference TASK_ID ${record.TASK_ID}`);
  }

  if (record.TASK_CLASS === 'CRITICAL') {
    admissionRequireEnum(record.ARCHITECTURE_PLAN_REQUIRED, 'ARCHITECTURE_PLAN_REQUIRED', ['YES', 'NO']);
    if (record.ARCHITECTURE_PLAN_REQUIRED !== 'YES') admissionInvalid('CRITICAL requires ARCHITECTURE_PLAN_REQUIRED=YES');
    admissionRequireString(record.ARCHITECTURE_PLAN_PATH, 'ARCHITECTURE_PLAN_PATH');
    if (path.posix.dirname(record.ARCHITECTURE_PLAN_PATH) !== path.posix.dirname(record.SPEC_PATH)) admissionInvalid('ARCHITECTURE_PLAN_PATH must live in the controlling spec directory (ownership/consistency)');
    admissionRequireExistingRepoFile(record.ARCHITECTURE_PLAN_PATH, 'ARCHITECTURE_PLAN_PATH');
    admissionRequireEnum(record.ARCHITECTURE_PLAN_STATUS, 'ARCHITECTURE_PLAN_STATUS', ['READY', 'NOT_READY']);
    if (record.ARCHITECTURE_PLAN_STATUS !== 'READY') admissionDenied('ARCHITECTURE_PLAN_NOT_READY');
    // Ownership/consistency (trust-boundary CHECK D): preparation artifacts
    // must live in the SAME spec directory as the controlling spec.
    const specDir = path.posix.dirname(record.SPEC_PATH);
    admissionRequireString(record.WORK_PACKAGES_PATH, 'WORK_PACKAGES_PATH');
    if (path.posix.dirname(record.WORK_PACKAGES_PATH) !== specDir) admissionInvalid('WORK_PACKAGES_PATH must live in the controlling spec directory (ownership/consistency)');
    admissionRequireExistingRepoFile(record.WORK_PACKAGES_PATH, 'WORK_PACKAGES_PATH');
    admissionRequireEnum(record.WORK_PACKAGES_STATUS, 'WORK_PACKAGES_STATUS', ['READY', 'NOT_READY']);
    if (record.WORK_PACKAGES_STATUS !== 'READY') admissionDenied('WORK_PACKAGES_NOT_READY');
    if (record.DEPENDENCY_ANALYSIS_PATH !== undefined) {
      admissionRequireString(record.DEPENDENCY_ANALYSIS_PATH, 'DEPENDENCY_ANALYSIS_PATH');
      if (path.posix.dirname(record.DEPENDENCY_ANALYSIS_PATH) !== specDir) admissionInvalid('DEPENDENCY_ANALYSIS_PATH must live in the controlling spec directory (ownership/consistency)');
      admissionRequireExistingRepoFile(record.DEPENDENCY_ANALYSIS_PATH, 'DEPENDENCY_ANALYSIS_PATH');
    }
    admissionRequireEnum(record.DEPENDENCY_ANALYSIS_STATUS, 'DEPENDENCY_ANALYSIS_STATUS', ['READY', 'NOT_READY']);
    if (record.DEPENDENCY_ANALYSIS_STATUS !== 'READY') admissionDenied('DEPENDENCY_ANALYSIS_NOT_READY');
  }
  return `ADMISSION_GRANTED ${record.TASK_ID} (${record.TASK_CLASS})`;
}
function checkAdmission(file) {
  let record;
  try { record = readJson(file); } catch { fail(`ADMISSION_INVALID: unreadable JSON: ${file}`); return; }
  try { console.log(validateAdmission(record)); } catch (err) { fail(String(err.message || err)); }
}
function checkAdmissions(dir) {
  const target = path.resolve(root, dir || 'docs/admissions');
  if (!fs.existsSync(target)) { console.log(`ADMISSIONS_PASS 0 records (directory absent: ${dir || 'docs/admissions'})`); return; }
  const files = fs.readdirSync(target).filter((f) => f.endsWith('.admission.json')).sort();
  let granted = 0, denied = 0;
  for (const f of files) {
    const file = path.join(target, f);
    let record;
    try { record = readJson(file); } catch { fail(`ADMISSION_INVALID: unreadable JSON: ${file}`); continue; }
    try {
      console.log(validateAdmission(record)); granted += 1;
    } catch (err) {
      if (err && err.kind === 'DENIED') { denied += 1; console.log(`ADMISSION_DENIED ${f}: ${String(err.message).replace('ADMISSION_DENIED: ', '')}`); }
      else { fail(String(err.message || err)); }
    }
  }
  console.log(`ADMISSIONS_PASS ${files.length} records (granted: ${granted}, denied: ${denied})`);
}

// --- Repository-driven Workout V2 ready-work selection -------------------
// This is a read-only projection over the canonical executable backlog and the
// existing Spec Kit dependency authority. It selects candidates; it never
// creates an admission record or changes task state.
function readTaggedJsonBlock(file, tag) {
  const content = fs.readFileSync(path.resolve(root, file), 'utf8');
  const pattern = new RegExp('<!-- ' + tag + ':BEGIN -->\\s*```json\\s*([\\s\\S]*?)```\\s*<!-- ' + tag + ':END -->');
  const match = content.match(pattern);
  if (!match) throw new Error(`missing machine-readable ${tag} block in ${file}`);
  try { return JSON.parse(match[1]); } catch (err) { throw new Error(`invalid JSON in ${tag} block: ${String(err.message || err)}`); }
}

function checkWorkoutV2Ready() {
  try {
    const stateFile = 'docs/TASKS.md';
    const dagFile = 'docs/specs/0001-workout-experience/dependencies.md';
    const state = readTaggedJsonBlock(stateFile, 'WORKOUT_V2_AUTONOMOUS_STATE');
    const dag = readTaggedJsonBlock(dagFile, 'WORKOUT_V2_AUTONOMOUS_DAG');
    if (state.schema !== 1 || dag.schema !== 1) throw new Error('unsupported Workout V2 execution projection schema');
    for (const file of [state.canonicalSpec, state.canonicalPlan, state.canonicalTasks, state.canonicalDependencies, state.parentAdmission]) {
      if (typeof file !== 'string' || !fs.existsSync(path.resolve(root, file))) throw new Error(`canonical execution reference missing: ${file}`);
    }

    const items = new Map();
    for (const item of state.items ?? []) {
      if (!item.id || items.has(item.id)) throw new Error(`duplicate or missing execution-state item: ${item.id}`);
      if (!states.has(item.status)) throw new Error(`invalid execution-state status for ${item.id}: ${item.status}`);
      const readinessRule = item.readinessRule ?? 'EXPLICIT';
      if (!['DAG_DERIVED', 'EXPLICIT'].includes(readinessRule)) throw new Error(`invalid readiness rule for ${item.id}: ${readinessRule}`);
      if (readinessRule === 'DAG_DERIVED') {
        if ('autonomousEligibility' in item) throw new Error(`DAG_DERIVED item must not carry manually assigned autonomousEligibility: ${item.id}`);
      } else if (!['READY', 'NOT_YET', 'HUMAN_GATE', 'RESEARCH_ONLY'].includes(item.autonomousEligibility)) {
        throw new Error(`invalid autonomous eligibility for ${item.id}: ${item.autonomousEligibility}`);
      }
      items.set(item.id, item);
    }
    const nodes = new Map();
    for (const node of dag.nodes ?? []) {
      if (!node.id || nodes.has(node.id)) throw new Error(`duplicate or missing DAG node: ${node.id}`);
      if (!Array.isArray(node.dependsOn) || !Array.isArray(node.softDependsOn ?? [])) throw new Error(`invalid dependency arrays for ${node.id}`);
      nodes.set(node.id, node);
    }
    for (const id of nodes.keys()) {
      if (!items.has(id)) throw new Error(`DAG node has no execution state: ${id}`);
    }
    for (const id of items.keys()) {
      if (!nodes.has(id)) throw new Error(`execution state has no DAG node: ${id}`);
    }
    for (const node of nodes.values()) {
      for (const dependency of [...node.dependsOn, ...node.softDependsOn ?? []]) {
        if (!nodes.has(dependency)) throw new Error(`DAG dependency ${dependency} referenced by ${node.id} is missing`);
        if (dependency === node.id) throw new Error(`DAG self-dependency: ${node.id}`);
      }
    }
    const visit = new Set();
    const active = new Set();
    const walk = (id) => {
      if (active.has(id)) throw new Error(`DAG cycle detected at ${id}`);
      if (visit.has(id)) return;
      active.add(id);
      for (const dependency of nodes.get(id).dependsOn) walk(dependency);
      active.delete(id);
      visit.add(id);
    };
    for (const id of nodes.keys()) walk(id);

    let parentAdmission;
    try {
      parentAdmission = readJson(state.parentAdmission);
      validateAdmission(parentAdmission);
    } catch (err) {
      throw new Error(`parent admission is not eligible: ${String(err.message || err)}`);
    }

    const ready = [];
    const blocked = [];
    for (const node of nodes.values()) {
      const item = items.get(node.id);
      if (item.status === 'CLOSED' && item.frozen === true) continue;
      const blockers = [];
      if (item.ownerBlocked === true || item.status === 'BLOCKED') blockers.push('OWNER_BLOCKED');
      if (item.status === 'HUMAN_GATE' || item.autonomousEligibility === 'HUMAN_GATE') blockers.push('HUMAN_GATE');
      if (item.ownerVisualAcceptanceRequired === true) blockers.push('COMPLETE_FLOW_OWNER_GATE');
      const readinessRule = item.readinessRule ?? 'EXPLICIT';
      if (readinessRule === 'EXPLICIT' && item.autonomousEligibility !== 'READY') blockers.push(`AUTONOMOUS_ELIGIBILITY=${item.autonomousEligibility}`);
      const unmet = node.dependsOn.filter((dependency) => {
        const dependencyState = items.get(dependency);
        return dependencyState.status !== 'CLOSED' || dependencyState.frozen !== true;
      });
      if (unmet.length) blockers.push(`DEPENDENCIES_UNSATISFIED=${unmet.join(',')}`);
      if (item.ownerDecisionRequired === true) blockers.push('OWNER_DECISION_REQUIRED');
      if (blockers.length) blocked.push({id: node.id, blockers});
      else ready.push({id: node.id, workstream: node.workstream ?? null, eligibility: readinessRule === 'DAG_DERIVED' ? 'READY_DERIVED' : 'READY', eligibilityDerivedAutomatically: readinessRule === 'DAG_DERIVED', admissionRequired: item.admissionRequired === true, taskProfile: item.taskProfile ?? null, parallelSafety: item.parallelSafety ?? null, ownerVisualAcceptanceRequired: item.ownerVisualAcceptanceRequired === true});
    }
    const admissionCandidates = ready.filter((candidate) => candidate.admissionRequired).map((candidate) => candidate.id);
    console.log(JSON.stringify({
      milestone: state.program,
      parentAdmission: 'ADMISSION_GRANTED',
      readyTasks: ready,
      nextAdmissionCandidates: admissionCandidates,
      blockedWork: blocked,
      ownerPromptRequiredToSelectNextTask: 'NO',
      selectionOnly: true,
    }, null, 2));
  } catch (err) {
    fail(`WORKOUT_V2_READY_INVALID: ${String(err.message || err)}`);
  }
}

const [command, arg] = process.argv.slice(2);
if (command === 'profile') checkProfile(arg);
else if (command === 'report') checkReport(arg);
else if (command === 'receipt') checkReceipt(arg);
else if (command === 'ui') checkUi(arg);
else if (command === 'admission') checkAdmission(arg);
else if (command === 'admissions') checkAdmissions(arg);
else if (command === 'workout-v2-ready') checkWorkoutV2Ready();
else if (command === 'docs') {
  const index = fs.readFileSync(path.join(root, 'docs/INDEX.md'), 'utf8');
  for (const file of ['AGENTS.md', 'docs/governance/DOCUMENTATION-GOVERNANCE.md', 'docs/AI_CHANGE_TEMPLATE.md', 'docs/PITFALL_GUARDRAILS.md']) if (!index.includes(file.replace('docs/', ''))) fail(`INDEX missing governance route: ${file}`);
} else { fail('usage: governance-runtime.mjs profile <PROFILE> | report <JSON> | receipt <JSON> | docs | ui [TARGET] | admission <JSON> | admissions [DIR] | workout-v2-ready'); }
if (!process.exitCode) console.log('GOVERNANCE_PASS');
