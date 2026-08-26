/**
 * Avatar storage — Supabase Storage backend for profile avatars.
 *
 * The public contract is unchanged from the old in-DB data URL approach: the
 * profile API still accepts a small JPEG data URL on PATCH (`avatar`) and
 * still returns a directly-renderable `avatarUrl`. What changed is WHERE the
 * bytes live and what the DB stores:
 *
 *   - `User.avatarUrl` now holds the Supabase Storage OBJECT PATH
 *     (`avatars/<userId>.<ext>`) instead of a `data:image/...` URL.
 *   - Reads resolve that path into a short-lived SIGNED URL
 *     (`createSignedUrl`, private bucket — the browser can never guess or
 *     list other users' avatars). Legacy rows that still contain a data URL
 *     are returned unchanged.
 *   - Writes upload the decoded bytes to the `avatars` bucket (upsert, so
 *     re-uploads replace the previous object) and removals delete the object.
 *
 * Fallback: when Supabase Storage is not configured (no
 * `NEXT_PUBLIC_SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` — e.g. mock
 * auth/dev/CI), every function degrades to the legacy in-DB behavior: the
 * data URL is stored as-is, deletions are no-ops and stored paths resolve to
 * null. Production with the env pair set uses storage exclusively.
 *
 * Secrets: `SUPABASE_SERVICE_ROLE_KEY` is read HERE only (server). The
 * service-role client bypasses bucket RLS, so uploads/signed URLs work for
 * any user — the object path itself (`<userId>.<ext>`) keeps avatars
 * namespaced per user. Bucket setup: create a PRIVATE bucket named
 * `avatars` (see docs/ASSETS.md).
 *
 * All functions are server-only (they read server env and construct a
 * service-role Supabase client). Call them from Route Handlers or Server
 * Components only.
 */
import { createClient } from '@supabase/supabase-js';

import { logger } from '../lib/logger';

/** Supabase Storage bucket holding profile avatars (create it as PRIVATE). */
export const AVATAR_BUCKET = 'avatars';

/**
 * Signed-URL lifetime. Long enough that a profile page render / cached
 * `avatarUrl` from the API stays valid for a week; every server render and
 * every `/api/profile` read mints a fresh one anyway.
 */
export const AVATAR_SIGNED_URL_TTL_SECONDS = 60 * 60 * 24 * 7; // 7 days

/**
 * Minimal storage-admin contract (testable offline). Mirrors the three
 * operations this module uses from `@supabase/supabase-js` storage — the real
 * client satisfies it structurally.
 */
export interface AvatarStorageAdmin {
  storage: {
    from(bucket: string): {
      upload(
        path: string,
        body: Uint8Array | ArrayBuffer,
        options: { contentType: string; upsert: boolean },
      ): Promise<{ error: { message: string } | null }>;
      remove(paths: string[]): Promise<{ error: { message: string } | null }>;
      createSignedUrl(
        path: string,
        expiresIn: number,
      ): Promise<{ data: { signedUrl: string } | null; error: { message: string } | null }>;
    };
  };
}

export interface AvatarStorageOptions {
  /** Environment override (tests run offline without touching process.env). */
  env?: Record<string, string | undefined>;
  /** Storage admin client override (tests inject a fake — no network). */
  admin?: AvatarStorageAdmin;
}

/** True when the server can talk to Supabase Storage (URL + service role key). */
export function isAvatarStorageConfigured(
  env: Record<string, string | undefined> = process.env,
): boolean {
  return Boolean(
    env.NEXT_PUBLIC_SUPABASE_URL?.trim() &&
      env.SUPABASE_SERVICE_ROLE_KEY?.trim(),
  );
}

const MIME_TO_EXT: Record<string, string> = {
  png: 'png',
  jpeg: 'jpg',
  webp: 'webp',
  gif: 'gif',
};

/**
 * Storage object path for a user's avatar: `<userId>.<ext>` — stable across
 * re-uploads (upsert overwrites the same object) and namespaced per user.
 */
export function avatarObjectPath(userId: string, mime: string): string {
  const ext = MIME_TO_EXT[mime] ?? 'jpg';
  return `${userId}.${ext}`;
}

/** True when a stored value is a legacy in-DB `data:image/...` URL. */
export function isLegacyAvatarDataUrl(value: string): boolean {
  return value.startsWith('data:image/');
}

/** Builds the real service-role admin client (server-only, fail-closed). */
export function createAvatarAdminClient(): AvatarStorageAdmin {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url || !serviceRoleKey) {
    throw new Error(
      'Avatar storage is not configured (missing NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY).',
    );
  }
  return createClient(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  }) as unknown as AvatarStorageAdmin;
}

function resolveDeps(options: AvatarStorageOptions): {
  configured: boolean;
  admin: AvatarStorageAdmin | null;
} {
  const configured = isAvatarStorageConfigured(options.env ?? process.env);
  return { configured, admin: configured ? (options.admin ?? createAvatarAdminClient()) : null };
}

/**
 * Uploads a profile avatar (data URL) for a user.
 *
 * Returns the storage object path when Supabase Storage is configured;
 * otherwise returns the data URL unchanged (legacy in-DB behavior, so mock
 * / dev deployments keep working without a bucket).
 *
 * @throws when storage is configured but the upload fails (the route maps
 *         that to a 502 — never a silently-lost avatar).
 */
export async function uploadAvatarDataUrl(
  dataUrl: string,
  userId: string,
  options: AvatarStorageOptions = {},
): Promise<string> {
  const { configured, admin } = resolveDeps(options);
  if (!configured || !admin) return dataUrl; // legacy fallback

  const match = /^data:image\/(png|jpeg|webp|gif);base64,([A-Za-z0-9+/=]+)$/.exec(dataUrl);
  if (!match) throw new Error('Invalid avatar data URL.');
  const mime = match[1];
  const bytes = Buffer.from(match[2], 'base64');

  const path = avatarObjectPath(userId, mime);
  const { error } = await admin.storage.from(AVATAR_BUCKET).upload(path, bytes, {
    contentType: `image/${mime}`,
    upsert: true, // re-uploads replace the same object — no orphaned versions
  });
  if (error) throw new Error(`Avatar upload failed: ${error.message}`);
  return path;
}

/**
 * Deletes an avatar object from storage. No-op when storage is not
 * configured or the value is a legacy data URL. Best-effort at the call site:
 * clearing the DB row is what removes the avatar from the app.
 */
export async function deleteAvatarObject(
  path: string,
  options: AvatarStorageOptions = {},
): Promise<void> {
  const { configured, admin } = resolveDeps(options);
  if (!configured || !admin || isLegacyAvatarDataUrl(path)) return;
  const { error } = await admin.storage.from(AVATAR_BUCKET).remove([path]);
  if (error) throw new Error(`Avatar delete failed: ${error.message}`);
}

/**
 * Resolves a stored avatar value into a directly-renderable URL:
 *   - null            → null
 *   - legacy data URL → returned unchanged (still readable from the DB)
 *   - storage path    → a fresh signed URL; null when signing fails or
 *                       storage is not configured (degrade gracefully — the
 *                       profile must never break because an avatar can't load).
 */
export async function resolveAvatarUrl(
  value: string | null,
  options: AvatarStorageOptions = {},
): Promise<string | null> {
  if (!value) return null;
  if (isLegacyAvatarDataUrl(value)) return value;

  const { configured, admin } = resolveDeps(options);
  if (!configured || !admin) return null;

  try {
    const { data, error } = await admin.storage
      .from(AVATAR_BUCKET)
      .createSignedUrl(value, AVATAR_SIGNED_URL_TTL_SECONDS);
    if (error || !data?.signedUrl) {
      logger.warn('avatar.signing_failed', { error: error?.message ?? 'no signed url' });
      return null;
    }
    return data.signedUrl;
  } catch (error) {
    logger.warn('avatar.signing_exception', {
      error: error instanceof Error ? error.message : 'unknown',
    });
    return null;
  }
}
