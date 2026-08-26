# Architecture Stabilization Plan

`STATUS: APPROVED DIRECTION — IN PROGRESS (S-01 COMPLETE 2026-08-27; S02-A + S02-B COMPLETE 2026-08-27; S02-C..S02-E + S-03..S-06 NOT STARTED)`

This document defines the approved scope, sequence and governance for the
controlled Architecture Stabilization phase. It is a **plan**, not an execution
record. Nothing in it has been implemented.

- Input: `docs/architecture/MODULARITY-AUDIT.md` (audit record) and
  `docs/architecture/COUPLING-RISK-REGISTER.md` (risk register).
- Authority: accepted ADRs `0001`–`0003` and the authoritative
  `docs/architecture/ARCHITECTURE-PRINCIPLES.md`.
- Workout Experience V2 remains `PRODUCT / UX VISION — NOT YET IMPLEMENTED`.

## 1. Accepted decisions (baseline for this plan)

| ID | Decision | Status | ADR |
|---|---|---|---|
| AD-1 | Canonical exercise identity (id = identity, names = display metadata), name fallback during migration | ACCEPTED | `docs/adr/0001-canonical-exercise-identity.md` |
| AD-2 | Pure workout session core + React adapter | ACCEPTED | `docs/adr/0002-pure-workout-session-core.md` |
| AD-3 | Quiz/onboarding JS island → TS + canonical contracts | ACCEPTED AS FUTURE WORK — DO WHEN TOUCHED | `docs/adr/0003-quiz-onboarding-migration.md` |
| AD-4 | Neutral shared contract ownership (fix inverted type imports) | ACCEPTED — BEFORE NEXT FEATURE | none (recorded here + principles §4) |
| AD-5 | Offline store split (`lib/offline/db.ts`) | DEFERRED — DO WHEN TOUCHED | none (recorded here) |

## 2. Immediate stabilization scope (S-01 … S-06)

| ID | Task | Outcome | Priority |
|---|---|---|---|
| S-01 | Shared Contract Ownership | Two inverted lib→services type imports resolved with zero behavior change | FIRST (smallest) |
| S-02 | Canonical Exercise Identity Foundation | Minimum compatible foundation: contracts + name→id resolution layer + compatibility fallback; **no schema change before GATE A** | AFTER S-01 |
| S-03 | Pure Workout Session Core | Framework-independent session core extracted; `useWorkoutEngine` becomes adapter | AFTER S-02 (GATE B before extraction) |
| S-04 | Stable Session State Contract | Stable read-model/event surface consumed by player, persistence, future Voice Coach | WITH/AFTER S-03 |
| S-05 | Snapshot Versioning | Explicit version discipline for persisted workout snapshots, additive evolution only | AFTER S-04 (GATE C before structure change) |
| S-06 | Exercise Library / Catalog Role | Decision + documentation of canonical vs sample/demo role for the current library | PARALLEL — decision-only; input to S-02 design review |

## 3. Explicitly excluded from immediate stabilization

Unless technically unavoidable, these remain future work:

- Quiz TS migration (AD-3 — DO WHEN TOUCHED);
- offline DB split (AD-5);
- Voice Coach; media asset creation; media technology decision;
- Workout V2 PREPARE/TRANSITION implementation; rep→duration; left/right;
  visual redesign; Focus Mode; Workout Preview UI; TTS;
- new AI providers; analytics redesign; gamification redesign;
- auth changes; Production AI work; any schema migration.

## 4. Dependency order and reasoning

```
S-01 Shared Contracts
   ↓ (provides the neutral contract home new exercise/session types will use)
S-02 Exercise Identity Foundation
   ↓ (contracts + resolution layer in place before any schema work)
S-03 Pure Session Core          ──── GATE B ────
   ↓ (core's public surface IS the session state contract)
S-04 Stable Session State Contract
   ↓ (serialization contract of the core anchors snapshot shape)
S-05 Snapshot Versioning        ──── GATE C ────
S-06 Catalog Role  (decision-only; may run in parallel at any point,
                   must complete before post-GATE-A schema work)
```

Rationale (evidence-based):

- **S-01 first**: smallest, zero-runtime-behavior, and both S-02 and S-03 want
  a neutral contract home for new shared types (per AD-4). Verified inverted
  imports: `src/lib/ai/ruleBasedProgram.ts:5` → `@/services/programService`
  types (`AiMethod`/`AiExercise`/`AiGeneratedProgram` defined at
  `programService.ts:94/121/155`); `src/lib/quiz/quizDraft.ts:30` →
  `@/services/userService` (`QuizAnswers` at `userService.ts:62`).
- **S-02 before S-03**: the exercise-identity contract is used by session
  persistence/logs; establishing it first prevents the session core from being
  extracted against the old name-keyed assumption. No schema work happens
  before GATE A.
- **S-03 → S-04**: the pure core's public surface *is* the session state
  contract; S-04 then stabilizes the consumer-facing read-model and migrates
  consumers (player, persistence). Defining the contract separately before the
  extraction would be speculative — it is produced by the extraction design.
- **S-05 after S-04**: snapshot versioning must align with the core's
  serialization contract so future engine changes evolve safely.
- **S-06 parallel**: a decision/documentation task with no code; its output
  (what becomes canonical vs sample) is an input to the S-02 design review and
  must complete before any post-GATE-A schema work.

## 5. Phases (controlled, atomic, gated)

### Phase S-01 — Shared Contract Ownership

- **Objective**: move shared program/quiz types to neutral owners; resolve the
  two inverted type-only imports with zero behavior change.
- **Why now**: smallest win; unblocks S-02/S-03 contract work; AD-4 priority
  BEFORE NEXT FEATURE.
- **Files/domains expected to change**: `src/lib/ai/ruleBasedProgram.ts`,
  `src/lib/quiz/quizDraft.ts`, `src/services/programService.ts`,
  `src/services/userService.ts`, `src/lib/quiz/quizFlow.ts`,
  `src/app/[locale]/quiz/page.tsx`; new neutral contract module(s) — proposed
  `src/lib/program/types.ts` (program shape) and `src/lib/quiz/types.ts`
  (raw `QuizAnswers`); services re-export the types for import compatibility.
- **Contract changes**: none (type-only move + re-exports; importers
  unchanged).
- **Schema impact**: none. **Runtime behavior impact**: none.
- **Compatibility**: type-only; `tsc --noEmit` + lint + unit tests prove parity.
- **Tests**: existing unit suites (`rule-based-program.test.ts`,
  `quiz-draft.test.ts`, `quiz-flow.test.ts`, `quiz-api.test.ts`,
  `quiz-save-response.test.ts`, `request-security.test.ts`) + typecheck.
- **Rollback**: plain git revert (code-only).
- **Exit criteria**: no `@/services/*` import remains in `src/lib/` (except
  documented deliberate exceptions); typecheck/lint/unit green; diff is
  import/type-only.
- **Dependency**: none. **Risk**: LOW.
- **Executed (2026-08-27) — COMPLETE**: canonical owners created —
  `src/lib/quiz/contracts.ts` (`QuizAnswers`) and `src/lib/ai/contracts.ts`
  (`AiMethod`, `AiEquipment`, `AiProgramMode`, `AiExercise`, `AiWeeklySession`,
  `AiGeneratedProgram`); both services now re-export them for compatibility;
  the inverted imports were migrated to the canonical owners
  (`src/lib/ai/ruleBasedProgram.ts`, `src/lib/quiz/quizDraft.ts`) plus the quiz
  page consumer (`src/app/[locale]/quiz/page.tsx`). Validation: `tsc --noEmit`
  clean, eslint 0 errors on changed files, full unit suite 394/394. No
  `@/services/*` import remains in `src/lib/`.

  > Note: the actual neutral homes differ from the proposal above
  > (`lib/program/types.ts` / `lib/quiz/types.ts`) — the audit-era proposal was
  > refined to `lib/ai/contracts.ts` + `lib/quiz/contracts.ts` so contracts live
  > with the domain that owns their meaning (Architecture Principle §2/§4).

### Phase S-02 — Canonical Exercise Identity Foundation

- **Objective**: introduce the minimum compatible foundation — exercise
  identity contracts, a name→id resolution layer with name fallback, and an
  inventory of name-keyed usages. **No schema change (GATE A).**
- **Why now**: R-01 is the highest-risk coupling and blocks Workout V2,
  preview, media mapping and sync joins.
- **GATE A (2026-08-27) — APPROVED**; decision package
  [`S02-EXERCISE-IDENTITY-GATE-A.md`](./S02-EXERCISE-IDENTITY-GATE-A.md)
  (GA-01..GA-08 all APPROVED as recommended). **S02-A COMPLETE (2026-08-27):**
  exercise-domain foundation created at `src/lib/exercise/` (`contracts.ts`,
  `catalog.ts`, `resolver.ts`, `index.ts`) + `tests/exercise-domain.test.ts`
  (16 tests) + `docs/architecture/S02A-SOURCE-VOCABULARY.md`. Pure/no side
  effects; typecheck clean, eslint clean, full unit 410/410.
- **S02-B COMPLETE (2026-08-27)**: additive schema foundation only.
  `Exercise.slug String? @unique` + `Exercise.faName String?` added to
  `prisma/schema.prisma`; migration
  `20260827011500_add_exercise_canonical_identity_fields` created and applied
  to the local/dev DB (40 Exercise rows intact, ids/names unchanged, slug
  & faName NULL). Prisma SQLite table-rebuild of `Program` reviewed as
  lossless (standard RedefineTables, all columns/relations preserved).
  No backfill, no aliases field. **Aliases decision: DEFER** — no DB
aliases persistence (see §aliases note). Validation: `prisma validate`
  clean, migration status in sync (no drift), typecheck clean, full unit
  410/410 (no code needed adapting to nullable columns → old-code
  compatibility `YES`).
- **Files/domains expected to change**: contracts + resolution helper
  (proposed `src/lib/exercise/`), `workoutTokens.ts`, `samplePlan.ts`,
  `programService.ts` normalization, `syncService.ts` log payloads (additive
  optional id), library catalog type; GATE A design document.
- **Contract changes**: additive optional `exerciseId` where feasible; the
  resolution layer resolves `id → name` and falls back to `name → id`.
- **Schema impact**: NONE in this phase (GATE A must pass first; see §7).
- **Runtime behavior impact**: none (additive; old name paths keep working).
- **Compatibility**: existing name-based programs/sessions/logs remain valid;
  name fallback preserved; original names never discarded.
- **Tests**: resolution unit tests (id-first, name fallback, ambiguity),
  program-normalization tests, API-compat tests, existing suites green.
- **Rollback**: git revert (code-only; no data touched).
- **Exit criteria**: GATE A design doc approved by owner; resolution layer
  tested; inventory of name-keyed usages recorded; behavior parity.
- **Dependency**: S-01. **Risk**: MEDIUM (design-sensitive; keep additive).

### Phase S-03 — Pure Workout Session Core

- **Objective**: extract the framework-independent session/timeline core from
  `useWorkoutEngine.ts`; the hook becomes an adapter. **GATE B before
  extraction** (owner approval of target boundaries, public contract, parity
  test plan).
- **Why now**: R-02; V2 session work, Voice Coach and recovery need a
  non-React-consumable core (ADR-0002).
- **Files/domains expected to change**: new pure core (proposed
  `src/lib/workout/sessionCore.ts`), `useWorkoutEngine.ts` (adapter),
  `WorkoutPlayer.tsx` (unchanged behavior), new tests.
- **Contract changes**: the core's public surface becomes the proposed Session
  State contract (see §8); adapter preserves the hook's current external
  behavior.
- **Schema impact**: none. **Runtime behavior impact**: none (parity).
- **Compatibility**: `WorkoutPlayer` behavior identical; all existing
  workout-engine tests pass; parity tests added before completion.
- **Tests**: parity tests first (target tests before extraction), pure-core
  unit tests (no React), existing `workout-engine.test.tsx`,
  `workout-persistence.test.ts`, `workout-timer.test.ts`, E2E `workout-route`.
- **Rollback**: git revert; core and adapter land as one reviewable change.
- **Exit criteria**: pure core has no React/UI imports; hook delegates to core;
  full test suite green; GATE B artifacts recorded.
- **Dependency**: S-02 (contract home). **Risk**: MEDIUM — the extraction must
  be behavior-preserving; avoid a monolithic "SessionManager" (keep small
  cohesive contracts per ADR-0002).

### Phase S-04 — Stable Session State Contract

- **Objective**: formalize and stabilize the read-model/event surface consumed
  by WorkoutPlayer, persistence and future consumers (Voice Coach, V2).
- **Why now**: consumers must not bind to hook internals or internal transition
  implementation (ADR-0002 required goal).
- **Files/domains expected to change**: contract module (proposed
  `src/lib/workout/sessionState.ts`), player + persistence import points,
  consumer contract tests.
- **Contract changes**: documented Session State read-model (see §8); event
  surface for transitions if needed.
- **Schema impact**: none. **Runtime behavior impact**: none.
- **Compatibility**: player and persistence migrate to the contract with
  identical behavior; old snapshot shapes unaffected (see S-05).
- **Tests**: consumer contract tests (player integration, persistence
  compatibility); existing suites green.
- **Rollback**: git revert (code-only).
- **Exit criteria**: player/persistence consume only the stable contract; no
  consumer imports hook internals.
- **Dependency**: S-03. **Risk**: LOW-MEDIUM.

### Phase S-05 — Snapshot Versioning

- **Objective**: introduce explicit version discipline for persisted workout
  snapshots (`workoutStates` in `src/lib/offline/db.ts`) so future engine
  changes evolve safely. **GATE C before modifying the snapshot structure.**
- **Why now**: the session serialization contract (S-03/S-04) will evolve for
  V2; pre-stabilization snapshots must keep hydrating (R-10).
- **Files/domains expected to change**: snapshot record contract + hydration
  adapter (additive), `workoutPersistence.ts`, `conflictPolicy.ts` (only to
  honor the version contract — policy itself is STABLE, do not rewrite).
- **Contract changes**: explicit `version` semantics (currently optional,
  default 0); additive fields allowed; unknown-newer-version behavior defined.
- **Schema impact**: none (IndexedDB records, not DB).
- **Runtime behavior impact**: none for existing records (backward compatible).
- **Compatibility**: old snapshots hydrate; new snapshots readable by old
  clients where additive; conflict policy unchanged (LWW + monotonic merge).
- **Tests**: old-shape hydration, new-shape hydration, version-mismatch
  behavior, background-recovery paths (`offline-conflict.test.ts`,
  `workout-persistence.test.ts`).
- **Rollback**: git revert; version bump is forward-compatible.
- **Exit criteria**: versioning contract documented; hydration adapter tested;
  no destructive migration.
- **Dependency**: S-04. **Risk**: LOW (additive discipline already exists).

### Phase S-06 — Exercise Library / Catalog Role

- **Objective**: clarify the architectural role of the current sample
  library/catalog (`ExerciseLibraryPage.tsx` hardcoded demo streams); decide
  what becomes canonical vs remains sample/demo.
- **Why now**: R-09; the answer feeds the S-02 design and prevents building the
  media library on the wrong foundation.
- **Files/domains expected to change**: documentation only (decision record);
  no catalog build-out.
- **Contract/schema/runtime impact**: none.
- **Compatibility**: n/a. **Tests**: n/a (documentation decision).
- **Rollback**: n/a. **Exit criteria**: decision recorded and reflected in
  `docs/INDEX.md`/catalog row; scope of a future library task (if any) bounded.
- **Dependency**: none — may run in parallel; must complete before
  post-GATE-A schema work. **Risk**: LOW.

## 6. Backward compatibility plan (applies to every phase)

| Data / surface | Guarantee |
|---|---|
| Programs with names only | readable; name fallback resolution (S-02) |
| ProgramExercise DB records | unchanged fields; additive optional id only |
| Historical WorkoutSessions | untouched; no destructive changes |
| Exercise logs (name-based) | keep resolving; new id fields optional |
| IndexedDB snapshots (pre-stabilization) | hydrate via additive versioning (S-05) |
| API payloads | unchanged (no breaking payload changes) |
| Current WorkoutPlayer | identical behavior unless later product change explicitly alters it |
| Rules- and AI-generated programs | both keep working through shared normalization |

Policy: **new contract + compatibility adapter + gradual adoption**. No
flag-day migration.

## 7. Database / schema migration strategy (planning only — NOT executed)

If canonical exercise identity eventually requires schema changes (GATE A):

- **Additive-first**: new nullable field(s) (e.g. `exerciseId` on the exercise
  representation) with no removal or repurposing of existing columns.
- **Backfill**: idempotent, separately observable script (dry-run +
  verification), mapped via the resolution layer; rows with unresolvable names
  are recorded, never guessed silently.
- **Name fallback**: resolution layer keeps name-based lookup during and after
  migration.
- **Validation**: typecheck, unit tests, migration verification query, targeted
  E2E for the user journey.
- **Rollback limits**: additive nullable columns can safely remain after
  rollback (forward-compatible); backfill is replayable.
- **Unresolved historical names**: surfaced explicitly (report/registry), not
  silently mapped; ambiguity resolution requires owner input.

> **Aliases persistence decision (S02-B, recorded 2026-08-27):** system
exercise aliases remain source-controlled in `src/lib/exercise/catalog.ts`
during S02-B. DB alias persistence is **not** currently justified and remains
deferred until a concrete mutable/queryable alias use case exists (e.g. a
future custom/coach-created exercise editing or authority path). This does not
prohibit a future relational `ExerciseAlias` model; it does not lock the
architecture into a JSON array.

## 8. Stable Session State contract (conceptual — NOT coded)

The contract exposes enough for consumers (player, persistence, future Voice
Coach) without exposing internal transitions:

- current exercise (id + display name);
- exercise index (and total);
- current set (and total sets);
- phase (e.g. `prepare | work | rest | transition | complete`);
- remaining time and elapsed time where relevant;
- running / paused state;
- overall progress (completed sets / total, completion percentage where
  product-defined);
- next phase and next exercise where available;
- session completion status.

Unresolved V2 product policy (exact PREPARE/REST/TRANSITION durations,
countdowns, rep→duration, left/right) is NOT encoded; the contract may
*support* future states without implementing them.

## 9. Session core extraction strategy (planning only)

- Current `useWorkoutEngine` responsibilities to split:
  - **into pure core**: session state machine, timeline/phase transitions, set
    progression, timing decisions (wall-clock semantics), pause/resume,
    auto-advance policy, serialization contract;
  - **remain in React adapter**: lifecycle, subscription/render triggers,
    browser-lifecycle integration;
  - **remain in persistence**: snapshot load/save and hydration (S-05);
  - **remain in wallClock**: timing primitives (STABLE — do not change).
- Small cohesive contracts; no giant "SessionManager".
- Target tests are defined BEFORE extraction (parity suite + pure-core unit
  suite).

## 10. Snapshot versioning strategy (planning only)

- Explicit `version` field on `WorkoutStateRecord` (currently optional, default
  0 — used as conflict tie-break; keep semantics).
- Compatibility policy: unknown/newer version → defined behavior (e.g. treat as
  additive-readable; never destructively rewrite); additive fields only;
  hydration adapter per version delta.
- Conflict policy (`conflictPolicy.ts`) preserved as-is (LWW + monotonic
  progress merge).

## 11. Validation strategy (per phase)

- S-01: typecheck, lint, unit tests.
- S-02: resolution unit tests (id-first, name fallback, ambiguity),
  normalization tests, API compatibility, migration verification when later
  applied.
- S-03: all existing workout-engine tests; pure-core unit tests; behavior
  parity tests.
- S-04: player integration, persistence compatibility, consumer contract tests.
- S-05: old/new snapshot hydration, version-mismatch behavior, background
  recovery.
- Targeted E2E only when the user journey changed or cross-boundary integration
  requires it; the existing pyramid (`docs/CI.md`) applies.

## 12. Rollback strategy (per phase)

- Code-only phases (S-01, S-03, S-04): plain git revert — the primary
  rollback mechanism.
- Additive schema migration (post-GATE-A, later): forward-compatible; extra
  nullable fields remain safely; backfill replayable; never destructive.
- Snapshot versioning (S-05): old data never destroyed; new structure
  additive-readable.
- Exercise identity mapping (S-02+): original exercise names never discarded
  solely because ids are added.

## 13. Implementation atomicity

Each phase is a small, independently reviewable change:

- one primary architecture goal per phase;
- runtime behavior preserved (documented `NONE` where applicable);
- targeted tests included in the same change;
- no bundled unrelated cleanup;
- revertable via git where practical.

No enormous "Architecture Refactor" commits.

## 14. Decision gates (must not be crossed silently)

### GATE A — before any schema change for canonical exercise identity

Owner approval required for: proposed ID strategy; migration/backfill approach;
compatibility behavior (unresolved historical names).

### GATE B — before extracting the Session Core

Owner approval required for: target boundaries; public contract; parity test
plan.

### GATE C — before modifying the snapshot structure

Owner approval required for: versioning contract; hydration compatibility.

Future agents must stop and request the gate decision; they may not proceed on
their own.

## 15. Component / Capability Registry timing

The authoritative Component/Capability Registry is planned **after** stable
architecture boundaries are implemented, not before. Future registry records:

Capability · Owner · Contract · Inputs · Outputs · Side Effects · Dependencies ·
Consumers · Reuse Grade · Stability · Public entry point.

Future rule (recorded, not yet binding): *before building a new capability,
agents must search the Registry.* The Registry becomes authoritative only when
it exists with owner-reviewed contents. Do NOT create it during stabilization
execution.

## 16. Do-Not-Refactor list (STABLE — DO NOT REFACTOR DURING THIS STABILIZATION)

- secure OTP stack (`src/lib/auth/*`, `src/services/otpService.ts`,
  `src/services/phoneSessionService.ts`);
- idempotency ledger (`services/generationIdempotency.ts`,
  `lib/ai/idempotency.ts`);
- conflict policy (`lib/offline/conflictPolicy.ts`);
- sync outbox (`lib/offline/db.ts` exercise logs, `services/syncService.ts` —
  additive changes only where S-02 requires);
- analytics service boundaries (`services/analyticsService.ts`,
  `services/analyticsEvents.ts`, `app/api/analytics/events`);
- gamification service boundaries (`services/gamificationService.ts`);
- wall-clock timing (`lib/workout/wallClock.ts`);
- UI platform package (`components/ui/platform/*`);
- existing provider abstraction (`lib/ai/provider.ts`);
- audio/haptic service seams (`services/audioService.ts`, `hooks/useHaptic.ts`).

These may receive minimal compatibility changes only when a phase directly
requires them (e.g. S-02 additive id on sync payloads).

## 17. Definition of Done (for the whole stabilization)

- S-01..S-06 completed within scope; exclusions respected.
- All gates (A/B/C) passed with owner approval records.
- Existing behavior parity verified by the test pyramid.
- No schema migration without GATE A; no Workout V2 implementation; no
  Component Registry created.
- Architecture docs updated with change: ADRs, `ARCHITECTURE-PRINCIPLES.md`,
  `docs/INDEX.md`, `docs/HANDOFF.md`/`docs/TASKS.md` status.
- `docs/architecture/ARCHITECTURE-STABILIZATION-PLAN.md` updated to reflect
  completion per phase.
