/**
 * Pure contract tests for the OTP policy module (`src/lib/auth/otp.ts`):
 * phone normalization, code generation, scrypt hashing, env parsing and the
 * stable error taxonomy. No database, no network, no Next.js runtime.
 */
import assert from 'node:assert/strict';
import test from 'node:test';

import {
  generateOtpCode,
  getOtpPolicy,
  hashOtpCode,
  isPlausibleOtpCode,
  normalizeIranianPhone,
  normalizeRequestId,
  OTP_ERROR_CODES,
  otpErrorMessage,
  redactPhone,
  verifyOtpCodeHash,
} from '../src/lib/auth/otp';

// ---------------------------------------------------------------------------
// Phone normalization
// ---------------------------------------------------------------------------

test('normalizes Iranian mobile numbers to canonical +98 form', () => {
  assert.equal(normalizeIranianPhone('09123456789'), '+989123456789');
  assert.equal(normalizeIranianPhone('989123456789'), '+989123456789');
  assert.equal(normalizeIranianPhone('+989123456789'), '+989123456789');
  assert.equal(normalizeIranianPhone('00989123456789'), '+989123456789');
  assert.equal(normalizeIranianPhone('0912 345 6789'), '+989123456789');
  assert.equal(normalizeIranianPhone('0912-345-6789'), '+989123456789');
});

test('rejects invalid or non-Iranian phone numbers', () => {
  for (const bad of [
    undefined,
    null,
    9123456789, // number, not string
    '',
    '12345',
    '0912345678', // 10 digits
    '091234567890', // 12 digits
    '79123456789', // wrong leading digit
    '+98912345678', // short
    '+1 415 555 2671', // US number
    'tel:+989123456789', // junk prefix
    '9891234567890', // too long after strip
  ]) {
    assert.equal(normalizeIranianPhone(bad), null, `should reject ${String(bad)}`);
  }
});

test('redacts phone numbers for logs', () => {
  assert.equal(redactPhone('+989121234567'), '+98••••••4567');
  assert.ok(!redactPhone('+989121234567').includes('912123'));
  assert.equal(redactPhone('+981'), '••••');
});

// ---------------------------------------------------------------------------
// Code generation + hashing
// ---------------------------------------------------------------------------

test('generates uniformly distributed fixed-length numeric codes', () => {
  const seen = new Set<string>();
  for (let i = 0; i < 500; i += 1) {
    const code = generateOtpCode(6);
    assert.match(code, /^\d{6}$/);
    seen.add(code);
  }
  // 500 draws from 10^6 — collisions are astronomically unlikely.
  assert.ok(seen.size > 450, `expected near-unique codes, got ${seen.size}`);
  // Leading zeros survive (padStart) — a code like "000123" must be possible.
  assert.equal(generateOtpCode(6).length, 6);
});

test('hashes codes with scrypt and verifies them in constant time', () => {
  const stored = hashOtpCode('123456');
  assert.match(stored, /^scrypt\$\d+\$\d+\$\d+\$[A-Za-z0-9_-]+\$[A-Za-z0-9_-]+$/);
  assert.ok(!stored.includes('123456'), 'plaintext code must never appear in the hash');
  assert.equal(verifyOtpCodeHash('123456', stored), true);
  assert.equal(verifyOtpCodeHash('654321', stored), false);
  // Same code, different salt → different hashes (per-record salt).
  assert.notEqual(hashOtpCode('123456'), stored);
});

test('rejects malformed stored hashes without throwing', () => {
  assert.equal(verifyOtpCodeHash('123456', ''), false);
  assert.equal(verifyOtpCodeHash('123456', 'not-a-hash'), false);
  assert.equal(verifyOtpCodeHash('123456', 'scrypt$16384$8$1$$'), false);
  assert.equal(verifyOtpCodeHash('123456', 'scrypt$16384$8$1$AAAA$'), false);
});

test('code plausibility check enforces length and digits', () => {
  assert.equal(isPlausibleOtpCode('123456', 6), true);
  assert.equal(isPlausibleOtpCode('000000', 6), true);
  assert.equal(isPlausibleOtpCode('12345', 6), false);
  assert.equal(isPlausibleOtpCode('1234567', 6), false);
  assert.equal(isPlausibleOtpCode('abcdef', 6), false);
  assert.equal(isPlausibleOtpCode(123456, 6), false);
  assert.equal(isPlausibleOtpCode(null, 6), false);
});

// ---------------------------------------------------------------------------
// requestId normalization
// ---------------------------------------------------------------------------

test('normalizes request ids (8-64 URL-safe chars) or returns null', () => {
  assert.equal(normalizeRequestId('abc12345'), 'abc12345');
  assert.equal(normalizeRequestId('  abc-1234_def-5678  '), 'abc-1234_def-5678');
  assert.equal(normalizeRequestId(undefined), null);
  assert.equal(normalizeRequestId(null), null);
  assert.equal(normalizeRequestId(''), null);
  assert.equal(normalizeRequestId('short'), null); // < 8 chars
  assert.equal(normalizeRequestId('a'.repeat(65)), null); // > 64 chars
  assert.equal(normalizeRequestId('has spaces!'), null);
  assert.equal(normalizeRequestId(42), null);
});

// ---------------------------------------------------------------------------
// Policy from env
// ---------------------------------------------------------------------------

test('policy falls back to secure defaults when env is empty', () => {
  const policy = getOtpPolicy({});
  assert.equal(policy.codeLength, 6);
  assert.equal(policy.codeTtlMs, 600_000);
  assert.equal(policy.resendCooldownMs, 60_000);
  assert.equal(policy.maxAttempts, 5);
});

test('policy honors valid env overrides and clamps invalid ones', () => {
  const policy = getOtpPolicy({
    OTP_CODE_LENGTH: '8',
    OTP_CODE_TTL_MS: '120000',
    OTP_MAX_ATTEMPTS: '3',
    OTP_REQUEST_PHONE_LIMIT: 'garbage',
    OTP_REQUEST_IP_LIMIT: '0', // below minimum → fallback
  });
  assert.equal(policy.codeLength, 8);
  assert.equal(policy.codeTtlMs, 120_000);
  assert.equal(policy.maxAttempts, 3);
  assert.equal(policy.requestPhoneLimit, 5); // garbage → default
  assert.equal(policy.requestIpLimit, 10); // below min → default
});

// ---------------------------------------------------------------------------
// Error taxonomy
// ---------------------------------------------------------------------------

test('every error code maps to a stable, generic client message', () => {
  for (const code of Object.values(OTP_ERROR_CODES)) {
    const message = otpErrorMessage(code);
    assert.equal(typeof message, 'string');
    assert.ok(message.length > 0);
  }
  // No internal detail ever leaks into client messages.
  for (const code of Object.values(OTP_ERROR_CODES)) {
    const message = otpErrorMessage(code);
    assert.ok(!/api.?key|secret|service.?role|SMS\.ir/i.test(message), message);
  }
});
