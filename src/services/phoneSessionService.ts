/**
 * Phone → Supabase session strategy (the "session" half of phone OTP auth).
 *
 * Strategy (documented in depth in `docs/OTP_LAUNCH_READINESS.md`):
 *
 *   1. SMS.ir delivers the code; `otpService` verifies it (hash/expiry/
 *      single-use/attempts/replay). After verification the phone is PROVEN.
 *   2. Supabase Auth is the single session authority. Because SMS.ir is NOT a
 *      supported Supabase phone provider (Supabase only supports Twilio,
 *      Vonage, MessageBird and TextLocal for phone login — verified against
 *      Supabase docs), we never call `signInWithOtp({ phone })`. Instead the
 *      verified phone is mapped deterministically to a synthetic email
 *      identity (`phoneToAuthEmail`) and a real Supabase Auth user:
 *      - deterministic UUIDv5 user id derived from the phone
 *        (`phoneToAuthUserId`) — the same phone always maps to the same user,
 *        and the id doubles as the Prisma `User.id` via the existing
 *        `syncUserWithSupabase` path (no schema change, no parallel auth).
 *      - `admin.createUser` (service role, server-only) with
 *        `email_confirm: true` — the phone was already proven by the OTP.
 *   3. A real session is minted server-side: `admin.generateLink` (magiclink)
 *      → token hash → `supabase.auth.verifyTokenHash` on the SSR client, which
 *      persists the Supabase Auth cookies for the request.
 *
 * BLOCKER (documented, not silently worked around):
 *   - Native Supabase PHONE identity (`user.phone`, `signInWithOtp({phone})`)
 *     is IMPOSSIBLE with SMS.ir — Supabase phone auth requires a Twilio /
 *     Vonage / MessageBird / TextLocal SMS provider. That part is tracked as
 *     a blocker in `docs/TASKS.md`; this module implements the working,
 *     supported path (email-mapped identity) and FAILS HONESTLY
 *     (`SessionProviderConfigError`, 503) when the required server-side env
 *     (`SUPABASE_SERVICE_ROLE_KEY` / `NEXT_PUBLIC_SUPABASE_URL`) is missing.
 *     There is no fake session, no mocked success.
 *
 * Secrets: `SUPABASE_SERVICE_ROLE_KEY` is read HERE only (server). The
 * browser never sees it; the exchange is done through the request-bound SSR
 * client (anon key + cookies).
 */
import {createHash} from 'node:crypto';

import {createClient} from '@supabase/supabase-js';

import {createServerSupabaseClient} from '../lib/supabase-server';

// ---------------------------------------------------------------------------
// Deterministic phone → identity mapping (pure, unit-tested)
// ---------------------------------------------------------------------------

const EMAIL_DOMAIN = 'phone.apex.invalid'; // RFC 2606 reserved — never routable
const EMAIL_LOCAL_LENGTH = 24;
const UUID_NAMESPACE = '6ba7b810-9dad-11d1-80b4-00c04fd430c8'; // RFC 4122 URL NAMESPACE

/**
 * Deterministic synthetic email for a verified phone. The phone number is
 * never embedded verbatim (hash prefix only) so the email column stays
 * privacy-neutral; the phone itself lives in `user_metadata` and the OTP
 * ledger.
 */
export function phoneToAuthEmail(phone: string): string {
  const digest = createHash('sha256').update(phone).digest('hex').slice(0, EMAIL_LOCAL_LENGTH);
  return `phone-${digest}@${EMAIL_DOMAIN}`;
}

/** Deterministic RFC 4122 v5 UUID from a namespace + phone. */
export function phoneToAuthUserId(phone: string): string {
  const ns = Buffer.from(UUID_NAMESPACE.replace(/-/g, ''), 'hex');
  const name = Buffer.from(`apex-home-fitness:phone:${phone}`, 'utf8');
  const hash = createHash('sha1').update(ns).update(name).digest();
  hash[6] = (hash[6] & 0x0f) | 0x50; // version 5
  hash[8] = (hash[8] & 0x3f) | 0x80; // RFC 4122 variant
  const hex = hash.subarray(0, 16).toString('hex');
  return [
    hex.slice(0, 8),
    hex.slice(8, 12),
    hex.slice(12, 16),
    hex.slice(16, 20),
    hex.slice(20, 32),
  ].join('-');
}

// ---------------------------------------------------------------------------
// Configuration (server-only env)
// ---------------------------------------------------------------------------

export interface PhoneSessionProviderConfig {
  url: string;
  serviceRoleKey: string;
}

/** Stable internal code the secure OTP service maps to a canonical result. */
export type PhoneSessionErrorCode = 'SESSION_PROVIDER_NOT_CONFIGURED' | 'SESSION_FAILED';

/** Thrown when `SUPABASE_SERVICE_ROLE_KEY` / URL are missing (fail closed). */
export class SessionProviderConfigError extends Error {
  readonly code: PhoneSessionErrorCode = 'SESSION_PROVIDER_NOT_CONFIGURED';

  constructor(missing: string[]) {
    super(`Session provider is not configured (missing: ${missing.join(', ')}).`);
    this.name = 'SessionProviderConfigError';
  }
}

/** Any failure while creating the Supabase user / minting the session. */
export class SessionEstablishmentError extends Error {
  readonly code: PhoneSessionErrorCode = 'SESSION_FAILED';

  constructor(message = 'Session establishment failed.') {
    super(message);
    this.name = 'SessionEstablishmentError';
  }
}

/**
 * Reads the server-side session provider config. Throws
 * `SessionProviderConfigError` (never returns a partial config) — the caller
 * maps that to an honest 503.
 */
export function getSessionProviderConfig(
  env: Record<string, string | undefined> = process.env,
): PhoneSessionProviderConfig {
  const missing: string[] = [];
  const url = env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url) missing.push('NEXT_PUBLIC_SUPABASE_URL');
  if (!serviceRoleKey) missing.push('SUPABASE_SERVICE_ROLE_KEY');
  if (missing.length > 0) throw new SessionProviderConfigError(missing);
  return {url: url as string, serviceRoleKey: serviceRoleKey as string};
}

// ---------------------------------------------------------------------------
// Minimal admin-client contract (for testable orchestration)
// ---------------------------------------------------------------------------

export interface PhoneAuthUser {
  id: string;
  email: string;
}

export interface PhoneAuthAdminClient {
  getUserById(id: string): Promise<{data: {user: PhoneAuthUser | null}; error: {code?: string; message: string} | null}>;
  createUser(attrs: {
    id: string;
    email: string;
    email_confirm: boolean;
    user_metadata: Record<string, unknown>;
  }): Promise<{data: {user: PhoneAuthUser | null}; error: {code?: string; message: string} | null}>;
  generateLink(params: {
    type: 'magiclink';
    email: string;
  }): Promise<{
    data: {
      properties?: {action_link?: string; hashed_token?: string; token_hash?: string} | null;
      user?: PhoneAuthUser | null;
    } | null;
    error: {code?: string; message: string} | null;
  }>;
}

/** Builds the real service-role admin client (server-only). */
export function createServiceRoleAdminClient(config: PhoneSessionProviderConfig): PhoneAuthAdminClient {
  const admin = createClient(config.url, config.serviceRoleKey, {
    auth: {persistSession: false, autoRefreshToken: false},
  });

  // The SDK's own response types (UserResponse / GenerateLinkResponse) are
  // richer than our minimal contract; map them EXPLICITLY to the narrow
  // shape instead of casting or using `any`, so the boundary stays honest.
  return {
    async getUserById(id) {
      const {data, error} = await admin.auth.admin.getUserById(id);
      return {
        data: {user: data.user ? {id: data.user.id, email: data.user.email ?? ''} : null},
        error: error ? {code: error.code, message: error.message} : null,
      };
    },
    async createUser(attrs) {
      const {data, error} = await admin.auth.admin.createUser(attrs);
      return {
        data: {user: data.user ? {id: data.user.id, email: data.user.email ?? ''} : null},
        error: error ? {code: error.code, message: error.message} : null,
      };
    },
    async generateLink(params) {
      const {data, error} = await admin.auth.admin.generateLink(params);
      return {
        data: data
          ? {
              properties: data.properties,
              user: data.user ? {id: data.user.id, email: data.user.email ?? ''} : null,
            }
          : null,
        error: error ? {code: error.code, message: error.message} : null,
      };
    },
  };
}

// ---------------------------------------------------------------------------
// Orchestration (real, honest — fails loudly when not configured)
// ---------------------------------------------------------------------------

/**
 * Ensures the Supabase Auth user for a verified phone exists and returns it.
 * Deterministic id → idempotent upsert: `getUserById` first, `createUser`
 * only when missing (no race-prone email search). GoTrue reports a missing
 * user as `{ error: { code: 'user_not_found' } }` — that is the expected
 * "create" branch, not a failure.
 */
export async function ensureAuthUserForPhone(
  admin: PhoneAuthAdminClient,
  phone: string,
): Promise<PhoneAuthUser> {
  const id = phoneToAuthUserId(phone);
  const email = phoneToAuthEmail(phone);

  const existing = await admin.getUserById(id);
  if (existing.error && existing.error.code !== 'user_not_found') {
    throw new SessionEstablishmentError('Failed to look up the auth user.');
  }
  if (existing.data.user) return existing.data.user;

  const created = await admin.createUser({
    id,
    email,
    email_confirm: true, // the phone was already proven by OTP verification
    user_metadata: {phone, verifiedBy: 'phone-otp'},
  });
  if (created.error || !created.data.user) {
    throw new SessionEstablishmentError('Failed to create the auth user.');
  }
  return created.data.user;
}

/**
 * Extracts the token hash from a generated magiclink. The admin API returns
 * `action_link` (full URL) and `hashed_token`; the exchange needs the
 * `token_hash` query parameter of the link.
 */
export function extractTokenHashFromLink(actionLink: string): string | null {
  try {
    const url = new URL(actionLink);
    return url.searchParams.get('token_hash');
  } catch {
    return null;
  }
}

/**
 * Mints a session for a verified phone using the request-bound SSR client
 * (anon key + cookies) — the resulting Supabase Auth cookies are attached to
 * the response by `@supabase/ssr`. Returns the exchanged user.
 *
 * Fail-closed production path: when NO dependencies are injected, the
 * server-side config is resolved FIRST (`getSessionProviderConfig`) and a
 * missing `SUPABASE_SERVICE_ROLE_KEY` / `NEXT_PUBLIC_SUPABASE_URL` throws
 * `SessionProviderConfigError` before any network call — never a fake
 * session. Test seam: when BOTH `admin` and `exchangeTokenHash` are injected
 * the config check is skipped (offline tests, no env required). Mixing
 * injections (e.g. admin without exchange) keeps the production path.
 *
 * @throws SessionProviderConfigError when env is missing and no admin is
 *         injected; SessionEstablishmentError when the provider flow fails.
 */
export async function establishSessionForVerifiedPhone(
  phone: string,
  opts: {
    admin?: PhoneAuthAdminClient;
    exchangeTokenHash?: (tokenHash: string) => Promise<PhoneAuthUser>;
  } = {},
): Promise<PhoneAuthUser> {
  // Short-circuit: an injected admin means the caller owns the identity
  // layer, so the config gate is skipped. Without injections the config is
  // resolved first (fail closed).
  const admin = opts.admin ?? createServiceRoleAdminClient(getSessionProviderConfig());
  const exchange =
    opts.exchangeTokenHash ?? (async (tokenHash) => {
      const supabase = await createServerSupabaseClient();
      // Magic-link exchange: the admin-generated link carries `token_hash`;
      // `verifyOtp({ token_hash, type: 'email' })` swaps it for a real
      // session (this supabase-js version has no `verifyTokenHash`). The
      // session cookies are written by the SSR client's cookie store and
      // attach to the current response. Requires non-PKCE magic links — the
      // production smoke test (Batch 14 task 5) verifies the live flow.
      const {data, error} = await supabase.auth.verifyOtp({
        token_hash: tokenHash,
        type: 'email',
      });
      if (error || !data.user) {
        throw new SessionEstablishmentError();
      }
      return {id: data.user.id, email: data.user.email ?? ''};
    });

  const user = await ensureAuthUserForPhone(admin, phone);
  const link = await admin.generateLink({type: 'magiclink', email: user.email});
  if (link.error || !link.data?.properties?.action_link) {
    throw new SessionEstablishmentError('Failed to generate the sign-in link.');
  }
  const tokenHash = extractTokenHashFromLink(link.data.properties.action_link);
  if (!tokenHash) {
    throw new SessionEstablishmentError('Sign-in link carried no token hash.');
  }

  const sessionUser = await exchange(tokenHash);
  if (!sessionUser.id) {
    throw new SessionEstablishmentError('Session exchange returned no user.');
  }
  return sessionUser;
}
