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

### Owner visual acceptance policy

Task-scoped machine, agent, and real-device verification is evidence for the
work package; it is not Owner visual acceptance and MUST NOT be inserted as a
per-package DAG gate. Work packages may unlock their dependents when their
defined verification and acceptance evidence passes. Owner intervention before
the complete-flow milestone is limited to an explicit `OWNER_DECISION_REQUIRED`
condition or another existing hard governance stop.

The single Owner visual gate is the complete program-driven Workout
Experience, after block-completeness/integration verification. Findings from
that review are collected into one coherent correction batch where
dependencies allow, machine regression runs before the complete-flow Owner
re-review, and only then is the experience frozen.

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
- **Real device:** recommended (mobile viewport) as task-scoped verification; no Owner visual gate.

## WP-05 — START + PREPARING first slice *(the first planned implementation slice — §17 readiness)*

- **Purpose:** implement the START/PREPARING experience on the shared architecture (see `plan.md` §17 for the exact dependency/scope/test/accepted criteria).
- **Dependencies:** WP-01, WP-02 (+ WP-04 for the shell).
- **Ownership scope:** START/PREPARING stage components + start/pause/resume actions.
- **Outputs:** first slice running end-to-end on device; START reliability evidence.
- **Prohibited scope:** SET execution, REST, transitions, deferral/skip, mentor implementation, schema, new dependencies.
- **Verification:** unit + orchestration contract tests; targeted UI test both locales; **explicit real-iPhone tap/interactivity verification** (legacy reliability risk).
- **Acceptance:** `START_FREEZE_CRITERIA` from `plan.md` §17 met.
- **Real device:** **required** as task-scoped verification; no Owner visual gate.

## WP-06 — SET + SET_RESULT + mode-aware progress *(CRITICAL capability; Run 1 / Workstream A)*

- **Purpose:** implement ONE `SET` capability supporting both modes, ONE mode-aware progress capability, and reusable `SET_RESULT` after every completed Set. `WORK_SET` may remain only as an implementation compatibility label.
- **Dependencies:** WP-02, WP-03.
- **Ownership scope:** SET module + progress component + SET_RESULT presentation/consumption.
- **Outputs:** rep-based and time-based execution through one capability; `6/10` and `40→0` presentations; stable completed-Set result/evidence.
- **Prohibited scope:** per-mode parallel architectures; progression logic in the UI; HOLD as a third mode; REST/INTRO/global sequencing.
- **Verification:** unit (both modes), SET_RESULT contract tests, targeted UI tests.
- **Acceptance:** both modes demonstrably share one SET capability; SET_RESULT follows each completed Set; both return state/result/intent to orchestration and do not choose the next global destination.
- **Real device:** yes at stage freeze as task-scoped verification; no Owner visual gate.

## WP-07 — REST *(CRITICAL capability; Run 1 / Workstream B)*

- **Purpose:** implement the independent REST capability for typed same-Exercise and exercise-boundary recovery. Exercise-boundary transition semantics remain orchestration-owned; there is no independent EXERCISE_TRANSITION top-level module.
- **Dependencies:** WP-02, WP-03.
- **Ownership scope:** REST capability and its local countdown/controls only.
- **Outputs:** typed `REST(BETWEEN_SETS)` and `REST(BETWEEN_EXERCISES)` behavior consumed by orchestration; no re-intro or same-Exercise next-preview ownership.
- **Prohibited scope:** SET/SET_RESULT ownership; INTRO ownership; global sequencing; `REST_NEXT_PREVIEW` semantics; next-set-as-Next-Exercise; legacy rest preview.
- **Verification:** orchestration + contract tests; targeted UI tests; regression tests against the legacy confusion findings.
- **Acceptance:** REST returns state/result/intent to orchestration; it never directly routes to SET, INTRO, or another global state; no terminal REST is created.
- **Real device:** yes at stage freeze as task-scoped verification; no Owner visual gate.

## WP-08 — Session controls + outcomes *(control surface; consumes WP-02 state)*

- **Purpose:** implement the six v1 controls' **control surface** and the presentation/consumption of `COMPLETED / OUTSTANDING-DEFERRED / SKIPPED` outcomes; dispatch approved orchestration actions.
- **Dependencies:** WP-02 (state + actions); stage-level exercise controls additionally need WP-06/07.
- **Ownership scope:** control surface (UI + dispatch wiring), control-specific verification, outcome rendering from orchestration state.
- **Outputs:** control surface dispatching the approved orchestration actions; outcome presentation rendered from orchestration state (deferred/skipped state is **owned by WP-02** and only consumed here).
- **Prohibited scope:** owning deferred/skipped state, orchestration transition logic, or any global action state machine (WP-02 owns these); `SKIP SET` / `EXTEND REST` / `REDUCE REST`; prescription writes; silent completion.
- **Verification:** control dispatch tests + contract tests for each approved action (state assertions run against WP-02's orchestration); targeted UI tests.
- **Acceptance:** every control dispatches exactly the approved orchestration action; outcomes render from orchestration state; deferred blocks block completion until resolved (asserted against WP-02's state, not re-implemented).
- **Real device:** yes at stage freeze as task-scoped verification; no Owner visual gate.

## WP-09 — Mentor presentation boundary + degraded mode

- **Purpose:** mentor/demo presentation boundary with capability detection and a fully usable degraded mode; moving demo as the normal path.
- **Dependencies:** presentation view-model (WP-02); asset work independent.
- **Ownership scope:** mentor boundary component + asset integration; no session logic.
- **Outputs:** demo path + degraded path (identity/static visual/essential cue/progress/controls preserved); asset reuse decision recorded (V1 GLB classification).
- **Prohibited scope:** orchestration ownership; Three.js/3D/renderer/format/tracking **mandates**; blocking workout on demo availability.
- **Verification:** degraded-mode tests (forced failure), targeted UI tests, reduced-motion check; asset integrity per MG-07 rules when assets are introduced.
- **Acceptance:** workout fully usable with the mentor unavailable; no renderer mandate recorded anywhere.
- **Real device:** yes at stage freeze (performance/fidelity) as task-scoped verification; no Owner visual gate.

## WP-10 — Functional audio + accessibility completion *(cross-cutting)*

- **Purpose:** functional audio cues (supplementary) + completion of the accessibility contract per stage.
- **Dependencies:** stage WPs (asserts on them); soft.
- **Ownership scope:** audio cue capability + a11y assertions per stage (no new settings system).
- **Outputs:** countdown/start/end/rest-ending cues; non-animation-only timers; no audio-only/motion-only essential state; accessible controls.
- **Prohibited scope:** Voice/TTS; essential state carried by audio; new settings systems beyond existing preferences.
- **Verification:** targeted tests; reduced-motion checks; a11y assertions in stage acceptance.
- **Acceptance:** the spec §5.8/§5.9 contract holds on every frozen stage.
- **Real device:** sound behavior checked on device at stage freeze as task-scoped verification; no Owner visual gate.

## WP-11 — Convergence & release path

- **Purpose:** converge docs/ADR for the session-contract change; prepare the release/acceptance path per `docs/RELEASE_POLICY.md` when production-bound.
- **Dependencies:** all implementing WPs terminal.
- **Ownership scope:** documentation + ADR + release preparation (no new product behavior).
- **Outputs:** ADR (ADR-0002 follow-on) for the contract change; updated canonical docs; release checklist readiness.
- **Prohibited scope:** unrelated refactors; production deployment without the standard gates.
- **Verification:** governance validation; full targeted + nightly E2E on the release path.
- **Acceptance:** canonical docs reflect the shipped architecture; release policy satisfied.
- **Real device:** any Owner/release-policy acceptance applies only at the existing release gate; this convergence package is not a per-capability visual gate.

## WP-12 — WORKOUT_RESULT + EXIT *(CRITICAL capability; Run 2)*

- **Purpose:** implement the reusable `WORKOUT_RESULT` + `EXIT` capability block after Run 1 (`SET + SET_RESULT` and `REST`) has been accepted and frozen.
- **Dependencies:** WP-02, WP-06, WP-07, WP-13.
- **Ownership scope:** Workout-result presentation/consumption and Exit confirmation/return boundary.
- **Outputs:** semantic completion result; confirmed Exit returns to Dashboard; deferred/skipped obligations remain respected.
- **Prohibited scope:** full Prototype Composition; fixed fixture sequencing; SET/SET_RESULT/REST/INTRO ownership; array-position completion rules.
- **Verification:** orchestration contract tests, result/Exit UI tests, recovery/control integration tests.
- **Acceptance:** `WORKOUT_RESULT` is entered only after semantic completion; Exit is confirmed and functional; no terminal REST; no global sequencing is owned by the capability.
- **Real device:** yes at stage freeze as task-scoped verification; no Owner visual gate.

## WP-13 — Shared Program ↔ Workout prescription contract *(CRITICAL architecture prerequisite)*

- **Purpose:** establish and validate the one canonical, shared, versioned domain contract produced by the Program/Prescription Engine and consumed by Workout Experience.
- **Dependencies:** WP-03; it reconciles the existing resolution authority before Run 2 and program-driven composition.
- **Ownership scope:** contract semantics, machine-readable shape/schema, fail-closed validation invariants, source-adapter parity for AI/rules/persisted program inputs, and compatibility/versioning rules.
- **Outputs:** a canonical resolved-prescription boundary plus a documented adapter/validation decision; an explicit mapping seam to the existing AL-01 `WorkoutOutcomeRecord` without inventing adaptation policy.
- **Prohibited scope:** Workout UI, session topology, presentation modules, orchestration ownership, numbered/fixture-specific flows, schema migration unless separately admitted as a DB_CHANGE decision, and future adaptation policy.
- **Verification:** contract-shape/invariant tests, AI/rules source-parity tests, persisted-program loss/incompatibility tests, and governance/dependency validation.
- **Acceptance:** Workout consumes only the shared resolved contract; Program/Prescription owns WHAT, Orchestrator derives HOW/topology; the contract carries explicit mode/targets/set/rest semantics, versioning, and compatibility behavior without freezing an implementation storage schema prematurely.
- **Real device:** not required; this is a pure architecture/contract prerequisite.

## WP-14 — Orchestration control-state capability reconciliation *(CRITICAL follow-up; single writer)*

- **Purpose:** complete the narrowly missing orchestration capability required by the approved control-surface boundary, without reopening or rewriting WP-02's historical CLOSED/FROZEN scope.
- **Dependencies:** WP-02, WP-06, WP-07; consumes the frozen base orchestration/view-model contract plus the accepted SET_RESULT and REST capability boundaries.
- **Ownership scope:** orchestration-authority extension only: approved control actions, session-scoped deferred/skipped state, completion eligibility, and the exit action contract required by downstream consumers.
- **Outputs:** versioned orchestration capability contract and adapter seam exposing the approved actions/state to consumers; verification evidence that unresolved deferred work blocks completion.
- **Prohibited scope:** modifying WP-02 historical close-out, presentation/control-surface UI, prescription writes, new global state machines, product scheduling policy, WORKOUT_RESULT presentation, or Owner-gate changes.
- **Verification:** orchestration contract tests, capability-provider/consumer DAG validation, negative readiness test proving WP-08 remains blocked without this capability, and adapter contract tests.
- **Acceptance:** the capability is CLOSED/FROZEN only after its contract/state/action boundary is verified; WP-08 can then become READY_DERIVED without owning orchestration state or transitions.
- **Real device:** not required for this contract/orchestration prerequisite.

## GATE-01 — Workout Experience Block-Completeness Audit *(Run 3; non-executable gate)*

- **Purpose:** audit the implemented and accepted reusable Workout Experience capabilities against `spec.md`, rather than inferring completeness from planned work-package completion.
- **Dependencies:** accepted START/PREPARING/INTRO boundary plus accepted WP-06, WP-07 and WP-12 freezes. Other required capabilities are audit subjects, not assumed complete dependencies.
- **Scope:** capability inventory, orchestration boundaries, controls, degraded behavior, localization/accessibility and completion/recovery contracts.
- **Outputs:** explicit `BLOCK_COMPLETENESS = PASS|FAIL` evidence and a list of any genuinely missing reusable capabilities.
- **Rule:** on FAIL, admit/implement only the missing capability or capabilities, then repeat the audit. No Prototype Composition is permitted before PASS.
- **Owner gate:** this is machine/agent completeness and integration verification; it is not the complete-flow Owner visual gate.
- **Status:** non-executable; does not admit Run 1, Run 2, or Run 4.

## Roadmap overlay *(non-executable)*

1. **RUN 1:** WP-06 (`SET + SET_RESULT`) ∥ WP-07 (`REST`), then task-scoped machine/agent verification and freeze evidence.
2. **Control-state prerequisite:** WP-14 (orchestration control-state capability reconciliation), then WP-08 (session controls + outcomes) with task-scoped machine/agent verification and freeze evidence.
3. **RUN 2 prerequisite:** WP-13 (shared Program ↔ Workout prescription contract), then WP-12 (`WORKOUT_RESULT + EXIT`) with task-scoped machine/agent verification and freeze evidence.
4. **RUN 3:** GATE-01. If it fails, admit only missing reusable capability/capabilities and repeat the gate.
5. **RUN 4:** program-driven Product Composition only after `BLOCK_COMPLETENESS = PASS`; the historical prototype label is retained only in evidence records. Close-out evidence is recorded in the canonical execution projection and `RUN-4-PROGRAM-COMPOSITION-closeout.json`.
6. **RUN 5:** targeted machine/agent regression verification, complete-flow Owner visual acceptance, one consolidated correction batch if required, machine regression, complete-flow Owner re-review, and freeze.

The product implementation must prove that changing only resolved Program data changes topology
(2/3 Sets → 3/1 Sets) through the same reusable capabilities.

## Downstream product-integration packages (Owner-authorized 2026-09-19)

### WP-15 — Real product entry and Workout V2 promotion *(CRITICAL product integration; single writer)*

- **Purpose:** make the existing Workout Experience V2 implementation the normal authenticated workout experience reached from Dashboard/Program navigation, without creating a second product flow.
- **Dependencies:** `RUN-4-PROGRAM-COMPOSITION`, `WP-13`; consumes the existing Program API, localized routing, AppShell/PWA shell, shared prescription adapter, and frozen orchestration/presentation capabilities.
- **Ownership scope:** normal workout route adapter, real Program-derived V2 launch, session start/result persistence seam, normal exit back to the localized Dashboard, and compatibility treatment for the historical review route.
- **Prohibited scope:** changing Program prescription semantics, test-identity conditionals, hidden QA links, new orchestration authority, Production/Beta deployment, or per-task Owner review.
- **Verification:** route/navigation tests, persisted Program-to-shared-contract tests, result/exit persistence tests, EN/FA + RTL, dark/light, responsive/PWA-shell checks, and browser console/runtime evidence.
- **Acceptance:** the normal authenticated product path launches V2 from the resolved Program; changing the Program changes topology without fixture-specific presentation code; no phone/user/account identity is read by product behavior.
- **Real device:** installed-app semantics remain part of downstream complete-flow acceptance evidence; machine checks cover the route/service-worker/manifest contract where the environment permits.

### WP-16 — QA Program through the real domain path *(CRITICAL data/verification integration; single writer)*

- **Purpose:** provide a small repeatable QA Program input through the existing persisted Program/Prescription path so integration verification exercises multiple Exercises, asymmetric sets, `REP_BASED`, `TIME_BASED`, between-set/between-exercise rest, and explicit fallback duration where applicable.
- **Dependencies:** `WP-15`, `WP-13`; uses existing Program persistence/seed/fixture mechanisms and the shared contract rather than a product-only fixture route.
- **Ownership scope:** QA/test data and contract/domain verification only; Program-owned order and prescription values remain authoritative.
- **Prohibited scope:** hardcoded test identities, product conditional branches, a second Workout implementation, adaptation policy, or schema migration unless a separately admitted DB_CHANGE becomes necessary.
- **Verification:** persisted QA input resolves through the same API/domain adapter as ordinary Programs; contract invariants and topology proofs cover the required modes/rest/fallback/order semantics.
- **Acceptance:** the QA Program is a data input to the real product path, not a numbered presentation flow; no product code depends on who receives it.
- **Real device:** not required for the data package; it contributes evidence to the downstream complete-flow checkpoint.

### PRODUCT-INTEGRATION-CHECKPOINT — Complete-flow machine integration gate

- **Dependencies:** `WP-15`, `WP-16`, and the prior `INTEGRATION-CHECKPOINT-WORKOUT-V2-COMPLETE-FLOW`.
- **Scope:** authoritative governance/admission checks, production build, relevant unit/contract/browser coverage, normal authenticated route evidence, QA Program topology proof, PWA shell checks where automatable, and branch/PR CI tied to the exact verified SHA.
- **Rule:** PASS establishes a new auditable known-good baseline; FAIL blocks downstream progression and is repaired/rerun within authority.

### BETA-DEPLOYMENT-AUTHORIZATION — existing deployment-authority Human Gate

- **Dependencies:** `PRODUCT-INTEGRATION-CHECKPOINT`.
- **Scope:** the Owner authorized Beta-only deployment on 2026-09-19. This gate records that decision; it does not invent a Beta host, workflow, compose file, secret source, or deployment authority.
- **Current reconciliation:** authorization is accepted and the canonical Beta path is established through the existing constrained gateway with an explicit Beta target, isolated volume/port, protected environment, and rollback identity.
- **Rule:** this is a genuine deployment-authority gate, not a product scheduling choice and not Owner visual acceptance. The derived Beta deployment capability and deployment checkpoint remain upstream of RUN-5.

### BETA-DEPLOYMENT-CAPABILITY — canonical Beta path prerequisite

- **Dependencies:** `BETA-DEPLOYMENT-AUTHORIZATION`, `PRODUCT-INTEGRATION-CHECKPOINT`.
- **Purpose:** establish and verify a governed Beta deployment path using the existing constrained gateway, exact-SHA identity, rollback, runtime, and environment controls.
- **Canonical target:** `beta.apexhomefit.ir` → existing AHF host → Nginx TLS/reverse proxy → `127.0.0.1:3100` → isolated `ahf_beta_db` volume. The repository-owned Beta Compose template and gateway action are the canonical deployment path; host configuration is verified without exposing secrets.
- **Status:** CLOSED/FROZEN — governed Beta path established and deployed on 2026-09-19; exact source/build identity, Production non-interference, database hash stability, health, and rollback were verified.
- **Verification:** gateway source-ref/branch+PR CI checks, immutable Beta images, exact deployed SHA/build identity, protected Beta environment shape, Production topology non-interference, database hash stability, health/readiness, and rollback proof; evidence is recorded in `docs/checkpoints/WORKOUT-V2-BETA-DEPLOYMENT-01.json`.
- **Prohibited scope:** Production deployment, PR merge, bypassing the Production gateway, arbitrary host/compose/secret selection, or weakening deployment security.

### BETA-DEPLOYMENT-CHECKPOINT — deployed Beta identity and runtime gate

- **Dependencies:** `BETA-DEPLOYMENT-CAPABILITY`.
- **Scope:** exact deployed SHA/build identity, deployment success, rollback identity, route/runtime/assets/CSP/network verification, and the Beta authenticated entry boundary; complete-flow visual/device acceptance remains RUN-5.
- **Rule:** PASS is recorded only with authoritative branch/PR CI, exact deployed identity, rollback, health, and Beta route evidence; PASS unblocks RUN-5 without satisfying its Human Gate.

## Consolidated RUN-5 correction cycle — Owner-authorized 2026-09-20

The first integrated Desktop + real-iPhone review rejected the candidate. The
following downstream packages are correction work, not reopening of historical
WP-02/WP-08/WP-09/WP-12/WP-13/WP-15/WP-16 truth. The packages are selected by
the DAG and remain subject to the existing admission and checkpoint contracts.

### WP-17 — INTRO→SET execution and lifecycle binding correction *(CRITICAL; single writer)*

- **Purpose:** repair the orchestration/state-binding defect that leaves INTRO
  in a deferred/demo state after `PERFORM_NOW`, and reconcile stage-aware result
  and Exit controls from the canonical session lifecycle.
- **Dependencies:** WP-14, WP-12, WP-15.
- **Ownership scope:** the existing Session Orchestrator and its thin adapter;
  current-exercise/current-set resolution; lifecycle-derived presentation
  read-model; persisted session completion handoff only where its existing
  contract is already determined.
- **Required evidence:** INTRO action crosses into the actual SET through the
  orchestrator; SET→SET_RESULT→REST/next obligation reaches normal result;
  deferred resurfacing, skip routing, no terminal REST, restart, and Exit
  semantics remain intact; no stale ordinal, active-control, or result copy is
  rendered from independent stage state. Audit scheduledFor/performedAt/date
  attribution and document evidence or derive a bounded repair.
- **Prohibited scope:** presentation-owned routing, prescription mutation,
  fixed fixture sequencing, test identity logic, and inventing skip-all credit.

### WP-18 — Exercise Passport and protected Mentor composition correction *(CRITICAL; UI + domain read-model)*

- **Purpose:** extend the existing Exercise/Movement authority into the
  minimum canonical Exercise Passport consumed by Workout presentation, and
  establish the protected Mentor-stage/adaptive composition contract.
- **Dependencies:** WP-09, WP-15.
- **Ownership scope:** existing Exercise/Movement metadata adapter and the
  reusable INTRO composition boundary; exercise-specific coaching/setup and
  Mentor capability resolution; structural responsive invariants.
- **Required evidence:** coaching resolves from the current canonical Exercise
  authority (no Squat copy on unrelated identities); unsupported Mentor assets
  degrade honestly; adding/removing secondary INTRO controls does not translate
  the Mentor anchor within one layout class; safe-area, RTL/LTR, theme, reduced
  motion, and 360px behavior remain covered.
- **Prohibited scope:** duplicate Exercise storage, per-exercise INTRO
  conditionals, root-motion assumptions without evidence, renderer replacement,
  camera/tracking authorization, and fixed QA topology.

### WP-19 — controlled QA visual-validation fixture correction *(STANDARD; data/fixture only)*

- **Purpose:** reconcile the persisted QA input used by the next Owner review
  to exactly two ordered exercise entries, both supported by the Squat Mentor
  path, while retaining arbitrary-N Program semantics.
- **Dependencies:** WP-16, WP-18.
- **Ownership scope:** canonical QA data/fixture and its bounded Beta data
  operation; exercise count/order, independently resolved set/mode/rest,
  duration/fallback, calories/labels, and schedule/session association.
- **Required evidence:** the same normal Program/Prescription path resolves
  the two-entry fixture; no stale three-exercise metadata remains; no product
  code branches on the QA identity or assumes two Squats globally.
- **Prohibited scope:** new workout implementation, identity shortcuts,
  production data mutation, or changes to the general Program contract.

### SKIP-ALL-COMPLETION-SEMANTICS-DECISION — downstream Owner decision gate

- **Purpose:** resolve the genuine product boundary between terminal
  `SKIPPED_FOR_SESSION` obligation resolution and successful workout
  completion/adherence credit.
- **Dependencies:** WP-17.
- **Owner gate:** required. Existing AL-01 completion vocabulary is evidence,
  not an inferred persistence policy. The DAG remains blocked until the Owner
  defines the canonical ended/non-credit outcome and its Dashboard/adherence
  attribution.

### WORKOUT-V2-CORRECTION-INTEGRATION-CHECKPOINT — complete corrected-flow machine gate

- **Dependencies:** WP-17, WP-18, WP-19, SKIP-ALL-COMPLETION-SEMANTICS-DECISION.
- **Scope:** authoritative CI, build/typecheck/tests, full canonical Dashboard
  → START → PREPARING → INTRO → SET → SET_RESULT → REST/next → result path,
  alternate defer/skip routing, passport/coaching resolution, protected Mentor
  composition invariants, date attribution evidence, and fail-closed lifecycle
  controls.
- **Rule:** PASS establishes a new known-good source SHA; FAIL blocks downstream
  deployment and is repaired/rerun within authority.

### WORKOUT-V2-CORRECTION-BETA-DEPLOYMENT-CHECKPOINT — corrected Beta gate

- **Dependencies:** WORKOUT-V2-CORRECTION-INTEGRATION-CHECKPOINT,
  BETA-DEPLOYMENT-CAPABILITY.
- **Scope:** deploy the exact CI-verified source through the existing governed
  Beta gateway, verify deployed SHA/build identity, rollback identity, runtime
  assets/CSP/network/route behavior, and the normal authenticated product path.
- **Rule:** PASS is required before RUN-5; Production remains untouched.

## Run 1 close-out — 2026-09-19

`WP-06` and `WP-07` were admitted as the two repository-selected Run 1 child
units, implemented, task-scoped verified, and then frozen CLOSED. The close-out
reports are [`WP-06-closeout.json`](../../../reports/workout-v2-impl-01/WP-06-closeout.json)
and [`WP-07-closeout.json`](../../../reports/workout-v2-impl-01/WP-07-closeout.json);
shared UI conformance evidence is in
[`run-1-ui-conformance-evidence.md`](../../../reports/workout-v2-impl-01/run-1-ui-conformance-evidence.md).
No Owner visual acceptance was required for either child. The canonical
execution projection now exposes WP-14 as the orchestration prerequisite;
WP-08 and WP-12 remain blocked until their declared capability providers are
verified and frozen.

## Convergence checklist (when implementation lands)

- [ ] Spec status/implementation state updated; this file marked `CLOSED`/`SUPERSEDED`
- [ ] ADR recorded for the session-contract change
- [ ] `docs/TASKS.md` lifecycle fields updated; report per `docs/AI_CHANGE_TEMPLATE.md`
- [ ] Admission record transitions to GRANTED only via Owner authorization

## HANDOFF

| Field | Value |
|---|---|
| CURRENT_STATUS | `RUN_1_CLOSED` — WP-06 and WP-07 are frozen after task-scoped verification; WP-14 is the next orchestration prerequisite |
| NEXT_ACTION | Repository-derived admission of WP-14 when autonomous execution resumes; WP-08 and WP-12 remain capability-gated |
| NEXT_ACTION_AUTONOMOUS | `YES` |
| BLOCKERS | WP-14 control-state capability is not yet verified/closed; no unresolved Owner decision |
