import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {execFileSync, spawnSync} from 'node:child_process';
import test from 'node:test';

const root = process.cwd();
const checker = path.join(root, 'scripts/guardrail-check.mjs');
const example = JSON.parse(fs.readFileSync(path.join(root, 'scripts/release-manifest.example.json'), 'utf8'));

function run(manifest, ...args) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'apex-guardrail-'));
  const file = path.join(dir, 'manifest.json');
  fs.writeFileSync(file, JSON.stringify(manifest));
  return spawnSync(process.execPath, [checker, file, ...args], {encoding: 'utf8'});
}

test('valid Production manifest passes', () => {
  const result = run(example);
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /GUARDRAIL_PASS/);
});

test('missing build-time public config fails closed', () => {
  const manifest = {...example, NEXT_PUBLIC_SUPABASE_ANON_KEY_PRESENT: false};
  const result = run(manifest);
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /NEXT_PUBLIC_SUPABASE_ANON_KEY_PRESENT/);
});

test('artifact/source identity fields are mandatory', () => {
  const manifest = {...example};
  delete manifest.IMAGE_ID;
  const result = run(manifest);
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /IMAGE_ID/);
});

test('wrong architecture fails', () => {
  const result = run({...example, IMAGE_ARCHITECTURE: 'linux/arm64'});
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /architecture/);
});

test('missing rollback evidence fails', () => {
  const result = run({...example, ROLLBACK_CONFIG_EVIDENCE: 'FAIL'});
  assert.notEqual(result.status, 0);
});

test('docs-only manifest does not require Production gates', () => {
  const result = run({TASK_ID: 'DOCS-01', PRODUCTION_BOUND: false}, '--docs-only');
  assert.equal(result.status, 0, result.stderr);
});

test('docs-only Production-bound manifest fails', () => {
  const result = run({TASK_ID: 'DOCS-01', PRODUCTION_BOUND: true}, '--docs-only');
  assert.notEqual(result.status, 0);
});

test('secret values are rejected from manifests', () => {
  const result = run({...example, SUPABASE_SERVICE_ROLE_KEY: 'value'});
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /must not appear/);
});

test('autonomous routine state is represented without secrets', () => {
  const manifest = {...example, NEXT_ACTION_AUTONOMOUS: true, HUMAN_DECISION_REQUIRED: false};
  const result = run(manifest);
  assert.equal(result.status, 0, result.stderr);
});
