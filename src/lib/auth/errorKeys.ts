/**
 * Provider-agnostic OTP error code → localized message key mapping
 * (client-safe).
 *
 * The auth API answers with the stable `OtpErrorCode` union from
 * `src/lib/auth/types.ts` (e.g. `invalid_code`, `rate_limited`,
 * `provider_error`). This module maps those codes to the `Auth.errors.*`
 * message keys used by the login/verify forms, so the UI never needs to know
 * which transport produced the error and never leaks internals. Pure and
 * importable from Client Components (no `node:*`).
 */

/** Message keys available under `Auth.errors.*` in messages/*.json. */
export type AuthErrorMessageKey =
  | 'invalidPhone'
  | 'invalidCode'
  | 'expired'
  | 'tooManyAttempts'
  | 'rateLimited'
  | 'notRequested'
  | 'providerError'
  | 'generic';

const REQUEST_CODE_TO_KEY: Record<string, AuthErrorMessageKey> = {
  invalid_phone: 'invalidPhone',
  INVALID_PHONE: 'invalidPhone',
  invalid_request: 'invalidPhone',
  INVALID_REQUEST: 'invalidPhone',
  rate_limited: 'rateLimited',
  RATE_LIMITED: 'rateLimited',
  COOLDOWN: 'rateLimited',
  SMS_RATE_LIMITED: 'rateLimited',
  provider_error: 'providerError',
  SMS_PROVIDER_NOT_CONFIGURED: 'providerError',
  SMS_PROVIDER_AUTH_FAILED: 'providerError',
  SMS_SEND_FAILED: 'providerError',
};

const VERIFY_CODE_TO_KEY: Record<string, AuthErrorMessageKey> = {
  invalid_phone: 'invalidPhone',
  INVALID_PHONE: 'invalidPhone',
  invalid_request: 'notRequested',
  INVALID_REQUEST: 'notRequested',
  invalid_code: 'invalidCode',
  INVALID_CODE: 'invalidCode',
  expired: 'expired',
  CODE_EXPIRED: 'expired',
  CODE_ALREADY_USED: 'expired',
  too_many_attempts: 'tooManyAttempts',
  ATTEMPTS_EXHAUSTED: 'tooManyAttempts',
  not_requested: 'notRequested',
  rate_limited: 'rateLimited',
  RATE_LIMITED: 'rateLimited',
  COOLDOWN: 'rateLimited',
  SMS_RATE_LIMITED: 'rateLimited',
  provider_error: 'providerError',
  SESSION_PROVIDER_NOT_CONFIGURED: 'providerError',
  SESSION_FAILED: 'providerError',
};

/** Maps a request-code error code to a localized message key. */
export function requestErrorMessageKey(code: unknown): AuthErrorMessageKey {
  return (typeof code === 'string' && REQUEST_CODE_TO_KEY[code]) || 'generic';
}

/** Maps a verify error code to a localized message key. */
export function verifyErrorMessageKey(code: unknown): AuthErrorMessageKey {
  return (typeof code === 'string' && VERIFY_CODE_TO_KEY[code]) || 'generic';
}

/** Cooldown/rate-limit errors carry `retryAfterSeconds` → restart the countdown. */
export function isCooldownError(code: unknown): boolean {
  return code === 'rate_limited' ||
    code === 'RATE_LIMITED' ||
    code === 'COOLDOWN' ||
    code === 'SMS_RATE_LIMITED';
}
