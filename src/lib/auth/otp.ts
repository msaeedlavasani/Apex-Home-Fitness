/**
 * OTP policy, phone normalization, code hashing and error taxonomy — the
 * canonical server contract for the OTP auth flow.
 *
 * This module is PURE (no network, no database, no Next.js runtime) so every
 * security rule is unit-testable in isolation. The full architecture is
 * documented in `src/services/otpService.ts` and `docs/OTP_LAUNCH_READINESS.md`; the
 * short version:
 *
 *   SMS.ir is ONLY the code-delivery provider (`src/lib/auth/smsIrProvider.ts`).
 *   Codes are app-managed: a 6-digit code is hashed with scrypt (random
 *   per-record salt) before it is persisted, and verification is single-use,
 *   time-boxed and attempt-limited (`PhoneOtp` ledger +
 *   `src/services/otpService.ts`). Supabase Auth/SSR provides the session
 *   layer AFTER the phone is proven (`src/services/phoneSessionService.ts`) —
 *   never the other way around, and never a parallel "auth" path.
 *
 * The `OTP_ERROR_CODES` taxonomy here is the contract the API routes emit and
 * the UI maps to localized messages (`src/lib/auth/errorKeys.ts`). Secrets
 * policy: nothing in this module (or anywhere in the flow) ever needs a
 * Supabase service-role key or the SMS.ir API key on the client.
 */
import {randomInt, randomBytes, scryptSync, timingSafeEqual} from 'node:crypto';

// ---------------------------------------------------------------------------
// Policy (env-tunable with secure defaults)
// ---------------------------------------------------------------------------

export interface OtpPolicy {
  /** Length of the generated numeric code (default 6). */
  codeLength: number;
  /** How long a challenge stays valid before it expires (default 15 min). */
  codeTtlMs: number;
  /** Minimum delay before a NEW challenge can replace an active one (default 60 s). */
  resendCooldownMs: number;
  /** Failed attempts allowed per challenge before it is locked (default 5). */
  maxAttempts: number;
  /** Fixed window for `/request` per phone (default 15 min). */
  requestPhoneWindowMs: number;
  requestPhoneLimit: number;
  /** Fixed window for `/request` per IP (default 15 min). */
  requestIpWindowMs: number;
  requestIpLimit: number;
  /** Fixed window for `/verify` per phone (default 15 min). */
  verifyPhoneWindowMs: number;
  verifyPhoneLimit: number;
  /** Fixed window for `/verify` per IP (default 15 min). */
  verifyIpWindowMs: number;
  verifyIpLimit: number;
}

function intFromEnv(
  env: Record<string, string | undefined>,
  name: string,
  fallback: number,
  min: number,
): number {
  const raw = env[name];
  if (raw === undefined || raw === '') return fallback;
  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) && parsed >= min ? parsed : fallback;
}

/** Reads the OTP policy from env, falling back to the documented defaults. */
export function getOtpPolicy(env: Record<string, string | undefined> = process.env): OtpPolicy {
  return {
    codeLength: intFromEnv(env, 'OTP_CODE_LENGTH', 6, 4),
    codeTtlMs: intFromEnv(env, 'OTP_CODE_TTL_MS', 900_000, 60_000),
    resendCooldownMs: intFromEnv(env, 'OTP_RESEND_COOLDOWN_MS', 60_000, 10_000),
    maxAttempts: intFromEnv(env, 'OTP_MAX_ATTEMPTS', 5, 1),
    requestPhoneWindowMs: intFromEnv(env, 'OTP_REQUEST_PHONE_WINDOW_MS', 900_000, 60_000),
    requestPhoneLimit: intFromEnv(env, 'OTP_REQUEST_PHONE_LIMIT', 5, 1),
    requestIpWindowMs: intFromEnv(env, 'OTP_REQUEST_IP_WINDOW_MS', 900_000, 60_000),
    requestIpLimit: intFromEnv(env, 'OTP_REQUEST_IP_LIMIT', 10, 1),
    verifyPhoneWindowMs: intFromEnv(env, 'OTP_VERIFY_PHONE_WINDOW_MS', 900_000, 60_000),
    verifyPhoneLimit: intFromEnv(env, 'OTP_VERIFY_PHONE_LIMIT', 5, 1),
    verifyIpWindowMs: intFromEnv(env, 'OTP_VERIFY_IP_WINDOW_MS', 900_000, 60_000),
    verifyIpLimit: intFromEnv(env, 'OTP_VERIFY_IP_LIMIT', 10, 1),
  };
}

// ---------------------------------------------------------------------------
// Phone normalization (Iranian mobile numbers)
// ---------------------------------------------------------------------------

const IRAN_MOBILE_RE = /^(?:\+98|0098|98|0)?9\d{9}$/;

/**
 * Normalizes an Iranian mobile number to the canonical E.164-ish form
 * `+989XXXXXXXXX`. Accepts `09123456789`, `989123456789`, `+989123456789`
 * and `00989123456789`. Returns `null` for anything else.
 */
export function normalizeIranianPhone(input: unknown): string | null {
  if (typeof input !== 'string') return null;
  const compact = input.replace(/[\s-]/g, '');
  if (!IRAN_MOBILE_RE.test(compact)) return null;
  // Strip a leading 0 or country prefixes, then re-add the canonical prefix.
  const national = compact.replace(/^(?:\+98|0098|98|0)/, '');
  return `+98${national}`;
}

/**
 * Redacts a phone number for logs/errors so support staff can correlate an
 * issue without full PII exposure: `+989121234567` → `+98••••••4567`.
 */
export function redactPhone(phone: string): string {
  if (phone.length <= 7) return '•'.repeat(phone.length);
  return `${phone.slice(0, 3)}${'•'.repeat(phone.length - 7)}${phone.slice(-4)}`;
}

// ---------------------------------------------------------------------------
// Code generation + hashing (scrypt, per-record salt)
// ---------------------------------------------------------------------------

/** Generates a uniformly random numeric code (leading zeros preserved). */
export function generateOtpCode(length = 6): string {
  // randomInt(0, 10^length) is uniformly distributed across the full range —
  // avoid `Math.random` (no uniform guarantee) and string concatenation of
  // digits (bias towards higher digits).
  return String(randomInt(0, 10 ** length)).padStart(length, '0');
}

/** Stored hash format: `scrypt$N$r$p$<salt-b64>$<key-b64>`. */
const SCRYPT_PREFIX = 'scrypt';
const SCRYPT_N = 16384; // 2^14 — ~16 MiB memory, ~50 ms per verify
const SCRYPT_R = 8;
const SCRYPT_P = 1;
const SCRYPT_KEYLEN = 32;
const SCRYPT_SALT_BYTES = 16;

/**
 * Hashes a code with scrypt and a fresh random salt. The result is what gets
 * persisted in `PhoneOtp.codeHash` — the plaintext code is never stored, so a
 * leaked database cannot be brute-forced offline (scrypt cost) and nobody
 * with DB read access can learn a code.
 */
export function hashOtpCode(code: string, length = 6): string {
  const salt = randomBytes(SCRYPT_SALT_BYTES);
  const key = scryptSync(code, salt, SCRYPT_KEYLEN, {
    N: SCRYPT_N,
    r: SCRYPT_R,
    p: SCRYPT_P,
  });
  return [
    SCRYPT_PREFIX,
    SCRYPT_N,
    SCRYPT_R,
    SCRYPT_P,
    salt.toString('base64url'),
    key.toString('base64url'),
  ].join('$');
}

/** Timing-safe verification of a submitted code against a stored hash. */
export function verifyOtpCodeHash(code: string, stored: string): boolean {
  const parts = stored.split('$');
  if (parts.length !== 6 || parts[0] !== SCRYPT_PREFIX) return false;
  const N = Number.parseInt(parts[1], 10);
  const r = Number.parseInt(parts[2], 10);
  const p = Number.parseInt(parts[3], 10);
  let salt: Buffer;
  let expected: Buffer;
  try {
    salt = Buffer.from(parts[4], 'base64url');
    expected = Buffer.from(parts[5], 'base64url');
  } catch {
    return false;
  }
  if (salt.length === 0 || expected.length !== SCRYPT_KEYLEN) return false;
  const actual = scryptSync(code, salt, SCRYPT_KEYLEN, {N, r, p});
  return timingSafeEqual(actual, expected);
}

// ---------------------------------------------------------------------------
// Request/verify pre-checks
// ---------------------------------------------------------------------------

/**
 * A client-supplied idempotency key for `/request` (optional). Bounded
 * format: 8–64 URL-safe characters. Replaying the same key returns the
 * original challenge without re-sending SMS (replay protection on the
 * request side); reusing it for a different phone is rejected.
 */
const REQUEST_ID_RE = /^[A-Za-z0-9_-]{8,64}$/;

/**
 * Validates the `requestId` if present. Returns the trimmed id, or `null`
 * when the field is absent/empty (the server then generates one).
 */
export function normalizeRequestId(input: unknown): string | null {
  if (input === undefined || input === null) return null;
  if (typeof input !== 'string') return null;
  const trimmed = input.trim();
  return REQUEST_ID_RE.test(trimmed) ? trimmed : null;
}

/** 6-digit numeric code, e.g. `123456`. */
export function isPlausibleOtpCode(input: unknown, length: number): boolean {
  if (typeof input !== 'string') return false;
  if (input.length !== length) return false;
  return /^\d+$/.test(input);
}

// ---------------------------------------------------------------------------
// Error taxonomy — stable `code`s consumed by the API routes, the UI
// (`src/lib/auth/errorKeys.ts`) and the tests
// ---------------------------------------------------------------------------

export const OTP_ERROR_CODES = {
  INVALID_PHONE: 'INVALID_PHONE',
  INVALID_REQUEST: 'INVALID_REQUEST',
  INVALID_CODE: 'INVALID_CODE',
  CODE_EXPIRED: 'CODE_EXPIRED',
  CODE_ALREADY_USED: 'CODE_ALREADY_USED',
  ATTEMPTS_EXHAUSTED: 'ATTEMPTS_EXHAUSTED',
  COOLDOWN: 'COOLDOWN',
  REQUEST_ID_CONFLICT: 'REQUEST_ID_CONFLICT',
  RATE_LIMITED: 'RATE_LIMITED',
  SMS_PROVIDER_NOT_CONFIGURED: 'SMS_PROVIDER_NOT_CONFIGURED',
  SMS_PROVIDER_AUTH_FAILED: 'SMS_PROVIDER_AUTH_FAILED',
  SMS_RATE_LIMITED: 'SMS_RATE_LIMITED',
  SMS_SEND_FAILED: 'SMS_SEND_FAILED',
  SESSION_PROVIDER_NOT_CONFIGURED: 'SESSION_PROVIDER_NOT_CONFIGURED',
  SESSION_FAILED: 'SESSION_FAILED',
  INTERNAL: 'INTERNAL',
} as const;

export type OtpErrorCode = (typeof OTP_ERROR_CODES)[keyof typeof OTP_ERROR_CODES];

export class OtpServiceError extends Error {
  readonly code: OtpErrorCode;
  /** Optional client-safe retry hint (seconds). */
  readonly retryAfterSeconds?: number;

  constructor(code: OtpErrorCode, message: string, retryAfterSeconds?: number) {
    super(message);
    this.name = 'OtpServiceError';
    this.code = code;
    this.retryAfterSeconds = retryAfterSeconds;
  }
}

/** The phone number is not a valid Iranian mobile. */
export class InvalidPhoneError extends OtpServiceError {
  constructor() {
    super(OTP_ERROR_CODES.INVALID_PHONE, 'Invalid phone number.');
    this.name = 'InvalidPhoneError';
  }
}

/** The request body / requestId failed validation. */
export class InvalidRequestError extends OtpServiceError {
  constructor(message = 'Invalid request.') {
    super(OTP_ERROR_CODES.INVALID_REQUEST, message);
    this.name = 'InvalidRequestError';
  }
}

/** The submitted code does not match the active challenge. */
export class InvalidCodeError extends OtpServiceError {
  constructor() {
    super(OTP_ERROR_CODES.INVALID_CODE, 'Invalid or expired code.');
    this.name = 'InvalidCodeError';
  }
}

/** The challenge expired before it could be verified. */
export class CodeExpiredError extends OtpServiceError {
  constructor() {
    super(OTP_ERROR_CODES.CODE_EXPIRED, 'Code expired. Request a new code.');
    this.name = 'CodeExpiredError';
  }
}

/** The challenge was already consumed (replay / double-verify). */
export class CodeAlreadyUsedError extends OtpServiceError {
  constructor() {
    super(OTP_ERROR_CODES.CODE_ALREADY_USED, 'Code already used. Request a new code.');
    this.name = 'CodeAlreadyUsedError';
  }
}

/** The challenge hit its attempt budget and is locked. */
export class AttemptsExhaustedError extends OtpServiceError {
  constructor() {
    super(OTP_ERROR_CODES.ATTEMPTS_EXHAUSTED, 'Too many attempts. Request a new code.');
    this.name = 'AttemptsExhaustedError';
  }
}

/** A resend is not allowed yet — an active challenge for this phone exists. */
export class CooldownActiveError extends OtpServiceError {
  constructor(retryAfterSeconds: number) {
    super(
      OTP_ERROR_CODES.COOLDOWN,
      'A code was already sent. Please wait before requesting another.',
      retryAfterSeconds,
    );
    this.name = 'CooldownActiveError';
  }
}

/** A `requestId` was replayed against a different phone. */
export class RequestIdConflictError extends OtpServiceError {
  constructor() {
    super(OTP_ERROR_CODES.REQUEST_ID_CONFLICT, 'Request id already used for a different phone.');
    this.name = 'RequestIdConflictError';
  }
}

/** Window/limit exceeded on the shared rate-limit store. */
export class OtpRateLimitedError extends OtpServiceError {
  constructor(retryAfterSeconds: number) {
    super(
      OTP_ERROR_CODES.RATE_LIMITED,
      'Too many requests. Please try again later.',
      retryAfterSeconds,
    );
    this.name = 'OtpRateLimitedError';
  }
}

/** Stable, client-safe message for a given error code (no internals leak). */
export function otpErrorMessage(code: OtpErrorCode): string {
  switch (code) {
    case OTP_ERROR_CODES.INVALID_PHONE:
      return 'Invalid phone number.';
    case OTP_ERROR_CODES.INVALID_REQUEST:
      return 'Invalid request.';
    case OTP_ERROR_CODES.INVALID_CODE:
      return 'Invalid or expired code.';
    case OTP_ERROR_CODES.CODE_EXPIRED:
      return 'Code expired. Request a new code.';
    case OTP_ERROR_CODES.CODE_ALREADY_USED:
      return 'Code already used. Request a new code.';
    case OTP_ERROR_CODES.ATTEMPTS_EXHAUSTED:
      return 'Too many attempts. Request a new code.';
    case OTP_ERROR_CODES.COOLDOWN:
      return 'A code was already sent. Please wait before requesting another.';
    case OTP_ERROR_CODES.REQUEST_ID_CONFLICT:
      return 'Request id already used for a different phone.';
    case OTP_ERROR_CODES.RATE_LIMITED:
      return 'Too many requests. Please try again later.';
    case OTP_ERROR_CODES.SMS_PROVIDER_NOT_CONFIGURED:
      return 'SMS delivery is not configured. Please try again later.';
    case OTP_ERROR_CODES.SMS_PROVIDER_AUTH_FAILED:
      return 'SMS delivery is temporarily unavailable.';
    case OTP_ERROR_CODES.SMS_RATE_LIMITED:
      return 'SMS provider rate limit reached. Please try again later.';
    case OTP_ERROR_CODES.SMS_SEND_FAILED:
      return 'Failed to deliver the code. Please try again.';
    case OTP_ERROR_CODES.SESSION_PROVIDER_NOT_CONFIGURED:
      return 'Sign-in is temporarily unavailable. Please try again later.';
    case OTP_ERROR_CODES.SESSION_FAILED:
      return 'Sign-in could not be completed. Please try again.';
    default:
      return 'Something went wrong. Please try again.';
  }
}
