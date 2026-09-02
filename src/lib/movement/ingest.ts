/**
 * MG-04 — Governed ingestion pipeline (architecture).
 *
 * Implements the strategy §5 pipeline stage-by-stage for the Owner-selected
 * upstream source (MG-04 DECISION GATE, 2026-09-01): **yuhonas/free-exercise-db**
 * (Unlicense, snapshot-pinned) with a **DATA-ONLY** media posture (no media
 * import — deferred to MG-07).
 *
 * Pipeline: pinned snapshots → parse → normalize → FAIL-CLOSED identity
 * (exact name/alias match against the canonical catalog; ambiguity surfaces,
 * never guessed — the S02-E lesson) → taxonomy enrichment (MG-02 maps) →
 * provenance (MG-03 records) → versioned `MovementObject` (MG-01 contract).
 * Downstream stages are declared hooks only: relationship enrichment =
 * MG-06, localization + media = MG-07.
 *
 * This module is PURE (no Prisma/DB/React). Network access happens only in
 * the dry-run CLI via the injected `fetch` (never at module import).
 * `RUNTIME_BEHAVIOR_CHANGED = NO` — nothing in application code imports
 * this; no Production writes ever (dry-run + evidence only).
 */

import { CANONICAL_CATALOG, normalizeExerciseName, slugifyName, type ExerciseSlug } from '../exercise';
import { evidenceConfidence, recordProvenance } from './provenance';
import {
  toEquipmentTypeToken,
  toMovementPatternToken,
  toMuscleGroupToken,
  type EquipmentType,
  type MovementPattern,
  type MuscleGroup,
} from './taxonomy';
import type {
  DifficultyTier,
  EquipmentTypeToken,
  LocalizedText,
  MovementId,
  MovementObject,
  MovementPatternToken,
  MovementSlug,
  MovementTaxonomy,
  MuscleGroupToken,
} from './types';

// ---------------------------------------------------------------------------
// Pinned snapshot (Owner-selected source; re-verify license at ingest time)
// ---------------------------------------------------------------------------

export interface FreeExerciseDbSnapshot {
  ownerRepo: 'yuhonas/free-exercise-db';
  /** Snapshot-pinned commit of the source repository. */
  commit: string;
  /** License recorded from the source LICENSE.md (Unlicense → permissive per MG-03). */
  license: 'Unlicense';
  /** Combined dataset URL at the pinned commit. */
  datasetUrl: string;
  /** Per-exercise file URL template at the pinned commit. */
  entryUrlTemplate: string;
  /** Entry count at snapshot time (verified 2026-09-01). */
  entryCount: number;
}

export const FREE_EXERCISE_DB_SNAPSHOT: FreeExerciseDbSnapshot = {
  ownerRepo: 'yuhonas/free-exercise-db',
  commit: 'a859101d633a01c4a1a920d6a8ce41dabba0705f',
  license: 'Unlicense',
  datasetUrl: 'https://raw.githubusercontent.com/yuhonas/free-exercise-db/a859101d633a01c4a1a920d6a8ce41dabba0705f/dist/exercises.json',
  entryUrlTemplate: 'https://raw.githubusercontent.com/yuhonas/free-exercise-db/a859101d633a01c4a1a920d6a8ce41dabba0705f/exercises/{id}.json',
  entryCount: 876,
};

// ---------------------------------------------------------------------------
// Raw source document types (free-exercise-db JSON schema, 2026 snapshot)
// ---------------------------------------------------------------------------

/** One upstream record (data-only: `images` is intentionally ignored). */
export interface FreeExerciseDbEntry {
  id: string;
  name: string;
  category: string | null;
  equipment: string | null;
  force: string | null;
  level: string | null;
  mechanic: string | null;
  primaryMuscles: string[];
  secondaryMuscles: string[];
  instructions: string[];
  /** Present in the source; EXCLUDED by this pipeline (data-only posture). */
  images?: string[];
}

export interface SourceDocument {
  source: string;
  license: string;
  pinnedCommit: string;
  exercises: FreeExerciseDbEntry[];
}

// ---------------------------------------------------------------------------
// Stage 1 — parse (fail-closed)
// ---------------------------------------------------------------------------

/** Parses a snapshot JSON document; malformed records are reported, never dropped silently. */
export function parseFreeExerciseDbDocument(jsonText: string): { document: SourceDocument | null; errors: string[] } {
  let raw: unknown;
  try {
    raw = JSON.parse(jsonText);
  } catch {
    return { document: null, errors: ['document is not valid JSON'] };
  }
  if (!Array.isArray(raw)) {
    return { document: null, errors: ['document root must be an array of exercise records'] };
  }
  const errors: string[] = [];
  const exercises: FreeExerciseDbEntry[] = [];
  for (let i = 0; i < raw.length; i++) {
    const entry = raw[i] as Record<string, unknown>;
    if (!entry || typeof entry !== 'object' || typeof entry.id !== 'string' || typeof entry.name !== 'string') {
      errors.push(`exercises[${i}]: missing string id/name — record rejected`);
      continue;
    }
    if (typeof entry.instructions !== 'undefined' && !Array.isArray(entry.instructions)) {
      errors.push(`exercises[${i}] (${entry.id}): instructions must be an array — record rejected`);
      continue;
    }
    const stringList = (v: unknown): string[] =>
      Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : [];
    exercises.push({
      id: entry.id,
      name: entry.name,
      category: typeof entry.category === 'string' ? entry.category : null,
      equipment: typeof entry.equipment === 'string' ? entry.equipment : null,
      force: typeof entry.force === 'string' ? entry.force : null,
      level: typeof entry.level === 'string' ? entry.level : null,
      mechanic: typeof entry.mechanic === 'string' ? entry.mechanic : null,
      primaryMuscles: stringList(entry.primaryMuscles),
      secondaryMuscles: stringList(entry.secondaryMuscles),
      instructions: stringList(entry.instructions),
    });
  }
  return {
    document: {
      source: 'yuhonas/free-exercise-db',
      license: 'Unlicense',
      pinnedCommit: FREE_EXERCISE_DB_SNAPSHOT.commit,
      exercises,
    },
    errors,
  };
}

// ---------------------------------------------------------------------------
// Stage 2 — identity (FAIL-CLOSED — the S02-E lesson)
// ---------------------------------------------------------------------------

export type IdentityStatus = 'RESOLVED' | 'AMBIGUOUS' | 'UNRESOLVED';

export interface IdentityResolution {
  status: IdentityStatus;
  /** Canonical slug on RESOLVED. */
  canonicalSlug?: MovementSlug;
  /** Candidate canonical slugs on AMBIGUOUS (order not significant). */
  candidates?: MovementSlug[];
  /** The normalized upstream name used for the lookup. */
  normalizedName: string;
}

/** Exact-match index over canonical names + aliases (normalized). */
function buildCanonicalIndex(): Map<string, Set<ExerciseSlug>> {
  const index = new Map<string, Set<ExerciseSlug>>();
  for (const entry of CANONICAL_CATALOG) {
    for (const key of [entry.name, ...(entry.aliases ?? [])]) {
      const normalized = normalizeExerciseName(key);
      if (!index.has(normalized)) index.set(normalized, new Set());
      index.get(normalized)!.add(entry.slug);
    }
  }
  return index;
}

let canonicalIndex: Map<string, Set<ExerciseSlug>> | undefined;

/**
 * Fail-closed exact identity resolution against the canonical catalog.
 * Multiple candidate hits ⇒ AMBIGUOUS (candidates surfaced, never guessed);
 * zero hits ⇒ UNRESOLVED (the upstream record is preserved, not dropped).
 * NOTE: the deterministic fuzzy classifier is MG-05 scope; this stage is
 * exact-match only by design.
 */
export function resolveIdentity(upstreamName: string): IdentityResolution {
  canonicalIndex ??= buildCanonicalIndex();
  const normalized = normalizeExerciseName(upstreamName);
  const hits = canonicalIndex.get(normalized);
  if (!hits || hits.size === 0) return { status: 'UNRESOLVED', normalizedName: normalized };
  const candidates = [...hits].map((slug) => slug as unknown as MovementSlug);
  if (candidates.length === 1) {
    return { status: 'RESOLVED', canonicalSlug: candidates[0], normalizedName: normalized };
  }
  return { status: 'AMBIGUOUS', candidates, normalizedName: normalized };
}

// ---------------------------------------------------------------------------
// Stage 3 — taxonomy enrichment (MG-02 closed vocabulary, explicit maps)
// ---------------------------------------------------------------------------

/** Upstream muscle term → MG-02 token. Terms absent here are SURFACED, never guessed. */
export const MUSCLE_ALIAS_MAP: Readonly<Record<string, MuscleGroup>> = {
  abdominals: 'core',
  lats: 'back',
  'middle back': 'back',
  'upper back': 'back',
  'lower back': 'lower-back',
  chest: 'chest',
  shoulders: 'shoulders',
  traps: 'traps',
  biceps: 'biceps',
  triceps: 'triceps',
  forearms: 'forearms',
  glutes: 'glutes',
  hamstrings: 'hamstrings',
  quadriceps: 'quadriceps',
  adductors: 'adductors',
  abductors: 'abductors',
  calves: 'calves',
};

/** Upstream equipment term → MG-02 token. `e-z curl bar` maps to the barbell
 * loading class (documented interpretation). Unmapped terms SURFACE. */
export const EQUIPMENT_ALIAS_MAP: Readonly<Record<string, EquipmentType>> = {
  'body only': 'bodyweight',
  'bands': 'resistance-band',
  'kettlebells': 'kettlebell',
  'cable': 'cable-machine',
  'dumbbell': 'dumbbell',
  'barbell': 'barbell',
  'e-z curl bar': 'barbell',
};

/** Upstream level → MG-02 difficulty tier (expert = top tier → advanced; documented). */
export const LEVEL_MAP: Readonly<Record<string, DifficultyTier>> = {
  beginner: 'beginner',
  intermediate: 'intermediate',
  expert: 'advanced',
};

/** Heuristic pattern hints (documented, reversible, NOT identity claims). */
export const PATTERN_HINT_MAP = {
  byCategory: { stretching: 'mobility', cardio: 'cardio', plyometrics: 'plyometric' } as const,
  byForce: { static: 'isometric-hold' } as const,
  byMechanic: { isolation: 'isolation' } as const,
};

type PatternHintToken = (typeof PATTERN_HINT_MAP.byCategory)[keyof typeof PATTERN_HINT_MAP.byCategory] |
  (typeof PATTERN_HINT_MAP.byForce)[keyof typeof PATTERN_HINT_MAP.byForce] |
  (typeof PATTERN_HINT_MAP.byMechanic)[keyof typeof PATTERN_HINT_MAP.byMechanic];

export interface TaxonomyMapping {
  taxonomy: MovementTaxonomy;
  /** Upstream terms that could NOT be mapped (fail-closed: surfaced in the report). */
  unknownTerms: string[];
}

/** Maps a raw entry's taxonomy fields onto the MG-02 closed vocabulary. */
export function mapEntryTaxonomy(entry: FreeExerciseDbEntry): TaxonomyMapping {
  const unknownTerms: string[] = [];
  const primary: MuscleGroupToken[] = [];
  const secondary: MuscleGroupToken[] = [];
  for (const muscle of [...entry.primaryMuscles, ...entry.secondaryMuscles]) {
    if (muscle in MUSCLE_ALIAS_MAP) {
      const list = entry.primaryMuscles.includes(muscle) ? primary : secondary;
      if (!list.includes(toMuscleGroupToken(MUSCLE_ALIAS_MAP[muscle]))) {
        list.push(toMuscleGroupToken(MUSCLE_ALIAS_MAP[muscle]));
      }
    } else {
      unknownTerms.push(`muscle:${muscle}`);
    }
  }
  const equipment: EquipmentTypeToken[] = [];
  if (entry.equipment) {
    if (entry.equipment in EQUIPMENT_ALIAS_MAP) {
      equipment.push(toEquipmentTypeToken(EQUIPMENT_ALIAS_MAP[entry.equipment]));
    } else {
      unknownTerms.push(`equipment:${entry.equipment}`);
    }
  }
  const patterns: MovementPatternToken[] = [];
  const categoryHint = entry.category
    ? (PATTERN_HINT_MAP.byCategory as Readonly<Record<string, PatternHintToken>>)[entry.category]
    : undefined;
  const forceHint = entry.force
    ? (PATTERN_HINT_MAP.byForce as Readonly<Record<string, PatternHintToken>>)[entry.force]
    : undefined;
  const mechanicHint = entry.mechanic
    ? (PATTERN_HINT_MAP.byMechanic as Readonly<Record<string, PatternHintToken>>)[entry.mechanic]
    : undefined;
  for (const hint of [categoryHint, forceHint, mechanicHint]) {
    if (hint && !patterns.includes(toMovementPatternToken(hint as MovementPattern))) {
      patterns.push(toMovementPatternToken(hint as MovementPattern));
    }
  }
  const taxonomy: MovementTaxonomy = {};
  if (primary.length > 0) taxonomy.primaryMuscles = primary;
  if (secondary.length > 0) taxonomy.secondaryMuscles = secondary;
  if (equipment.length > 0) taxonomy.equipment = equipment;
  if (patterns.length > 0) taxonomy.movementPatterns = patterns;
  const difficulty = entry.level ? LEVEL_MAP[entry.level] : undefined;
  if (difficulty) taxonomy.difficulty = difficulty;
  // Symmetry/impact/home-suitability/constraints are MG-04-OUT: not present
  // in the source; left absent (knowledge is accumulated later).
  return { taxonomy, unknownTerms };
}

// ---------------------------------------------------------------------------
// Stage 4 — build the MG-01 MovementObject + MG-03 provenance
// ---------------------------------------------------------------------------

/** Canonical serialization of a data-only entry (sorted keys, images excluded) — hash input. */
export function canonicalEntryJson(entry: FreeExerciseDbEntry): string {
  const { images: _images, ...data } = entry;
  const sorted: Record<string, unknown> = {};
  for (const key of Object.keys(data).sort()) sorted[key] = (data as Record<string, unknown>)[key];
  return JSON.stringify(sorted);
}

export function upstreamMovementId(entryId: string): MovementId {
  return `draft-movement:fedb:${entryId}` as MovementId;
}

export function upstreamMovementSlug(entryId: string): MovementSlug {
  return slugifyName(`fedb ${entryId}`) as unknown as MovementSlug;
}

export interface BuiltMovement {
  object: MovementObject;
  identity: IdentityResolution;
  unknownTerms: string[];
  /** Number of source image paths excluded (data-only posture). */
  imagesSkipped: number;
}

/**
 * Assembles one `MovementObject` from a raw entry: identity (fail-closed),
 * MG-02 taxonomy, MG-03 provenance (pinned per-entry source URL, Unlicense,
 * sha256 content hash, confidence per evidence), name + instructions
 * (localization keys; FA absent — GATE A).
 */
export function buildMovementObject(
  entry: FreeExerciseDbEntry,
  options?: { ingestedAt?: string; identity?: IdentityResolution },
): BuiltMovement {
  const identity = options?.identity ?? resolveIdentity(entry.name);
  const { taxonomy, unknownTerms } = mapEntryTaxonomy(entry);
  const instructions: LocalizedText[] = entry.instructions.map((step, i) => ({
    key: `fedb.${entry.id}.instr.${i + 1}`,
    en: step,
  }));
  const confidence = identity.status === 'RESOLVED' ? evidenceConfidence('verified') : undefined;
  const object: MovementObject = {
    id: upstreamMovementId(entry.id),
    slug: identity.status === 'RESOLVED' ? identity.canonicalSlug! : upstreamMovementSlug(entry.id),
    name: { en: entry.name },
    provenance: recordProvenance({
      sourceKind: 'UPSTREAM_IMPORT',
      sourceRef: FREE_EXERCISE_DB_SNAPSHOT.entryUrlTemplate.replace('{id}', entry.id),
      license: 'Unlicense',
      content: canonicalEntryJson(entry),
      ...(confidence !== undefined ? { confidence } : {}),
      ...(options?.ingestedAt !== undefined ? { ingestedAt: options.ingestedAt } : {}),
    }),
    versioning: {
      catalogVersion: 1,
      entryVersion: 1,
      changeNote: `free-exercise-db@${FREE_EXERCISE_DB_SNAPSHOT.commit}`,
    },
  };
  if (Object.keys(taxonomy).length > 0) object.taxonomy = taxonomy;
  if (instructions.length > 0) object.instructions = instructions;
  return { object, identity, unknownTerms, imagesSkipped: entry.images?.length ?? 0 };
}

// ---------------------------------------------------------------------------
// Orchestration — one dry-run of the governed pipeline
// ---------------------------------------------------------------------------

export interface IngestionRunReport {
  /** Snapshot metadata (license recorded from the source at snapshot time). */
  source: { name: string; license: string; pinnedCommit: string; entryCountAtSnapshot: number };
  generatedAt: string;
  entriesInput: number;
  recordsRejected: number;
  objects: MovementObject[];
  counts: {
    resolved: number;
    ambiguous: number;
    unresolved: number;
    imagesSkipped: number;
  };
  issues: {
    rejected: string[];
    ambiguous: Array<{ upstreamName: string; normalizedName: string; candidates: string[] }>;
    unresolvedNames: string[];
    unknownTaxonomyTerms: string[];
  };
  /** Declared downstream stages (execution deferred to their owning tasks). */
  deferredStages: {
    relationshipEnrichment: 'MG-06';
    localizationModel: 'MG-07';
    mediaManagement: 'MG-07';
  };
}

/** Runs the pipeline over a parsed document in DRY-RUN mode (no writes). */
export function runIngestion(document: SourceDocument, options?: { ingestedAt?: string }): IngestionRunReport {
  const generatedAt = options?.ingestedAt ?? new Date().toISOString();
  const ambiguous: IngestionRunReport['issues']['ambiguous'] = [];
  const unresolvedNames: string[] = [];
  const unknownTaxonomyTerms: string[] = [];
  const objects: MovementObject[] = [];
  let imagesSkipped = 0;

  for (const entry of document.exercises) {
    const built = buildMovementObject(entry, { ingestedAt: generatedAt });
    imagesSkipped += built.imagesSkipped;
    unknownTaxonomyTerms.push(...built.unknownTerms);
    objects.push(built.object);
    if (built.identity.status === 'AMBIGUOUS') {
      ambiguous.push({
        upstreamName: entry.name,
        normalizedName: built.identity.normalizedName,
        candidates: (built.identity.candidates ?? []).map((c) => String(c)),
      });
    } else if (built.identity.status === 'UNRESOLVED') {
      unresolvedNames.push(entry.name);
    }
  }

  return {
    source: {
      name: document.source,
      license: document.license,
      pinnedCommit: document.pinnedCommit,
      entryCountAtSnapshot: FREE_EXERCISE_DB_SNAPSHOT.entryCount,
    },
    generatedAt,
    entriesInput: document.exercises.length,
    recordsRejected: 0,
    objects,
    counts: {
      resolved: objects.length - ambiguous.length - unresolvedNames.length,
      ambiguous: ambiguous.length,
      unresolved: unresolvedNames.length,
      imagesSkipped,
    },
    issues: { rejected: [], ambiguous, unresolvedNames, unknownTaxonomyTerms },
    deferredStages: {
      relationshipEnrichment: 'MG-06',
      localizationModel: 'MG-07',
      mediaManagement: 'MG-07',
    },
  };
}

// ---------------------------------------------------------------------------
// Snapshot loader (dry-run CLI use only; fetch injected for testability)
// ---------------------------------------------------------------------------

/**
 * Loads the pinned snapshot document over the network. `fetch` is injected
 * (default global fetch) so tests never hit the network. Dry-run only.
 */
export async function loadSnapshotDocument(
  fetchImpl: typeof fetch = fetch,
  url: string = FREE_EXERCISE_DB_SNAPSHOT.datasetUrl,
): Promise<SourceDocument> {
  const response = await fetchImpl(url);
  if (!response.ok) throw new Error(`source fetch failed: ${response.status} ${response.statusText}`);
  const jsonText = await response.text();
  const { document, errors } = parseFreeExerciseDbDocument(jsonText);
  if (!document) throw new Error(`source parse failed: ${errors.join('; ')}`);
  return document;
}