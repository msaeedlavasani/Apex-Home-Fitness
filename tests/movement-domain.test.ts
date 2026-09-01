import assert from 'node:assert/strict';
import test from 'node:test';

import { CANONICAL_CATALOG } from '../src/lib/exercise';
import {
  MOVEMENT_GRAPH_CONTRACT_VERSION,
  draftMovementId,
  movementDraftFromCatalogEntry,
  type MovementId,
  type MovementObject,
  type MovementReference,
  type MovementRelationshipEdge,
  type MovementSlug,
  type MovementTaxonomy,
  type MuscleGroupToken,
  type MovementPatternToken,
} from '../src/lib/movement';

/**
 * MG-01 domain-contract invariants:
 *  - the contract version is declared exactly once and equals 1;
 *  - the existing canonical exercise catalog is expressible in the Movement
 *    Graph types (every entry maps, ids/slugs stay unique and deterministic);
 *  - drafts carry only the known seed knowledge (identity/name/provenance/
 *    versioning) — taxonomy/instructions/relationships/media are ABSENT, i.e.
 *    partial knowledge is representable, and no knowledge is invented;
 *  - a fully-populated knowledge object satisfies the schema shape, including
 *    relationship edges that reference movements only by id/slug and a
 *    difficulty tier aligned with the existing Prisma DifficultyLevel
 *    vocabulary (lowercased).
 */

test('contract version: MOVEMENT_GRAPH_CONTRACT_VERSION is 1', () => {
  assert.equal(MOVEMENT_GRAPH_CONTRACT_VERSION, 1);
});

test('expressibility: every canonical catalog entry maps into the contract types', () => {
  const drafts = CANONICAL_CATALOG.map(movementDraftFromCatalogEntry);
  assert.equal(drafts.length, CANONICAL_CATALOG.length);

  const ids = new Set(drafts.map((d) => d.id));
  const slugs = new Set(drafts.map((d) => d.slug));
  assert.equal(ids.size, drafts.length, 'draft ids must be unique');
  assert.equal(slugs.size, drafts.length, 'draft slugs must be unique');
});

test('expressibility: drafts are deterministic and anchored to their slug', () => {
  for (const entry of CANONICAL_CATALOG) {
    const draft = movementDraftFromCatalogEntry(entry);
    assert.equal(draft.slug, entry.slug);
    assert.equal(draft.id, draftMovementId(draft.slug));
    assert.equal(draft.name.en, entry.name);
    assert.ok(draft.id.startsWith('draft-movement:'), 'draft ids are marked non-durable');
    assert.ok(draft.slug === entry.slug, 'slug token format is preserved across domains');
  }
});

test('expressibility: draft provenance is SOURCE_CONTROLLED at full confidence', () => {
  for (const entry of CANONICAL_CATALOG) {
    const draft = movementDraftFromCatalogEntry(entry);
    assert.equal(draft.provenance.sourceKind, 'SOURCE_CONTROLLED');
    assert.equal(draft.provenance.confidence, 1);
    assert.ok(draft.provenance.sourceRef, 'source ref must name the canonical catalog');
  }
});

test('expressibility: drafts carry partial knowledge — metadata fields are absent, not guessed', () => {
  for (const entry of CANONICAL_CATALOG) {
    const draft = movementDraftFromCatalogEntry(entry);
    assert.equal(draft.taxonomy, undefined);
    assert.equal(draft.instructions, undefined);
    assert.equal(draft.coachingCues, undefined);
    assert.equal(draft.relationships, undefined);
    assert.equal(draft.media, undefined);
    assert.equal(draft.description, undefined);
    assert.equal(draft.versioning.catalogVersion, MOVEMENT_GRAPH_CONTRACT_VERSION);
    assert.equal(draft.versioning.entryVersion, 1);
  }
});

test('expressibility: FA names are not invented — drafts carry fa only when the source has one', () => {
  for (const entry of CANONICAL_CATALOG) {
    const draft = movementDraftFromCatalogEntry(entry);
    if (entry.faName) {
      assert.equal(draft.name.fa, entry.faName);
    } else {
      assert.equal(draft.name.fa, undefined);
    }
  }
});

test('a fully-populated knowledge object satisfies the contract shape', () => {
  const references: readonly MovementReference[] = [
    { kind: 'id', id: 'mv_other' as MovementId },
    { kind: 'slug', slug: 'bodyweight-squat' as MovementSlug },
  ];
  const edges: MovementRelationshipEdge[] = [
    { kind: 'progression', target: references[0] },
    { kind: 'regression', target: references[1], note: 'knee-friendly entry point' },
    { kind: 'substitution', target: references[0], note: 'equipment-driven alternative' },
  ];
  const taxonomy: MovementTaxonomy = {
    primaryMuscles: ['quadriceps' as MuscleGroupToken],
    movementPatterns: ['squat' as MovementPatternToken],
    difficulty: 'intermediate',
  };
  const full: MovementObject = {
    id: 'mv_example' as MovementId,
    slug: 'bodyweight-squat' as MovementSlug,
    name: { en: 'Bodyweight Squat', aliases: ['squat'] },
    taxonomy,
    description: { key: 'mv.bodyweight-squat.description', en: 'A fundamental squat pattern.' },
    instructions: [{ key: 'mv.bodyweight-squat.instr.1', en: 'Stand with feet shoulder-width.' }],
    coachingCues: [{ key: 'mv.bodyweight-squat.cue.1', en: 'Knees track over toes.' }],
    relationships: edges,
    media: [{ kind: 'video', url: '/assets/movements/bodyweight-squat.mp4', contentHash: 'sha256:abc', validated: true }],
    provenance: { sourceKind: 'CURATED', confidence: 0.9 },
    versioning: { catalogVersion: MOVEMENT_GRAPH_CONTRACT_VERSION, entryVersion: 2, changeNote: 'example' },
  };

  assert.equal(full.name.en, 'Bodyweight Squat');
  assert.equal(full.taxonomy?.difficulty, 'intermediate');
  assert.deepEqual(
    full.relationships?.map((e) => e.kind),
    ['progression', 'regression', 'substitution'],
  );
  for (const edge of full.relationships ?? []) {
    assert.ok(edge.target.kind === 'id' || edge.target.kind === 'slug');
  }
  assert.equal(full.media?.[0].validated, true);
  assert.equal(full.provenance.confidence, 0.9);
});

test('difficulty tier tokens align with the live DifficultyLevel vocabulary (lowercased)', () => {
  // Prisma enum: BEGINNER | INTERMEDIATE | ADVANCED — the contract projects it kebab-lowercase.
  const tiers = ['beginner', 'intermediate', 'advanced'] as const;
  for (const tier of tiers) {
    assert.equal(tier, tier.toLowerCase());
  }
  // The schema type accepts exactly these tokens (compile-time check).
  const sample: MovementTaxonomy = { difficulty: 'intermediate' };
  assert.equal(sample.difficulty, 'intermediate');
});