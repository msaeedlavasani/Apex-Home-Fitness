import assert from 'node:assert/strict';
import test from 'node:test';

import {
  isCooldownError,
  requestErrorMessageKey,
  verifyErrorMessageKey,
} from '../src/lib/auth/errorKeys';
import {maskPhone, normalizePhone} from '../src/lib/auth/phone';
import {
  REDIRECT_ALLOWLIST,
  isAuthPath,
  isProtectedPath,
  localeSegmentOf,
  postAuthDefaultPath,
  sanitizeRedirectPath,
} from '../src/lib/auth/protect';

/**
 * Batch 14 task 4 — auth UI/route-protection unit tests:
 * client-safe phone normalization (canonical parity with `src/lib/auth/otp.ts`),
 * the redirect allowlist (open-redirect posture) and the canonical
 * OTP-error-code → localized-message-key mapping.
 *
 * Server-side OTP/session logic is covered by the canonical suites
 * (`tests/otp-policy.test.ts`, `tests/otp-service.test.ts`,
 * `tests/phone-session-service.test.ts`, `tests/sms-ir-*.test.ts`).
 */

// ---------------------------------------------------------------------------
// Phone normalization (client-safe helper, canonical parity)
// ---------------------------------------------------------------------------

test('normalizePhone accepts local, E.164 and Persian-digit formats', () => {
  assert.equal(normalizePhone('09123456789'), '+989123456789');
  assert.equal(normalizePhone('989123456789'), '+989123456789');
  assert.equal(normalizePhone('+989123456789'), '+989123456789');
  assert.equal(normalizePhone('00989123456789'), '+989123456789');
  // Persian digits (fa keyboard)
  assert.equal(normalizePhone('۰۹۱۲۳۴۵۶۷۸۹'), '+989123456789');
  // Whitespace/hyphens are ignored (matches the server rule)
  assert.equal(normalizePhone(' 0912-345 67 89 '), '+989123456789');
});

test('normalizePhone rejects invalid numbers', () => {
  assert.equal(normalizePhone('0912345678'), null); // too short
  assert.equal(normalizePhone('091234567890'), null); // too long
  assert.equal(normalizePhone('02123456789'), null); // landline, not mobile
  assert.equal(normalizePhone('+4915123456789'), null); // foreign
  assert.equal(normalizePhone(''), null);
  assert.equal(normalizePhone('abc'), null);
  assert.equal(normalizePhone(null as unknown as string), null);
});

test('maskPhone redacts the middle of the number (redactPhone shape)', () => {
  const masked = maskPhone('+989123456789');
  assert.ok(masked.startsWith('+98'));
  assert.ok(masked.endsWith('6789'));
  assert.ok(masked.includes('•'));
  assert.ok(!masked.includes('12345'));
  assert.equal(maskPhone('+9812'), '•••••');
});

// ---------------------------------------------------------------------------
// Redirect allowlist (open-redirect posture)
// ---------------------------------------------------------------------------

test('allowlist: protected segments are recognized locale-aware', () => {
  for (const segment of ['dashboard', 'workout', 'history', 'analytics', 'challenges', 'profile']) {
    assert.equal(isProtectedPath(`/en/${segment}`, 'en'), true, segment);
    assert.equal(isProtectedPath(`/fa/${segment}`, 'fa'), true, `fa ${segment}`);
    assert.equal(isProtectedPath(`/fa/${segment}`, 'en'), false, `wrong-locale ${segment}`);
  }
  // Public pages are never protected.
  assert.equal(isProtectedPath('/en/quiz', 'en'), false);
  assert.equal(isProtectedPath('/en/faq', 'en'), false);
  assert.equal(isProtectedPath('/en/library', 'en'), false);
  assert.equal(isProtectedPath('/en', 'en'), false);
});

test('allowlist: auth pages are detected locale-aware', () => {
  assert.equal(isAuthPath('/en/auth/login', 'en'), true);
  assert.equal(isAuthPath('/fa/auth/verify', 'fa'), true);
  assert.equal(isAuthPath('/en/auth/login', 'fa'), false);
  assert.equal(isAuthPath('/en/dashboard', 'en'), false);
});

test('localeSegmentOf extracts the segment after the locale', () => {
  assert.equal(localeSegmentOf('/en/dashboard', 'en'), 'dashboard');
  assert.equal(localeSegmentOf('/fa/workout/123', 'fa'), 'workout');
  assert.equal(localeSegmentOf('/en', 'en'), null);
  assert.equal(localeSegmentOf('/', 'en'), null);
  assert.equal(localeSegmentOf('/en/quiz?x=1', 'en'), 'quiz');
});

test('sanitizeRedirectPath accepts only allowlisted locale-prefixed paths', () => {
  assert.equal(sanitizeRedirectPath('/en/dashboard', 'en'), '/en/dashboard');
  assert.equal(sanitizeRedirectPath('/fa/workout', 'fa'), '/fa/workout');
  assert.equal(sanitizeRedirectPath('/en/history/2026-08-16', 'en'), '/en/history/2026-08-16');
  assert.equal(sanitizeRedirectPath('/en/quiz', 'en'), '/en/quiz');
  assert.equal(sanitizeRedirectPath('/en/library', 'en'), '/en/library');
  // Wrong locale prefix → rejected (stays on the current locale).
  assert.equal(sanitizeRedirectPath('/fa/dashboard', 'en'), null);
});

test('sanitizeRedirectPath blocks every open-redirect vector', () => {
  const blocked = [
    'https://evil.example.com',
    '//evil.example.com',
    '/\\evil.example.com',
    '/en//evil.example.com',
    '/en/dashboard@evil.com',
    '/en/dashboard?next=https://evil.example.com',
    '/en/dashboard#fragment',
    '/en/unknown-segment',
    '/en',
    '/',
    '',
    'javascript:alert(1)',
    '/en/auth/login',
  ];
  for (const candidate of blocked) {
    assert.equal(sanitizeRedirectPath(candidate, 'en'), null, candidate);
  }
});

test('sanitizeRedirectPath rejects oversized or non-string input', () => {
  assert.equal(sanitizeRedirectPath(null, 'en'), null);
  assert.equal(sanitizeRedirectPath(undefined, 'en'), null);
  assert.equal(sanitizeRedirectPath(42, 'en'), null);
  assert.equal(sanitizeRedirectPath(`/en/dashboard/${'x'.repeat(300)}`, 'en'), null);
});

test('allowlist contents and default post-auth path are coherent', () => {
  assert.ok(REDIRECT_ALLOWLIST.includes('dashboard'));
  assert.equal(postAuthDefaultPath('fa'), '/fa/dashboard');
});

// ---------------------------------------------------------------------------
// Canonical error code → localized message key mapping
// ---------------------------------------------------------------------------

test('request error mapping covers the canonical request codes', () => {
  assert.equal(requestErrorMessageKey('INVALID_PHONE'), 'invalidPhone');
  assert.equal(requestErrorMessageKey('INVALID_REQUEST'), 'invalidPhone');
  assert.equal(requestErrorMessageKey('COOLDOWN'), 'rateLimited');
  assert.equal(requestErrorMessageKey('RATE_LIMITED'), 'rateLimited');
  assert.equal(requestErrorMessageKey('SMS_RATE_LIMITED'), 'rateLimited');
  assert.equal(requestErrorMessageKey('SMS_PROVIDER_NOT_CONFIGURED'), 'providerError');
  assert.equal(requestErrorMessageKey('SMS_PROVIDER_AUTH_FAILED'), 'providerError');
  assert.equal(requestErrorMessageKey('SMS_SEND_FAILED'), 'providerError');
  assert.equal(requestErrorMessageKey('INTERNAL'), 'generic');
  // Unknown / absent codes degrade to the generic message.
  assert.equal(requestErrorMessageKey(undefined), 'generic');
  assert.equal(requestErrorMessageKey('SOMETHING_ELSE'), 'generic');
});

test('verify error mapping covers the canonical verify codes', () => {
  assert.equal(verifyErrorMessageKey('INVALID_PHONE'), 'invalidPhone');
  assert.equal(verifyErrorMessageKey('INVALID_REQUEST'), 'notRequested');
  assert.equal(verifyErrorMessageKey('INVALID_CODE'), 'invalidCode');
  assert.equal(verifyErrorMessageKey('CODE_EXPIRED'), 'expired');
  assert.equal(verifyErrorMessageKey('CODE_ALREADY_USED'), 'expired');
  assert.equal(verifyErrorMessageKey('ATTEMPTS_EXHAUSTED'), 'tooManyAttempts');
  assert.equal(verifyErrorMessageKey('COOLDOWN'), 'rateLimited');
  assert.equal(verifyErrorMessageKey('RATE_LIMITED'), 'rateLimited');
  assert.equal(verifyErrorMessageKey('SESSION_PROVIDER_NOT_CONFIGURED'), 'sessionUnavailable');
  assert.equal(verifyErrorMessageKey('session_unavailable'), 'sessionUnavailable');
  assert.equal(verifyErrorMessageKey('SESSION_FAILED'), 'providerError');
  assert.equal(verifyErrorMessageKey('INTERNAL'), 'generic');
  assert.equal(verifyErrorMessageKey(undefined), 'generic');
});

test('cooldown classification drives the resend countdown restart', () => {
  assert.equal(isCooldownError('COOLDOWN'), true);
  assert.equal(isCooldownError('RATE_LIMITED'), true);
  assert.equal(isCooldownError('SMS_RATE_LIMITED'), true);
  assert.equal(isCooldownError('INVALID_CODE'), false);
  assert.equal(isCooldownError(undefined), false);
});
