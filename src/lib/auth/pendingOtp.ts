/**
 * Pending-OTP flow state — client-only sessionStorage wrapper.
 *
 * The request-code step stashes the phone, the allowlisted `next` target, the
 * request timestamp (drives the resend countdown) and the dev-only mock code
 * (if any) in sessionStorage — never in the URL, so the phone number doesn't
 * leak into analytics/referrer logs. The verify step reads it back, and it is
 * cleared on success, on "change number", or when the tab session ends.
 *
 * Safe for SSR: all access is guarded by `typeof window` and wrapped in
 * try/catch (private mode / storage-disabled browsers degrade to a null flow,
 * which the verify page handles by returning to login).
 */
export interface PendingOtp {
  /** Canonical E.164 phone, e.g. `+989123456789`. */
  phone: string;
  /**
   * Optional opaque challenge token retained for future provider-specific
   * flows; the canonical UI contract uses provider-agnostic routes and does
   * not expose this token to the browser.
   */
  requestId?: string | null;
  /** Allowlisted post-auth target (null → default dashboard). */
  next: string | null;
  /** Timestamp of the last code request — drives the resend countdown. */
  sentAt: number;
  /** Seconds until a NEW challenge may be requested (from the response). */
  resendAfterSeconds: number;
  /** Dev-only deterministic code (mock mode, non-production). */
  devCode: string | null;
}

const STORAGE_KEY = 'ahf.auth.pending';

export function readPendingOtp(): PendingOtp | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<PendingOtp>;
    if (typeof parsed.phone !== 'string' || typeof parsed.sentAt !== 'number') {
      return null;
    }
    return {
      phone: parsed.phone,
      requestId: typeof parsed.requestId === 'string' ? parsed.requestId : null,
      next: typeof parsed.next === 'string' ? parsed.next : null,
      sentAt: parsed.sentAt,
      resendAfterSeconds:
        typeof parsed.resendAfterSeconds === 'number'
          ? parsed.resendAfterSeconds
          : 60,
      devCode: typeof parsed.devCode === 'string' ? parsed.devCode : null,
    };
  } catch {
    return null;
  }
}

export function writePendingOtp(value: PendingOtp): void {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(value));
  } catch {
    // Storage unavailable — the verify page falls back to login.
  }
}

export function clearPendingOtp(): void {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    // Ignore — nothing else to clean up.
  }
}
