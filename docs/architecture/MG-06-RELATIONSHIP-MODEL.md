# MG-06 — Relationship Model (Progression / Regression / Substitution)

- **Task:** MG-06 — P0 — `CODE_NO_DEPLOY` (no Production/DB/UI change)
- **Status:** ACTIVE 2026-09-01 (DELIVERED on merge)
- **Dependencies:** MG-05 (normalized catalog) — builds on MG-01 contract types (`MovementRelationshipEdge`, `MovementRelationshipKind`) and the MG-02 taxonomy vocabulary
- **Architecture gate:** `NONE` (per `docs/TASKS.md` MG-06 row — design record is this document, no ADR)
- **DB sensitivity:** `DATA` (relationship edges) — edges are modeled and validated in code; **no DB writes in this task**

## 1. Scope

Implements the strategy §2 relationship model
([`product/MOVEMENT-INTELLIGENCE-STRATEGY.md`](../product/MOVEMENT-INTELLIGENCE-STRATEGY.md))
as a pure, deterministic module (`src/lib/movement/relationships.ts`):

- typed edges — `progression` (harder variants), `regression` (easier
  variants), `substitution` (functionally similar, equipment/impact/
  constraint driven);
- fail-closed structural validation — no cycles, no dangling references,
  no self-loops, no duplicate edges, closed kind set;
- expressibility proof — the existing canonical catalog expresses at least
  one example of each relationship type.

These edges are what enable the Adaptive Training Graph and Companion to make
**contextual** progression/regression/substitution decisions later (future
backlog tasks AL/CP families) — this task only models and validates them.

## 2. Design

### 2.1 Edge kinds (closed set)

| Kind | Semantics | Example (real canonical catalog) |
|---|---|---|
| `progression` | harder variant / next step | `Bodyweight Squat` → `Pistol Squat` (single-leg progression) |
| `regression` | easier variant / entry point | `Push-Up` → `Incline Push-Up` (elevated hands reduce load) |
| `substitution` | functionally similar, equipment/impact/constraint driven | `Pull-Up` → `Banded Pull-Apart` (no bar available) |

`RELATIONSHIP_KINDS` is the closed runtime set with the `isRelationshipKind`
guard. Edges carry the MG-01 shape: `{ kind, target: MovementReference
(id|slug), note? }`.

### 2.2 Fail-closed validation

`validateRelationshipGraph(graph)` checks every edge and the graph structure:

| Problem | Rule |
|---|---|
| `INVALID_KIND` | kind outside the closed set |
| `DANGLING_TARGET` | target does not resolve to any movement in the validated graph — never assumed |
| `SELF_LOOP` | edge targets its own source |
| `DUPLICATE_EDGE` | same `(kind, target)` declared twice from one source |
| `DIFFICULTY_CYCLE` | cycle in the collapsed progression/regression relation |
| `SUBSTITUTION_CYCLE` | cycle in the collapsed substitution relation |

Cycle semantics (deterministic, union-find over sorted edge pairs):

- **Mirrored inverse pairs are ONE semantic edge.** `A progression→B` +
  `B regression→A` declare the same difficulty relationship from both ends
  (the natural, expected double-declaration in a catalog) — collapsed to one
  pair, never reported as a cycle. Same for symmetric both-direction
  substitution edges.
- **Real cycles are rejected.** `A→B→C→A` (any direction among
  progression/regression) would make an adaptive graph loop forever; a
  substitution triangle is redundant equivalence. Both fail validation.
- Self-loops are caught by the per-edge pass before cycle detection.

Validation is deterministic: identical graphs produce identical results
(sorted pair consumption, no randomness).

### 2.3 Expressibility exemplars

`catalogRelationshipExemplars()` returns the three curated demo edges and
`buildRelationshipDemoGraph()` a six-node demo graph (`bodyweight-squat`,
`pistol-squat`, `push-up`, `incline-push-up`, `pull-up`, `banded-pull-apart`)
with mirrored inverse edges, which validates **PASS**.

**Curation note:** these are DEMONSTRATION draft edges over real S-06
canonical movements proving the expressibility acceptance criterion. They are
explicitly NOT canonical relationship knowledge — canonical edge
establishment is an MG-08 (catalog reconciliation) concern, and no movement
outside the canonical catalog is referenced.

## 3. Acceptance criteria — evidence

- All three relationship types modeled — `RELATIONSHIP_KINDS` + exemplars.
- Validation rejects cycles (difficulty + substitution) and dangling refs —
  14 unit tests, incl. self-loop, duplicate edge, invalid kind, mirrored-pair
  PASS, and determinism.
- Expressibility — every demo-graph slug resolves in `CANONICAL_CATALOG`
  (resolver-verified) and the demo graph carries one edge of each kind.
- No Production/DB/UI change; no deployment. `RUNTIME_BEHAVIOR_CHANGED = NO`
  (nothing in application code imports this module yet).

## 4. Open items (unchanged by MG-06)

- `Side-Lying Leg Lift` ambiguity remains **unresolved** (MG-08 scope).
- Canonical relationship establishment across the full catalog is MG-08
  scope; this task proves expressibility + validation only.