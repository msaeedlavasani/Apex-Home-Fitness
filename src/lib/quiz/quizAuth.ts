/**
 * Client-side session check for the quiz flow (Batch 14 / task 3).
 *
 * Uses the EXISTING auth seams in the workspace:
 *   - The ONLY sessions are real Supabase Auth/SSR sessions (see
 *     `src/lib/auth/mode.ts` — `hasSupabaseEnv()`; there is no parallel mock
 *     session). The session cookies are written by `POST /api/auth/verify`
 *     (via `phoneSessionService` → the SSR client).
 *   - Client identity: `createBrowserSupabaseClient().auth.getUser()` — the
 *     same contract `syncService.getCurrentUserId()` relies on.
 *   - When Supabase is not configured (`AUTH_OTP_MODE=mock` arming dev/CI
 *     protection without a project, or no env at all), every visitor is
 *     treated as signed out — exactly like the middleware and the auth API
 *     behave — so the flow hands off to the login page instead of crashing.
 *
 * The result decides:
 *   - authenticated → run the save + generate completion flow directly;
 *   - signed out    → hand off to `/{locale}/auth/login?next=…` (the OTP
 *                     login/signup step; after verify the auth UI redirects
 *                     back to the quiz page and the flow resumes).
 */
import {createBrowserSupabaseClient} from '@/lib/supabase';
import {hasSupabaseEnv} from '@/lib/auth/mode';

export interface QuizSessionState {
  authenticated: boolean;
  userId?: string;
  reason?: 'signed_out' | 'not_configured' | 'error';
}

/** Resolves the current session for the quiz flow — never throws. */
export async function checkQuizSession(): Promise<QuizSessionState> {
  if (!hasSupabaseEnv()) {
    // No Supabase configured (dev/CI without a project): no session can
    // exist — treat as signed out (matches middleware + auth API behaviour).
    return {authenticated: false, reason: 'not_configured'};
  }

  try {
    const supabase = createBrowserSupabaseClient();
    const {data, error} = await supabase.auth.getUser();
    if (error || !data.user) {
      return {authenticated: false, reason: 'signed_out'};
    }
    return {authenticated: true, userId: data.user.id};
  } catch {
    return {authenticated: false, reason: 'error'};
  }
}
