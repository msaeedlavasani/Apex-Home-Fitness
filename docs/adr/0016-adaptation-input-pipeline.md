# ADR-0016: Adaptation Input Pipeline

> **STATUS: ACCEPTED — 2026-09-03**
>
> **Decision owner:** Product/architecture owner
>
> **Evidence task:** `AL-03` (Adaptation input pipeline, delivered
> 2026-09-03; contract/schema:
> `docs/architecture/AL-03-ADAPTATION-INPUT-PIPELINE.md`; module:
> `src/lib/adaptive/`; invariants: `tests/adaptation-input.test.ts`;
> view in `docs/TASKS.md`)
>
> **Execution gating:** this ADR ratifies the adaptation-input schema and
> pipeline. It does NOT authorize the Adaptive Training Graph decision layer
> (AL-04 — `NOT_YET`, with its OWNER_DECISION_GATE on the decision
> algorithm), any persistence, any runtime wiring, or any UI. AL-04
> requires separate authorization.

## Context

The closed loop (`docs/product/PRODUCT-STRATEGY.md` §3) requires an
"Adaptation" stage that answers *"what is the appropriate training decision
for this person now?"* AL-01 delivered the per-session outcome contract and
AL-02 the accumulated per-user profile (observed facts + attributed
inference). Without a canonical **input boundary**, the future decision
layer (AL-04) would read raw profile/knowledge shapes ad hoc, making
decisions hard to test and audit. AL-03 fixes that boundary: a pure,
deterministic projection of (profile, movement knowledge, workout history)
into one decision-layer input schema.

## Decision

1. **Adopt the adaptation-input schema and pure pipeline** in
   `src/lib/adaptive/` (`ADAPTATION_INPUT_VERSION = 1`): the ONLY shape the
   AL-04 decision layer may consume, produced exclusively by the pure
   `buildAdaptationInput`.
2. **The pipeline is PURE and deterministic** — no side effects, no I/O;
   identical sources always produce identical input (test-pinned).
3. **Input is attributable**: inference (capability, adherence, movement
   trends) is copied from the AL-02 profile WITH its confidence/derivation;
   observed projections (activity, per-movement performance, recurring
   difficulties, equipment, preferences) are deterministic aggregates; every
   consulted outcome/observation is listed in `evidence`. Nothing is
   invented.
4. **Fail-closed edge handling**: a missing profile (anonymous user), empty
   history, or graph without relationships yields a valid, conservative
   input — absence means "insufficient data" (AL-02's not-a-medical-system
   boundary unchanged).
5. **Vocabulary is owned elsewhere**: movement refs (S-02), relationship
   kinds and constraint tokens (MG-02/MG-06), profile types (AL-02) — this
   module projects, never defines new vocabulary. Movement knowledge is
   consumed as the MG-06 `RelationshipNode` graph via a small pure adapter.
6. **This pipeline authorizes no decision-making** — AL-04 remains
   `NOT_YET` and gated on the decision-algorithm sign-off OWNER_DECISION_GATE.

## Consequences

- AL-04 imports `AdaptationInput` instead of improvising over raw profile
  and knowledge shapes; the decision layer becomes a pure function
  `AdaptationInput → decision`, which is testable and auditable.
- Existing profile/outcome/movement modules stay untouched; `src/lib/adaptive`
  is a one-way, type-only consumer of them.
- No migration or runtime wiring is implied or performed.
- A decision can always cite its input evidence; a conservative (empty)
  input never fabricates user state.

## Addendum (2026-09-03) — D4a additive session-intent extension

Per the AL-04 gate decision **D4a** (Owner, 2026-09-03), `AdaptationInput`
gains an optional, backward-compatible `sessionIntent` section (the user's
intended session: movements in order + planned sets, fail-closed validated
by `validateSessionIntent`), and `MovementPerformanceAggregate` gains an
optional `lastOutcomeId` for per-decision evidence fidelity. The "only shape
AL-04 may consume" invariant is preserved — the intent is part of
`AdaptationInput`. `ADAPTATION_INPUT_VERSION` stays 1 (additive).
Recorded in ADR-0017.

## Related

- `docs/architecture/AL-03-ADAPTATION-INPUT-PIPELINE.md` — the architecture/schema (this record's evidence)
- `docs/adr/0017-adaptive-training-graph-decision-layer.md` (AL-04 — D4a extension + decision layer)
- `docs/adr/0013-personal-movement-profile.md` (AL-02), `docs/adr/0012-workout-outcome-model.md` (AL-01)
- `docs/adr/0006-movement-graph-domain-contract.md` (MG-01/MG-06 graph)
- `docs/product/PRODUCT-STRATEGY.md` §3 (closed loop), §2C (Adaptive Training Graph)
