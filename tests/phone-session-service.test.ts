/**
 * Phone → Supabase session strategy tests (`src/services/phoneSessionService.ts`).
 *
 * Two layers:
 *   1. PURE: deterministic phone → email / UUIDv5 mappings and the
 *      config-error path (missing env → typed SessionProviderConfigError —
 *      an honest failure, never a fake session).
 *   2. CONTRACT: the orchestration (`ensureAuthUserForPhone`,
 *      `extractTokenHashFromLink`, `establishSessionForVerifiedPhone`) is
 *      exercised against a minimal fake of the SUPABASE SDK boundary to pin
 *      OUR call pattern (deterministic id lookup → createUser → generateLink
 *      → token-hash exchange). The fake implements the documented admin
 *      interface; no real Supabase project is contacted, and no production
 *      behavior is stubbed out.
 */
import assert from 'node:assert/strict';
import test from 'node:test';

import {
  establishSessionForVerifiedPhone,
  ensureAuthUserForPhone,
  extractTokenHashFromLink,
  getSessionProviderConfig,
  phoneToAuthEmail,
  phoneToAuthUserId,
  SessionEstablishmentError,
  SessionProviderConfigError,
  type PhoneAuthAdminClient,
} from '../src/services/phoneSessionService';
import {OTP_ERROR_CODES} from '../src/lib/auth/otp';

// ---------------------------------------------------------------------------
// Deterministic identity mapping
// ---------------------------------------------------------------------------

test('phone maps to a deterministic, stable synthetic email', () => {
  const phone = '+989121234567';
  const a = phoneToAuthEmail(phone);
  const b = phoneToAuthEmail(phone);
  assert.equal(a, b, 'same phone must always map to the same email');
  assert.match(a, /^phone-[a-f0-9]{24}@phone\.apex\.invalid$/);
  assert.ok(!a.includes('9121234567'), 'the phone must not be embedded verbatim');
  assert.notEqual(phoneToAuthEmail(phone), phoneToAuthEmail('+989123456789'));
});

test('phone maps to a deterministic, valid UUIDv5', () => {
  const phone = '+989121234567';
  const id = phoneToAuthUserId(phone);
  const uuidRe = /^[0-9a-f]{8}-[0-9a-f]{4}-5[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
  assert.match(id, uuidRe, 'must be a valid version-5 UUID');
  assert.equal(phoneToAuthUserId(phone), id, 'deterministic');
  assert.notEqual(phoneToAuthUserId(phone), phoneToAuthUserId('+989123456789'));
});

test('extracts the token_hash from a generated magic link', () => {
  const link =
    'https://example.supabase.co/auth/v1/verify?token=hash&type=magiclink&token_hash=abc123&redirect_to=/dashboard';
  assert.equal(extractTokenHashFromLink(link), 'abc123');
  assert.equal(
    extractTokenHashFromLink('https://example.supabase.co/auth/v1/verify?token=legacy123'),
    'legacy123',
  );
  assert.equal(extractTokenHashFromLink('not a url'), null);
  assert.equal(extractTokenHashFromLink('https://example.test/link-without-token'), null);
});

// ---------------------------------------------------------------------------
// Config gating (fail closed — no fake sessions)
// ---------------------------------------------------------------------------

test('missing session provider env throws a typed config error, never a fake session', () => {
  const originalUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const originalKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  try {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    assert.throws(() => getSessionProviderConfig({}), SessionProviderConfigError);
    try {
      getSessionProviderConfig({NEXT_PUBLIC_SUPABASE_URL: 'https://x.supabase.co'});
      assert.fail('missing service role key must throw');
    } catch (error) {
      assert.ok(error instanceof SessionProviderConfigError);
      assert.equal(error.code, OTP_ERROR_CODES.SESSION_PROVIDER_NOT_CONFIGURED);
      assert.match(error.message, /SUPABASE_SERVICE_ROLE_KEY/);
    }
  } finally {
    if (originalUrl !== undefined) process.env.NEXT_PUBLIC_SUPABASE_URL = originalUrl;
    if (originalKey !== undefined) process.env.SUPABASE_SERVICE_ROLE_KEY = originalKey;
  }
});

test('establishSessionForVerifiedPhone fails closed when config is missing', async () => {
  const originalUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const originalKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  try {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    await assert.rejects(
      establishSessionForVerifiedPhone('+989121234567'),
      SessionProviderConfigError,
    );
  } finally {
    if (originalUrl !== undefined) process.env.NEXT_PUBLIC_SUPABASE_URL = originalUrl;
    if (originalKey !== undefined) process.env.SUPABASE_SERVICE_ROLE_KEY = originalKey;
  }
});

// ---------------------------------------------------------------------------
// Orchestration contract (fake of the Supabase SDK boundary)
// ---------------------------------------------------------------------------

const PHONE = '+989121234567';

/** Records admin calls and lets each test script the responses. */
function fakeAdmin(overrides: {
  existingUser?: boolean;
  createError?: boolean;
  linkError?: boolean;
} = {}): {
  admin: PhoneAuthAdminClient;
  calls: string[];
} {
  const calls: string[] = [];
  const user = {id: phoneToAuthUserId(PHONE), email: phoneToAuthEmail(PHONE)};
  const admin: PhoneAuthAdminClient = {
    async getUserById(id) {
      calls.push(`getUserById:${id}`);
      if (overrides.existingUser) return {data: {user}, error: null};
      return {data: {user: null}, error: {code: 'user_not_found', message: 'not found'}};
    },
    async createUser(attrs) {
      calls.push(`createUser:${attrs.email}`);
      if (overrides.createError) return {data: {user: null}, error: {code: 'email_exists', message: 'exists'}};
      return {data: {user: {id: attrs.id, email: attrs.email}}, error: null};
    },
    async generateLink(params) {
      calls.push(`generateLink:${params.type}:${params.email}`);
      if (overrides.linkError) return {data: null, error: {code: 'error', message: 'boom'}};
      return {
        data: {
          properties: {
            action_link: `https://example.supabase.co/verify?token_hash=hash-${PHONE.length}`,
          },
        },
        error: null,
      };
    },
  };
  return {admin, calls};
}

test('ensureAuthUserForPhone creates the user with the deterministic identity', async () => {
  const {admin, calls} = fakeAdmin();
  const user = await ensureAuthUserForPhone(admin, PHONE);

  assert.equal(user.id, phoneToAuthUserId(PHONE));
  assert.equal(user.email, phoneToAuthEmail(PHONE));
  assert.deepEqual(calls, [`getUserById:${phoneToAuthUserId(PHONE)}`, `createUser:${phoneToAuthEmail(PHONE)}`]);
});

test('ensureAuthUserForPhone reuses the existing user (idempotent upsert)', async () => {
  const {admin, calls} = fakeAdmin({existingUser: true});
  const user = await ensureAuthUserForPhone(admin, PHONE);
  assert.equal(user.id, phoneToAuthUserId(PHONE));
  assert.deepEqual(calls, [`getUserById:${phoneToAuthUserId(PHONE)}`]);
});

test('ensureAuthUserForPhone surfaces create failures as typed errors', async () => {
  const {admin} = fakeAdmin({createError: true});
  await assert.rejects(ensureAuthUserForPhone(admin, PHONE), SessionEstablishmentError);
});

test('establishSessionForVerifiedPhone mints a session through the exchange', async () => {
  const {admin, calls} = fakeAdmin();
  let exchanged: string | null = null;
  const exchange = async (tokenHash: string) => {
    exchanged = tokenHash;
    return {id: phoneToAuthUserId(PHONE), email: phoneToAuthEmail(PHONE)};
  };

  const sessionUser = await establishSessionForVerifiedPhone(PHONE, {admin, exchangeTokenHash: exchange});
  assert.equal(sessionUser.id, phoneToAuthUserId(PHONE));
  assert.equal(exchanged, `hash-${PHONE.length}`);
  assert.deepEqual(calls, [
    `getUserById:${phoneToAuthUserId(PHONE)}`,
    `createUser:${phoneToAuthEmail(PHONE)}`,
    `generateLink:magiclink:${phoneToAuthEmail(PHONE)}`,
  ]);
});

test('establishSessionForVerifiedPhone fails when the link carries no token hash', async () => {
  const admin = fakeAdmin().admin;
  // Overwrite generateLink to return a link without token_hash.
  const broken: PhoneAuthAdminClient = {
    ...admin,
    async generateLink() {
      return {data: {properties: {action_link: 'https://example.test/no-token'}}, error: null};
    },
  };
  await assert.rejects(
    establishSessionForVerifiedPhone(PHONE, {admin: broken, exchangeTokenHash: async () => ({id: 'x', email: 'x@x'})}),
    SessionEstablishmentError,
  );
});
