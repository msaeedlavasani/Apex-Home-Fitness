/**
 * MG-06 — Relationship model tests.
 *
 * Proves:
 *   - all three relationship kinds are modeled (progression / regression /
 *     substitution) with a closed runtime set + guard;
 *   - the demo graph over REAL canonical catalog slugs validates cleanly and
 *     expresses at least one edge of each kind (expressibility acceptance);
 *   - fail-closed validation rejects invalid kinds, self-loops, dangling
 *     targets, duplicate edges, difficulty cycles, and substitution cycles;
 *   - mirrored inverse pairs (A progression→B + B regression→A) are one
 *     semantic edge — NOT a cycle;
 *   - validation is deterministic (same graph ⇒ same result).
 */

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { CANONICAL_CATALOG, resolveWithAmbiguity } from '../src/lib/exercise/index';
import {
  RELATIONSHIP_KINDS,
  buildRelationshipDemoGraph,
  catalogRelationshipExemplars,
  isRelationshipGraphValid,
  isRelationshipKind,
  validateRelationshipGraph,
  type RelationshipNode,
} from '../src/lib/movement/index';
import type { ExerciseSlug } from '../src/lib/exercise/contracts';
import type { MovementRelationshipKind, MovementSlug } from '../src/lib/movement/types';

const slug = (s: string): MovementSlug => s as MovementSlug;
const exerciseSlug = (s: string): ExerciseSlug => s as ExerciseSlug;

describe('MG-06 relationship kinds', () => {
  it('models all three relationship types (strategy §2)', () => {
    assert.deepEqual(RELATIONSHIP_KINDS, ['progression', 'regression', 'substitution']);
  });

  it('isRelationshipKind guards the closed set', () => {
    assert.equal(isRelationshipKind('progression'), true);
    assert.equal(isRelationshipKind('regression'), true);
    assert.equal(isRelationshipKind('substitution'), true);
    assert.equal(isRelationshipKind('related'), false);
    assert.equal(isRelationshipKind(undefined), false);
  });

  it('exemplars cover all three kinds', () => {
    const ex = catalogRelationshipExemplars();
    assert.equal(ex.progression.kind, 'progression');
    assert.equal(ex.regression.kind, 'regression');
    assert.equal(ex.substitution.kind, 'substitution');
  });
});

describe('MG-06 expressibility over the canonical catalog', () => {
  it('every demo-graph slug resolves against the canonical catalog', () => {
    const ex = catalogRelationshipExemplars();
    const targets = [
      (ex.progression.target as { slug: string }).slug,
      (ex.regression.target as { slug: string }).slug,
      (ex.substitution.target as { slug: string }).slug,
      'bodyweight-squat',
      'pistol-squat',
      'push-up',
      'incline-push-up',
      'pull-up',
      'banded-pull-apart',
    ];
    for (const s of targets) {
      const result = resolveWithAmbiguity({ kind: 'slug', slug: exerciseSlug(s) }, CANONICAL_CATALOG);
      assert.equal(result.status, 'RESOLVED', `slug ${s} must resolve in the canonical catalog`);
    }
  });

  it('the demo graph expresses at least one edge of each kind and validates PASS', () => {
    const graph = buildRelationshipDemoGraph();
    const kinds = new Set<MovementRelationshipKind>();
    for (const node of graph) {
      for (const edge of node.relationships ?? []) kinds.add(edge.kind);
    }
    assert.deepEqual(
      [...kinds].sort(),
      ['progression', 'regression', 'substitution'],
      'demo graph must express every relationship kind',
    );
    const v = validateRelationshipGraph(graph);
    assert.equal(v.status, 'PASS', `demo graph must validate cleanly: ${JSON.stringify(v.problems)}`);
    assert.equal(v.problems.length, 0);
  });
});

describe('MG-06 fail-closed validation', () => {
  const node = (over: Partial<RelationshipNode>): RelationshipNode => ({
    slug: slug('push-up'),
    ...over,
  });

  it('empty / relationship-free graphs PASS', () => {
    assert.equal(isRelationshipGraphValid([]), true);
    assert.equal(isRelationshipGraphValid([{ slug: slug('push-up') }]), true);
  });

  it('rejects an invalid relationship kind', () => {
    const graph = [
      node({ relationships: [{ kind: 'follows' as MovementRelationshipKind, target: { kind: 'slug', slug: slug('plank-hold') } }] }),
    ];
    const v = validateRelationshipGraph(graph);
    assert.equal(v.status, 'FAIL');
    assert.equal(v.problems[0].kind, 'INVALID_KIND');
  });

  it('rejects a self-loop', () => {
    const graph = [
      node({ relationships: [{ kind: 'progression', target: { kind: 'slug', slug: slug('push-up') } }] }),
    ];
    const v = validateRelationshipGraph(graph);
    assert.equal(v.status, 'FAIL');
    assert.equal(v.problems[0].kind, 'SELF_LOOP');
  });

  it('rejects a dangling target (unknown slug)', () => {
    const graph = [
      node({ relationships: [{ kind: 'progression', target: { kind: 'slug', slug: slug('zero-g-movement-3000') } }] }),
    ];
    const v = validateRelationshipGraph(graph);
    assert.equal(v.status, 'FAIL');
    assert.equal(v.problems[0].kind, 'DANGLING_TARGET');
    assert.equal(v.problems[0].target, 'zero-g-movement-3000');
  });

  it('rejects a duplicate (kind, target) edge from one source', () => {
    const graph = [
      node({
        relationships: [
          { kind: 'progression', target: { kind: 'slug', slug: slug('plank-hold') } },
          { kind: 'progression', target: { kind: 'slug', slug: slug('plank-hold') } },
        ],
      }),
      { slug: slug('plank-hold') },
    ];
    const v = validateRelationshipGraph(graph);
    assert.equal(v.status, 'FAIL');
    assert.equal(v.problems[0].kind, 'DUPLICATE_EDGE');
  });

  it('rejects a difficulty cycle (progression triangle)', () => {
    const graph: RelationshipNode[] = [
      { slug: slug('a'), relationships: [{ kind: 'progression', target: { kind: 'slug', slug: slug('b') } }] },
      { slug: slug('b'), relationships: [{ kind: 'progression', target: { kind: 'slug', slug: slug('c') } }] },
      { slug: slug('c'), relationships: [{ kind: 'progression', target: { kind: 'slug', slug: slug('a') } }] },
    ];
    const v = validateRelationshipGraph(graph);
    assert.equal(v.status, 'FAIL');
    assert.ok(v.problems.some((p) => p.kind === 'DIFFICULTY_CYCLE'));
  });

  it('rejects a substitution cycle', () => {
    const graph: RelationshipNode[] = [
      { slug: slug('a'), relationships: [{ kind: 'substitution', target: { kind: 'slug', slug: slug('b') } }] },
      { slug: slug('b'), relationships: [{ kind: 'substitution', target: { kind: 'slug', slug: slug('c') } }] },
      { slug: slug('c'), relationships: [{ kind: 'substitution', target: { kind: 'slug', slug: slug('a') } }] },
    ];
    const v = validateRelationshipGraph(graph);
    assert.equal(v.status, 'FAIL');
    assert.ok(v.problems.some((p) => p.kind === 'SUBSTITUTION_CYCLE'));
  });

  it('mirrored inverse pair is one semantic edge — NOT a cycle', () => {
    const graph: RelationshipNode[] = [
      { slug: slug('bodyweight-squat'), relationships: [{ kind: 'progression', target: { kind: 'slug', slug: slug('pistol-squat') } }] },
      { slug: slug('pistol-squat'), relationships: [{ kind: 'regression', target: { kind: 'slug', slug: slug('bodyweight-squat') } }] },
    ];
    const v = validateRelationshipGraph(graph);
    assert.equal(v.status, 'PASS', `mirrored pair must PASS: ${JSON.stringify(v.problems)}`);
  });

  it('validation is deterministic: identical graphs give identical results', () => {
    const graph: RelationshipNode[] = [
      { slug: slug('a'), relationships: [{ kind: 'substitution', target: { kind: 'slug', slug: slug('b') } }] },
      { slug: slug('b'), relationships: [{ kind: 'substitution', target: { kind: 'slug', slug: slug('a') } }] },
    ];
    const a = validateRelationshipGraph(graph);
    const b = validateRelationshipGraph(graph);
    assert.deepEqual(b, a);
  });
});