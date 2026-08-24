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
 *   Temporary test/demo harness for a running production server while the
 *   real SMS delivery path is being fixed (see docs/HANDOFF.md). In this mode
 *   `getOtpService()` returns the mock service for EVERY phone:
 *     - NO real SMS is ever sent — the request-code API returns the
 *       deterministic `devCode` (123456) and the UI surfaces it directly
 *       ("لطفا با کد 123456 وارد شوید");
 *     - verify with that code establishes a REAL Supabase SSR session
 *       (`establishSessionForVerifiedPhone`), so the tester can use the app
 *       end to end.
 *   Security posture: the override is opt-in and OFF by default, and the
 *   deterministic code lets anyone who knows it sign in as any phone — use
 *   ONLY while the app is not serving real users. Remove `AUTH_OTP_MODE=mock`
 *   (or the override) once the SMS provider is healthy again.
 *
 * Server-only module: the secure implementation imports Prisma and
 * `next/headers` transitively, so this module must never be imported from
 * middleware or Client Components. Middleware uses the edge-safe
 * `src/lib/auth/mode.ts` + `protect.ts` instead.
 */
import type {OtpService} from './types';
import {createMockOtpService} from './mockOtpService';
import {createSecureOtpService} from '../../services/otpService';
import {establishSessionForVerifiedPhone} from '../../services/phoneSessionService';

/** True when the mock OTP backend is active (dev/CI, or prod with override). */
export function isMockOtpMode(): boolean {
  return process.env.AUTH_OTP_MODE === 'mock';
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
            'explicitly opt into the temporary no-SMS harness with ' +
            'AUTH_OTP_MOCK_IN_PRODUCTION=true.',
        );
      }
      // Temporary harness while SMS delivery is being fixed: EVERY phone gets
      // the deterministic mock code (surfaced in the UI via `devCode`) — no
      // real SMS — and a REAL Supabase SSR session after verify.
      return createMockOtpService({onVerified: establishSessionForVerifiedPhone});
    }
    return createMockOtpService();
  }
  return createSecureOtpService();
}
