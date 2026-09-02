/**
 * MG-07 — Localization key structure for movement knowledge objects.
 *
 * Defines the canonical FA/EN localization key model for user-facing
 * movement content (strategy §2 / MG-01 `LocalizedText`/`MovementMediaAsset`
 * caption contract). The MG-01 contract defers the key structure to MG-07;
 * this module is that definition.
 *
 * Key grammar (dotted, next-intl-compatible — cf. `badges.<id>.name` in
 * `src/services/gamificationService.ts`):
 *
 *     movement-key := scope "." ref "." field
 *     scope        := "mv" | "fedb" | "rules" | "seed" | "canonical" | "curated"
 *                     (knowledge-source scope — mirrors MovementSourceKind:
 *                      source-controlled/canonical vs upstream-imported)
 *     ref          := kebab-or-token movement reference (canonical slug for
 *                     canonical scopes; upstream record id for fedb)
 *     field        := "name" | "description"
 *                   | "instr" "." <1-based-index>
 *                   | "cue" "." <1-based-index>
 *                   | "media" "." <assetId> "." "caption"
 *
 * Examples (matching MG-01/MG-04 existing usage):
 *   - `mv.bodyweight-squat.name`                      (canonical name)
 *   - `mv.bodyweight-squat.description`               (canonical description)
 *   - `mv.bodyweight-squat.instr.1`                   (instruction 1)
 *   - `mv.bodyweight-squat.cue.1`                     (coaching cue 1)
 *   - `mv.bodyweight-squat.media.thumb-001.caption`   (media caption)
 *   - `fedb.Alternate_Incline_Dumbbell_Curl.instr.1`  (MG-04 upstream import)
 *
 * Every user-facing field of a MovementObject carries a conforming key:
 *   - `name`            → `<scope>.<ref>.name`
 *   - `description`     → `<scope>.<ref>.description`
 *   - `instructions[i]` → `<scope>.<ref>.instr.<i+1>`
 *   - `coachingCues[i]` → `<scope>.<ref>.cue.<i+1>`
 *   - `media[i].captionKey` → `<scope>.<ref>.media.<assetId>.caption`
 *
 * This module is PURE (no Prisma/DB/React/network) and deterministic.
 */

import type { LocalizedText, MovementMediaAsset, MovementObject } from './types';

// ---------------------------------------------------------------------------
// Grammar
// ---------------------------------------------------------------------------

/** Allowed key scopes (knowledge-source scopes; extend deliberately). */
export const LOCALIZATION_SCOPES = ['mv', 'fedb', 'rules', 'seed', 'canonical', 'curated'] as const;
export type LocalizationScope = (typeof LOCALIZATION_SCOPES)[number];

/** Field tokens (closed set). */
export type LocalizationField =
  | 'name'
  | 'description'
  | 'instructions' // stored as instr.<n>
  | 'coachingCues' // stored as cue.<n>
  | 'mediaCaption';

const SCOPE_RE = /^(mv|fedb|rules|seed|canonical|curated)$/;
const REF_RE = /^[a-z0-9][a-z0-9_-]*$/i;
const INDEX_RE = /^[1-9][0-9]*$/;
const CAPTION_RE = /^media\.[a-zA-Z0-9][a-zA-Z0-9._-]*\.caption$/;

export interface ParsedLocalizationKey {
  scope: LocalizationScope;
  ref: string;
  /** Canonical movement slug when the ref is canonical-form; else raw ref. */
  canonicalSlug: string | null;
  kind: 'name' | 'description' | 'instructions' | 'coachingCues' | 'mediaCaption';
  /** 1-based index for instructions/coachingCues. */
  index?: number;
  /** Asset id for media captions. */
  assetId?: string;
}

/** True when the dotted key conforms to the movement localization grammar. */
export function isValidLocalizationKey(key: string): boolean {
  return parseLocalizationKey(key) !== null;
}

/**
 * Parses a movement localization key into its parts, or null when it does
 * not conform. Deterministic.
 */
export function parseLocalizationKey(key: string): ParsedLocalizationKey | null {
  if (typeof key !== 'string') return null;
  const segments = key.split('.');
  if (segments.length < 3) return null;
  const [scopeRaw, refRaw, ...rest] = segments;
  if (!SCOPE_RE.test(scopeRaw) || !REF_RE.test(refRaw)) return null;
  const scope = scopeRaw as LocalizationScope;
  const restJoined = rest.join('.');

  // name / description — exactly one trailing segment.
  if (rest.length === 1 && (rest[0] === 'name' || rest[0] === 'description')) {
    return {
      scope,
      ref: refRaw,
      canonicalSlug: toCanonicalSlug(refRaw),
      kind: rest[0] === 'name' ? 'name' : 'description',
    };
  }

  // instructions / coaching cues — `instr.<n>` / `cue.<n>` with 1-based index.
  if (rest.length === 2 && (rest[0] === 'instr' || rest[0] === 'cue') && INDEX_RE.test(rest[1])) {
    return {
      scope,
      ref: refRaw,
      canonicalSlug: toCanonicalSlug(refRaw),
      kind: rest[0] === 'instr' ? 'instructions' : 'coachingCues',
      index: Number(rest[1]),
    };
  }

  // media captions — `media.<assetId>.caption` (assetId may contain dots).
  if (rest.length >= 3 && CAPTION_RE.test(restJoined)) {
    const assetId = restJoined.slice('media.'.length, -'.caption'.length);
    return { scope, ref: refRaw, canonicalSlug: toCanonicalSlug(refRaw), kind: 'mediaCaption', assetId };
  }
  return null;
}

/** Canonical kebab slug when the ref is canonical-form; else null. */
function toCanonicalSlug(ref: string): string | null {
  return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(ref) ? ref : null;
}

// ---------------------------------------------------------------------------
// Builders (canonical key for each user-facing field)
// ---------------------------------------------------------------------------

export function movementNameKey(ref: string, scope: LocalizationScope = 'mv'): string {
  return `${scope}.${ref}.name`;
}

export function movementDescriptionKey(ref: string, scope: LocalizationScope = 'mv'): string {
  return `${scope}.${ref}.description`;
}

export function movementInstructionKey(
  ref: string,
  index: number,
  scope: LocalizationScope = 'mv',
): string {
  return `${scope}.${ref}.instr.${index}`;
}

export function movementCoachingCueKey(
  ref: string,
  index: number,
  scope: LocalizationScope = 'mv',
): string {
  return `${scope}.${ref}.cue.${index}`;
}

export function movementMediaCaptionKey(
  ref: string,
  assetId: string,
  scope: LocalizationScope = 'mv',
): string {
  return `${scope}.${ref}.media.${assetId}.caption`;
}

// ---------------------------------------------------------------------------
// MovementObject coverage — every user-facing field has a conforming key
// ---------------------------------------------------------------------------

export interface LocalizationCoverage {
  /** Keys found on the object (deterministic: name, description,
   * instructions, coachingCues, media captions). */
  keys: string[];
  /** User-facing fields missing a conforming key. */
  missing: string[];
  /** Keys present that do not conform to the grammar. */
  invalid: string[];
  status: 'PASS' | 'FAIL';
}

function localizedKeys(entries: readonly LocalizedText[] | undefined): string[] {
  return entries ? entries.map((e) => e.key) : [];
}

/**
 * Verifies every user-facing field of a MovementObject carries a conforming
 * localization key (MG-07 acceptance). The `name` field's key is
 * `<scope>.<ref>.name`; list fields require `<...>.instr.<n>` / `<...>.cue.<n>`
 * with 1-based sequential indices. Media assets require `captionKey` entries
 * of the media-caption grammar. Deterministic.
 */
export function localizationKeyCoverage(movement: MovementObject): LocalizationCoverage {
  const keys: string[] = [];
  const missing: string[] = [];
  const invalid: string[] = [];

  const ref = String(movement.slug);
  const scope = (movement.provenance?.sourceKind ?? 'SOURCE_CONTROLLED') === 'UPSTREAM_IMPORT' ? 'fedb' : 'mv';
  const expectedNameKey = movementNameKey(ref, scope);
  keys.push(expectedNameKey);
  if (!isValidLocalizationKey(expectedNameKey)) invalid.push(expectedNameKey);

  // description
  if (movement.description) {
    const k = movement.description.key;
    if (!k) missing.push('description');
    else {
      keys.push(k);
      if (!isValidLocalizationKey(k)) invalid.push(k);
      else {
        const parsed = parseLocalizationKey(k);
        if (parsed?.kind !== 'description') invalid.push(`${k} (expected description kind)`);
      }
    }
  }

  // instructions — sequential 1-based indices required
  const instrKeys = localizedKeys(movement.instructions);
  if (movement.instructions && movement.instructions.length > 0) {
    instrKeys.forEach((k, i) => {
      keys.push(k);
      if (!k) missing.push(`instructions[${i}]`);
      else if (!isValidLocalizationKey(k)) invalid.push(k);
      else {
        const parsed = parseLocalizationKey(k);
        if (parsed?.kind !== 'instructions' || parsed.index !== i + 1) {
          invalid.push(`${k} (expected instr.${i + 1})`);
        }
      }
    });
  }

  // coaching cues — sequential 1-based indices
  const cueKeys = localizedKeys(movement.coachingCues);
  if (movement.coachingCues && movement.coachingCues.length > 0) {
    cueKeys.forEach((k, i) => {
      keys.push(k);
      if (!k) missing.push(`coachingCues[${i}]`);
      else if (!isValidLocalizationKey(k)) invalid.push(k);
      else {
        const parsed = parseLocalizationKey(k);
        if (parsed?.kind !== 'coachingCues' || parsed.index !== i + 1) {
          invalid.push(`${k} (expected cue.${i + 1})`);
        }
      }
    });
  }

  // media captions
  for (const asset of movement.media ?? []) {
    const caption = (asset as MovementMediaAsset).captionKey;
    if (!caption) {
      missing.push(`media.${assetUrlLabel(asset)}.captionKey`);
    } else {
      keys.push(caption);
      if (!isValidLocalizationKey(caption)) invalid.push(caption);
      else {
        const parsed = parseLocalizationKey(caption);
        if (parsed?.kind !== 'mediaCaption') invalid.push(`${caption} (expected media caption kind)`);
      }
    }
  }

  return {
    keys: [...new Set(keys)].sort(),
    missing,
    invalid,
    status: missing.length === 0 && invalid.length === 0 ? 'PASS' : 'FAIL',
  };
}

function assetUrlLabel(asset: MovementMediaAsset): string {
  try {
    return new URL(asset.url).pathname.split('/').filter(Boolean).pop() ?? asset.url;
  } catch {
    return asset.url.split('/').filter(Boolean).pop() ?? asset.url;
  }
}