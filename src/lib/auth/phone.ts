/**
 * Client-safe Iranian phone helpers (UI layer only).
 *
 * The SERVER-side canonical implementation lives in `src/lib/auth/otp.ts`
 * (`normalizeIranianPhone` / `redactPhone`) — that module imports
 * `node:crypto`, so it can never be bundled into a client component. These
 * helpers mirror the canonical rules exactly (same accepted prefixes, same
 * E.164-ish output `+98…`) so client pre-validation and server validation
 * always agree, plus one UI convenience: Persian/Arabic-Indic digits are
 * converted to ASCII before matching (fa keyboard input).
 */

const IRAN_MOBILE_RE = /^(?:\+98|0098|98|0)?9\d{9}$/;

/** Persian (۰-۹) and Arabic-Indic (٠-٩) digits → ASCII. */
const PERSIAN_DIGITS = /[۰-۹]/g;
const ARABIC_DIGITS = /[٠-٩]/g;

function toAsciiDigits(value: string): string {
  return value
    .replace(PERSIAN_DIGITS, (d) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d)))
    .replace(ARABIC_DIGITS, (d) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d)));
}

/**
 * Normalizes a raw phone string to canonical `+989XXXXXXXXX`, or null when
 * invalid. Mirrors `normalizeIranianPhone` in `src/lib/auth/otp.ts`.
 */
export function normalizePhone(raw: string): string | null {
  if (typeof raw !== 'string') return null;
  const compact = toAsciiDigits(raw).replace(/[\s-]/g, '');
  if (!IRAN_MOBILE_RE.test(compact)) return null;
  const national = compact.replace(/^(?:\+98|0098|98|0)/, '');
  return `+98${national}`;
}

/** True when the raw value is a valid Iranian mobile number. */
export function isValidPhone(raw: string): boolean {
  return normalizePhone(raw) !== null;
}

/**
 * Redaction-safe display form matching the server `redactPhone` shape:
 * `+989121234567` → `+98••••••4567`. Keeps the country prefix and the last 4
 * digits so the verify screen can echo which number the code went to.
 */
export function maskPhone(phone: string): string {
  const canonical = phone.startsWith('+') ? phone : `+${phone}`;
  if (canonical.length <= 7) return '•'.repeat(canonical.length);
  return `${canonical.slice(0, 3)}${'•'.repeat(canonical.length - 7)}${canonical.slice(-4)}`;
}
