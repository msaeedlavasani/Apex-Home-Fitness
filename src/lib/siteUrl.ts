export const DEFAULT_SITE_URL = 'https://apexfit.app';

/**
 * Resolve the public origin used by metadata and structured data.
 *
 * Docker build args can legitimately be absent and are then exposed as an
 * empty string. Treat empty and malformed values as unconfigured so metadata
 * generation never calls `new URL('')` during the initial server render.
 */
export function resolveSiteUrl(value = process.env.NEXT_PUBLIC_SITE_URL): string {
  const candidate = value?.trim();

  if (!candidate) return DEFAULT_SITE_URL;

  try {
    return new URL(candidate).origin;
  } catch {
    return DEFAULT_SITE_URL;
  }
}
