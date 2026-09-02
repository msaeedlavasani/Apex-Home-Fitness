/**
 * MG-06 — Relationship model (progression / regression / substitution).
 *
 * Implements the strategy §2 relationship model: typed edges between movement
 * knowledge objects that enable the Adaptive Training Graph and Companion to
 * make CONTEXTUAL progression/regression/substitution decisions later.
 *
 * Edge kinds (MG-01 contract, validated here):
 *   - `progression`  — harder variants / next steps;
 *   - `regression`   — easier variants / entry points;
 *   - `substitution` — functionally similar movements (equipment, impact, or
 *     constraint driven), usable in place of each other.
 *
 * Validation is FAIL-CLOSED and deterministic:
 *   - INVALID_KIND      — edge kind outside {progression, regression,
 *                         substitution};
 *   - SELF_LOOP         — edge targets its own movement;
 *   - DANGLING_TARGET   — edge target does not resolve to any movement in the
 *                         validated graph (never assumed/guessed);
 *   - DUPLICATE_EDGE    — the same (kind, target) declared twice from one
 *                         source;
 *   - DIFFICULTY_CYCLE  — a cycle in the collapsed progression/regression
 *                         (difficulty) relation. Mirrored inverse pairs
 *                         (A progression→B + B regression→A) are the SAME
 *                         semantic edge declared from both ends and are NOT a
 *                         cycle; real cycles (A→B→C→A) are rejected — an
 *                         adaptive graph must never loop;
 *   - SUBSTITUTION_CYCLE — a cycle in the substitution (equivalence) relation
 *                         (A↔B↔C↔A). Substitution is symmetric: both-direction
 *                         declaration collapses to one edge and is fine.
 *
 * This module is PURE (no Prisma/DB/React/network) and deterministic (all
 * traversal order is sorted). Nothing in application code imports it yet —
 * no runtime behavior change.
 */

import {
  type MovementId,
  type MovementRelationshipEdge,
  type MovementRelationshipKind,
  type MovementSlug,
} from './types';

/** The closed set of relationship kinds (strategy §2). */
export const RELATIONSHIP_KINDS: readonly MovementRelationshipKind[] = [
  'progression',
  'regression',
  'substitution',
] as const;

/** Runtime guard for the closed kind set. */
export function isRelationshipKind(value: unknown): value is MovementRelationshipKind {
  return RELATIONSHIP_KINDS.includes(value as MovementRelationshipKind);
}

/** One node of the relationship graph (a movement knowledge object). */
export interface RelationshipNode {
  slug: MovementSlug;
  /** Durable id, when known (lets id-kind edge targets resolve). */
  id?: MovementId;
  relationships?: readonly MovementRelationshipEdge[];
}

export type RelationshipProblemKind =
  | 'INVALID_KIND'
  | 'SELF_LOOP'
  | 'DANGLING_TARGET'
  | 'DUPLICATE_EDGE'
  | 'DIFFICULTY_CYCLE'
  | 'SUBSTITUTION_CYCLE';

export interface RelationshipProblem {
  kind: RelationshipProblemKind;
  /** The source movement slug the problem was found on. */
  source: string;
  /** The offending edge target when applicable. */
  target?: string;
  detail?: string;
}

/** Resolves an edge target (id or slug) to a node, or undefined when unknown. */
function resolveTarget(
  edge: MovementRelationshipEdge,
  bySlug: Map<string, RelationshipNode>,
  byId: Map<string, RelationshipNode>,
): RelationshipNode | undefined {
  if (edge.target.kind === 'slug') return bySlug.get(edge.target.slug);
  return byId.get(edge.target.id);
}

export interface RelationshipValidation {
  status: 'PASS' | 'FAIL';
  problems: RelationshipProblem[];
}

/**
 * Fail-closed validation of a relationship graph (no cycles, no dangling
 * references, no self-loops, no duplicates, closed kinds). Deterministic:
 * edges are examined in declaration order; cycle detection consumes a sorted
 * edge list, so identical graphs always produce identical results.
 */
export function validateRelationshipGraph(
  graph: readonly RelationshipNode[],
): RelationshipValidation {
  const problems: RelationshipProblem[] = [];
  const bySlug = new Map<string, RelationshipNode>();
  const byId = new Map<string, RelationshipNode>();
  for (const node of graph) {
    bySlug.set(String(node.slug), node);
    if (node.id) byId.set(String(node.id), node);
  }

  // --- per-edge checks -------------------------------------------------------
  const seen = new Set<string>();
  for (const node of graph) {
    const sourceSlug = String(node.slug);
    for (const edge of node.relationships ?? []) {
      if (!isRelationshipKind(edge.kind)) {
        problems.push({
          kind: 'INVALID_KIND',
          source: sourceSlug,
          detail: `unknown relationship kind: ${JSON.stringify(edge.kind)}`,
        });
        continue;
      }
      const target = resolveTarget(edge, bySlug, byId);
      if (!target) {
        problems.push({
          kind: 'DANGLING_TARGET',
          source: sourceSlug,
          target: edge.target.kind === 'slug' ? String(edge.target.slug) : String(edge.target.id),
        });
        continue;
      }
      const targetSlug = String(target.slug);
      if (targetSlug === sourceSlug) {
        problems.push({ kind: 'SELF_LOOP', source: sourceSlug, target: targetSlug });
        continue;
      }
      const dedupeKey = `${sourceSlug}|${edge.kind}|${targetSlug}`;
      if (seen.has(dedupeKey)) {
        problems.push({
          kind: 'DUPLICATE_EDGE',
          source: sourceSlug,
          target: targetSlug,
          detail: `duplicate ${edge.kind} edge`,
        });
        continue;
      }
      seen.add(dedupeKey);
    }
  }

  // --- cycle detection -------------------------------------------------------
  // Difficulty relation: collapse progression + regression to unordered
  // pairs (a mirrored inverse pair declares the same semantic difficulty
  // edge from both ends → one pair, NOT a cycle).
  const difficultyPairs = new Set<string>();
  // Substitution relation: symmetric equivalence, also collapsed.
  const substitutionPairs = new Set<string>();
  for (const node of graph) {
    const sourceSlug = String(node.slug);
    for (const edge of node.relationships ?? []) {
      if (!isRelationshipKind(edge.kind)) continue;
      const target = resolveTarget(edge, bySlug, byId);
      if (!target || String(target.slug) === sourceSlug) continue;
      const a = sourceSlug < String(target.slug) ? sourceSlug : String(target.slug);
      const b = sourceSlug < String(target.slug) ? String(target.slug) : sourceSlug;
      const key = `${a}|${b}`;
      if (edge.kind === 'substitution') substitutionPairs.add(key);
      else difficultyPairs.add(key);
    }
  }

  for (const cycleKind of ['DIFFICULTY_CYCLE', 'SUBSTITUTION_CYCLE'] as const) {
    const pairs = cycleKind === 'DIFFICULTY_CYCLE' ? difficultyPairs : substitutionPairs;
    const sortedPairs = [...pairs].sort();
    const parent = new Map<string, string>();
    const find = (x: string): string => {
      let root = x;
      while (parent.has(root) && parent.get(root) !== root) root = parent.get(root)!;
      // path compression
      let cur = x;
      while (parent.has(cur) && parent.get(cur) !== root) {
        const next = parent.get(cur)!;
        parent.set(cur, root);
        cur = next;
      }
      return root;
    };
    for (const key of sortedPairs) {
      const [a, b] = key.split('|');
      const ra = find(a);
      const rb = find(b);
      if (ra === rb) {
        // The pair connects two nodes already joined — an undirected cycle.
        problems.push({ kind: cycleKind, source: a, target: b });
      } else {
        if (!parent.has(ra)) parent.set(ra, ra);
        parent.set(rb, ra);
      }
    }
  }

  return { status: problems.length === 0 ? 'PASS' : 'FAIL', problems };
}

/** Convenience predicate: does the graph validate cleanly? */
export function isRelationshipGraphValid(graph: readonly RelationshipNode[]): boolean {
  return validateRelationshipGraph(graph).status === 'PASS';
}

// ---------------------------------------------------------------------------
// Expressibility — the existing canonical catalog expresses all three kinds
// ---------------------------------------------------------------------------

/**
 * Curation note (MG-06): these are DEMONSTRATION draft edges over REAL
 * S-06 canonical catalog movements (src/lib/exercise/catalog.ts), proving the
 * expressibility acceptance criterion — one example of each relationship
 * type. They are explicitly NOT canonical relationship knowledge yet:
 * canonical edge establishment is an MG-08 (catalog reconciliation) concern.
 * No movement outside the existing canonical catalog is referenced.
 */
export interface RelationshipExemplars {
  progression: MovementRelationshipEdge;
  regression: MovementRelationshipEdge;
  substitution: MovementRelationshipEdge;
}

/** The three exemplar edges used by the expressibility proof + tests. */
export function catalogRelationshipExemplars(): RelationshipExemplars {
  return {
    // Harder variant: pistol squat is the single-leg progression of the squat
    // pattern (seed catalog: 'Pistol Squat', rules catalog: 'Bodyweight Squat').
    progression: {
      kind: 'progression',
      target: { kind: 'slug', slug: 'pistol-squat' as MovementSlug },
      note: 'single-leg progression of the bodyweight squat pattern',
    },
    // Easier variant / entry point: incline push-up lowers the load vs a
    // standard push-up (rules catalog 'Incline Push-Up' → seed 'Push-Up').
    regression: {
      kind: 'regression',
      target: { kind: 'slug', slug: 'incline-push-up' as MovementSlug },
      note: 'elevated hands reduce load versus the standard push-up',
    },
    // Equipment-driven substitution: with no bar available, band pull-aparts
    // substitute for the pull-up's upper-back pulling work (rules catalog).
    substitution: {
      kind: 'substitution',
      target: { kind: 'slug', slug: 'banded-pull-apart' as MovementSlug },
      note: 'equipment-driven alternative when no pull-up bar is available',
    },
  };
}

/**
 * Builds the expressibility demo graph: the three draft movements that anchor
 * the exemplar edges PLUS their targets, each with its own outgoing edge,
 * so the whole demo graph validates cleanly (mirrored inverse pairs included).
 * Deterministic; returns a fresh array on each call.
 */
export function buildRelationshipDemoGraph(): RelationshipNode[] {
  const ex = catalogRelationshipExemplars();
  const slug = (s: string) => s as MovementSlug;
  return [
    {
      slug: slug('bodyweight-squat'),
      relationships: [ex.progression],
    },
    {
      slug: slug('pistol-squat'),
      relationships: [
        // mirrored regression back from the harder variant (same semantic edge)
        { kind: 'regression', target: { kind: 'slug', slug: 'bodyweight-squat' as MovementSlug } },
      ],
    },
    {
      slug: slug('push-up'),
      relationships: [ex.regression],
    },
    {
      slug: slug('incline-push-up'),
      relationships: [
        // mirrored progression back from the easier variant (same semantic edge)
        { kind: 'progression', target: { kind: 'slug', slug: 'push-up' as MovementSlug } },
      ],
    },
    {
      slug: slug('pull-up'),
      relationships: [ex.substitution],
    },
    {
      slug: slug('banded-pull-apart'),
      relationships: [
        // substitution is symmetric — both-direction declaration is one edge
        { kind: 'substitution', target: { kind: 'slug', slug: 'pull-up' as MovementSlug } },
      ],
    },
  ];
}