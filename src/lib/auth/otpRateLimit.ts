/**
 * Rate limiting for the OTP endpoints — IP and phone windows through the same
 * swappable shared store as the AI endpoints (`src/lib/ai/rateLimitStore.ts`),
 * so limits hold across instances in production (Redis) and reset on restart
 * in local dev (memory).
 *
 * These windows back-stop the OTP-specific protections:
 *   - per-challenge attempt budget (`PhoneOtp.maxAttempts`),
 *   - per-phone cooldown between resends (active-challenge rule in
 *     `otpService.requestOtpCode`),
 *   - code expiry.
 *
 * Every method returns the remaining window time so the API can echo a
 * `retryAfterSeconds` hint without leaking any other state.
 */
import {createRateLimitStore, RateLimitStoreError, type RateLimitStore} from '../ai/rateLimitStore';
import {OtpRateLimitedError} from './otp';

/** What a slot check can return: allowed, or the seconds until the window resets. */
export type OtpSlotResult =
  | {allowed: true}
  | {allowed: false; retryAfterSeconds: number};

export interface OtpWindowLimits {
  windowMs: number;
  limit: number;
}

// Store singleton — created lazily so importing this module never reads env.
let otpStore: RateLimitStore | null = null;

/** Returns the active OTP rate-limit store (created once from env on first use). */
export function getOtpRateLimitStore(): RateLimitStore {
  if (!otpStore) otpStore = createRateLimitStore();
  return otpStore;
}

/** Test hook: swap in an isolated store. */
export function setOtpRateLimitStoreForTesting(next: RateLimitStore): void {
  otpStore = next;
}

/** Test hook: drop the store so the next call rebuilds it from env. */
export function resetOtpRateLimitStoreForTesting(): void {
  otpStore = null;
}

/**
 * Consumes one slot of a fixed window. Throws `OtpRateLimitedError` (with a
 * retry hint) when the window is exhausted, so callers can let it propagate
 * straight into the API's error mapping.
 */
export async function consumeOtpWindow(
  key: string,
  limits: OtpWindowLimits,
  now = Date.now(),
): Promise<void> {
  const result = await getOtpRateLimitStore().incrementWindow(
    `otp:${key}`,
    limits.windowMs,
    limits.limit,
    now,
  );
  if (!result.allowed) {
    const retryAfterSeconds = Math.max(1, Math.ceil((result.resetAt - now) / 1000));
    throw new OtpRateLimitedError(retryAfterSeconds);
  }
}

/**
 * Rate-limits a `/request` call: per-phone window first, then per-IP. Both
 * must pass. On store failure (e.g. Redis down) the error propagates as a
 * `RateLimitStoreError` — callers must fail closed (503), never allow the
 * request through silently.
 */
export async function consumeOtpRequestSlots(
  phone: string,
  ip: string,
  limits: {phone: OtpWindowLimits; ip: OtpWindowLimits},
  now = Date.now(),
): Promise<void> {
  await consumeOtpWindow(`request:phone:${phone}`, limits.phone, now);
  await consumeOtpWindow(`request:ip:${ip}`, limits.ip, now);
}

/** Rate-limits a `/verify` call: per-phone window first, then per-IP. */
export async function consumeOtpVerifySlots(
  phone: string,
  ip: string,
  limits: {phone: OtpWindowLimits; ip: OtpWindowLimits},
  now = Date.now(),
): Promise<void> {
  await consumeOtpWindow(`verify:phone:${phone}`, limits.phone, now);
  await consumeOtpWindow(`verify:ip:${ip}`, limits.ip, now);
}

export {RateLimitStoreError};
