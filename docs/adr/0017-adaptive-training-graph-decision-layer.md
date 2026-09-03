# ADR-0017: Adaptive Training Graph — v1 Decision Layer

> **STATUS: ACCEPTED — 2026-09-03**
>
> **Decision owner:** Product/architecture owner
>
> **Evidence task:** `AL-04` (Adaptive Training Graph decision layer,
> delivered 2026-09-03; gate document:
> `docs/architecture/AL-04-DECISION-GATE.md`; architecture:
> `docs/architecture/AL-04-ADAPTIVE-TRAINING-GRAPH.md`; module:
> `src/lib/adaptive/decisions.ts`; invariants:
> `tests/adaptive-decisions.test.ts`; view in `docs/TASKS.md`)
>
> **Owner decision (2026-09-03):** the four AL-04 gate decisions were
> answered **D1a D2a D3a D4a**: v1 scope = adjust-over-intent; apply
> posture = auto-apply safety-lowering only; rule-table defaults adopted as
> the sign-off baseline; session-intent input = additive AL-03
> `AdaptationInput` extension. This ADR ratifies the resulting decision
> layer. It does NOT authorize persistence, runtime wiring, UI, or any
> Companion integration (those remain separate, gated tasks).

## Context

The closed loop (`docs/product/PRODUCT-STRATEGY.md` §2C/§3) requires the
Adaptive Training Graph to answer *"what is the appropriate training
decision for this person now?"*. AL-01/02/03 delivered the outcome record,
the personal movement profile, and the canonical decision-layer input
(`AdaptationInput`). The decision algorithm itself remained `NOT_YET` with
an `OWNER_DECISION_GATE` (decision-algorithm sign-off). The gate
(`docs/architecture/AL-04-DECISION-GATE.md`) proposed the smallest safe v1
model; the Owner accepted all four recommendations.

## Decision

1. **Adopt the v1 decision layer** in `src/lib/adaptive/decisions.ts`
   (`ADAPTIVE_DECISION_VERSION = 1`): a pure function
   `AdaptationInput → AdaptiveDecisionOutput`. Hierarchy: **L0 safety
   gates → L1 session frame → L2 per-movement decision → L3 sets deltas**.
   Sequencing (L4) and catalog-wide exercise selection are deferred.
2. **L2 vocabulary** is `KEEP | PROGRESS | REGRESS | SUBSTITUTE | EXCLUDE`,
   driven by the signed-off difficulty-feeling rule table over MG-06 edges —
   exactly **one edge step per movement per session** (never a chain).
3. **L0 gates are non-negotiable** and can only hold/lower/substitute/
   exclude: no-graph-knowledge ⇒ no adjustment (G-FEAS); recurring
   difficulty forces REGRESS → SUBSTITUTE → EXCLUDE (G-CONSTRAINT,
   auto-applied, non-diagnostic flag); recovery/return-to-training frame
   suppresses progression and lowers volume (G-RECOV); the proposed total is
   clamped to the capability volume cap (G-VOLCAP).
4. **D2a apply posture**: `AUTO` only for safety-lowering decisions
   (regression/substitution/exclusion, negative sets deltas); `ADVISORY`
   for load raises (progression, positive deltas). The module never applies
   anything itself — it renders the plan decision document for the caller.
5. **Zero inference inside AL-04**: attributed profile inference
   (capability/adherence/trends) is consumed as opaque input with its
   confidence relayed; no statistics are computed, no models are fit, no
   LLM is invoked. Determinism is absolute (intent order preserved, edge
   order sorted, flags sorted).
6. **D3a policy defaults** live in ONE auditable knob module
   (`DECISION_POLICY`): freshness window 21d, recovery inactivity 14d,
   completion baseline 0.7, progression threshold 0.9, trend confidence
   threshold 0.5, capability volume caps (beginner 16 / intermediate 20 /
   advanced 24 / unknown 16), max delta +1 per movement and per session.
7. **D4a additive input extension**: `AdaptationInput` gains an optional,
   backward-compatible `sessionIntent` section (movements in intended order
   with planned sets; validated fail-closed by `validateSessionIntent`).
   The ADR-0016 "only shape AL-04 may consume" invariant is preserved — the
   intent is part of `AdaptationInput`. `MovementPerformanceAggregate`
   additionally carries `lastOutcomeId` for per-decision evidence fidelity.
8. **Insufficient-data posture**: no session intent, no capability AND no
   adherence, or no performance for any intended movement ⇒ basis
   `INSUFFICIENT_DATA`, conservative all-`KEEP` baseline, zero deltas, each
   rationale naming exactly what is missing. Absence is never a signal.
9. **Explainability**: every decision carries `ruleId`, `evidenceRefs`,
   `confidence` (deterministic applicability strength, never a
   probability), and a fixed EN template `humanText` (no free text, no
   invented Persian — contract rule).
10. **Not medical, not policing**: constraint/regression/deload behavior is
    conservative load management; flags are non-diagnostic; load raises are
    advisory.

## Consequences

- The decision layer is a pure, unit-testable, auditable function over the
  governed input boundary — 30 invariants pinned in
  `tests/adaptive-decisions.test.ts`.
- Companion guidance (CP-01/02+) can render `AdaptiveDecisionOutput`
  without further interpretation; safety-lowering decisions are already
  flagged `AUTO`, load raises `ADVISORY`.
- No persistence, no runtime wiring, no UI, no Production change; the
  application still does not import `src/lib/adaptive` (pure contract
  stage).
- Input-coverage gaps recorded in the gate (§0) remain: movement metadata
  (difficulty/equipment/patterns) and asymmetry/form-risk severities are not
  yet projected — catalog exercise selection and structural equipment
  verification are future, separately-gated extensions.

## Related

- `docs/architecture/AL-04-DECISION-GATE.md` — the gate (Owner decision D1a–D4a, alternatives R1–R5)
- `docs/architecture/AL-04-ADAPTIVE-TRAINING-GRAPH.md` — architecture (this record's evidence)
- `docs/adr/0016-adaptation-input-pipeline.md` (AL-03 input boundary; addendum for the D4a extension)
- `docs/adr/0012-workout-outcome-model.md` (AL-01), `docs/adr/0013-personal-movement-profile.md` (AL-02)
- `docs/architecture/MG-06-RELATIONSHIP-MODEL.md` (relationship edges the rules walk)
- `docs/product/PRODUCT-STRATEGY.md` §2C (Adaptive Training Graph), §2D (Companion)