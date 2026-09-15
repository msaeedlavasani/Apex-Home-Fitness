# TASKS 0001 — Workout Experience V2 work packages (CRITICAL implementation preparation)

> **STATUS: READY — implementation decomposition; NON-EXECUTABLE / NON-AUTHORIZING**
>
> This file is the Spec Kit decomposition artifact for `WORKOUT-V2-IMPL-01`.
> It is **not** an executable backlog and **not** authorization: `docs/TASKS.md`
> remains the only executable backlog, and the Development Admission Gate must
> return `ADMISSION_GRANTED` before any work package starts. Every item below is
> blocked on a separate explicit Owner implementation authorization.

| Field | Value |
|---|---|
| STATUS | `READY` (decomposition) / `NON-EXECUTABLE` until admission GRANTED |
| SPEC | [`spec.md`](./spec.md) · PLAN: [`plan.md`](./plan.md) · DEPS: [`dependencies.md`](./dependencies.md) |
| TASKS.md entry | [`../../TASKS.md`](../../TASKS.md) → `WORKOUT-V2-IMPL-01` (registration pending Owner authorization) |
| Date | 2026-09-15 · Baseline: fresh main `897e376` |

Each package: **ID · purpose · dependencies · ownership scope · outputs · prohibited scope · verification · acceptance · real-device**.

## WP-01 — Session-core contract extension *(CRITICAL core; single writer)*

- **Purpose:** extend the pure session core (ADR-0002) with the modular/phase vocabulary + per-phase progression policy (`AUTO` | `CONFIRMATION_REQUIRED`), additively.
- **Dependencies:** none (foundation).
- **Ownership scope:** `src/lib/workout/sessionCore.ts` (+ its contract types) only.
- **Outputs:** extended state/command/effect contract; backward-compatible snapshot evolution; contract tests + golden traces.
- **Prohibited scope:** React/UI, orchestration logic, prescription storage, any behavior change to today's shipped player.
- **Verification:** unit + session-core contract/golden-trace suites; `snapshotVersion` compatibility asserted.
- **Acceptance:** existing shipped behavior unchanged; new vocabulary fully covered by tests; snapshot compatibility proven.
- **Real device:** not required.

## WP-02 — Orchestration layer *(CRITICAL core; single writer)*

- **Purpose:** implement the orchestration contract (lifecycle, module applicability/order, active exercise, set/rest progression, transitions, deferred/skipped, completion eligibility, pause/resume, exit, auto vs confirmation).
- **Dependencies:** WP-01.
- **Ownership scope:** new pure orchestration module + adapter wiring.
- **Outputs:** orchestration contract + adapter integration; deferred/skipped session state; view-model contract for presentation.
- **Prohibited scope:** presentation components, mentor, audio, prescription data writes, schema.
- **Verification:** orchestration contract tests; integration tests with the adapter.
- **Acceptance:** sequencing fully owned by orchestration; no module-owned progression; completion blocked while deferred blocks are unresolved.
- **Real device:** not required.

## WP-03 — Prescription resolution contract *(CRITICAL; may open a DB_CHANGE gate)*

- **Purpose:** resolve programs into the canonical prescription (explicit `executionMode` + targets + sets + rest), source-independently; decide the additive storage representation if needed.
- **Dependencies:** none for resolution design; consumes program contract.
- **Ownership scope:** prescription resolution module + enrichment seam; possible additive schema (DB_CHANGE gate inside this WP only).
- **Outputs:** resolution contract + tests (AI/rules parity); storage decision recorded (additive; safe defaults).
- **Prohibited scope:** UI code, generator internals, mode-choosing policy (future authorization), non-additive schema changes.
- **Verification:** unit tests for resolution; contract tests proving both provenance paths resolve identically.
- **Acceptance:** no exercise is hardcoded to a mode; unresolved cases fail explicitly (no silent coercion); storage decision documented and additive.
- **Real device:** not required.

## WP-04 — Experience shell *(presentation)*

- **Purpose:** the full-surface shell: viewport/safe-area contract, fa/en + RTL, reduced-motion-safe, mobile-first.
- **Dependencies:** presentation view-model contract (from WP-02 design).
- **Ownership scope:** shell/layout components + locale keys.
- **Outputs:** shell with 360px behavior, safe-area handling, RTL correctness; conformance-gate evidence.
- **Prohibited scope:** session logic, mentor internals, controls semantics.
- **Verification:** targeted UI test at 360px in both locales; UI conformance gate.
- **Acceptance:** no scroll/trap issues; safe-area correct; reduced motion respected.
- **Real device:** recommended (mobile viewport), Owner acceptance at first on-device stage.

## WP-05 — START + PREPARING first slice *(the first planned implementation slice — §17 readiness)*

- **Purpose:** implement the START/PREPARING experience on the shared architecture (see `plan.md` §17 for the exact dependency/scope/test/accepted criteria).
- **Dependencies:** WP-01, WP-02 (+ WP-04 for the shell).
- **Ownership scope:** START/PREPARING stage components + start/pause/resume actions.
- **Outputs:** first slice running end-to-end on device; START reliability evidence.
- **Prohibited scope:** WORK_SET execution, REST, transitions, deferral/skip, mentor implementation, schema, new dependencies.
- **Verification:** unit + orchestration contract tests; targeted UI test both locales; **explicit real-iPhone tap/interactivity acceptance** (legacy reliability risk).
- **Acceptance:** `START_FREEZE_CRITERIA` from `plan.md` §17 met.
- **Real device:** **required** (Owner).

## WP-06 — WORK_SET + mode-aware progress *(CRITICAL capability)*

- **Purpose:** implement ONE `WORK_SET` capability supporting both modes + ONE mode-aware progress capability.
- **Dependencies:** WP-02, WP-03.
- **Ownership scope:** WORK_SET module + progress component.
- **Outputs:** rep-based and time-based execution through one capability; `6/10` and `40→0` presentations.
- **Prohibited scope:** per-mode parallel architectures; progression logic in the UI; HOLD as a third mode.
- **Verification:** unit (both modes), contract tests, targeted UI tests.
- **Acceptance:** both modes demonstrably share one capability; progress reflects state without owning it.
- **Real device:** yes at stage freeze.

## WP-07 — REST / EXERCISE_TRANSITION / Exercise-Block lifecycle

- **Purpose:** implement REST (independent), EXERCISE_TRANSITION, Intro-once-per-identity, next-exercise-only-on-identity-change.
- **Dependencies:** WP-02, WP-03.
- **Ownership scope:** REST + transition modules; block lifecycle in orchestration consumption.
- **Outputs:** set/rest/transition sequence per prescription; no re-intro between same-exercise sets.
- **Prohibited scope:** Intro inside REST; `REST_NEXT_PREVIEW` semantics; next-set-as-Next-Exercise; legacy rest preview.
- **Verification:** orchestration + contract tests; targeted UI tests; regression tests against the legacy confusion findings.
- **Acceptance:** identity-change-only Next-Exercise; Intro exactly once per identity.
- **Real device:** yes at stage freeze.

## WP-08 — Session controls + outcomes *(control surface; consumes WP-02 state)*

- **Purpose:** implement the six v1 controls' **control surface** and the presentation/consumption of `COMPLETED / OUTSTANDING-DEFERRED / SKIPPED` outcomes; dispatch approved orchestration actions.
- **Dependencies:** WP-02 (state + actions); stage-level exercise controls additionally need WP-06/07.
- **Ownership scope:** control surface (UI + dispatch wiring), control-specific verification, outcome rendering from orchestration state.
- **Outputs:** control surface dispatching the approved orchestration actions; outcome presentation rendered from orchestration state (deferred/skipped state is **owned by WP-02** and only consumed here).
- **Prohibited scope:** owning deferred/skipped state, orchestration transition logic, or any global action state machine (WP-02 owns these); `SKIP SET` / `EXTEND REST` / `REDUCE REST`; prescription writes; silent completion.
- **Verification:** control dispatch tests + contract tests for each approved action (state assertions run against WP-02's orchestration); targeted UI tests.
- **Acceptance:** every control dispatches exactly the approved orchestration action; outcomes render from orchestration state; deferred blocks block completion until resolved (asserted against WP-02's state, not re-implemented).
- **Real device:** yes at stage freeze.

## WP-09 — Mentor presentation boundary + degraded mode

- **Purpose:** mentor/demo presentation boundary with capability detection and a fully usable degraded mode; moving demo as the normal path.
- **Dependencies:** presentation view-model (WP-02); asset work independent.
- **Ownership scope:** mentor boundary component + asset integration; no session logic.
- **Outputs:** demo path + degraded path (identity/static visual/essential cue/progress/controls preserved); asset reuse decision recorded (V1 GLB classification).
- **Prohibited scope:** orchestration ownership; Three.js/3D/renderer/format/tracking **mandates**; blocking workout on demo availability.
- **Verification:** degraded-mode tests (forced failure), targeted UI tests, reduced-motion check; asset integrity per MG-07 rules when assets are introduced.
- **Acceptance:** workout fully usable with the mentor unavailable; no renderer mandate recorded anywhere.
- **Real device:** yes at stage freeze (performance/fidelity).

## WP-10 — Functional audio + accessibility completion *(cross-cutting)*

- **Purpose:** functional audio cues (supplementary) + completion of the accessibility contract per stage.
- **Dependencies:** stage WPs (asserts on them); soft.
- **Ownership scope:** audio cue capability + a11y assertions per stage (no new settings system).
- **Outputs:** countdown/start/end/rest-ending cues; non-animation-only timers; no audio-only/motion-only essential state; accessible controls.
- **Prohibited scope:** Voice/TTS; essential state carried by audio; new settings systems beyond existing preferences.
- **Verification:** targeted tests; reduced-motion checks; a11y assertions in stage acceptance.
- **Acceptance:** the spec §5.8/§5.9 contract holds on every frozen stage.
- **Real device:** sound behavior checked on device at stage freeze.

## WP-11 — Convergence & release path

- **Purpose:** converge docs/ADR for the session-contract change; prepare the release/acceptance path per `docs/RELEASE_POLICY.md` when production-bound.
- **Dependencies:** all implementing WPs terminal.
- **Ownership scope:** documentation + ADR + release preparation (no new product behavior).
- **Outputs:** ADR (ADR-0002 follow-on) for the contract change; updated canonical docs; release checklist readiness.
- **Prohibited scope:** unrelated refactors; production deployment without the standard gates.
- **Verification:** governance validation; full targeted + nightly E2E on the release path.
- **Acceptance:** canonical docs reflect the shipped architecture; release policy satisfied.
- **Real device:** Owner acceptance per release policy.

## Convergence checklist (when implementation lands)

- [ ] Spec status/implementation state updated; this file marked `CLOSED`/`SUPERSEDED`
- [ ] ADR recorded for the session-contract change
- [ ] `docs/TASKS.md` lifecycle fields updated; report per `docs/AI_CHANGE_TEMPLATE.md`
- [ ] Admission record transitions to GRANTED only via Owner authorization

## HANDOFF

| Field | Value |
|---|---|
| CURRENT_STATUS | `WORK_PACKAGES_READY` (non-executable; admission DENIED) |
| NEXT_ACTION | Owner authorizes `WORKOUT-V2-IMPL-01` implementation (admission gate then expected to return GRANTED) |
| NEXT_ACTION_AUTONOMOUS | `NO` |
| BLOCKERS | Owner implementation authorization |
