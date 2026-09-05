/**
 * Account deletion tests (`src/services/accountDeletionService.ts`).
 *
 * Covers the TS-03 deletion contract with NO real database or Supabase:
 *   - the typed confirmation literal gates everything (nothing is touched
 *     without it);
 *   - the Prisma transaction deletes EVERY user-owned table, removes the OTP
 *     ledger by phone, and DE-OWNS shared programs instead of deleting them;
 *   - the Supabase side removes outbox rows, then the avatar, then the auth
 *     identity LAST (point of no return), and failures are surfaced as typed
 *     errors — never swallowed, never claimed as success;
 *   - legacy in-DB avatar data URLs and null avatars are no-ops.
 *
 * Runs offline. No real user data.
 */
import assert from 'node:assert/strict';
import {test} from 'node:test';

import {
  DELETE_CONFIRMATION,
  AccountDeletionError,
  createAccountDeletionAdminClient,
  createAccountDeletionDataClient,
  deleteAccount,
  type AccountDeletionAdminClient,
  type AccountDeletionDataClient,
} from '../src/services/accountDeletionService';

// ---------------------------------------------------------------------------
// Fakes
// ---------------------------------------------------------------------------

interface DataCalls {
  loadUser: Array<{userId: string}>;
  deleteUserData: Array<{userId: string; phone: string | null}>;
}

function createFakeData(overrides: {
  user?: {id: string; phone: string | null; avatarUrl: string | null} | null;
  deleteError?: Error;
} = {}): {data: AccountDeletionDataClient; calls: DataCalls} {
  const calls: DataCalls = {loadUser: [], deleteUserData: []};
  return {
    calls,
    data: {
      async loadUser(userId) {
        calls.loadUser.push({userId});
        return overrides.user ?? null;
      },
      async deleteUserData(userId, phone) {
        calls.deleteUserData.push({userId, phone});
        if (overrides.deleteError) throw overrides.deleteError;
      },
    },
  };
}

function createFakeAdmin(overrides: {
  outboxError?: {message: string} | null;
  authError?: {message: string} | null;
} = {}): {admin: AccountDeletionAdminClient; outboxDeletes: string[]; authDeletes: string[]} {
  const outboxDeletes: string[] = [];
  const authDeletes: string[] = [];
  return {
    outboxDeletes,
    authDeletes,
    admin: {
      async deleteOutboxRows(userId) {
        outboxDeletes.push(userId);
        return {error: overrides.outboxError ?? null};
      },
      async deleteAuthUser(id) {
        authDeletes.push(id);
        return {error: overrides.authError ?? null};
      },
    },
  };
}

const USER = {id: 'user-1', phone: '+989121234567', avatarUrl: 'user-1.jpg'};

// ---------------------------------------------------------------------------
// Confirmation gate
// ---------------------------------------------------------------------------

test('rejects deletion without the exact confirmation literal (nothing touched)', async () => {
  const {data, calls} = createFakeData({user: USER});
  const {admin, outboxDeletes, authDeletes} = createFakeAdmin();
  const avatarDeletes: Array<string | null> = [];

  await assert.rejects(
    () =>
      deleteAccount(
        {data, admin, deleteAvatar: async (path) => {avatarDeletes.push(path);}},
        {supabaseUserId: 'user-1', confirmation: 'delete'},
      ),
    (error: unknown) =>
      error instanceof AccountDeletionError && error.code === 'CONFIRMATION_REQUIRED',
  );

  assert.deepEqual(calls.loadUser, []);
  assert.deepEqual(calls.deleteUserData, []);
  assert.deepEqual(outboxDeletes, []);
  assert.deepEqual(authDeletes, []);
  assert.deepEqual(avatarDeletes, []);
});

test('rejects deletion for a missing confirmation body', async () => {
  const {data} = createFakeData({user: USER});
  const {admin} = createFakeAdmin();
  await assert.rejects(
    () =>
      deleteAccount(
        {data, admin, deleteAvatar: async () => {}},
        {supabaseUserId: 'user-1', confirmation: ''},
      ),
    (error: unknown) =>
      error instanceof AccountDeletionError && error.code === 'CONFIRMATION_REQUIRED',
  );
});

// ---------------------------------------------------------------------------
// Success path — full cascade
// ---------------------------------------------------------------------------

test('deletes user data, outbox rows, avatar and auth identity in order (legacy avatars skipped)', async () => {
  const {data, calls} = createFakeData({user: USER});
  const {admin, outboxDeletes, authDeletes} = createFakeAdmin();
  const avatarDeletes: Array<string | null> = [];
  const order: string[] = [];

  await deleteAccount(
    {
      data: {
        async loadUser(userId) {
          order.push('loadUser');
          return data.loadUser(userId).then((value) => {
            calls.loadUser.push({userId});
            return value;
          });
        },
        async deleteUserData(userId, phone) {
          order.push('deleteUserData');
          return data.deleteUserData(userId, phone);
        },
      },
      admin: {
        async deleteOutboxRows(userId) {
          order.push('deleteOutboxRows');
          return admin.deleteOutboxRows(userId);
        },
        async deleteAuthUser(id) {
          order.push('deleteAuthUser');
          return admin.deleteAuthUser(id);
        },
      },
      deleteAvatar: async (path) => {
        order.push('deleteAvatar');
        avatarDeletes.push(path);
      },
    },
    {supabaseUserId: 'user-1', confirmation: DELETE_CONFIRMATION},
  );

  // Auth identity is deleted LAST (point of no return).
  assert.deepEqual(order, [
    'loadUser',
    'deleteUserData',
    'deleteOutboxRows',
    'deleteAvatar',
    'deleteAuthUser',
  ]);
  assert.deepEqual(calls.deleteUserData, [{userId: 'user-1', phone: '+989121234567'}]);
  assert.deepEqual(outboxDeletes, ['user-1']);
  assert.deepEqual(authDeletes, ['user-1']);
  assert.deepEqual(avatarDeletes, ['user-1.jpg']);
});

test('legacy in-DB avatar data URL is a no-op for the storage deleter', async () => {
  const legacyUser = {id: 'user-2', phone: null, avatarUrl: 'data:image/jpeg;base64,AAAA'};
  const {data, calls} = createFakeData({user: legacyUser});
  const {admin} = createFakeAdmin();
  const avatarDeletes: Array<string | null> = [];

  await deleteAccount(
    {data, admin, deleteAvatar: async (path) => {avatarDeletes.push(path);}},
    {supabaseUserId: 'user-2', confirmation: DELETE_CONFIRMATION},
  );

  assert.deepEqual(calls.deleteUserData, [{userId: 'user-2', phone: null}]);
  assert.deepEqual(avatarDeletes, ['data:image/jpeg;base64,AAAA']);
});

// ---------------------------------------------------------------------------
// Failure paths — fail-stop, honest errors
// ---------------------------------------------------------------------------

test('unknown account -> ACCOUNT_NOT_FOUND, nothing deleted', async () => {
  const {data, calls} = createFakeData({user: null});
  const {admin, outboxDeletes, authDeletes} = createFakeAdmin();

  await assert.rejects(
    () =>
      deleteAccount(
        {data, admin, deleteAvatar: async () => {}},
        {supabaseUserId: 'ghost', confirmation: DELETE_CONFIRMATION},
      ),
    (error: unknown) =>
      error instanceof AccountDeletionError && error.code === 'ACCOUNT_NOT_FOUND',
  );

  assert.deepEqual(calls.deleteUserData, []);
  assert.deepEqual(outboxDeletes, []);
  assert.deepEqual(authDeletes, []);
});

test('Prisma transaction failure -> DATA_DELETE_FAILED, Supabase never touched', async () => {
  const {data} = createFakeData({user: USER, deleteError: new Error('tx aborted')});
  const {admin, outboxDeletes, authDeletes} = createFakeAdmin();

  await assert.rejects(
    () =>
      deleteAccount(
        {data, admin, deleteAvatar: async () => {}},
        {supabaseUserId: 'user-1', confirmation: DELETE_CONFIRMATION},
      ),
    (error: unknown) =>
      error instanceof AccountDeletionError && error.code === 'DATA_DELETE_FAILED',
  );

  assert.deepEqual(outboxDeletes, []);
  assert.deepEqual(authDeletes, []);
});

test('outbox delete failure -> PROVIDER_DELETE_FAILED, auth identity NOT deleted (retry-safe)', async () => {
  const {data} = createFakeData({user: USER});
  const {admin, outboxDeletes, authDeletes} = createFakeAdmin({
    outboxError: {message: 'network down'},
  });

  await assert.rejects(
    () =>
      deleteAccount(
        {data, admin, deleteAvatar: async () => {}},
        {supabaseUserId: 'user-1', confirmation: DELETE_CONFIRMATION},
      ),
    (error: unknown) =>
      error instanceof AccountDeletionError &&
      error.code === 'PROVIDER_DELETE_FAILED' &&
      error.message.includes('workout logs'),
  );

  assert.deepEqual(outboxDeletes, ['user-1']);
  assert.deepEqual(authDeletes, []);
});

test('auth identity delete failure -> PROVIDER_DELETE_FAILED surfaced, never claimed as success', async () => {
  const {data} = createFakeData({user: USER});
  const {admin, authDeletes} = createFakeAdmin({
    authError: {message: 'user not found'},
  });

  await assert.rejects(
    () =>
      deleteAccount(
        {data, admin, deleteAvatar: async () => {}},
        {supabaseUserId: 'user-1', confirmation: DELETE_CONFIRMATION},
      ),
    (error: unknown) =>
      error instanceof AccountDeletionError &&
      error.code === 'PROVIDER_DELETE_FAILED' &&
      error.message.includes('Auth identity'),
  );

  assert.deepEqual(authDeletes, ['user-1']);
});

// ---------------------------------------------------------------------------
// Prisma data client — the transaction covers every user-owned table
// ---------------------------------------------------------------------------

interface TxCall {
  table: string;
  op: 'deleteMany' | 'updateMany' | 'delete';
  args: Record<string, unknown>;
}

function createFakePrisma() {
  const txCalls: TxCall[] = [];
  const tx = {
    weightEntry: {deleteMany: async (args: Record<string, unknown>) => {txCalls.push({table: 'weightEntry', op: 'deleteMany', args});}},
    workoutSession: {deleteMany: async (args: Record<string, unknown>) => {txCalls.push({table: 'workoutSession', op: 'deleteMany', args});}},
    quizResponse: {deleteMany: async (args: Record<string, unknown>) => {txCalls.push({table: 'quizResponse', op: 'deleteMany', args});}},
    programGenerationRequest: {deleteMany: async (args: Record<string, unknown>) => {txCalls.push({table: 'programGenerationRequest', op: 'deleteMany', args});}},
    program: {updateMany: async (args: Record<string, unknown>) => {txCalls.push({table: 'program', op: 'updateMany', args});}},
    phoneOtp: {deleteMany: async (args: Record<string, unknown>) => {txCalls.push({table: 'phoneOtp', op: 'deleteMany', args});}},
    user: {delete: async (args: Record<string, unknown>) => {txCalls.push({table: 'user', op: 'delete', args});}},
  };
  const prisma = {
    user: {findUnique: async () => USER},
    $transaction: async (fn: (client: typeof tx) => Promise<unknown>) => fn(tx),
  };
  return {prisma: prisma as never, txCalls};
}

test('data client transaction deletes all user-owned rows, de-owns programs, removes OTP ledger, deletes the user', async () => {
  const {prisma, txCalls} = createFakePrisma();
  const client = createAccountDeletionDataClient(prisma as Parameters<typeof createAccountDeletionDataClient>[0]);

  await client.deleteUserData('user-1', '+989121234567');

  const tables = txCalls.map((call) => `${call.table}:${call.op}`);
  assert.deepEqual(tables, [
    'weightEntry:deleteMany',
    'workoutSession:deleteMany',
    'quizResponse:deleteMany',
    'programGenerationRequest:deleteMany',
    'program:updateMany',
    'phoneOtp:deleteMany',
    'user:delete',
  ]);
  const programCall = txCalls.find((call) => call.table === 'program');
  assert.deepEqual(programCall?.args, {where: {ownerId: 'user-1'}, data: {ownerId: null}});
  const otpCall = txCalls.find((call) => call.table === 'phoneOtp');
  assert.deepEqual(otpCall?.args, {where: {phone: '+989121234567'}});
  const userCall = txCalls.find((call) => call.table === 'user');
  assert.deepEqual(userCall?.args, {where: {id: 'user-1'}});
});

test('data client skips the OTP ledger when the account has no phone', async () => {
  const {prisma, txCalls} = createFakePrisma();
  const client = createAccountDeletionDataClient(prisma as Parameters<typeof createAccountDeletionDataClient>[0]);

  await client.deleteUserData('user-1', null);

  assert.equal(txCalls.some((call) => call.table === 'phoneOtp'), false);
  assert.equal(txCalls.some((call) => call.table === 'user'), true);
});

// ---------------------------------------------------------------------------
// Admin client factory — fail-closed on missing config
// ---------------------------------------------------------------------------

test('admin client factory throws CONFIG_MISSING without Supabase env', () => {
  assert.throws(
    () => createAccountDeletionAdminClient({}),
    (error: unknown) =>
      error instanceof AccountDeletionError && error.code === 'CONFIG_MISSING',
  );
  assert.throws(
    () =>
      createAccountDeletionAdminClient({
        NEXT_PUBLIC_SUPABASE_URL: 'https://x.supabase.co',
      }),
    (error: unknown) =>
      error instanceof AccountDeletionError && error.code === 'CONFIG_MISSING',
  );
});