/**
 * Mock OTP service — deterministic, in-memory implementation of `OtpService`.
 *
 * Purpose (Batch 14 task 4): until a real SMS delivery path is configured in
 * the local environment, the mock lets the full request-code → verify →
 * protected-route flow be built, unit-tested and E2E-tested end to end
 * without any external provider (the E2E spec boots the dev server with
 * `AUTH_OTP_MODE=mock`).
 *
 * Behaviour mirrors the production contract:
 *   - code is single-use and expires after 5 minutes,
 *   - max 5 verify attempts before the entry is destroyed,
 *   - a 60s resend cooldown between requests for the same number,
 *   - the code is deterministic (`123456`) so tests are stable.
 *
 * Safety rails:
 *   - the factory (`src/lib/auth/otpService.ts`) refuses mock mode in
 *     production,
 *   - the returned `devCode` is the same deterministic value; the API route
 *     only surfaces it in mock mode (never in production),
 *   - the store lives in memory only — no persistence, no cross-instance
 *     sharing; that is fine for dev/CI and explicitly not for production.
 *
 * Test seam: `resetMockOtpStore()` / `getMockOtpEntry()` allow tests to start
 * from a clean slate and inspect state.
 */
import type {OtpService, RequestCodeResult, VerifyCodeResult} from './types';
import {normalizePhone} from './phone';

/** Deterministic code returned in mock mode (dev/CI only). */
export const MOCK_OTP_CODE = '123456';
/** Resend cooldown enforced server-side and mirrored by the client countdown. */
export const MOCK_RESEND_COOLDOWN_SECONDS = 60;
export const MOCK_CODE_TTL_MS = 5 * 60 * 1000;
export const MOCK_MAX_ATTEMPTS = 5;

interface MockOtpEntry {
  code: string;
  expiresAt: number;
  attempts: number;
  lastRequestAt: number;
}

const store = new Map<string, MockOtpEntry>();

/** Clears all pending codes. Call between tests for a deterministic state. */
export function resetMockOtpStore(): void {
  store.clear();
}

/** Test seam: inspect the current entry for a phone (E.164 key). */
export function getMockOtpEntry(phone: string): MockOtpEntry | undefined {
  return store.get(normalizePhone(phone) ?? phone);
}

/** Number of in-flight codes (useful for leak assertions in tests). */
export function mockOtpStoreSize(): number {
  return store.size;
}

export interface MockOtpServiceOptions {
  /**
   * When set, only these normalized (E.164 `+98…`) phones receive mock codes;
   * every other phone is rejected with `provider_error`. Used by the explicit
   * production test mode — dev/CI mock stays open (no allowlist), exactly as
   * today.
   */
  allowedPhones?: ReadonlySet<string>;
  /**
   * Session side effect invoked AFTER a mock code verifies successfully.
   * Production test mode wires this to `establishSessionForVerifiedPhone` so
   * an allowlisted tester actually lands in the signed-in app. Dev/CI mock
   * leaves it unset (no session — same behaviour as today).
   */
  onVerified?: (phone: string) => Promise<unknown>;
}

export function createMockOtpService(options: MockOtpServiceOptions = {}): OtpService {
  const {allowedPhones, onVerified} = options;
  return {
    async requestCode({phone}): Promise<RequestCodeResult> {
      const normalized = normalizePhone(phone);
      if (!normalized) return {ok: false, error: 'invalid_phone'};
      if (allowedPhones && !allowedPhones.has(normalized)) {
        // Belt-and-suspenders: the production hybrid routes non-listed phones
        // to the secure service before reaching the mock. A direct call for a
        // non-listed number is an honest delivery error, never a mock code.
        return {ok: false, error: 'provider_error'};
      }

      const now = Date.now();
      const existing = store.get(normalized);
      if (existing) {
        const elapsedSec = Math.floor((now - existing.lastRequestAt) / 1000);
        if (elapsedSec < MOCK_RESEND_COOLDOWN_SECONDS) {
          return {
            ok: false,
            error: 'rate_limited',
            retryAfterSeconds: MOCK_RESEND_COOLDOWN_SECONDS - elapsedSec,
          };
        }
      }

      store.set(normalized, {
        code: MOCK_OTP_CODE,
        expiresAt: now + MOCK_CODE_TTL_MS,
        attempts: 0,
        lastRequestAt: now,
      });

      return {
        ok: true,
        retryAfterSeconds: MOCK_RESEND_COOLDOWN_SECONDS,
        devCode: MOCK_OTP_CODE,
      };
    },

    async verifyCode({phone, code}): Promise<VerifyCodeResult> {
      const normalized = normalizePhone(phone);
      if (!normalized) return {ok: false, error: 'invalid_phone'};
      if (allowedPhones && !allowedPhones.has(normalized)) {
        return {ok: false, error: 'provider_error'};
      }

      const entry = store.get(normalized);
      if (!entry) return {ok: false, error: 'not_requested'};

      if (Date.now() > entry.expiresAt) {
        store.delete(normalized);
        return {ok: false, error: 'expired'};
      }

      if (entry.attempts >= MOCK_MAX_ATTEMPTS) {
        store.delete(normalized);
        return {ok: false, error: 'too_many_attempts'};
      }

      if (entry.code !== code.trim()) {
        entry.attempts += 1;
        if (entry.attempts >= MOCK_MAX_ATTEMPTS) store.delete(normalized);
        return {ok: false, error: 'invalid_code'};
      }

      // Single-use: the verified code is consumed immediately.
      store.delete(normalized);
      if (onVerified) {
        try {
          await onVerified(normalized);
        } catch {
          // The phone is proven and the code is consumed; a session failure is
          // surfaced honestly so the client re-requests a fresh code.
          return {ok: false, error: 'provider_error'};
        }
      }
      return {ok: true};
    },
  };
}
