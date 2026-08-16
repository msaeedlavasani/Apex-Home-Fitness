/**
 * Route protection helpers — pure, isomorphic, unit-tested.
 *
 * The allowlist/deny-list rules here are the ONLY place that decides whether a
 * path is protected or a `next` redirect target is safe, so the open-redirect
 * posture of the app is pinned by `tests/auth-otp.test.ts`.
 */

/** App segments that require a signed-in session. */
export const PROTECTED_SEGMENTS = [
  'dashboard',
  'workout',
  'history',
  'analytics',
  'challenges',
  'profile',
] as const;

/** Public app segments users may be returned to after signing in. */
export const PUBLIC_APP_SEGMENTS = ['quiz', 'faq', 'library'] as const;

/** Segment hosting the auth pages (login / verify). */
export const AUTH_SEGMENT = 'auth';

/** Every segment accepted as a post-auth redirect target. */
export const REDIRECT_ALLOWLIST: readonly string[] = [
  ...PROTECTED_SEGMENTS,
  ...PUBLIC_APP_SEGMENTS,
];

/**
 * Returns the first path segment after the locale prefix, or null for the
 * locale root itself (e.g. `/en` → null, `/en/dashboard` → 'dashboard').
 * Works with paths that lack the locale prefix too (defensive).
 */
export function localeSegmentOf(pathname: string, locale: string): string | null {
  const prefix = `/${locale}`;
  const rest = pathname.startsWith(prefix)
    ? pathname.slice(prefix.length)
    : pathname;
  const segment = rest.replace(/^\/+/, '').split(/[/?#]/)[0];
  return segment.length > 0 ? segment : null;
}

/** True when the pathname is a protected app segment (locale-aware). */
export function isProtectedPath(pathname: string, locale: string): boolean {
  const segment = localeSegmentOf(pathname, locale);
  return segment !== null && (PROTECTED_SEGMENTS as readonly string[]).includes(segment);
}

/** True when the pathname is under `/auth` (login/verify pages). */
export function isAuthPath(pathname: string, locale: string): boolean {
  return localeSegmentOf(pathname, locale) === AUTH_SEGMENT;
}

/**
 * Sanitizes a `next` redirect parameter against the allowlist.
 *
 * Returns the path only when ALL of these hold:
 *   1. it is a locale-prefixed internal path (`/{locale}` or `/{locale}/…`),
 *   2. it contains no open-redirect vectors (protocol, protocol-relative,
 *      backslash, `@`, `:`, query, hash),
 *   3. its first segment is on `REDIRECT_ALLOWLIST`.
 *
 * Everything else → null (callers fall back to the default post-auth page).
 */
export function sanitizeRedirectPath(
  next: unknown,
  locale: string,
): string | null {
  if (typeof next !== 'string' || next.length === 0 || next.length > 200) {
    return null;
  }
  if (next !== `/${locale}` && !next.startsWith(`/${locale}/`)) return null;

  // Hard deny-list for open-redirect / protocol smuggling vectors.
  if (
    next.startsWith('//') ||
    next.includes('\\') ||
    next.includes(':') ||
    next.includes('@') ||
    next.includes('?') ||
    next.includes('#')
  ) {
    return null;
  }

  const segment = localeSegmentOf(next, locale);
  if (segment === null || !REDIRECT_ALLOWLIST.includes(segment)) return null;
  return next;
}

/** Default destination after a successful sign-in. */
export function postAuthDefaultPath(locale: string): string {
  return `/${locale}/dashboard`;
}

/** Login path carrying an allowlisted `next` target. */
export function authLoginPath(locale: string, nextPath: string): string {
  return `/${locale}/auth/login?next=${encodeURIComponent(nextPath)}`;
}
