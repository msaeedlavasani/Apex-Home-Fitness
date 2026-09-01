/**
 * MG-01 — expressibility bridge: the existing S-06 canonical exercise catalog
 * expressed in terms of the Movement Graph contract types.
 *
 * This module PROVES (and documents) the MG-01 acceptance criterion: the
 * existing `src/lib/exercise` catalog can be expressed in the new types. It
 * is PURE — no Prisma, React, or runtime side effects — and it is not wired
 * into any application code. It intentionally performs ZERO identity
 * resolution: the ids it produces are deterministic DRAFT placeholders,
 * explicitly non-durable, until identity assignment lands with MG-04/MG-05
 * (fail-closed, the S02-E lesson).
 *
 * The `ExerciseSlug → MovementSlug` cast is licensed here because both are
 * branded strings over the same kebab-case token format produced by
 * `slugifyName` (the canonical resolution syntax); the cast is documented,
 * not implicit.
 */

import type { ExerciseCatalogEntry } from '../exercise/contracts';

import {
  MOVEMENT_GRAPH_CONTRACT_VERSION,
  type MovementId,
  type MovementObject,
  type MovementProvenance,
  type MovementSlug,
} from './types';

/**
 * Deterministic DRAFT id for a movement seeded from the source-controlled
 * catalog. The `draft-movement:` prefix marks it as place-only: durable
 * identity is assigned by identity resolution (MG-04/MG-05) later.
 */
export function draftMovementId(slug: MovementSlug): MovementId {
  return `draft-movement:${slug}` as MovementId;
}

/** Baseline provenance for source-controlled system-catalog seeds. */
const SOURCE_CONTROLLED_PROVENANCE: MovementProvenance = {
  sourceKind: 'SOURCE_CONTROLLED',
  sourceRef: 'src/lib/exercise/catalog.ts (S-06 canonical system catalog)',
  license: 'source-controlled (repository)',
  confidence: 1,
};

/**
 * Maps one existing catalog entry into the Movement Graph contract as a
 * partial-knowledge draft: identity/name/provenance/versioning are known;
 * taxonomy, instructions, cues, relationships, and media are ABSENT (that
 * knowledge is accumulated by the governance pipeline from MG-02 onward).
 */
export function movementDraftFromCatalogEntry(entry: ExerciseCatalogEntry): MovementObject {
  // Licensed/cast through unknown: both brands are strings over the same
  // kebab-case token format (slugifyName output); the brand swap is explicit.
  const slug = entry.slug as unknown as MovementSlug;
  return {
    id: draftMovementId(slug),
    slug,
    name: {
      en: entry.name,
      // Absent until a real Persian corpus exists (GATE A: no invented names).
      ...(entry.faName !== undefined && entry.faName !== '' ? { fa: entry.faName } : {}),
      ...(entry.aliases && entry.aliases.length > 0 ? { aliases: entry.aliases } : {}),
    },
    provenance: SOURCE_CONTROLLED_PROVENANCE,
    versioning: {
      catalogVersion: MOVEMENT_GRAPH_CONTRACT_VERSION,
      entryVersion: 1,
    },
  };
}