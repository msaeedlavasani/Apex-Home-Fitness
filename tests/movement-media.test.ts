/**
 * MG-07 — Self-hosted media manifest tests.
 *
 * Proves the media manifest format + fail-closed rules:
 *   - manifest entries carry asset id, kind, self-hosted URL, sha256 content
 *     hash, optional fallback + caption key;
 *   - content-hash verification is deterministic and contract-checked;
 *   - required movement media NEVER points at third-party CDNs — same-origin
 *     paths pass, external origins fail (mux.dev / commondatastorage stay
 *     demo-only), unless an AHF-controlled origin is explicitly allowlisted;
 *   - validation rejects duplicate asset ids, invalid kinds, malformed
 *     hashes, non-self-hosted fallbacks, and invalid caption keys.
 */

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  AHF_CONTROLLED_ORIGINS,
  MEDIA_KINDS,
  MOVEMENT_MEDIA_MANIFEST_VERSION,
  contentHashMatches,
  isMediaKind,
  isSelfHostedMediaUrl,
  mediaContentHash,
  validateMediaManifest,
  type MediaManifestEntry,
  type MovementMediaManifest,
} from '../src/lib/movement/index';

const HASH = (n: number) => String(n).padStart(64, 'a');

function entry(over: Partial<MediaManifestEntry> = {}): MediaManifestEntry {
  return {
    assetId: 'squat-thumb-001',
    kind: 'image',
    url: '/posters/squat.jpg',
    contentHash: HASH(1),
    ...over,
  };
}

function manifest(entries: MediaManifestEntry[], over: Partial<MovementMediaManifest> = {}): MovementMediaManifest {
  return {
    manifestVersion: MOVEMENT_MEDIA_MANIFEST_VERSION,
    source: 'canonical',
    license: 'source-controlled',
    entries,
    ...over,
  };
}

describe('MG-07 media kinds', () => {
  it('closed kind set matches the MG-01 contract', () => {
    assert.deepEqual(MEDIA_KINDS, ['image', 'video', 'animation', 'audio']);
    assert.equal(isMediaKind('video'), true);
    assert.equal(isMediaKind('gif'), false);
  });
});

describe('MG-07 self-hosting rules', () => {
  it('same-origin absolute paths are self-hosted', () => {
    assert.equal(isSelfHostedMediaUrl('/videos/squat.mp4'), true);
    assert.equal(isSelfHostedMediaUrl('/posters/squat.jpg'), true);
    assert.equal(isSelfHostedMediaUrl('/animations/push-up.json'), true);
  });

  it('rejects third-party CDN origins (required media must not use them)', () => {
    assert.equal(isSelfHostedMediaUrl('https://mux.dev/stream.m3u8'), false);
    assert.equal(isSelfHostedMediaUrl('https://commondatastorage.googleapis.com/squat.jpg'), false);
    assert.equal(isSelfHostedMediaUrl('https://supabase.co/storage/x.jpg'), false);
  });

  it('rejects protocol-relative and non-http forms', () => {
    assert.equal(isSelfHostedMediaUrl('//mux.dev/x.mp4'), false);
    assert.equal(isSelfHostedMediaUrl('data:image/png;base64,abc'), false);
    assert.equal(isSelfHostedMediaUrl(''), false);
  });

  it('accepts explicitly allowlisted AHF-controlled origins', () => {
    assert.equal(isSelfHostedMediaUrl('https://apexhomefit.ir/videos/squat.mp4', AHF_CONTROLLED_ORIGINS), true);
    assert.equal(isSelfHostedMediaUrl('https://evil.example.com/videos/squat.mp4', AHF_CONTROLLED_ORIGINS), false);
  });
});

describe('MG-07 content-hash verification', () => {
  it('mediaContentHash produces a deterministic sha256 hex digest', () => {
    const h1 = mediaContentHash('hello');
    const h2 = mediaContentHash(new TextEncoder().encode('hello'));
    assert.equal(h1, h2);
    assert.equal(h1.length, 64);
  });

  it('contentHashMatches verifies bytes against the manifest hash', () => {
    const e = entry({ contentHash: mediaContentHash('asset-bytes') });
    assert.equal(contentHashMatches(e, 'asset-bytes'), true);
    assert.equal(contentHashMatches(e, 'tampered-bytes'), false);
  });
});

describe('MG-07 manifest validation (fail-closed)', () => {
  it('a conforming manifest PASSes', () => {
    const m = manifest([
      entry({ assetId: 'a-1', contentHash: HASH(1) }),
      entry({ assetId: 'a-2', kind: 'video', url: '/videos/squat.mp4', contentHash: HASH(2) }),
    ]);
    const v = validateMediaManifest(m);
    assert.equal(v.status, 'PASS', JSON.stringify(v.problems));
  });

  it('rejects duplicate asset ids', () => {
    const m = manifest([entry({ assetId: 'dup' }), entry({ assetId: 'dup', contentHash: HASH(2) })]);
    const v = validateMediaManifest(m);
    assert.equal(v.status, 'FAIL');
    assert.ok(v.problems.some((p) => p.kind === 'DUPLICATE_ASSET_ID'));
  });

  it('rejects invalid media kinds', () => {
    const m = manifest([entry({ kind: 'gif' as never })]);
    const v = validateMediaManifest(m);
    assert.equal(v.status, 'FAIL');
    assert.ok(v.problems.some((p) => p.kind === 'INVALID_KIND'));
  });

  it('rejects malformed content hashes', () => {
    const m = manifest([entry({ contentHash: 'not-a-hash' })]);
    const v = validateMediaManifest(m);
    assert.equal(v.status, 'FAIL');
    assert.ok(v.problems.some((p) => p.kind === 'INVALID_CONTENT_HASH'));
  });

  it('rejects non-self-hosted primary URLs', () => {
    const m = manifest([entry({ url: 'https://mux.dev/stream.m3u8' })]);
    const v = validateMediaManifest(m);
    assert.equal(v.status, 'FAIL');
    assert.ok(v.problems.some((p) => p.kind === 'NON_SELF_HOSTED_URL'));
  });

  it('rejects non-self-hosted fallback URLs', () => {
    const m = manifest([entry({ fallbackUrl: 'https://commondatastorage.googleapis.com/x.mp4' })]);
    const v = validateMediaManifest(m);
    assert.equal(v.status, 'FAIL');
    assert.ok(v.problems.some((p) => p.kind === 'NON_SELF_HOSTED_FALLBACK'));
  });

  it('accepts a self-hosted fallback', () => {
    const m = manifest([entry({ fallbackUrl: '/videos/squat-alt.mp4' })]);
    const v = validateMediaManifest(m);
    assert.equal(v.status, 'PASS', JSON.stringify(v.problems));
  });

  it('rejects caption keys that do not match the asset', () => {
    const m = manifest([
      entry({ captionKey: 'mv.squat.media.thumb-001.caption' }), // assetId mismatch (thumb-999 expected)
    ]);
    const v = validateMediaManifest(m);
    assert.equal(v.status, 'FAIL');
    assert.ok(v.problems.some((p) => p.kind === 'INVALID_CAPTION_KEY'));
  });

  it('accepts a conforming caption key', () => {
    const m = manifest([
      entry({ captionKey: 'mv.squat.media.squat-thumb-001.caption' }),
    ]);
    const v = validateMediaManifest(m);
    assert.equal(v.status, 'PASS', JSON.stringify(v.problems));
  });
});