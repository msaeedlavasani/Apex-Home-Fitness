/**
 * MG-07 — Localization key structure tests.
 *
 * Proves the FA/EN localization key grammar for movement knowledge objects:
 *   - conforming keys parse to typed parts (name / description /
 *     instructions / coachingCues / mediaCaption);
 *   - canonical builders produce conforming keys for every user-facing field;
 *   - existing MG-01/MG-04 usage (`mv.bodyweight-squat.instr.1`,
 *     `fedb.<id>.instr.<n>`) remains conforming;
 *   - non-conforming keys are rejected (wrong scope, bad ref, zero-index,
 *     missing index, unknown fields, malformed captions);
 *   - `localizationKeyCoverage` PASSes only when every user-facing field of a
 *     MovementObject carries a conforming key (MG-07 acceptance).
 */

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  MOVEMENT_GRAPH_CONTRACT_VERSION,
  isValidLocalizationKey,
  localizationKeyCoverage,
  movementCoachingCueKey,
  movementDescriptionKey,
  movementInstructionKey,
  movementMediaCaptionKey,
  movementNameKey,
  parseLocalizationKey,
  type LocalizedText,
} from '../src/lib/movement/index';
import type { MovementId, MovementObject, MovementSlug } from '../src/lib/movement/types';

const slug = (s: string): MovementSlug => s as MovementSlug;
const id = (s: string): MovementId => s as MovementId;

function baseMovement(over: Partial<MovementObject> = {}): MovementObject {
  return {
    id: id('draft-movement:bodyweight-squat'),
    slug: slug('bodyweight-squat'),
    name: { en: 'Bodyweight Squat' },
    provenance: { sourceKind: 'SOURCE_CONTROLLED', sourceRef: 'catalog', confidence: 1 },
    versioning: { catalogVersion: MOVEMENT_GRAPH_CONTRACT_VERSION, entryVersion: 1 },
    ...over,
  };
}

const lt = (key: string, en: string): LocalizedText => ({ key, en });

describe('MG-07 key grammar — valid keys', () => {
  it('accepts canonical name/description keys', () => {
    assert.equal(isValidLocalizationKey('mv.bodyweight-squat.name'), true);
    assert.equal(isValidLocalizationKey('mv.bodyweight-squat.description'), true);
  });

  it('accepts instruction and cue keys with 1-based indices', () => {
    assert.equal(isValidLocalizationKey('mv.bodyweight-squat.instr.1'), true);
    assert.equal(isValidLocalizationKey('mv.bodyweight-squat.cue.3'), true);
  });

  it('accepts the MG-04 upstream key form (fedb scope)', () => {
    assert.equal(isValidLocalizationKey('fedb.Alternate_Incline_Dumbbell_Curl.instr.1'), true);
  });

  it('accepts media caption keys', () => {
    assert.equal(isValidLocalizationKey('mv.bodyweight-squat.media.thumb-001.caption'), true);
  });

  it('parseLocalizationKey returns typed parts', () => {
    const p = parseLocalizationKey('mv.bodyweight-squat.instr.2')!;
    assert.equal(p.scope, 'mv');
    assert.equal(p.ref, 'bodyweight-squat');
    assert.equal(p.kind, 'instructions');
    assert.equal(p.index, 2);
    assert.equal(p.canonicalSlug, 'bodyweight-squat');
  });
});

describe('MG-07 key grammar — invalid keys', () => {
  it('rejects unknown scopes and empty keys', () => {
    assert.equal(isValidLocalizationKey('foo.bodyweight-squat.name'), false);
    assert.equal(isValidLocalizationKey(''), false);
    assert.equal(isValidLocalizationKey('mv..name'), false);
  });

  it('rejects bad refs (spaces, dots in canonical refs, empty)', () => {
    assert.equal(isValidLocalizationKey('mv.bodyweight squat.name'), false);
    assert.equal(isValidLocalizationKey('mv.bodyweight.squat.name'), false);
  });

  it('rejects zero/negative instruction indices and missing indices', () => {
    assert.equal(isValidLocalizationKey('mv.bodyweight-squat.instr.0'), false);
    assert.equal(isValidLocalizationKey('mv.bodyweight-squat.instr'), false);
    assert.equal(isValidLocalizationKey('mv.bodyweight-squat.cue.0'), false);
  });

  it('rejects unknown fields', () => {
    assert.equal(isValidLocalizationKey('mv.bodyweight-squat.tips'), false);
    assert.equal(isValidLocalizationKey('mv.bodyweight-squat.media'), false);
  });

  it('rejects malformed caption keys', () => {
    assert.equal(isValidLocalizationKey('mv.bodyweight-squat.media.thumb-001'), false);
    assert.equal(isValidLocalizationKey('mv.bodyweight-squat.caption'), false);
  });
});

describe('MG-07 key builders', () => {
  it('build conforming keys for every user-facing field', () => {
    const keys = [
      movementNameKey('bodyweight-squat'),
      movementDescriptionKey('bodyweight-squat'),
      movementInstructionKey('bodyweight-squat', 1),
      movementCoachingCueKey('bodyweight-squat', 2),
      movementMediaCaptionKey('bodyweight-squat', 'thumb-001'),
    ];
    for (const key of keys) assert.equal(isValidLocalizationKey(key), true, `${key} must conform`);
  });
});

describe('MG-07 localization coverage (every user-facing field keyed)', () => {
  it('PASSes a fully keyed MovementObject', () => {
    const movement = baseMovement({
      description: lt('mv.bodyweight-squat.description', 'A fundamental squat pattern.'),
      instructions: [lt('mv.bodyweight-squat.instr.1', 'Stand with feet shoulder-width.')],
      coachingCues: [lt('mv.bodyweight-squat.cue.1', 'Knees track over toes.')],
      media: [
        {
          kind: 'image' as const,
          url: '/posters/bodyweight-squat.jpg',
          contentHash: 'a'.repeat(64),
          captionKey: 'mv.bodyweight-squat.media.thumb-001.caption',
        },
      ],
    });
    const c = localizationKeyCoverage(movement);
    assert.equal(c.status, 'PASS', JSON.stringify({ missing: c.missing, invalid: c.invalid }));
  });

  it('FAILs when a description lacks a key', () => {
    const movement = baseMovement({ description: { key: '', en: 'desc' } });
    const c = localizationKeyCoverage(movement);
    assert.equal(c.status, 'FAIL');
    assert.ok(c.missing.includes('description'));
  });

  it('FAILs on non-sequential instruction indices', () => {
    const movement = baseMovement({ instructions: [lt('mv.bodyweight-squat.instr.2', 'wrong index')] });
    const c = localizationKeyCoverage(movement);
    assert.equal(c.status, 'FAIL');
    assert.ok(c.invalid.some((k) => k.includes('instr.1')));
  });

  it('FAILs when a media asset has no captionKey', () => {
    const movement = baseMovement({
      media: [{ kind: 'image' as const, url: '/posters/bodyweight-squat.jpg' }],
    });
    const c = localizationKeyCoverage(movement);
    assert.equal(c.status, 'FAIL');
    assert.ok(c.missing.some((m) => m.includes('captionKey')));
  });

  it('FAILs when a caption key does not match the asset grammar', () => {
    const movement = baseMovement({
      media: [
        {
          kind: 'image' as const,
          url: '/posters/bodyweight-squat.jpg',
          captionKey: 'mv.bodyweight-squat.caption',
        },
      ],
    });
    const c = localizationKeyCoverage(movement);
    assert.equal(c.status, 'FAIL');
  });
});