# ADR-0013: Personal Movement Profile Data Contract

> **STATUS: ACCEPTED — 2026-09-03**
>
> **Decision owner:** Product/architecture owner
>
> **Evidence task:** `AL-02` (Personal Movement Profile data contract,
> delivered 2026-09-03; contract:
> `docs/architecture/AL-02-PERSONAL-MOVEMENT-PROFILE.md`; module:
> `src/lib/profile/types.ts` + `index.ts`; invariants:
> `tests/profile-contract.test.ts`; view in `docs/TASKS.md`)
>
> **Execution gating:** this ADR ratifies the type-level profile contract. It
> does NOT authorize the adaptation input pipeline (AL-03), the Adaptive
> Training Graph decision layer (AL-04), any profile persistence/migration,
> any profile update pipeline implementation, any inference model, or any UI.
> Each of those requires its own task authorization.

## Context

The strategy (`docs/product/PRODUCT-STRATEGY.md` §2B) requires Apex to
progressively understand how each user trains and moves — capability,
training history, movement performance, progression, recurring difficulties,
asymmetries (where reliably observable), form degradation, exercise
tolerance, adherence, equipment, preferences, session constraints, and user
feedback — explicitly **not** a medical diagnosis system. AL-01 delivered
the per-session outcome record; the profile is the *accumulation* across
sessions that the adaptation layers (AL-03/AL-04) will consume. Without a
canonical profile shape, adaptation would have to improvise over raw
outcome logs, mixing facts with guesses.

## Decision

1. **Adopt the Personal Movement Profile contract as the canonical
   type-level model** of accumulated per-user training signals, in
   `src/lib/profile/` (public surface `src/lib/profile/index.ts`), with
   `PROFILE_CONTRACT_VERSION = 1`.
2. **The contract is PURE** — no Prisma, React, services, environment, or
   runtime side effects; nothing in application code imports it yet.
3. **Observed vs inferred is STRUCTURAL**: a `ProfileSnapshot` splits
   `observed` (deterministic projections of AL-01 outcomes + user
   declarations, each referenceable) from `inferred` (named, versioned model
   outputs). Every inference carries `confidence` (0..1), `derivedBy`,
   `derivedAtDateKey`, and non-empty `evidenceRefs` — inference can never
   masquerade as a stored fact, and absence of an inference means
   "insufficient data", never a negative claim.
4. **Privacy by design is structural**: the profile stores only minimal
   projections + references (never raw session bodies or duplicated outcome
   payloads) — `privacy.projectionsOnly = true` is a binding invariant
   enforced by validation; user view/export/deletion surfaces are design
   requirements documented in the contract doc.
5. **Vocabulary is owned elsewhere**: exercise identity is the S-02
   canonical `ExerciseId`/`ExerciseSlug`; equipment-constraint tokens and
   difficulty feelings are type-imported from the MG-02 / AL-01 closed
   vocabularies — never invented in this module.
6. **Not-a-medical-system is a hard boundary**: the contract models training
   signals only; there is no diagnosis/prognosis vocabulary, and inference
   severity is a training-planning concern (`LOW/MEDIUM/HIGH`), never a
   health assessment.
7. **Deterministic aggregates stay observed**: the pure windowed activity
   aggregate (`profileActivitySummary`) is a deterministic projection of
   observed history (adherence basis); the *adherence tier* itself is an
   inference, not a stored fact.

## Consequences

- AL-03 (adaptation inputs) and AL-04 (decisions) import the profile
  contract instead of inventing parallel user-state shapes; AL-01 outcomes
  feed the profile's observed sections.
- Existing session/outcome/persistence modules stay untouched; the profile
  module is a one-way, type-only consumer of AL-01 outcomes, the S-02
  exercise identity, and the MG-02 vocabulary.
- No migration is implied or performed; profile persistence (additive tables
  or server state) is a separate, gated lifecycle.
- A profile can never claim a fact it cannot cite and never store an
  inference as truth; the closed loop stays auditable by construction.

## Related

- `docs/architecture/AL-02-PERSONAL-MOVEMENT-PROFILE.md` — signal-by-signal contract + profile update pipeline design
- `docs/adr/0012-workout-outcome-model.md` — AL-01 outcome contract (primary input)
- `docs/product/PRODUCT-STRATEGY.md` — §2B (signal list), §3 (closed loop)
- `docs/adr/0006-movement-graph-domain-contract.md`, `0001-canonical-exercise-identity.md` — identity/contract precedents
