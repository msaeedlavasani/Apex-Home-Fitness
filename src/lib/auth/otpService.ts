/**
 * OTP service factory — resolves the active `OtpService` implementation.
 *
 * Wire-up (the canonical Batch 14 contract):
 *   - `AUTH_OTP_MODE=mock`   → deterministic in-memory mock (`devCode` seam).
 *                              DEV/CI ONLY — refused in production. Used by
 *                              `tests/auth-flow.spec.ts` (boot the dev server
 *                              with `AUTH_OTP_MODE=mock`).
 *   - anything else          → the secure implementation
 *                              (`createSecureOtpService` in
 *                              `src/services/otpService.ts`), which resolves
 *                              the SMS.ir env automatically and fails HONESTLY
 *                              (`provider_error`) when delivery is not
 *                              configured — never a fake success.
 *
 * Server-only module: the secure implementation imports Prisma and
 * `next/headers` transitively, so this module must never be imported from
 * middleware or Client Components. Middleware uses the edge-safe
 * `src/lib/auth/mode.ts` + `protect.ts` instead.
 */
import type {OtpService} from './types';
import {createMockOtpService} from './mockOtpService';
import {createSecureOtpService} from '../../services/otpService';

/** True when the mock OTP backend is active (dev/CI only). */
export function isMockOtpMode(): boolean {
  return process.env.AUTH_OTP_MODE === 'mock';
}

/**
 * Returns the active OTP service.
 * @throws when mock mode is used in production (misconfiguration guard).
 */
export function getOtpService(): OtpService {
  if (isMockOtpMode()) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error(
        '[auth] AUTH_OTP_MODE=mock is not allowed in production. ' +
          'Configure the SMS.ir provider + Supabase session env instead.',
      );
    }
    return createMockOtpService();
  }
  return createSecureOtpService();
}
