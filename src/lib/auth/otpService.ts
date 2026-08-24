/**
 * OTP service factory — resolves the active `OtpService` implementation.
 *
 * Wire-up (the canonical Batch 14 contract):
 *   - `AUTH_OTP_MODE=mock`   → deterministic in-memory mock (`devCode` seam).
 *                              DEV/CI ONLY — refused in production UNLESS the
 *                              explicit `AUTH_OTP_MOCK_IN_PRODUCTION=true`
 *                              override is set (see below).
 *   - anything else          → the secure implementation
 *                              (`createSecureOtpService` in
 *                              `src/services/otpService.ts`), which resolves
 *                              the SMS.ir env automatically and fails HONESTLY
 *                              (`provider_error`) when delivery is not
 *                              configured — never a fake success.
 *
 * Production mock override (`AUTH_OTP_MOCK_IN_PRODUCTION=true`):
 *   Temporary dev/test harness for a running production server while the real
 *   SMS delivery path is being fixed (see docs/HANDOFF.md). In this mode
 *   `getOtpService()` returns a HYBRID service:
 *     - phones listed in `AUTH_OTP_MOCK_PHONES` (comma-separated Iranian
 *       numbers, e.g. `09121234567,09351234567`) get instant mock codes
 *       (`devCode` in the response, deterministic `123456`) AND a real
 *       Supabase SSR session after verify — the tester can use the app end to
 *       end without waiting for SMS;
 *     - EVERY other phone is routed to the secure service (real SMS.ir
 *       delivery) untouched.
 *   Security posture: the override is opt-in and OFF by default; the mock
 *   surface is strictly limited to the allowlisted phones; `devCode` is never
 *   returned to non-listed numbers. Remove `AUTH_OTP_MODE=mock` (or the
 *   override) once the SMS provider is healthy again.
 *
 * Server-only module: the secure implementation imports Prisma and
 * `next/headers` transitively, so this module must never be imported from
 * middleware or Client Components. Middleware uses the edge-safe
 * `src/lib/auth/mode.ts` + `protect.ts` instead.
 */
import type {OtpService, RequestCodeResult, VerifyCodeResult} from './types';
import {createMockOtpService} from './mockOtpService';
import {createSecureOtpService} from '../../services/otpService';
import {establishSessionForVerifiedPhone} from '../../services/phoneSessionService';
import {normalizePhone} from './phone';

/** True when the mock OTP backend is active (dev/CI, or prod with override). */
export function isMockOtpMode(): boolean {
  return process.env.AUTH_OTP_MODE === 'mock';
}

/** Parses `AUTH_OTP_MOCK_PHONES` (comma-separated) into normalized E.164 keys. */
export function parseMockPhoneAllowlist(raw: string | undefined): Set<string> {
  const allowed = new Set<string>();
  for (const part of (raw ?? '').split(',')) {
    const normalized = normalizePhone(part.trim());
    if (normalized) allowed.add(normalized);
  }
  return allowed;
}

export interface ProductionMockOtpDeps {
  /** Default: parsed from `AUTH_OTP_MOCK_PHONES`. */
  allowedPhones?: ReadonlySet<string>;
  /** Session side effect after a mock verify. Default: real Supabase SSR. */
  onVerified?: (phone: string) => Promise<unknown>;
  /** Secure fallback for non-listed phones (tests inject a fake). */
  secureService?: OtpService;
}

/**
 * Hybrid OTP service for the explicit production test mode: allowlisted phones
 * get the in-memory mock (instant `devCode` + real session), every other phone
 * is handled by the secure service (real SMS.ir delivery).
 */
export function createProductionMockOtpService(deps: ProductionMockOtpDeps = {}): OtpService {
  const allowedPhones = deps.allowedPhones ?? parseMockPhoneAllowlist(process.env.AUTH_OTP_MOCK_PHONES);
  const onVerified = deps.onVerified ?? establishSessionForVerifiedPhone;
  const mock = createMockOtpService({allowedPhones, onVerified});

  // Lazily built: `createSecureOtpService` reads the SMS.ir env at
  // construction, so building it eagerly would throw on hosts without it.
  let secure: OtpService | null = null;
  const getSecure = (): OtpService => (secure ??= deps.secureService ?? createSecureOtpService());

  return {
    async requestCode(input): Promise<RequestCodeResult> {
      const normalized = normalizePhone(input.phone);
      if (normalized && allowedPhones.has(normalized)) return mock.requestCode(input);
      try {
        return await getSecure().requestCode(input);
      } catch {
        return {ok: false, error: 'provider_error'};
      }
    },
    async verifyCode(input): Promise<VerifyCodeResult> {
      const normalized = normalizePhone(input.phone);
      if (normalized && allowedPhones.has(normalized)) return mock.verifyCode(input);
      try {
        return await getSecure().verifyCode(input);
      } catch {
        return {ok: false, error: 'provider_error'};
      }
    },
  };
}

/**
 * Returns the active OTP service.
 * @throws when mock mode is used in production without the explicit
 *         `AUTH_OTP_MOCK_IN_PRODUCTION=true` override (misconfiguration guard).
 */
export function getOtpService(): OtpService {
  if (isMockOtpMode()) {
    if (process.env.NODE_ENV === 'production') {
      if (process.env.AUTH_OTP_MOCK_IN_PRODUCTION !== 'true') {
        throw new Error(
          '[auth] AUTH_OTP_MODE=mock is not allowed in production. ' +
            'Configure the SMS.ir provider + Supabase session env instead, or ' +
            'explicitly opt into the dev/test harness with ' +
            'AUTH_OTP_MOCK_IN_PRODUCTION=true + AUTH_OTP_MOCK_PHONES.',
        );
      }
      return createProductionMockOtpService();
    }
    return createMockOtpService();
  }
  return createSecureOtpService();
}
