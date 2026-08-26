/**
 * Avatar storage tests (`src/services/avatarStorage.ts`).
 *
 * Covers the migration contract:
 *   - when Supabase Storage is NOT configured, everything degrades to the
 *     legacy in-DB data-URL behavior (upload returns the data URL, deletes
 *     are no-ops, stored paths resolve to null) — offline, no network;
 *   - when configured, uploads decode the data URL and upsert the bytes into
 *     the `avatars` bucket at `<userId>.<ext>`, deletes remove the object and
 *     reads resolve to a signed URL — verified against a FAKE admin client
 *     (no Supabase calls, no secrets).
 *
 * Runs offline. No real user data.
 */
import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  AVATAR_BUCKET,
  avatarObjectPath,
  deleteAvatarObject,
  isAvatarStorageConfigured,
  isLegacyAvatarDataUrl,
  resolveAvatarUrl,
  uploadAvatarDataUrl,
  type AvatarStorageAdmin,
} from '../src/services/avatarStorage';

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const CONFIGURED_ENV = {
  NEXT_PUBLIC_SUPABASE_URL: 'https://project.supabase.co',
  SUPABASE_SERVICE_ROLE_KEY: 'service-role-key',
};

const JPEG_BYTES = 'fake-jpeg-bytes';
const JPEG_DATA_URL = `data:image/jpeg;base64,${Buffer.from(JPEG_BYTES).toString('base64')}`;
const PNG_DATA_URL = `data:image/png;base64,${Buffer.from('fake-png-bytes').toString('base64')}`;

interface UploadCall {
  bucket: string;
  path: string;
  body: Uint8Array | ArrayBuffer;
  contentType: string;
  upsert: boolean;
}

function createFakeAdmin(overrides: {
  uploadError?: { message: string } | null;
  removeError?: { message: string } | null;
  signResult?: { data: { signedUrl: string } | null; error: { message: string } | null };
} = {}): {
  admin: AvatarStorageAdmin;
  uploads: UploadCall[];
  removes: string[][];
  signs: Array<{ bucket: string; path: string; expiresIn: number }>;
} {
  const uploads: UploadCall[] = [];
  const removes: string[][] = [];
  const signs: Array<{ bucket: string; path: string; expiresIn: number }> = [];

  const admin: AvatarStorageAdmin = {
    storage: {
      from(bucket) {
        return {
          async upload(path, body, options) {
            uploads.push({ bucket, path, body, contentType: options.contentType, upsert: options.upsert });
            return { error: overrides.uploadError ?? null };
          },
          async remove(paths) {
            removes.push(paths);
            return { error: overrides.removeError ?? null };
          },
          async createSignedUrl(path, expiresIn) {
            signs.push({ bucket, path, expiresIn });
            return (
              overrides.signResult ?? {
                data: { signedUrl: `https://project.supabase.co/storage/v1/object/sign/avatars/${path}?token=signed` },
                error: null,
              }
            );
          },
        };
      },
    },
  };

  return { admin, uploads, removes, signs };
}

// ---------------------------------------------------------------------------
// Configuration / pure helpers
// ---------------------------------------------------------------------------

test('isAvatarStorageConfigured requires BOTH the URL and the service-role key', () => {
  assert.equal(isAvatarStorageConfigured({}), false);
  assert.equal(isAvatarStorageConfigured({ NEXT_PUBLIC_SUPABASE_URL: 'https://x.supabase.co' }), false);
  assert.equal(isAvatarStorageConfigured({ SUPABASE_SERVICE_ROLE_KEY: 'k' }), false);
  assert.equal(isAvatarStorageConfigured({ NEXT_PUBLIC_SUPABASE_URL: ' https://x.supabase.co ', SUPABASE_SERVICE_ROLE_KEY: ' k ' }), true);
});

test('avatarObjectPath derives the extension from the mime and namespaces by user id', () => {
  assert.equal(avatarObjectPath('user-1', 'jpeg'), 'user-1.jpg');
  assert.equal(avatarObjectPath('user-1', 'png'), 'user-1.png');
  assert.equal(avatarObjectPath('user-1', 'webp'), 'user-1.webp');
  assert.equal(avatarObjectPath('user-1', 'gif'), 'user-1.gif');
  assert.equal(avatarObjectPath('user-1', 'unknown'), 'user-1.jpg'); // safe default
});

test('isLegacyAvatarDataUrl recognises legacy in-DB rows', () => {
  assert.equal(isLegacyAvatarDataUrl('data:image/jpeg;base64,abc'), true);
  assert.equal(isLegacyAvatarDataUrl('user-1.jpg'), false);
});

// ---------------------------------------------------------------------------
// Legacy fallback (storage NOT configured — dev/mock keeps working)
// ---------------------------------------------------------------------------

test('upload returns the data URL unchanged when storage is not configured', async () => {
  const stored = await uploadAvatarDataUrl(JPEG_DATA_URL, 'user-1', { env: {} });
  assert.equal(stored, JPEG_DATA_URL);
});

test('delete is a no-op when storage is not configured (a spy would throw)', async () => {
  const { admin, removes } = createFakeAdmin();
  // No admin is even touched in the fallback path.
  await deleteAvatarObject('user-1.jpg', { env: {}, admin });
  assert.equal(removes.length, 0);
});

test('resolve returns legacy data URLs as-is and storage paths as null when not configured', async () => {
  assert.equal(await resolveAvatarUrl(null, { env: {} }), null);
  assert.equal(await resolveAvatarUrl(JPEG_DATA_URL, { env: {} }), JPEG_DATA_URL);
  assert.equal(await resolveAvatarUrl('user-1.jpg', { env: {} }), null);
});

// ---------------------------------------------------------------------------
// Configured path (fake admin client — no network)
// ---------------------------------------------------------------------------

test('upload decodes the data URL and upserts into the avatars bucket', async () => {
  const { admin, uploads } = createFakeAdmin();
  const path = await uploadAvatarDataUrl(JPEG_DATA_URL, 'user-1', { env: CONFIGURED_ENV, admin });

  assert.equal(path, 'user-1.jpg');
  assert.equal(uploads.length, 1);
  const call = uploads[0];
  assert.equal(call.bucket, AVATAR_BUCKET);
  assert.equal(call.path, 'user-1.jpg');
  assert.equal(call.contentType, 'image/jpeg');
  assert.equal(call.upsert, true); // re-uploads replace the same object
  assert.equal(Buffer.from(call.body as Uint8Array).toString(), JPEG_BYTES);
});

test('upload keeps the mime-appropriate extension for non-JPEG avatars', async () => {
  const { admin, uploads } = createFakeAdmin();
  const path = await uploadAvatarDataUrl(PNG_DATA_URL, 'user-1', { env: CONFIGURED_ENV, admin });
  assert.equal(path, 'user-1.png');
  assert.equal(uploads[0].contentType, 'image/png');
});

test('upload rejects when the storage call fails', async () => {
  const { admin } = createFakeAdmin({ uploadError: { message: 'bucket not found' } });
  await assert.rejects(
    uploadAvatarDataUrl(JPEG_DATA_URL, 'user-1', { env: CONFIGURED_ENV, admin }),
    /Avatar upload failed: bucket not found/,
  );
});

test('delete removes the stored object when storage is configured', async () => {
  const { admin, removes } = createFakeAdmin();
  await deleteAvatarObject('user-1.jpg', { env: CONFIGURED_ENV, admin });
  assert.deepEqual(removes, [['user-1.jpg']]);
});

test('delete rejects when the storage call fails', async () => {
  const { admin } = createFakeAdmin({ removeError: { message: 'not found' } });
  await assert.rejects(
    deleteAvatarObject('user-1.jpg', { env: CONFIGURED_ENV, admin }),
    /Avatar delete failed: not found/,
  );
});

test('resolve returns a fresh signed URL for a stored path', async () => {
  const { admin, signs } = createFakeAdmin();
  const url = await resolveAvatarUrl('user-1.jpg', { env: CONFIGURED_ENV, admin });

  assert.equal(url, 'https://project.supabase.co/storage/v1/object/sign/avatars/user-1.jpg?token=signed');
  assert.deepEqual(signs, [{ bucket: AVATAR_BUCKET, path: 'user-1.jpg', expiresIn: 60 * 60 * 24 * 7 }]);
});

test('resolve degrades to null (never throws) when signing fails', async () => {
  const { admin } = createFakeAdmin({
    signResult: { data: null, error: { message: 'object does not exist' } },
  });
  assert.equal(await resolveAvatarUrl('user-1.jpg', { env: CONFIGURED_ENV, admin }), null);
});
