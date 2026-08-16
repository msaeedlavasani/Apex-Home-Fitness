import {test} from 'node:test';
import assert from 'node:assert/strict';

import {
  hasSupabaseEnv,
  isAuthConfigured,
  otpAuthEnabled,
} from '../src/lib/auth/mode';

const SUPABASE_URL = 'https://example.supabase.co';
const SUPABASE_KEY = 'anon-key';

/**
 * mode.ts reads process.env at call time. Save/restore the keys it consults
 * so tests are hermetic regardless of the host environment.
 */
function withEnv(
  patch: Record<string, string | undefined>,
  fn: () => void,
): void {
  const keys = [
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    'AUTH_OTP_MODE',
    'OTP_AUTH_ENABLED',
  ];
  const saved: Record<string, string | undefined> = {};
  for (const k of keys) {
    saved[k] = process.env[k];
    if (patch[k] === undefined) delete process.env[k];
    else process.env[k] = patch[k] as string;
  }
  try {
    fn();
  } finally {
    for (const k of keys) {
      if (saved[k] === undefined) delete process.env[k];
      else process.env[k] = saved[k] as string;
    }
  }
}

test('otpAuthEnabled: defaults to true when unset', () => {
  withEnv({OTP_AUTH_ENABLED: undefined}, () => {
    assert.equal(otpAuthEnabled(), true);
  });
});

test('otpAuthEnabled: true when explicitly "true"', () => {
  withEnv({OTP_AUTH_ENABLED: 'true'}, () => {
    assert.equal(otpAuthEnabled(), true);
  });
});

test('otpAuthEnabled: false only when "false"', () => {
  withEnv({OTP_AUTH_ENABLED: 'false'}, () => {
    assert.equal(otpAuthEnabled(), false);
  });
});

test('isAuthConfigured: true with AUTH_OTP_MODE=mock (flag unset)', () => {
  withEnv({AUTH_OTP_MODE: 'mock', OTP_AUTH_ENABLED: undefined}, () => {
    assert.equal(isAuthConfigured(), true);
  });
});

test('isAuthConfigured: true with Supabase env (flag unset)', () => {
  withEnv(
    {
      NEXT_PUBLIC_SUPABASE_URL: SUPABASE_URL,
      NEXT_PUBLIC_SUPABASE_ANON_KEY: SUPABASE_KEY,
      OTP_AUTH_ENABLED: undefined,
    },
    () => {
      assert.equal(isAuthConfigured(), true);
    },
  );
});

test('isAuthConfigured: false without backend even when flag enabled', () => {
  withEnv({OTP_AUTH_ENABLED: 'true'}, () => {
    assert.equal(isAuthConfigured(), false);
  });
});

test('rollback: OTP_AUTH_ENABLED=false kills mock-mode protection', () => {
  withEnv(
    {AUTH_OTP_MODE: 'mock', OTP_AUTH_ENABLED: 'false'},
    () => {
      assert.equal(isAuthConfigured(), false);
    },
  );
});

test('rollback: OTP_AUTH_ENABLED=false kills Supabase protection too', () => {
  withEnv(
    {
      NEXT_PUBLIC_SUPABASE_URL: SUPABASE_URL,
      NEXT_PUBLIC_SUPABASE_ANON_KEY: SUPABASE_KEY,
      OTP_AUTH_ENABLED: 'false',
    },
    () => {
      assert.equal(hasSupabaseEnv(), true); // env still present…
      assert.equal(isAuthConfigured(), false); // …but protection is off.
    },
  );
});
