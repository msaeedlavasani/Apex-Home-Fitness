import {NextResponse} from 'next/server';

import {logger} from '@/lib/logger';
import {prisma} from '@/lib/prisma';
import {createServerSupabaseClient} from '@/lib/supabase-server';
import {deleteAvatarObject} from '@/services/avatarStorage';
import {
  AccountDeletionError,
  DELETE_CONFIRMATION,
  createAccountDeletionAdminClient,
  createAccountDeletionDataClient,
  deleteAccount,
} from '@/services/accountDeletionService';

/**
 * DELETE /api/account/delete
 *
 * Irreversibly deletes the signed-in account and ALL user-owned data
 * (profile, weight history, workouts, quiz answers, generated programs,
 * synced workout logs, avatar, and the Supabase auth identity). This is the
 * TS-03 deletion surface.
 *
 * Guards:
 *   - requires a valid session (401 otherwise);
 *   - the body MUST carry the exact literal `DELETE` in `confirmation`
 *     (400 otherwise) — the UI requires the user to type it;
 *   - the request method is DELETE (no state change on GET), the payload is
 *     JSON, and the session cookie authenticates the caller;
 *   - shared content is preserved (programs are de-owned, the exercise/
 *     movement catalog is untouched — see accountDeletionService).
 *
 * Success (200) clears the browser session so the client can redirect to the
 * public start page. The service throws typed AccountDeletionErrors which are
 * mapped here: 400 confirmation, 401 unauthenticated, 404 no account,
 * 502 provider/data failure, 503 missing server config (fail closed).
 */
export async function DELETE(request: Request) {
  try {
    const body = await request.json().catch(() => null);
    const confirmation =
      body && typeof body.confirmation === 'string' ? body.confirmation : '';

    const supabase = await createServerSupabaseClient();
    const {data, error: authError} = await supabase.auth.getUser();
    if (authError || !data.user) {
      return NextResponse.json({error: 'UNAUTHENTICATED'}, {status: 401});
    }

    if (confirmation !== DELETE_CONFIRMATION) {
      return NextResponse.json({error: 'CONFIRMATION_REQUIRED'}, {status: 400});
    }

    await deleteAccount(
      {
        data: createAccountDeletionDataClient(prisma),
        admin: createAccountDeletionAdminClient(),
        // No-op for null and legacy in-DB data URLs (deleteAvatarObject
        // already skips legacy URLs).
        deleteAvatar: async (path) => {
          if (path) await deleteAvatarObject(path);
        },
      },
      {supabaseUserId: data.user.id, confirmation},
    );

    // Revoke the browser session now that the identity is gone server-side.
    await supabase.auth.signOut();

    logger.info('account.delete', {userId: data.user.id});
    return NextResponse.json({ok: true});
  } catch (error) {
    if (error instanceof AccountDeletionError) {
      const status =
        error.code === 'ACCOUNT_NOT_FOUND'
          ? 404
          : error.code === 'CONFIG_MISSING'
            ? 503
            : 502;
      logger.error(`account.delete.${error.code}`, {message: error.message});
      return NextResponse.json({error: error.code, message: error.message}, {status});
    }
    logger.error('account.delete.failed', {error});
    return NextResponse.json({error: 'INTERNAL'}, {status: 500});
  }
}