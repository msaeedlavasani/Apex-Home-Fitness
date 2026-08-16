/**
 * OTP service — app-managed phone verification codes (Batch 14 task 2).
 *
 * Architecture:
 *
 *   SMS.ir is ONLY the code-delivery provider (canonical adapter:
 *   `src/lib/auth/smsIrProvider.ts`, Batch 14 task 1). This service owns the
 *   full code lifecycle against the `PhoneOtp` ledger (prisma/schema.prisma):
 *
 *     HASH        — `codeHash` stores a scrypt digest (random salt per record);
 *                   the plaintext code never touches the database.
 *     EXPIRY      — a challenge dies after `OtpPolicy.codeTtlMs`.
 *     SINGLE-USE  — verification consumes the row atomically
 *                   (`updateMany ... where consumedAt: null`); a replayed
 *                   verify request can never succeed twice.
 *     ATTEMPTS    — every verify increments `attempts` before the
 *                   (constant-time) hash check; after `maxAttempts` the
 *                   challenge locks.
 *     REPLAY      — `requestId` is UNIQUE: re-sending `/request` with the same
 *                   key returns the original challenge without a new SMS; a
 *                   key reused for another phone is rejected; a consumed
 *                   challenge rejects re-verification.
 *     COOLDOWN    — a new challenge for a phone can only replace an active one
 *                   after `resendCooldownMs`; afterwards the old code is
 *                   invalidated (a leaked SMS log can never be replayed).
 *
 * Two surfaces, one secure core:
  *   - `requestOtpCode` / `verifyOtpCode` — secure requestId-based core used by
  *     `POST /api/auth/request-code` and `POST /api/auth/verify` through the
  *     canonical provider-agnostic error mapping.
 *   - `createSecureOtpService` — the canonical `OtpService` seam
 *     (`src/lib/auth/types.ts`) used by `POST /api/auth/request-code` and
 *     `POST /api/auth/verify` via the factory (`src/lib/auth/otpService.ts`);
 *     it wraps the SAME core and maps to provider-agnostic codes.
 *
 *   SESSION: only after a code verifies is the phone proven, and only then
 *   is the session established (`phoneSessionService.establishSessionForVerifiedPhone`
 *   — Supabase SSR cookies via an email-mapped identity; see that module for
 *   the documented Supabase phone-auth blocker). There is NO parallel "auth"
 *   path and no client-side secret (service-role key and SMS.ir API key are
 *   server-only).
 *
 * Fail-closed: any send failure deletes the challenge row so a retry
 * regenerates, and every failure maps to a safe client response — never a
 * fake success.
 */
import {randomUUID} from 'node:crypto';

import {prisma} from '../lib/prisma';
import {
  AttemptsExhaustedError,
  CodeAlreadyUsedError,
  CodeExpiredError,
  CooldownActiveError,
  generateOtpCode,
  getOtpPolicy,
  hashOtpCode,
  InvalidCodeError,
  InvalidPhoneError,
  InvalidRequestError,
  isPlausibleOtpCode,
  normalizeIranianPhone,
  normalizeRequestId,
  type OtpPolicy,
  OtpServiceError,
  RequestIdConflictError,
  verifyOtpCodeHash,
} from '../lib/auth/otp';
import type {OtpErrorCode, OtpService, RequestCodeResult, VerifyCodeResult} from '../lib/auth/types';
import {normalizePhone} from '../lib/auth/phone';
import {hasSupabaseEnv} from '../lib/auth/mode';
import {createSmsIrOtpProvider, SmsIrProviderError, SMSIR_ERROR_CODES, type SmsIrOtpProvider} from '../lib/auth/smsIrProvider';
import {establishSessionForVerifiedPhone} from './phoneSessionService';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Delivery seam — production default is the canonical SMS.ir provider. */
export interface OtpSmsSender {
  /** Sends `code` to `phone`. Must throw (typed) on any failure. */
  send(phone: string, code: string): Promise<void>;
}

export interface RequestOtpInput {
  /** Raw phone as submitted by the client (normalized internally). */
  phone: string;
  /** Optional idempotency key; the server generates one when absent. */
  requestId?: string;
  /** Injectable clock (tests). */
  now?: number;
}

export interface RequestOtpResult {
  /** Opaque token the client must echo on verify. */
  requestId: string;
  /** Seconds until the challenge expires. */
  expiresInSeconds: number;
  /** Seconds until a NEW challenge may be requested for this phone. */
  resendAfterSeconds: number;
  /** True when an existing active challenge was returned without a new SMS. */
  replayed: boolean;
}

export interface VerifyOtpInput {
  phone: string;
  requestId: string;
  code: string;
  /** Injectable clock (tests). */
  now?: number;
}

export interface VerifiedContext {
  phone: string;
  requestId: string;
}

/**
 * Hook invoked AFTER the challenge is consumed atomically. The default is
 * session establishment; the API route may override for tests. If the hook
 * throws, the code STAYS consumed (secure default — the client simply
 * requests a fresh code).
 */
export type OnVerifiedHook = (ctx: VerifiedContext) => Promise<void>;

export interface VerifyOtpResult {
  phone: string;
  requestId: string;
}

/** Builds the default SMS.ir sender lazily (env read at send time). */
function defaultSender(): OtpSmsSender {
  const provider: SmsIrOtpProvider = createSmsIrOtpProvider();
  return {
    async send(phone, code) {
      await provider.sendOtp({mobile: phone, code});
    },
  };
}

// ---------------------------------------------------------------------------
// Request a code
// ---------------------------------------------------------------------------

/**
 * Issues (or replays) a phone OTP challenge.
 *
 * @returns `{ requestId, expiresInSeconds, resendAfterSeconds, replayed }`.
 * @throws InvalidPhoneError | InvalidRequestError | RequestIdConflictError |
 *         CooldownActiveError | SmsIrProviderError (from the canonical
 *         SMS.ir provider)
 */
export async function requestOtpCode(
  input: RequestOtpInput,
  opts: {policy?: OtpPolicy; sender?: OtpSmsSender; now?: number} = {},
): Promise<RequestOtpResult> {
  const policy = opts.policy ?? getOtpPolicy();
  const now = opts.now ?? Date.now();
  const sender = opts.sender ?? defaultSender();

  const phone = normalizeIranianPhone(input.phone);
  if (!phone) throw new InvalidPhoneError();

  // requestId: reject a present-but-malformed key; generate one when absent.
  const clientRequestId = normalizeRequestId(input.requestId);
  if (input.requestId !== undefined && input.requestId !== null && clientRequestId === null) {
    throw new InvalidRequestError('Invalid requestId.');
  }
  const requestId = clientRequestId ?? randomUUID();

  // Replay protection (request side): the same key returns the original
  // challenge — no new code, no new SMS.
  if (clientRequestId !== null) {
    const existing = await prisma.phoneOtp.findUnique({where: {requestId}});
    if (existing) {
      if (existing.phone !== phone) throw new RequestIdConflictError();
      const active = existing.consumedAt === null && existing.expiresAt.getTime() > now;
      if (active) {
        return {
          requestId,
          expiresInSeconds: Math.max(1, Math.ceil((existing.expiresAt.getTime() - now) / 1000)),
          resendAfterSeconds: 0,
          replayed: true,
        };
      }
      // Consumed or expired — the key is free to be reused for a fresh challenge.
      await prisma.phoneOtp.deleteMany({where: {requestId}});
    }
  }

  // Cooldown: an active challenge for this phone blocks a NEW one until the
  // cooldown elapses; afterwards it is invalidated (previous code no longer
  // works, so a compromised SMS log cannot be replayed).
  const activeForPhone = await prisma.phoneOtp.findFirst({
    where: {phone, purpose: 'SIGNIN', consumedAt: null, expiresAt: {gt: new Date(now)}},
    orderBy: {createdAt: 'desc'},
  });
  if (activeForPhone && activeForPhone.requestId !== requestId) {
    const age = now - activeForPhone.createdAt.getTime();
    if (age < policy.resendCooldownMs) {
      const retryAfterSeconds = Math.max(1, Math.ceil((policy.resendCooldownMs - age) / 1000));
      throw new CooldownActiveError(retryAfterSeconds);
    }
    await prisma.phoneOtp.deleteMany({
      where: {phone, purpose: 'SIGNIN', consumedAt: null},
    });
  }

  // Fresh challenge: 6-digit code, scrypt-hashed, never stored in plaintext.
  // `createdAt` is set EXPLICITLY from the injected clock so cooldown math
  // (age = now - createdAt) is deterministic in tests and correct in prod.
  const code = generateOtpCode(policy.codeLength);
  const expiresAt = new Date(now + policy.codeTtlMs);
  await prisma.phoneOtp.create({
    data: {
      phone,
      purpose: 'SIGNIN',
      requestId,
      codeHash: hashOtpCode(code, policy.codeLength),
      maxAttempts: policy.maxAttempts,
      expiresAt,
      createdAt: new Date(now),
    },
  });

  // Deliver AFTER persisting so a crash between the two never leaves an
  // unsendable challenge; on failure the row is removed so a retry with the
  // same requestId regenerates instead of 409-ing on the unique key.
  try {
    await sender.send(phone, code);
  } catch (error) {
    await prisma.phoneOtp.deleteMany({where: {requestId}}).catch(() => undefined);
    throw error;
  }

  return {
    requestId,
    expiresInSeconds: Math.max(1, Math.ceil(policy.codeTtlMs / 1000)),
    resendAfterSeconds: Math.max(1, Math.ceil(policy.resendCooldownMs / 1000)),
    replayed: false,
  };
}

// ---------------------------------------------------------------------------
// Verify — shared consume core
// ---------------------------------------------------------------------------

interface ActiveChallenge {
  id: string;
  codeHash: string;
  maxAttempts: number;
  expiresAt: Date;
}

/**
 * Shared single-use verification core used by BOTH surfaces. Ordering is
 * deliberate and race-safe:
 *   1. attempts are incremented BEFORE the hash check (every guess counts),
 *   2. the hash is checked in constant time,
 *   3. success consumes the row with `where consumedAt: null` — under
 *      concurrency exactly one verify wins; every loser sees
 *      CODE_ALREADY_USED.
 *
 * @throws InvalidCodeError | CodeExpiredError | CodeAlreadyUsedError |
 *         AttemptsExhaustedError
 */
async function consumeChallenge(
  challenge: ActiveChallenge,
  code: string,
  policy: OtpPolicy,
  now: number,
): Promise<void> {
  if (challenge.expiresAt.getTime() <= now) throw new CodeExpiredError();

  // Count the attempt atomically; lock the challenge once the budget is spent.
  await prisma.phoneOtp.updateMany({
    where: {id: challenge.id, consumedAt: null},
    data: {attempts: {increment: 1}},
  });
  const updated = await prisma.phoneOtp.findUniqueOrThrow({where: {id: challenge.id}});
  if (updated.attempts > updated.maxAttempts) {
    await prisma.phoneOtp.updateMany({
      where: {id: challenge.id, consumedAt: null},
      data: {consumedAt: new Date(now)},
    });
    throw new AttemptsExhaustedError();
  }

  // Constant-time comparison — a wrong code costs one attempt and nothing more.
  if (!verifyOtpCodeHash(code, updated.codeHash)) {
    throw new InvalidCodeError();
  }

  // Single-use: consume atomically. count===0 means a concurrent verify won.
  const consumed = await prisma.phoneOtp.updateMany({
    where: {id: challenge.id, consumedAt: null},
    data: {consumedAt: new Date(now)},
  });
  if (consumed.count === 0) throw new CodeAlreadyUsedError();
}

/**
 * Verifies a submitted code against the ACTIVE challenge for a phone (used by
 * the canonical `OtpService` seam, which has no requestId). Distinguishes
 * "never requested" from "expired/consumed" for a precise error.
 */
async function verifyLatestChallengeForPhone(
  phone: string,
  code: string,
  policy: OtpPolicy,
  now: number,
  onVerified: OnVerifiedHook,
): Promise<VerifyOtpResult> {
  const challenge = await prisma.phoneOtp.findFirst({
    where: {phone, purpose: 'SIGNIN', consumedAt: null},
    orderBy: {createdAt: 'desc'},
  });
  if (!challenge) {
    const anyRow = await prisma.phoneOtp.findFirst({
      where: {phone, purpose: 'SIGNIN'},
      orderBy: {createdAt: 'desc'},
    });
    if (anyRow) throw new CodeExpiredError();
    throw new InvalidRequestError('No code was requested for this phone.');
  }

  await consumeChallenge(
    {id: challenge.id, codeHash: challenge.codeHash, maxAttempts: challenge.maxAttempts, expiresAt: challenge.expiresAt},
    code,
    policy,
    now,
  );
  await onVerified({phone, requestId: challenge.requestId});
  return {phone, requestId: challenge.requestId};
}

// ---------------------------------------------------------------------------
// Verify — requestId-based secure core used by the canonical auth route
// ---------------------------------------------------------------------------

/**
 * Verifies a submitted code against the active challenge (by requestId) and
 * consumes it. After success `onVerified` runs (session establishment by
 * default); if it throws, the code stays consumed.
 *
 * @throws InvalidPhoneError | InvalidRequestError | InvalidCodeError |
 *         CodeExpiredError | CodeAlreadyUsedError | AttemptsExhaustedError |
 *         anything thrown by `onVerified`
 */
export async function verifyOtpCode(
  input: VerifyOtpInput,
  opts: {policy?: OtpPolicy; now?: number; onVerified?: OnVerifiedHook} = {},
): Promise<VerifyOtpResult> {
  const policy = opts.policy ?? getOtpPolicy();
  const now = opts.now ?? Date.now();
  const onVerified = opts.onVerified ?? (async (ctx) => {
    await establishSessionForVerifiedPhone(ctx.phone);
  });

  const phone = normalizeIranianPhone(input.phone);
  if (!phone) throw new InvalidPhoneError();

  const requestId = normalizeRequestId(input.requestId);
  if (requestId === null) throw new InvalidRequestError('Invalid requestId.');
  if (!isPlausibleOtpCode(input.code, policy.codeLength)) {
    throw new InvalidCodeError();
  }

  const challenge = await prisma.phoneOtp.findUnique({where: {requestId}});

  // Distinguish replay states so the client gets a precise, safe error.
  if (!challenge) throw new InvalidCodeError();
  if (challenge.phone !== phone) throw new InvalidCodeError();
  if (challenge.consumedAt !== null) throw new CodeAlreadyUsedError();

  await consumeChallenge(
    {id: challenge.id, codeHash: challenge.codeHash, maxAttempts: challenge.maxAttempts, expiresAt: challenge.expiresAt},
    input.code,
    policy,
    now,
  );

  // The phone is proven. Session establishment runs here; a failure leaves the
  // challenge consumed (the client re-requests — no replay window).
  await onVerified({phone, requestId});

  return {phone, requestId};
}

// ---------------------------------------------------------------------------
// Canonical OtpService seam (POST /api/auth/request-code + /api/auth/verify)
// ---------------------------------------------------------------------------

/** Dependency seam for the canonical implementation (tests inject fakes). */
export interface SecureOtpServiceDeps {
  /** SMS.ir delivery (default: canonical `createSmsIrOtpProvider()`). */
  provider?: SmsIrOtpProvider;
  /** Session side effect after a verified phone (default: Supabase SSR). */
  establishSession?: (phone: string) => Promise<unknown>;
  policy?: OtpPolicy;
  now?: () => number;
}

/** Maps typed OTP/SMS.ir failures to the canonical provider-agnostic codes. */
function toCanonicalError(error: unknown): RequestCodeResult | VerifyCodeResult {
  if (error instanceof OtpServiceError) {
    switch (error.code) {
      case 'INVALID_PHONE':
        return {ok: false, error: 'invalid_phone'};
      case 'INVALID_CODE':
        return {ok: false, error: 'invalid_code'};
      case 'CODE_EXPIRED':
      case 'CODE_ALREADY_USED':
        return {ok: false, error: 'expired'};
      case 'ATTEMPTS_EXHAUSTED':
        return {ok: false, error: 'too_many_attempts'};
      case 'COOLDOWN':
      case 'RATE_LIMITED':
        return {ok: false, error: 'rate_limited', retryAfterSeconds: error.retryAfterSeconds};
      default:
        return {ok: false, error: 'provider_error'};
    }
  }
  if (error instanceof SmsIrProviderError) {
    if (error.code === SMSIR_ERROR_CODES.RATE_LIMITED) {
      return {
        ok: false,
        error: 'rate_limited',
        retryAfterSeconds:
          typeof error.retryAfterMs === 'number' ? Math.max(1, Math.ceil(error.retryAfterMs / 1000)) : undefined,
      };
    }
    return {ok: false, error: 'provider_error'};
  }
  return {ok: false, error: 'provider_error'};
}

/**
 * Creates the canonical `OtpService` implementation (factory default in
 * production): SMS.ir delivers, the app owns hashing/expiry/single-use/
 * attempts/session, and every failure is an honest provider-agnostic result.
 */
export function createSecureOtpService(deps: SecureOtpServiceDeps = {}): OtpService {
  const policy = deps.policy ?? getOtpPolicy();
  const now = deps.now ?? (() => Date.now());
  const provider = deps.provider ?? createSmsIrOtpProvider();
  const establishSession = deps.establishSession ?? establishSessionForVerifiedPhone;

  const onVerified: OnVerifiedHook = async (ctx) => {
    await establishSession(ctx.phone);
  };

  return {
    async requestCode({phone}): Promise<RequestCodeResult> {
      if (!normalizePhone(phone)) return {ok: false, error: 'invalid_phone'};
      try {
        const result = await requestOtpCode({phone, now: now()}, {policy, now: now()});
        return {ok: true, retryAfterSeconds: result.resendAfterSeconds};
      } catch (error) {
        return toCanonicalError(error);
      }
    },

    async verifyCode({phone, code}): Promise<VerifyCodeResult> {
      if (!normalizePhone(phone)) return {ok: false, error: 'invalid_phone'};
      if (!isPlausibleOtpCode(code, policy.codeLength)) return {ok: false, error: 'invalid_code'};
      // Session-provider availability gate. Without Supabase the verified code
      // cannot be exchanged for a session — fail BEFORE consuming the
      // challenge so the code stays valid once the provider is configured
      // (no burning codes + a precise, honest error message).
      if (!hasSupabaseEnv()) {
        return {ok: false, error: 'session_unavailable'};
      }
      try {
        await verifyLatestChallengeForPhone(phone, code, policy, now(), onVerified);
        return {ok: true};
      } catch (error) {
        return toCanonicalError(error);
      }
    },
  };
}

// ---------------------------------------------------------------------------
// Retention
// ---------------------------------------------------------------------------

/**
 * Lazy retention cleanup: drops expired challenges and consumed challenges
 * older than `olderThanMs` (default 24 h). Called opportunistically by the
 * API layer; the rows are also covered by the unique/index design so a stale
 * row can never be verified twice.
 */
export async function cleanupExpiredOtps(
  opts: {now?: number; olderThanMs?: number} = {},
): Promise<{deleted: number}> {
  const now = opts.now ?? Date.now();
  const olderThanMs = opts.olderThanMs ?? 86_400_000;
  const result = await prisma.phoneOtp.deleteMany({
    where: {
      OR: [
        {expiresAt: {lt: new Date(now)}},
        {consumedAt: {lt: new Date(now - olderThanMs)}},
      ],
    },
  });
  return {deleted: result.count};
}
