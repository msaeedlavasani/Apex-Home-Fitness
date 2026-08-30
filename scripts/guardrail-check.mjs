#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const args = process.argv.slice(2);
const manifestArg = args[0];
const mode = args.includes('--docs-only') ? 'docs-only' : 'production';

function fail(message) {
  console.error(`GUARDRAIL_FAIL: ${message}`);
  process.exitCode = 1;
}

function required(manifest, key) {
  if (manifest[key] === undefined || manifest[key] === null || manifest[key] === '') {
    fail(`${key} is required`);
    return false;
  }
  return true;
}

if (!manifestArg) {
  fail('usage: node scripts/guardrail-check.mjs <manifest.json> [--docs-only]');
  process.exit();
}

const filename = path.resolve(manifestArg);
let manifest;
try {
  manifest = JSON.parse(fs.readFileSync(filename, 'utf8'));
} catch (error) {
  fail(`cannot read manifest: ${error.message}`);
  process.exit();
}

const publicKeys = [
  'NEXT_PUBLIC_SUPABASE_URL_PRESENT',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY_PRESENT',
  'NEXT_PUBLIC_SITE_URL_PRESENT',
];
const secretKeys = ['SUPABASE_SERVICE_ROLE_KEY', 'SMS_IR_API_KEY', 'DATABASE_URL'];
const productionKeys = [
  'TASK_ID', 'SOURCE_SHA', 'MAIN_BASE_SHA', 'IMAGE_TAG', 'IMAGE_ID',
  'IMAGE_ARCHITECTURE', 'BUILD_TIMESTAMP', 'BUILD_MODE',
  'BUILD_TIME_PUBLIC_CONFIG_CHECK', 'RUNTIME_CONFIG_CHECK', 'SECRET_BOUNDARY_CHECK',
  'DB_VOLUME', 'DB_VOLUME_PRESERVATION_CHECK', 'PORT_BINDING',
  'LOCAL_PROD_ACCEPTANCE', 'ROLLBACK_IMAGE', 'ROLLBACK_CONFIG_EVIDENCE',
  'MIGRATION_REQUIRED', 'PRODUCTION_PREFLIGHT',
];

let ok = true;
if (mode === 'docs-only') {
  ok = required(manifest, 'TASK_ID') && ok;
  if (manifest.PRODUCTION_BOUND === true) fail('docs-only manifest cannot be Production-bound');
} else {
  for (const key of productionKeys) ok = required(manifest, key) && ok;
  for (const key of publicKeys) {
    if (manifest[key] !== true) {
      fail(`${key} must be true; public build configuration is not accepted`);
      ok = false;
    }
  }
  if (manifest.BUILD_TIME_PUBLIC_CONFIG_CHECK !== 'PASS') ok = false;
  if (manifest.SECRET_BOUNDARY_CHECK !== 'PASS') ok = false;
  if (manifest.DB_VOLUME_PRESERVATION_CHECK !== 'PASS') ok = false;
  if (manifest.ROLLBACK_CONFIG_EVIDENCE !== 'PASS') ok = false;
  for (const key of secretKeys) {
    if (key in manifest) {
      fail(`${key} must not appear in a release manifest`);
      ok = false;
    }
  }
  if (manifest.IMAGE_ARCHITECTURE !== 'linux/amd64') {
    fail('IMAGE_ARCHITECTURE must match the approved Production architecture linux/amd64');
    ok = false;
  }
}

if (ok) console.log(`GUARDRAIL_PASS: mode=${mode} manifest=${path.basename(filename)}`);
else process.exitCode = 1;
