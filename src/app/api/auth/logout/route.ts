import {NextResponse} from 'next/server';

import {logger} from '@/lib/logger';

/**
 * POST /api/auth/logout
 *
 * Destroys the current Supabase Auth/SSR session: `signOut` revokes the
 * session and clears its cookies through the server client's cookie store
 * (mutable in Route Handlers), so the cleared cookies are attached to this
 * response.
 *
 * Always answers 200 {ok: true} — logging out is idempotent; the client
 * redirects to the public start page regardless of the previous state.
 */
export async function POST() {
  try {
    const {createServerSupabaseClient} = await import('@/lib/supabase-server');
    const supabase = createServerSupabaseClient();
    await supabase.auth.signOut();
    logger.info('auth.logout');
  } catch {
    // No session/config — still respond ok (idempotent logout).
  }

  return NextResponse.json({ok: true});
}
