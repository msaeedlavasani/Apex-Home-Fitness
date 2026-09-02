/**
 * MG-07 — Self-hosted media manifest for movement knowledge objects.
 *
 * Implements the media part of MG-07: a manifest format and validation
 * rules for exercise media, per the strategy §6 self-hosting/resilience
 * principle and the MG-04 decision-gate DATA-ONLY media posture:
 *
 *   - every required movement asset is served from AHF-controlled
 *     infrastructure (same-origin `public/` paths in this app today — see
 *     `docs/ASSETS.md` namespaces `/videos/`, `/posters/`, `/animations/`);
 *   - **no third-party CDN dependencies** for required exercise media
 *     (mux.dev / commondatastorage.googleapis.com remain DEMO-only origins,
 *     never canonical movement media);
 *   - every asset carries a sha256 content hash (MG-03 hash contract) so
 *     integrity is verifiable end-to-end;
 *   - a `fallbackUrl` provides resilience when the primary asset cannot load;
 *   - loss of upstream connectivity must never break core workout execution.
 *
 * This task defines the manifest format + validation ONLY. It imports no
 * media bytes (MG-04 DATA-ONLY posture), writes nothing, and touches no
 * runtime. This module is PURE and deterministic.
 */

import { parseLocalizationKey } from './localization';
import { isValidContentHash, sha256Hex } from './provenance';
import type { MovementMediaAsset, MovementMediaKind } from './types';

// ---------------------------------------------------------------------------
// Self-hosting rules
// ---------------------------------------------------------------------------

/** Media kinds supported by the manifest (MG-01 closed set). */
export const MEDIA_KINDS: readonly MovementMediaKind[] = ['image', 'video', 'animation', 'audio'] as const;

/** Runtime guard for the closed media-kind set. */
export function isMediaKind(value: unknown): value is MovementMediaKind {
  return MEDIA_KINDS.includes(value as MovementMediaKind);
}

/**
 * True when `url` is served from AHF-controlled infrastructure. Required
 * movement media must NEVER point at a third-party CDN. Accepted forms:
 *   - same-origin absolute path (`/videos/squat.mp4`, `/posters/squat.jpg`,
 *     `/animations/push-up.json`) — the canonical form (this app serves
 *     static assets from `public/` under root paths, per `docs/ASSETS.md`);
 *   - an explicitly allowlisted AHF-controlled origin (production domain),
 *     only when supplied by the caller (never a built-in third-party list).
 */
export function isSelfHostedMediaUrl(
  url: string,
  allowedOrigins: readonly string[] = [],
): boolean {
  if (typeof url !== 'string' || url.length === 0) return false;
  if (url.startsWith('/')) {
    // Same-origin absolute path. Must not be a protocol-relative sneaky form.
    if (url.startsWith('//')) return false;
    return true;
  }
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') return false;
    return allowedOrigins.includes(parsed.origin);
  } catch {
    return false;
  }
}

/** Built-in AHF-controlled origins (production domain family). */
export const AHF_CONTROLLED_ORIGINS = ['https://apexhomefit.ir', 'https://www.apexhomefit.ir'] as const;

// ---------------------------------------------------------------------------
// Manifest format
// ---------------------------------------------------------------------------

/** The manifest schema version (bump on breaking shape changes). */
export const MOVEMENT_MEDIA_MANIFEST_VERSION = 1 as const;

/** One manifest entry: asset identity, integrity, delivery, fallback. */
export interface MediaManifestEntry {
  /** Stable asset id, unique within the manifest (e.g. `squat-thumb-001`). */
  assetId: string;
  kind: MovementMediaKind;
  /** Self-hosted URL on AHF-controlled infrastructure. */
  url: string;
  /** sha256 lowercase-hex content hash of the asset bytes (MG-03 contract). */
  contentHash: string;
  /** Optional resilience fallback (also self-hosted). */
  fallbackUrl?: string;
  /** Optional localization key for captions/narration (MG-07 grammar). */
  captionKey?: string;
}

export interface MovementMediaManifest {
  manifestVersion: typeof MOVEMENT_MEDIA_MANIFEST_VERSION;
  /** Source of the media set (e.g. `free-exercise-db@<commit>` or `canonical`). */
  source: string;
  /** Provenance/rights note for the media set. */
  license: string;
  /** Deterministic serialization moment (injectable for tests). */
  generatedAt?: string;
  entries: MediaManifestEntry[];
}

// ---------------------------------------------------------------------------
// Integrity verification (content-hash)
// ---------------------------------------------------------------------------

/** True when a manifest entry's content hash matches the actual asset bytes
 * (sha256 hex, deterministic). */
export function contentHashMatches(entry: MediaManifestEntry, actualBytes: Uint8Array | string): boolean {
  const actual =
    typeof actualBytes === 'string'
      ? actualBytes
      : Buffer.from(actualBytes.buffer, actualBytes.byteOffset, actualBytes.byteLength).toString('utf8');
  return entry.contentHash === sha256Hex(actual);
}

/** Builds the sha256 hex digest of raw bytes — the manifest hash contract. */
export function mediaContentHash(bytes: Uint8Array | string): string {
  const text =
    typeof bytes === 'string' ? bytes : Buffer.from(bytes.buffer, bytes.byteOffset, bytes.byteLength).toString('utf8');
  return sha256Hex(text);
}

// ---------------------------------------------------------------------------
// Manifest validation (fail-closed)
// ---------------------------------------------------------------------------

export type MediaManifestProblemKind =
  | 'INVALID_KIND'
  | 'DUPLICATE_ASSET_ID'
  | 'INVALID_CONTENT_HASH'
  | 'NON_SELF_HOSTED_URL'
  | 'NON_SELF_HOSTED_FALLBACK'
  | 'INVALID_CAPTION_KEY';

export interface MediaManifestProblem {
  kind: MediaManifestProblemKind;
  assetId: string;
  detail?: string;
}

export interface MediaManifestValidation {
  status: 'PASS' | 'FAIL';
  problems: MediaManifestProblem[];
}

/**
 * Fail-closed manifest validation:
 *   - kind in the closed media set;
 *   - asset ids unique;
 *   - content hash matches the sha256 hex contract (MG-03);
 *   - url AND fallbackUrl are self-hosted (no third-party CDN);
 *   - captionKey, when present, conforms to the movement localization
 *     grammar (scope.ref.media.<assetId>.caption).
 * Deterministic (entries examined in manifest order).
 */
export function validateMediaManifest(
  manifest: MovementMediaManifest,
  options?: { allowedOrigins?: readonly string[] },
): MediaManifestValidation {
  const problems: MediaManifestProblem[] = [];
  const allowedOrigins = options?.allowedOrigins ?? [];
  const seenAssetIds = new Set<string>();
  for (const entry of manifest.entries) {
    if (seenAssetIds.has(entry.assetId)) {
      problems.push({ kind: 'DUPLICATE_ASSET_ID', assetId: entry.assetId });
      continue;
    }
    seenAssetIds.add(entry.assetId);
    if (!isMediaKind(entry.kind)) {
      problems.push({ kind: 'INVALID_KIND', assetId: entry.assetId, detail: String(entry.kind) });
    }
    if (!isValidContentHash(entry.contentHash)) {
      problems.push({ kind: 'INVALID_CONTENT_HASH', assetId: entry.assetId });
    }
    if (!isSelfHostedMediaUrl(entry.url, allowedOrigins)) {
      problems.push({ kind: 'NON_SELF_HOSTED_URL', assetId: entry.assetId, detail: entry.url });
    }
    if (entry.fallbackUrl !== undefined && !isSelfHostedMediaUrl(entry.fallbackUrl, allowedOrigins)) {
      problems.push({ kind: 'NON_SELF_HOSTED_FALLBACK', assetId: entry.assetId, detail: entry.fallbackUrl });
    }
    if (entry.captionKey !== undefined && !isValidMediaCaptionKey(entry.captionKey, entry.assetId)) {
      problems.push({ kind: 'INVALID_CAPTION_KEY', assetId: entry.assetId, detail: entry.captionKey });
    }
  }
  return { status: problems.length === 0 ? 'PASS' : 'FAIL', problems };
}

/**
 * Validates a caption key against the canonical localization grammar
 * (`./localization.ts`): must parse as a `mediaCaption` kind whose assetId
 * matches the entry's assetId.
 */
function isValidMediaCaptionKey(captionKey: string, assetId: string): boolean {
  const parsed = parseLocalizationKey(captionKey);
  return parsed !== null && parsed.kind === 'mediaCaption' && parsed.assetId === assetId;
}

/**
 * Maps a validated MovementMediaAsset back into a manifest entry shape.
 * FAIL-CLOSED: the manifest contract REQUIRES a content hash, so an asset
 * without one cannot become a manifest entry — an explicit error is thrown
 * rather than silently emitting an invalid entry.
 */
export function assetToManifestEntry(asset: MovementMediaAsset, assetId: string): MediaManifestEntry {
  if (!asset.contentHash) {
    throw new Error(`asset ${assetId} has no contentHash — cannot enter the media manifest`);
  }
  const result: MediaManifestEntry = {
    assetId,
    kind: asset.kind,
    url: asset.url,
    contentHash: asset.contentHash,
  };
  if (asset.fallbackUrl) result.fallbackUrl = asset.fallbackUrl;
  if (asset.captionKey) result.captionKey = asset.captionKey;
  return result;
}