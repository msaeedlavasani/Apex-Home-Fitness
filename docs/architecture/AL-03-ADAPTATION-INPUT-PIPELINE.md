# AL-03 — Adaptation Input Pipeline

> **STATUS: DELIVERED / CLOSED — 2026-09-03**
>
> Module: `src/lib/adaptive/` (`types.ts` schema + `pipeline.ts` pure
> pipeline + `index.ts` entry); decision:
> [`adr/0016-adaptation-input-pipeline.md`](../adr/0016-adaptation-input-pipeline.md);
> invariants: `tests/adaptation-input.test.ts`. No DB migration, no schema
> change, no runtime wiring (`CODE_NO_DEPLOY`).

## 1. What this task delivers

The input side of the Adaptation stage (`PRODUCT-STRATEGY.md` §2C/§3) — the
canonical boundary between accumulated user/movement knowledge and the
future decision layer:

```text
Profile (AL-02) ─┐
Movement graph ──┼─→ buildAdaptationInput (pure) ─→ AdaptationInput ─→ AL-04 (NOT_YET)
Workout history ─┘
```

The pipeline deterministically projects (profile, movement knowledge,
workout history) into the well-typed `AdaptationInput` — the **only** shape
the AL-04 Adaptive Training Graph may consume. The pipeline itself makes no
decisions.

## 2. Input schema (highlights)

`AdaptationInput { version: 1, userId?, asOfDateKey, user, movementKnowledge,
history, constraints, evidence }`

| Section | Content | Origin |
|---|---|---|
| `user.capability` / `user.adherence` / `user.movementTrends` | attributed inference (tier/trend + `confidence` + `derivedBy`) | copied from `profile.inferred.*` — never a bare fact |
| `user.preferences` / `user.equipment` | declared preferences + equipment posture | `profile.observed.*` |
| `movementKnowledge` | movements with resolved MG-06 relationship edges (progression/regression/substitution) | MG-06 `RelationshipNode` graph (pure adapter) |
| `history.activity` | windowed observed aggregate (adherence basis) | `profileActivitySummary` over history |
| `history.performance` | per-movement aggregates: planned/completed sets, completion ratio, last date + difficulty | deterministic grouping of `observed.movementPerformance` |
| `history.recurringDifficulties` | distinct difficulty subjects in first-reported order | `observed.difficultyReports` |
| `constraints` | equipment available/missing, MG-02 constraint tokens, recurring-difficulty subjects | projections above |
| `evidence` | sorted, unique `outcomeId`/observation refs consulted | deterministic collection |

## 3. Pipeline rules (ADR-0016)

1. **Pure + deterministic** — no side effects; identical sources → identical
   input (pinned by tests).
2. **Attributable** — inference keeps its confidence/derivation; everything
   consulted is listed in `evidence`.
3. **Fail-closed edges** — missing profile (anonymous), empty history, empty
   graph all produce valid, conservative input; absence = insufficient
   data, never an invented value.
4. **Vocabulary owned elsewhere** — S-02 movement refs, MG-02 constraint
   tokens, MG-06 relationship kinds, AL-01/AL-02 types are imported
   type-only; nothing is invented here.
5. **No decision-making** — AL-04 remains `NOT_YET` with its OWNER_DECISION_GATE
   (decision-algorithm sign-off).

## 4. Pure helpers (deterministic, exported for reuse/testing)

- `buildAdaptationInput(source)` — the canonical pipeline entry.
- `movementKnowledgeFromGraph(graph)` — MG-06 `RelationshipNode[]` →
  `MovementKnowledgeEntry[]` (edges resolved to slug/id targets).
- `aggregateMovementPerformance(rows)` — per-movement totals/ratio/newest
  fields; subject-key sort for determinism; divide-by-zero guard.
- `recurringDifficultySubjects(reports)` — dedupe + first-seen order.

## 5. Acceptance

- [x] pipeline produces a well-typed adaptation input from (profile,
      movement knowledge, workout history);
- [x] module is pure (no side effects — no imports beyond pure type-only
      consumers);
- [x] unit tests cover the happy path and edge cases (empty history,
      missing profile, empty graph) — 8 tests, `tests/adaptation-input.test.ts`;
- [x] typecheck + lint pass; additive (no existing type changed); no runtime
      wiring.

## 6. Related

- `docs/adr/0016-adaptation-input-pipeline.md` — decision record
- `src/lib/profile` (AL-02), `src/lib/outcomes` (AL-01), `src/lib/movement` (MG-01…MG-08)
- `docs/TASKS.md` — AL-03 queue entry (DELIVERED / CLOSED; AL-04 NOT_YET)
