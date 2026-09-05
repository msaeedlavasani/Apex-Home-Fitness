/**
 * accountDeletionService — irreversible account + data deletion (TS-03).
 *
 * Scope (mirrors `prisma/schema.prisma` and the Supabase sync layer):
 *   DELETED (user-owned):
 *     - Prisma `User` row and every user-owned table:
 *         WeightEntry, WorkoutSession (+ WorkoutSessionExercise via FK cascade),
 *         QuizResponse, ProgramGenerationRequest, PhoneOtp rows for the
 *         account's verified phone (the OTP ledger has no FK — keyed by phone).
 *     - Supabase side: `workout_exercise_logs` outbox rows keyed by
 *       `user_id` (offline sync, `src/services/syncService.ts`), the avatar
 *       object in the `avatars` storage bucket, and the Supabase AUTH
 *       identity itself (service-role `admin.auth.admin.deleteUser` — also
 *       revokes its sessions server-side).
 *   PRESERVED (shared/content, never user data):
 *     - `Program` rows are DE-OWNED (`ownerId → null`) instead of deleted —
 *       programs are shared content; the catalog (Exercise / Movement /
 *       MovementRelationship / MovementMedia) is global and untouched.
 *     - Admin identities (`AdminAccount` / `AdminSession`) are a separate
 *       identity domain and are never touched.
 *
 * Irreversibility + confirmation: the caller MUST supply the exact literal
 * `DELETE_CONFIRMATION`; any other value throws `CONFIRMATION_REQUIRED`
 * before anything is touched. There is no soft-delete/undo path by design.
 *
 * Ordering / atomicity (honest, cross-system):
 *   1. Prisma user-owned data is deleted FIRST inside ONE transaction
 *      (all-or-nothing on the Prisma side).
 *   2. Supabase outbox rows, then the avatar object (best-effort storage).
 *   3. The Supabase AUTH identity is deleted LAST — the point of no return.
 *   A failure in 1 leaves the account fully intact (transaction rollback).
 *   A failure in 2/3 after 1 means the app data is gone but the auth
 *   identity survives, so the user can still sign in and retry — the retry
 *   is safe and idempotent (the recreated Prisma row is empty and deleted
 *   again). Failures in 2/3 are surfaced as `PROVIDER_DELETE_FAILED`, never
 *   swallowed. This module never claims success unless every step completed.
 *
 * Server-only. Call from Route Handlers / Server Actions; never from client
 * code. The route maps error codes to HTTP statuses.
 */
import {createClient} from '@supabase/supabase-js';
import type {PrismaClient} from '@prisma/client';

/** Exact literal the user must type to confirm deletion (matches the UI). */
export const DELETE_CONFIRMATION = 'DELETE';

// ---------------------------------------------------------------------------
// Errors
// ---------------------------------------------------------------------------

export type AccountDeletionErrorCode =
  | 'CONFIRMATION_REQUIRED'
  | 'ACCOUNT_NOT_FOUND'
  | 'DATA_DELETE_FAILED'
  | 'PROVIDER_DELETE_FAILED'
  | 'CONFIG_MISSING';

export class AccountDeletionError extends Error {
  readonly code: AccountDeletionErrorCode;

  constructor(code: AccountDeletionErrorCode, message: string) {
    super(message);
    this.name = 'AccountDeletionError';
    this.code = code;
  }
}

// ---------------------------------------------------------------------------
// Narrow contracts (testable — fakes satisfy these, no real clients needed)
// ---------------------------------------------------------------------------

export interface AccountDeletionUserRecord {
  id: string;
  phone: string | null;
  avatarUrl: string | null;
}

/** Prisma boundary: load the account, then delete all user-owned data atomically. */
export interface AccountDeletionDataClient {
  loadUser(userId: string): Promise<AccountDeletionUserRecord | null>;
  /** ONE transaction: user-owned rows deleted, shared programs de-owned, OTP ledger by phone removed. */
  deleteUserData(userId: string, phone: string | null): Promise<void>;
}

/** Supabase boundary: synced outbox rows + the auth identity (service role). */
export interface AccountDeletionAdminClient {
  deleteOutboxRows(userId: string): Promise<{error: {message: string} | null}>;
  deleteAuthUser(id: string): Promise<{error: {message: string} | null}>;
}

/** Avatar storage boundary: removes the stored object (no-op for legacy data URLs). */
export type AccountDeletionAvatarDeleter = (path: string | null) => Promise<void>;

export interface AccountDeletionDeps {
  data: AccountDeletionDataClient;
  admin: AccountDeletionAdminClient;
  deleteAvatar: AccountDeletionAvatarDeleter;
}

export interface DeleteAccountInput {
  /** Supabase auth user id — also the Prisma `User.id` (identity contract). */
  supabaseUserId: string;
  /** Must equal `DELETE_CONFIRMATION` exactly. */
  confirmation: string;
}

// ---------------------------------------------------------------------------
// Factories (server-only, fail-closed on missing config)
// ---------------------------------------------------------------------------

/** Adapts Prisma to the narrow data contract. */
export function createAccountDeletionDataClient(prisma: PrismaClient): AccountDeletionDataClient {
  return {
    async loadUser(userId) {
      return prisma.user.findUnique({
        where: {id: userId},
        select: {id: true, phone: true, avatarUrl: true},
      });
    },
    async deleteUserData(userId, phone) {
      await prisma.$transaction(async (tx) => {
        await tx.weightEntry.deleteMany({where: {userId}});
        // WorkoutSessionExercise rows cascade via the FK (`onDelete: Cascade`).
        await tx.workoutSession.deleteMany({where: {userId}});
        await tx.quizResponse.deleteMany({where: {userId}});
        await tx.programGenerationRequest.deleteMany({where: {userId}});
        // Shared programs are content, not user data — de-own, never delete.
        await tx.program.updateMany({where: {ownerId: userId}, data: {ownerId: null}});
        // The OTP ledger has no FK to User — keyed by phone; remove by phone.
        if (phone) await tx.phoneOtp.deleteMany({where: {phone}});
        await tx.user.delete({where: {id: userId}});
      });
    },
  };
}

/** Builds the service-role admin client (throws CONFIG_MISSING when env absent). */
export function createAccountDeletionAdminClient(
  env: Record<string, string | undefined> = process.env,
): AccountDeletionAdminClient {
  const url = env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url || !serviceRoleKey) {
    throw new AccountDeletionError(
      'CONFIG_MISSING',
      'Account deletion requires NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.',
    );
  }
  const admin = createClient(url, serviceRoleKey, {
    auth: {persistSession: false, autoRefreshToken: false},
  });
  return {
    async deleteOutboxRows(userId) {
      // Raw Supabase table (supabase/migrations) — synced offline workout logs.
      const {error} = await admin.from('workout_exercise_logs').delete().eq('user_id', userId);
      return {error: error ? {message: error.message} : null};
    },
    async deleteAuthUser(id) {
      const {error} = await admin.auth.admin.deleteUser(id);
      return {error: error ? {message: error.message} : null};
    },
  };
}

// ---------------------------------------------------------------------------
// Orchestration
// ---------------------------------------------------------------------------

/**
 * Deletes the account and ALL user-owned data, irreversibly.
 *
 * Order: confirmation check → load account → Prisma transaction (app data) →
 * Supabase outbox rows → avatar object → Supabase auth identity (last). Any
 * step failure throws a typed `AccountDeletionError`; success is claimed only
 * after every step completed. See the module docstring for the retry/partial-
 * failure semantics.
 */
export async function deleteAccount(deps: AccountDeletionDeps, input: DeleteAccountInput): Promise<void> {
  if (input.confirmation !== DELETE_CONFIRMATION) {
    throw new AccountDeletionError(
      'CONFIRMATION_REQUIRED',
      `Type ${DELETE_CONFIRMATION} to confirm permanent deletion.`,
    );
  }

  const user = await deps.data.loadUser(input.supabaseUserId);
  if (!user) {
    throw new AccountDeletionError('ACCOUNT_NOT_FOUND', 'No account matches this identity.');
  }

  try {
    await deps.data.deleteUserData(user.id, user.phone);
  } catch (error) {
    throw new AccountDeletionError(
      'DATA_DELETE_FAILED',
      error instanceof Error ? `App data deletion failed: ${error.message}` : 'App data deletion failed.',
    );
  }

  const {error: outboxError} = await deps.admin.deleteOutboxRows(user.id);
  if (outboxError) {
    throw new AccountDeletionError(
      'PROVIDER_DELETE_FAILED',
      `Synced workout logs could not be deleted: ${outboxError.message}`,
    );
  }

  // Legacy in-DB data URLs and null are no-ops in the injected deleter.
  await deps.deleteAvatar(user.avatarUrl);

  const {error: authError} = await deps.admin.deleteAuthUser(user.id);
  if (authError) {
    throw new AccountDeletionError(
      'PROVIDER_DELETE_FAILED',
      `Auth identity could not be deleted: ${authError.message}`,
    );
  }
}