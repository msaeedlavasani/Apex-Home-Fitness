/**
 * Production mock override (`AUTH_OTP_MOCK_IN_PRODUCTION=true`) — unit tests
 * for the temporary "no real SMS" harness used while SMS.ir delivery is being
 * fixed. No DB, no network, no Supabase: the session hook is injected into
 * the mock service directly, and the factory path is asserted for the
 * deterministic `devCode` contract only.
 *
 * The contract under test:
 *   - `getOtpService()` still refuses mock in production UNLESS the explicit
 *     override flag is set (misconfiguration guard);
 *   - with the override, EVERY phone gets the deterministic mock code
 *     (123456) as `devCode` — no allowlist, no real SMS;
 *   - verify with 123456 invokes the session hook (real session in prod);
 *   - the dev/CI mock path is unchanged.
 */
import {before, beforeEach, test} from 'node:test';
import assert from 'node:assert/strict';

import {createMockOtpService, MOCK_OTP_CODE, resetMockOtpStore} from '../src/lib/auth/mockOtpService';

// PrismaClient is constructed at import of the services graph — give it a
// scratch URL before the module loads (the mock path never touches the DB).
process.env.DATABASE_URL = 'file:./otp-mock-production-test.db';

let authOtp: typeof import('../src/lib/auth/otpService');

const ENV_KEYS: string[] = ['NODE_ENV', 'AUTH_OTP_MODE', 'AUTH_OTP_MOCK_IN_PRODUCTION'];

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

test('getOtpService: mock in production WITHOUT the override throws', async () => {
  await withEnvAsync(
    {NODE_ENV: 'production', AUTH_OTP_MODE: 'mock', AUTH_OTP_MOCK_IN_PRODUCTION: undefined},
    async () => {
      assert.throws(() => authOtp.getOtpService(), /not allowed in production/);
    },
  );
});

test('getOtpService: with the override EVERY phone gets the deterministic devCode', async () => {
  await withEnvAsync(
    {NODE_ENV: 'production', AUTH_OTP_MODE: 'mock', AUTH_OTP_MOCK_IN_PRODUCTION: 'true'},
    async () => {
      const service = authOtp.getOtpService();
      // Three different numbers — no allowlist: everyone gets the mock code.
      for (const phone of ['09123456789', '09351234567', '09212345678']) {
        const result = await service.requestCode({phone});
        assert.equal(result.ok, true, `request for ${phone} must succeed`);
        if (result.ok) {
          assert.equal(result.devCode, MOCK_OTP_CODE, `devCode for ${phone}`);
        }
      }
    },
  );
});

test('getOtpService: dev/CI mock still works without the override', async () => {
  await withEnvAsync(
    {NODE_ENV: 'development', AUTH_OTP_MODE: 'mock', AUTH_OTP_MOCK_IN_PRODUCTION: undefined},
    async () => {
      const service = authOtp.getOtpService();
      const result = await service.requestCode({phone: '09123456789'});
      assert.equal(result.ok, true);
      if (result.ok) assert.equal(result.devCode, MOCK_OTP_CODE);
    },
  );
});

test('createMockOtpService: verify with 123456 invokes the session hook once', async () => {
  const verified: string[] = [];
  const service = createMockOtpService({
    onVerified: async (phone) => {
      verified.push(phone);
    },
  });

  await service.requestCode({phone: '09123456789'});
  const result = await service.verifyCode({phone: '09123456789', code: MOCK_OTP_CODE});

  assert.deepEqual(result, {ok: true});
  assert.deepEqual(verified, ['+989123456789'], 'hook receives the normalized phone');
});

test('createMockOtpService: wrong code does NOT run the session hook', async () => {
  const verified: string[] = [];
  const service = createMockOtpService({
    onVerified: async (phone) => {
      verified.push(phone);
    },
  });

  await service.requestCode({phone: '09123456789'});
  const result = await service.verifyCode({phone: '09123456789', code: '000000'});

  assert.equal(result.ok, false);
  assert.equal(verified.length, 0);
});

test('createMockOtpService: the 60s resend cooldown still applies', async () => {
  const service = createMockOtpService();
  await service.requestCode({phone: '09123456789'});

  const second = await service.requestCode({phone: '09123456789'});
  assert.equal(second.ok, false);
  if (!second.ok) {
    assert.equal(second.error, 'rate_limited');
    assert.ok(second.retryAfterSeconds !== undefined && second.retryAfterSeconds > 0);
  }
});
