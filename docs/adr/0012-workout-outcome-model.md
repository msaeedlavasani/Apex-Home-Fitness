# ADR-0012: Workout Outcome / Feedback Model

> **STATUS: ACCEPTED — 2026-09-03**
>
> **Decision owner:** Product/architecture owner
>
> **Evidence task:** `AL-01` (Workout outcome / feedback model, delivered
> 2026-09-03; contract: `docs/architecture/AL-01-WORKOUT-OUTCOME-MODEL.md`;
> module: `src/lib/outcomes/types.ts` + `index.ts`; invariants:
> `tests/outcome-contract.test.ts`; view in `docs/TASKS.md`)
>
> **Execution gating:** this ADR ratifies the type-level outcome contract. It
> does NOT authorize the Personal Movement Profile contract (AL-02), the
> adaptation input pipeline (AL-03), the Adaptive Training Graph decision
> layer (AL-04), any persistence/migration change, any recorder, or any UI.
> Each of those requires its own task authorization.

## Context

The persisted product strategy
(`docs/product/PRODUCT-STRATEGY.md` §3) describes the learning loop
`User ↔ Movement ↔ Workout ↔ Observation / Performance ↔ Outcome / Feedback
↔ Adaptation`. The candidate moat is the accumulating closed-loop knowledge
of how an individual moves, responds to progression/regression, and reacts
to substitutions. Today the app records workout *state* (S-04
`WorkoutStateRecord` snapshots and the `exerciseLogs` set-outbox), but there
is no canonical shape for the post-session **outcome** — completion,
per-exercise performance, subjective difficulty, and context — that later
profile/adaptation stages can consume deterministically.

## Decision

1. **Adopt the workout-outcome contract as the canonical type-level model**
   for recorded session outcomes, in `src/lib/outcomes/` (public surface
   `src/lib/outcomes/index.ts`), with `OUTCOME_CONTRACT_VERSION = 1`.
2. **The contract is PURE** — no Prisma, React, Dexie, services,
   environment, or runtime side effects; nothing in application code imports
   it yet (no runtime behavior change).
3. **The contract is additive by law**: it references the S-04 session
   contract and the S-02 canonical exercise identity but modifies no
   existing session/persistence type, and it implies no migration.
4. **Completion and subjective ratings are closed vocabularies** with
   runtime guards; display text is EN-only until a real FA corpus exists (no
   invented Persian). Equipment-constraint tokens are imported as a TYPE
   from the MG-02 movement taxonomy — this module never invents vocabulary.
5. **Outcome capture is fail-closed**: the deterministic
   `validateOutcomeRecord` refuses malformed/inconsistent records
   (counts, indices, ratings, timestamps, keys) and never repairs or
   guesses — the S02-E identity lesson applied to outcome data.
6. **Recording is offline-first at session end** (per-device, synced later,
   mirroring the existing `exerciseLogs` pattern); the pure
   `outcomeBaseFromSummary` adapter over the S-04 `SessionSummary` is part
   of this delivery, the recorder/UI/persistence are not.

## Consequences

- AL-02 (profile) and the adaptation family (AL-03/AL-04) import the outcome
  contract instead of inventing parallel session-record shapes.
- Existing session/persistence modules stay untouched; the outcome module is
  a one-way, type-only consumer of the S-04 contract and the exercise /
  movement identity types.
- No migration is implied or performed; when persistence is eventually
  authorized it must be an additive table lifecycle consistent with the
  governed-migration discipline.
- A malformed outcome can never enter the learning loop; an unanswered
  feedback prompt yields an outcome without feedback, never a fabricated one.

## Related

- `docs/architecture/AL-01-WORKOUT-OUTCOME-MODEL.md` — field-by-field contract + recording pipeline design
- `src/lib/workout/sessionContracts.ts` — S-04 session contract (input boundary)
- `docs/product/PRODUCT-STRATEGY.md` — §3 (closed loop), §4 (candidate moat)
- `docs/adr/0006-movement-graph-domain-contract.md` — the P0 contract precedent this model mirrors
