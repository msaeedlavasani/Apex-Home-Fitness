/**
 * OTP auth service contract — the canonical seam every auth surface consumes.
 *
 * This module is the single contract shared by:
 *   - `POST /api/auth/request-code`  → `OtpService.requestCode`
 *   - `POST /api/auth/verify`        → `OtpService.verifyCode`
 *   - the middleware session checks  → `src/lib/auth/mode.ts`
 *
 * Two implementations plug in behind this interface (`src/lib/auth/otpService.ts`
 * resolves them from the environment):
 *   - `mock`   — deterministic, in-memory code store with a `devCode` seam.
 *                Dev/CI only (refused in production). Used by the E2E auth
 *                flow and local smoke tests until real SMS is available.
 *   - `secure` — `src/services/otpService.ts` (`createSecureOtpService`):
 *                SMS.ir delivers the code, the app owns hashing/expiry/
 *                single-use/attempts against the `PhoneOtp` ledger, and the
 *                session is established via Supabase SSR
 *                (`src/services/phoneSessionService.ts`) AFTER the phone is
 *                proven. The browser only ever talks to the API routes with
 *                the phone + code; it never sees a secret.
 *
 * Error codes are deliberately provider-agnostic so the UI maps them to
 * localized messages without knowing which transport produced them.
 */

/** Provider-agnostic error codes returned by both implementations. */
export type OtpErrorCode =
  | 'invalid_phone'
  | 'invalid_code'
  | 'expired'
  | 'too_many_attempts'
  | 'rate_limited'
  | 'not_requested'
  | 'provider_error'
  | 'session_unavailable';

export interface RequestCodeResult {
  ok: boolean;
  /** Present when `ok === false`. */
  error?: OtpErrorCode;
  /**
   * Seconds the client must wait before requesting another code. Present on
   * success (cooldown window) and on `rate_limited`.
   */
  retryAfterSeconds?: number;
  /**
   * Development-only seam: the mock service returns the deterministic code so
   * local flows and E2E tests can complete without a real SMS provider. Never
   * set in production (mock mode is refused in production).
   */
  devCode?: string;
}

export interface VerifyCodeResult {
  ok: boolean;
  /** Present when `ok === false`. */
  error?: OtpErrorCode;
}

/** The transport-agnostic OTP operations used by the auth API routes. */
export interface OtpService {
  /** Sends (or in mock mode, generates) a one-time code for a phone number. */
  requestCode(input: {phone: string}): Promise<RequestCodeResult>;
  /**
   * Verifies a submitted code. Implementations are responsible for code
   * expiry, single-use semantics, and attempt limiting, and must establish
   * the auth session as a side effect when verification succeeds.
   */
  verifyCode(input: {phone: string; code: string}): Promise<VerifyCodeResult>;
}
