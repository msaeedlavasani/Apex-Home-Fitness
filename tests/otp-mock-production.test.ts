/**
 * Production mock override (`AUTH_OTP_MOCK_IN_PRODUCTION=true`) — unit tests
 * for the hybrid OTP service (the dev/test harness used while SMS delivery is
 * being fixed). No DB, no network, no Supabase: the secure fallback is a fake
 * recorder, and the session hook is injected.
 *
 * The hybrid contract under test:
 *   - allowlisted phones get the deterministic mock code (`devCode`) and a
 *     session hook on verify — no provider round-trip;
 *   - every other phone is routed to the secure service untouched;
 *   - `getOtpService()` still refuses mock in production UNLESS the explicit
 *     override flag is set.
 */
import {before, beforeEach, test} from 'node:test';
import assert from 'node:assert/strict';

import {MOCK_OTP_CODE, resetMockOtpStore} from '../src/lib/auth/mockOtpService';

// PrismaClient is constructed at import of the services graph — give it a
// scratch URL before the module loads (the mock path never touches the DB).
process.env.DATABASE_URL = 'file:./otp-mock-production-test.db';

let authOtp: typeof import('../src/lib/auth/otpService');

const ENV_KEYS: string[] = [
  'NODE_ENV',
  'AUTH_OTP_MODE',
  'AUTH_OTP_MOCK_IN_PRODUCTION',
  'AUTH_OTP_MOCK_PHONES',
];

before(async () => {
  authOtp = await import('../src/lib/auth/otpService');
});

// The mock store is a module-level singleton shared by every mock instance —
// reset it so tests are hermetic regardless of order.
beforeEach(() => {
  resetMockOtpStore();
});

/** Save/restore the env keys this module reads, awaiting the callback. */
async function withEnvAsync(
  patch: Record<string, string | undefined>,
  fn: () => Promise<void>,
): Promise<void> {
  const saved: Record<string, string | undefined> = {};
  for (const k of ENV_KEYS) {
    saved[k] = process.env[k];
    if (patch[k] === undefined) delete process.env[k];
    else process.env[k] = patch[k] as string;
  }
  try {
    await fn();
  } finally {
    for (const k of ENV_KEYS) {
      if (saved[k] === undefined) delete process.env[k];
      else process.env[k] = saved[k] as string;
    }
  }
}

/** Fake secure service that records every call and always fails honestly. */
function makeFakeSecureService(calls: string[]) {
  return {
    async requestCode({phone}: {phone: string}) {
      calls.push(`request:${phone}`);
      return {ok: false, error: 'provider_error'} as const;
    },
    async verifyCode({phone}: {phone: string; code: string}) {
      calls.push(`verify:${phone}`);
      return {ok: false, error: 'provider_error'} as const;
    },
  };
}

test('getOtpService: mock in production WITHOUT the override throws', async () => {
  await withEnvAsync(
    {NODE_ENV: 'production', AUTH_OTP_MODE: 'mock', AUTH_OTP_MOCK_IN_PRODUCTION: undefined},
    async () => {
      assert.throws(() => authOtp.getOtpService(), /AUTH_OTP_MOCK_IN_PRODUCTION/);
    },
  );
});

test('getOtpService: mock in production WITH the override returns a working hybrid', async () => {
  await withEnvAsync(
    {
      NODE_ENV: 'production',
      AUTH_OTP_MODE: 'mock',
      AUTH_OTP_MOCK_IN_PRODUCTION: 'true',
      AUTH_OTP_MOCK_PHONES: '09127953903',
    },
    async () => {
      const svc = authOtp.getOtpService();
      const sent = await svc.requestCode({phone: '09127953903'});
      assert.equal(sent.ok, true);
      assert.equal(sent.devCode, MOCK_OTP_CODE);
    },
  );
});

test('hybrid: allowlisted phone gets devCode + session; others go to secure', async () => {
  const secureCalls: string[] = [];
  let verifiedPhone: string | null = null;
  const svc = authOtp.createProductionMockOtpService({
    allowedPhones: authOtp.parseMockPhoneAllowlist('09127953903'),
    onVerified: async (phone) => {
      verifiedPhone = phone;
    },
    secureService: makeFakeSecureService(secureCalls),
  });

  // Allowlisted: instant mock code, the provider is never touched.
  const sent = await svc.requestCode({phone: '09127953903'});
  assert.equal(sent.ok, true);
  assert.equal(sent.devCode, MOCK_OTP_CODE);
  assert.deepEqual(secureCalls, []);

  // Wrong code fails and does not fire the session hook.
  const wrong = await svc.verifyCode({phone: '09127953903', code: '000000'});
  assert.equal(wrong.ok, false);
  assert.equal(verifiedPhone, null);

  // Correct code verifies, consumes the code, and fires the session hook.
  const verified = await svc.verifyCode({phone: '09127953903', code: MOCK_OTP_CODE});
  assert.equal(verified.ok, true);
  assert.equal(verifiedPhone, '+989127953903');
  assert.deepEqual(secureCalls, []);

  // Single-use: the consumed code cannot verify again.
  const replay = await svc.verifyCode({phone: '09127953903', code: MOCK_OTP_CODE});
  assert.equal(replay.ok, false);

  // A non-allowlisted phone is routed to the secure service untouched.
  const other = await svc.requestCode({phone: '09351234567'});
  assert.deepEqual(secureCalls, ['request:09351234567']);
  assert.equal(other.ok, false);
});

test('parseMockPhoneAllowlist: normalizes national numbers and drops garbage', () => {
  const allowed = authOtp.parseMockPhoneAllowlist('09127953903, 0935 123 4567,not-a-phone,');
  assert.deepEqual([...allowed].sort(), ['+989127953903', '+989351234567']);
});

test('hybrid: no allowlist means every phone goes to the secure service', async () => {
  const secureCalls: string[] = [];
  const svc = authOtp.createProductionMockOtpService({
    allowedPhones: new Set(),
    secureService: makeFakeSecureService(secureCalls),
  });
  const res = await svc.requestCode({phone: '09127953903'});
  assert.deepEqual(secureCalls, ['request:09127953903']);
  assert.equal(res.ok, false);
});
