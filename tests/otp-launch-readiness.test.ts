import assert from 'node:assert/strict';
import {readFileSync, readdirSync, statSync} from 'node:fs';
import {join} from 'node:path';
import test from 'node:test';
import {fileURLToPath} from 'node:url';

/**
 * OTP launch-readiness guard (Batch 14 / task 5).
 *
 * Runs in CI (`npm test`) with NO real credentials and sends NO SMS. It
 * validates the launch *contract* only — the same checks a human runs before
 * going live with OTP auth:
 *
 *   1. `.env.example` documents every production env placeholder the OTP flow
 *      needs (SMS.ir, OTP policy, Supabase, site URL, smoke-test gate).
 *   2. `docs/OTP_LAUNCH_READINESS.md` covers every launch-critical topic
 *      (verify endpoint, Supabase redirect, HTTPS, cookie/security, rate
 *      limits, logging redaction, test-number consent, rollback, go/no-go)
 *      and documents smoke coverage for all 7 flows
 *      (request / verify / refresh / logout / quiz save / generation /
 *      dashboard).
 *   3. No real secret value is committed in the curated config/docs set
 *      (placeholders only — see .env.example conventions).
 *   4. The Node 22+ requirement is enforced in `package.json` and CI.
 *   5. Cross-references from docs/RELEASING.md and docs/TASKS.md stay intact.
 *
 * Keep this test green when the launch contract changes — update it alongside
 * docs/OTP_LAUNCH_READINESS.md and .env.example. Real-SMS smoke testing is a
 * separate, staged, human step (see the launch doc §12).
 */

const ROOT = fileURLToPath(new URL('..', import.meta.url));

function readText(relPath: string): string {
  return readFileSync(join(ROOT, relPath), 'utf8');
}

/** Recursively collect files (by extension) under a repo-relative dir. */
function collectFiles(dir: string, extensions: string[], out: string[] = []): string[] {
  const abs = join(ROOT, dir);
  for (const entry of readdirSync(abs)) {
    const rel = join(dir, entry);
    const absEntry = join(abs, entry);
    if (statSync(absEntry).isDirectory()) {
      collectFiles(rel, extensions, out);
    } else if (extensions.some((ext) => entry.endsWith(ext))) {
      out.push(rel);
    }
  }
  return out;
}

/** Curated set of files where a committed real secret would be a release blocker. */
function curatedFiles(): string[] {
  const files = ['.env.example', 'next.config.mjs'];
  files.push(...collectFiles('docs', ['.md']));
  files.push(...collectFiles('.github/workflows', ['.yml', '.yaml']));
  files.push(...collectFiles('infra', ['.ts', '.js', '.mjs', '.yml', '.yaml', '.json', '.md']));
  return files;
}

// ---------------------------------------------------------------------------
// 1. .env.example — every production OTP placeholder is documented
// ---------------------------------------------------------------------------

const REQUIRED_ENV_PLACEHOLDERS = [
  'SMS_IR_API_KEY',
  'SMS_IR_TEMPLATE_ID',
  'SMS_IR_CODE_PARAMETER',
  'SMS_IR_TIMEOUT_MS',
  'OTP_CODE_LENGTH',
  'OTP_CODE_TTL_MS',
  'OTP_RESEND_COOLDOWN_MS',
  'OTP_MAX_ATTEMPTS',
  'OTP_REQUEST_PHONE_WINDOW_MS',
  'OTP_REQUEST_PHONE_LIMIT',
  'OTP_REQUEST_IP_WINDOW_MS',
  'OTP_REQUEST_IP_LIMIT',
  'OTP_VERIFY_PHONE_WINDOW_MS',
  'OTP_VERIFY_PHONE_LIMIT',
  'OTP_VERIFY_IP_WINDOW_MS',
  'OTP_VERIFY_IP_LIMIT',
  'NEXT_PUBLIC_SITE_URL',
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'SMOKE_TEST_MODE',
  'SMOKE_TEST_PHONE',
];

test('otp launch: .env.example documents every production OTP placeholder', () => {
  const env = readText('.env.example');
  const missing = REQUIRED_ENV_PLACEHOLDERS.filter((name) => !env.includes(name));
  assert.deepEqual(
    missing,
    [],
    `missing env placeholders in .env.example: ${missing.join(', ')} — ` +
      'add them (placeholder value only, never a real secret).',
  );
});

test('otp launch: SMS.ir source consumes the documented env contract', () => {
  const source = readText('src/lib/auth/smsIrProvider.ts');
  const required = ['SMS_IR_API_KEY', 'SMS_IR_TEMPLATE_ID', 'SMS_IR_API_BASE_URL', 'SMS_IR_CODE_PARAMETER', 'SMS_IR_TIMEOUT_MS'];
  assert.deepEqual(required.filter((name) => !source.includes(name)), []);
  assert.equal(source.includes('SMSIR_API_KEY'), false);
  assert.equal(source.includes('SMSIR_TEMPLATE_ID'), false);
});

// ---------------------------------------------------------------------------
// 2. Launch doc — required topics + all 7 smoke flows are covered
// ---------------------------------------------------------------------------

const DOC = 'docs/OTP_LAUNCH_READINESS.md';

const REQUIRED_TOPICS: Array<[string, string | RegExp, string]> = [
  ['SMS.ir verify endpoint', 'v1/send/verify', 'SMS.ir verify endpoint (POST /v1/send/verify)'],
  ['SMS.ir template', 'templateId', 'template id / parameters contract'],
  ['SMS.ir API key usage', 'X-API-KEY', 'API key header (server-only)'],
  ['Supabase site URL', 'Site URL', 'Supabase URL Configuration → Site URL'],
  ['Supabase redirect URLs', 'Redirect URLs', 'Supabase URL Configuration → Redirect URLs'],
  ['Domain HTTPS', /https/i, 'domain HTTPS requirement'],
  ['Cookie settings', 'httpOnly', 'cookie httpOnly/secure/sameSite settings'],
  ['Cookie security', 'sameSite', 'cookie security settings'],
  ['Rate limits', 'RATE_LIMIT_STORE', 'shared rate-limit store choice'],
  ['Rate limit windows', /rate limit/i, 'rate limit windows / counters'],
  ['Logging redaction', 'redaction', 'log redaction policy'],
  ['Test number consent', 'رضایت', 'test-number consent requirement'],
  ['Rollback plan', 'Rollback', 'rollback scenario'],
  ['Go/No-Go checklist', 'No-Go', 'go/no-go checklist'],
];

const REQUIRED_FLOWS = [
  ['request', 'request-code'],
  ['verify', 'auth/verify'],
  ['refresh', 'refresh'],
  ['logout', 'logout'],
  ['quiz save', 'quiz/save'],
  ['generation', 'generate-program'],
  ['dashboard', 'dashboard'],
];

test('otp launch: launch doc covers every launch-critical topic', () => {
  const doc = readText(DOC);
  const missing = REQUIRED_TOPICS.filter(([, needle]) =>
    needle instanceof RegExp ? !needle.test(doc) : !doc.includes(needle),
  );
  assert.deepEqual(
    missing.map(([topic]) => topic),
    [],
    `docs/OTP_LAUNCH_READINESS.md is missing coverage for: ` +
      `${missing.map(([, , label]) => label).join('; ')}.`,
  );
});

test('otp launch: launch doc specifies smoke coverage for all 7 flows', () => {
  const doc = readText(DOC);
  const missing = REQUIRED_FLOWS.filter(([, needle]) => !doc.includes(needle));
  assert.deepEqual(
    missing.map(([flow]) => flow),
    [],
    `docs/OTP_LAUNCH_READINESS.md must describe smoke coverage for: ${missing
      .map(([flow]) => flow)
      .join(', ')}.`,
  );
});

test('otp launch: launch doc separates mock (no SMS) from real (staging-only) smoke', () => {
  const doc = readText(DOC);
  assert.ok(doc.includes('SMOKE_TEST_MODE'), 'doc must reference SMOKE_TEST_MODE');
  assert.ok(/mock/i.test(doc), 'doc must describe the mock harness (no real SMS)');
  assert.ok(/real/i.test(doc), 'doc must describe the real-SMS staging path');
});

// ---------------------------------------------------------------------------
// 3. No committed real secrets in the curated config/docs set
// ---------------------------------------------------------------------------

const SECRET_ASSIGNMENT_RE =
  /(SMS_IR_API_KEY|NEXT_PUBLIC_SUPABASE_ANON_KEY|REDIS_REST_TOKEN)\s*=\s*([^\s#]+)/gi;
const REAL_OPENAI_KEY_RE = /sk-[A-Za-z0-9]{16,}/;
const REAL_SUPABASE_REF_RE = /[a-z0-9]{24,}\.supabase\.co/;
const REAL_XAPIKEY_HEADER_RE = /X-API-KEY:\s*[A-Za-z0-9]{16,}/i;

test('otp launch: no real secret values are committed in config/docs', () => {
  const violations: string[] = [];

  for (const rel of curatedFiles()) {
    const text = readText(rel);

    let match: RegExpExecArray | null;
    while ((match = SECRET_ASSIGNMENT_RE.exec(text)) !== null) {
      const [, name, value] = match;
      if (!/placeholder/i.test(value) && !value.startsWith('<')) {
        violations.push(`${rel}: ${name} is assigned a non-placeholder value`);
      }
    }

    if (REAL_OPENAI_KEY_RE.test(text)) violations.push(`${rel}: looks like a real OpenAI key`);
    if (REAL_SUPABASE_REF_RE.test(text)) violations.push(`${rel}: looks like a real Supabase ref`);
    if (REAL_XAPIKEY_HEADER_RE.test(text)) violations.push(`${rel}: looks like a real X-API-KEY`);
  }

  assert.deepEqual(
    violations,
    [],
    'committed secrets found (release blocker):\n' + violations.join('\n'),
  );
});

// ---------------------------------------------------------------------------
// 4. Node 22+ contract (package.json engines + CI pin)
// ---------------------------------------------------------------------------

test('otp launch: package.json requires Node 22+ and CI runs Node 22', () => {
  const pkg = JSON.parse(readText('package.json')) as {
    engines?: {node?: string};
  };
  const range = pkg.engines?.node ?? '';
  const match = /^>=\s*(\d+)/.exec(range);
  assert.ok(match, `engines.node must be a >= major range, got: "${range}"`);
  assert.ok(
    Number(match[1]) >= 22,
    `engines.node "${range}" does not require Node 22+`,
  );

  const ci = readText('.github/workflows/ci.yml');
  assert.ok(
    /node-version:\s*['"]?22/.test(ci),
    'CI must pin Node 22 (actions/setup-node node-version)',
  );
});

// ---------------------------------------------------------------------------
// 5. Cross-references stay discoverable
// ---------------------------------------------------------------------------

test('otp launch: release docs cross-reference the readiness doc', () => {
  assert.ok(
    readText('docs/RELEASING.md').includes('OTP_LAUNCH_READINESS'),
    'docs/RELEASING.md must link docs/OTP_LAUNCH_READINESS.md',
  );
  assert.ok(
    readText('docs/TASKS.md').includes('OTP_LAUNCH_READINESS'),
    'docs/TASKS.md (Batch 14 task 5) must link docs/OTP_LAUNCH_READINESS.md',
  );
});
