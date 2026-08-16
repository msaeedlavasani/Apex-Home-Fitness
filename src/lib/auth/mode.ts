/**
 * Auth configuration resolution — pure env reading, safe for every runtime
 * (including edge middleware). Free of any `next/headers` / server-only
 * imports so `src/middleware.ts` can import it directly.
 *
 * Session architecture (aligned with the canonical Batch 14 flow — see
 * `src/services/phoneSessionService.ts` and `docs/OTP_LAUNCH_READINESS.md`):
 *   - The ONLY sessions are real Supabase Auth/SSR sessions. There is no
 *     parallel mock session, no fake cookie, no mocked success.
 *   - `AUTH_OTP_MODE=mock` is a DEVELOPMENT/CI-ONLY switch that ARMS route
 *     protection when no Supabase env is present, so the redirect behaviour
 *     and the auth UI can be exercised end-to-end without a real project
 *     (see `tests/auth-flow.spec.ts`). It never mints sessions: without
 *     Supabase env, `getUser()` is skipped and every visitor is treated as
 *     signed out — the login API then fails HONESTLY (503) at the session
 *     step instead of faking success.
 */

/** True when the Supabase env pair is present (production session backend). */
export function hasSupabaseEnv(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );
}

/**
 * True when route protection should be enforced:
 *   - explicit `AUTH_OTP_MODE=mock` (dev/CI E2E), or
 *   - Supabase is configured (production).
 *
 * Without either the app degrades gracefully to today's open behaviour —
 * this keeps the UI-only E2E suite and local development working without
 * Supabase, exactly as documented in `.env.example`.
 */
export function isAuthConfigured(): boolean {
  return process.env.AUTH_OTP_MODE === 'mock' || hasSupabaseEnv();
}
