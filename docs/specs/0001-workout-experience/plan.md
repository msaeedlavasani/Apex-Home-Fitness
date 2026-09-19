# PLAN 0001 — Workout Experience (Guided Workout Player) — V2 Implementation Architecture

| Field | Value |
|---|---|
| STATUS | `READY — implementation-ready architecture (CRITICAL admission preparation)` |
| SPEC | [`spec.md`](./spec.md) — the controlling product contract (SPEC_READINESS: READY; BLOCKING_OWNER_DECISIONS: NONE) |
| TASK | `WORKOUT-V2-IMPL-01` — CRITICAL implementation-admission preparation |
| TASK_PROFILE | `PRODUCTION_BOUND` (implementation, once authorized) |
| IMPLEMENTATION | **NOT AUTHORIZED** — this plan prepares admission only (see §19 non-goals and HANDOFF) |
| Date | 2026-09-15 · Baseline: main `897e376` (fresh canonical main; V1 prototype branches are evidence only — §14) |

This plan **prepares** the implementation architecture for the whole Workout Experience before any code is written. It invents no product semantics: every rule below derives from `spec.md`. Where the spec is silent, this plan proposes an **implementation decision** and labels it as such.

## 1. System context (current architecture, evidence-based)

From [`../../CURRENT_SYSTEM_BASELINE.md`](../../CURRENT_SYSTEM_BASELINE.md) and the current codebase:

- Next.js App Router; **pure session core** `src/lib/workout/sessionCore.ts` (ADR-0002) + thin React adapter `src/components/workout/useWorkoutEngine.ts` + `WorkoutPlayer.tsx` on `/[locale]/workout`.
- The core today has a **fixed phase set** (`READY/EXERCISING/RESTING/COMPLETED`) and a global `autoAdvance` boolean; there is **no orchestration layer** and **no modular composition**.
- Offline snapshots (`src/lib/offline/*`, S-05 versioned snapshots) and conflict policy already exist.
- Program data arrives via the normalized program contract + `programSchedule` enrichment; Prisma/SQLite server plane; `exerciseId` identity (ADR-0001).
- Localization (fa/en), platform kit, DESIGN_SYSTEM, ADR-0005 mobile guardrails, TS-01 privacy posture are binding.

**Consequence:** V2 needs a real contract extension of the pure core + a new orchestration boundary. That is why the implementation is CRITICAL-class.

## 2. Binding rules carried from the spec (must survive in every work package)

Modular composition with orchestration authority · `EXERCISE_IDENTITY != WORKOUT_PRESCRIPTION` · two first-class prescription modes as **one** `SET` capability · one mode-aware progress capability · `INTRO` once per new Exercise identity · REST owns no Intro/Next-Exercise/identity/order · Next-Exercise = identity change only · `SET_RESULT` follows every completed Set · auto-advance default with `CONFIRMATION_REQUIRED` permitted · the six v1 controls only · deferral never mutates the prescription and must resurface before `WORKOUT_RESULT` · skipped ≠ completed ≠ failed · moving demonstration in the normal experience with **no renderer/3D/format/pipeline mandate** and a usable degraded mode · one accessibility contract for timers/controls · functional audio cues supplementary · Voice/TTS deferred · no silent behavior change (RELEASE_POLICY RULE 4).

**Explicit architecture non-goals:** TIME_BASED-only execution · global three-set or single-exercise assumptions · prototype timing constants as defaults · `REST_NEXT_PREVIEW` semantics · next-set-as-Next-Exercise · Intro inside REST · Three.js/3D/renderer/asset-format/tracking mandates · prototype state names as canonical vocabulary · pixel-perfect prototype layout · the legacy unreliable START interaction · the confusing same-exercise rest preview behavior · an independent `EXERCISE_TRANSITION` top-level module · fixed 2×2 validation-fixture topology as architecture.

## 3. Shared V2 architecture

**Workout Session = Resolved Prescription + Session Orchestration + Composed Experience Modules.**

The final prototype is a **resolved Workout Program input** to this architecture,
not a manually authored screen/Set/REST sequence. The Orchestrator derives the
runtime topology from the resolved Program and supplies each current state to the
same reusable capabilities. Program-only topology changes must not require new
presentation components, exercise-number-specific flows, or route rewrites.

Implementation boundaries (mapped to the current codebase — **not** one component per product module):

| Layer | Implementation boundary (proposed) | Owns |
|---|---|---|
| **Session core (contract extension)** | `src/lib/workout/sessionCore.ts` evolved additively: module/phase vocabulary + progression policy (`AUTO` \| `CONFIRMATION_REQUIRED`) | Pure state transitions; no I/O, no React |
| **Orchestration** | New pure module `src/lib/workout/orchestration.ts` (orchestrator contract) + adapter wiring in `useWorkoutEngine` | Applicability · module order · active exercise · set/rest progression · transitions · deferred/skipped resolution · completion eligibility · session actions |
| **Experience presentation** | `src/components/workout/experience/*` (shell + stage components) | Rendering current state; per-module local behavior only |
| **Mentor presentation** | Boundary component (lazy, capability-detected) | Demonstration + degraded presentation |
| **Progress** | ONE mode-aware progress component | Display of prescription/session state |
| **Audio cues** | Small cue capability reacting to state | Supplementary cues only |
| **Controls** | Control surface dispatching orchestration actions | No progression logic |

Rules: presentation never sequences; no module owns global progression; no competing mini state machines; one source of progression truth (orchestration). Product capability names (START/PREPARING/INTRO/SET/SET_RESULT/REST/WORKOUT_RESULT/EXIT) are **concepts**, not a required file/component inventory. Legacy implementation labels may be retained only as compatibility aliases; `EXERCISE_TRANSITION` is not an independent top-level module.

`currentExerciseIndex` and `currentSetIndex` may be runtime coordinates for the
active state, but they are never semantic routing authorities. The Orchestrator
must evaluate remaining Sets, eligible next Exercises, deferred obligations,
skipped-for-session Exercises and completed Exercises; array position alone cannot
choose the next Exercise, enter `WORKOUT_RESULT`, or declare completion.

## 4. Prescription contract

- `EXERCISE_IDENTITY != WORKOUT_PRESCRIPTION`: identity says *what movement*; the prescription says *how it is prescribed here*.
- Execution semantics are **explicit on the resolved prescription** before the session consumes it: `executionMode ∈ {REP_BASED, TIME_BASED}` + targets (reps or seconds) + set count + rest per prescription.
- **One capability**: `SET` renders/executes either mode; progress unit follows the mode. `WORK_SET` is a compatibility implementation label only.
- HOLD is **not** a third mode in v1; a static hold is `TIME_BASED` with distinct movement/coaching semantics.
- Every camera-less-capable `REP_BASED` prescription resolves a `fallbackDuration`; runtime fallback never rewrites the original mode.
- **Source independence:** AI, rules, and future authorized adaptation must all resolve into this **same canonical prescription contract**; provenance must not change execution semantics.
- **Storage of the mode remains an implementation decision** (spec §16) — this plan deliberately does **not** select a schema. **WP-03** may propose an additive representation (existing `ProgramExercise`/enrichment surfaces first) inside its **DB_CHANGE** gate if a schema change proves necessary; no other work package may touch the prescription data representation.
- **No hardcoded per-exercise modes**; no invented policy that chooses between modes (that policy is future authorization).

### 4.1 Shared-boundary audit (2026-09-19)

The repository audit found that the existing artifacts are only partial
implementations of this boundary. `src/lib/ai/contracts.ts` is the validated
generator-output contract, while `src/lib/workout/resolvedPrescription.ts`
is a consumer-local in-memory resolver over `SessionExercise`; neither is the
one shared, versioned Program ↔ Workout contract required by this plan. The
persisted `ProgramExercise` representation also does not preserve explicit
execution mode or duration semantics for every AI/rules source.
The current V2 shape also has no explicit `fallbackDuration`, although the
spec requires a resolved camera-less fallback for eligible `REP_BASED`
prescriptions.

Before `WP-12`, `GATE-01`, or program-driven composition, `WP-13` must define
the minimum canonical boundary without prematurely selecting a storage schema:

- shared domain semantics for exercise identity/order, explicit
  `REP_BASED`/`TIME_BASED` mode, mutually exclusive targets, set count, rest,
  and any required camera-less fallback duration;
- a machine-readable versioned shape and source-independent AI/rules/persisted
  adapters;
- deterministic fail-closed validation invariants and compatibility rules;
- no presentation topology fields (`INTRO`, `SET`, `REST`, etc.), because the
  Workout Session Orchestrator derives HOW from the resolved WHAT.

The existing versioned AL-01 `WorkoutOutcomeRecord` is the downstream
Progress/Adaptation-facing outcome authority. A separate durable adaptation
policy or duplicate outcome schema is not authorized by this audit; `WP-13`
must define only the narrow mapping seam from a future Workout Session Result
to that existing record.

## 5. Session orchestration contract

Owns: session lifecycle · composed capability order · active Exercise · **Set progression** · **REST progression** · exercise-boundary transition semantics · deferred Exercises · skipped-for-session Exercises · completion eligibility · pause/resume · exit boundary · auto vs confirmation-required transitions. `SET`, `SET_RESULT` and `REST` return state/result/intent to this layer; none owns global sequencing or directly routes to another capability.

Session states (implementation view): `LOADING → READY → (PREPARING) → [Exercise Blocks…] → WORKOUT_RESULT → EXIT`, with orthogonal flags: `PAUSED`, `EXITED`, deferred Exercise, skipped Exercise.

- `WORKOUT_RESULT` is reachable **only** when no required unresolved Exercise obligation remains; there is no terminal REST after the final required Set.
- Pause preserves position and execution context; exit is distinct from complete.
- Confirmation gates are orchestration/prescription-applicability rules — never module-owned branches.

## 6. Exercise Block contract

An **Exercise Block** is composed from the resolved prescription:

```
INTRO (once, new identity) → SET × N (prescription-driven), with `SET_RESULT` after every completed Set and `REST(BETWEEN_SETS)` or `REST(BETWEEN_EXERCISES)` selected by orchestration.
```

Rules: Intro once before the first Set of a new identity; additional Sets never repeat Intro; “Next Exercise” only on identity change; Set count, execution mode, targets and duration all come from the resolved prescription. The Orchestrator, not `SET_RESULT` or presentation, selects the next destination.

## 7. Session controls (v1 boundary)

In v1: `PAUSE/RESUME` · `EXIT WORKOUT` · `SKIP REST` · `RESTART CURRENT SET` · `DO EXERCISE LATER` · `SKIP EXERCISE FOR THIS SESSION`. Not v1: `SKIP SET`, `EXTEND REST`, `REDUCE REST`.

Proposed representation: controls dispatch **orchestration actions**; `DO LATER` maintains a **session-scoped deferred list** (execution order only — never written back to the prescription); deferred blocks must be resurfaced before completion and resolved as perform-now or skip-this-session; `SKIP FOR THIS SESSION` removes the block from outstanding work without marking completed/failed; `RESTART CURRENT SET` restarts only the active set; `SKIP REST` ends only the current rest.

### 7.1 Pre-workout capability gate and observation fallback

The admission boundary before Workout Experience is:

```text
Dashboard / Workout Launch
  → PRE_WORKOUT_CAPABILITY_GATE
  → Workout Experience
  → START → PREPARING → INTRO → …
```

This gate is not a Workout Exercise state. On every launch it silently checks Camera permission/capability and Pose/Skeleton Harness readiness. Valid capability proceeds without interruption or repeated prompting. If unavailable or not granted, the user receives a clear movement-tracking explanation and may choose to enable Camera. `YES` requests permission, initializes the Harness, and completes required calibration before Workout Experience; `NO` enters without tracking. A calibration failure offers corrective guidance + Retry and always offers Continue without camera tracking. Permission granted is not Harness readiness, and no first-time permission/calibration flow may interrupt an active Set.

Runtime strategy remains separate from prescription mode: `REP_BASED` + usable capability → `TRACKED_REP`; `REP_BASED` without usable capability → `TIMED_FALLBACK` using the resolved `fallbackDuration`; `TIME_BASED` → `TIMED`. Tracking loss attempts reacquisition, preserves completed performed-rep progress, and falls back without rewriting the prescription. Exact thresholds, algorithms and mid-Set remaining-time policy are implementation-deferred.

The CP-04 privacy boundary applies: raw camera imagery is processed locally and is not sent to the AHF server in the normal movement-tracking pipeline. Only structured/derived movement information explicitly required by an authorized contract may cross that boundary.

### 7.2 Independent Run 1 capability boundaries

Run 1 contains two independent reusable workstreams:

- **Workstream A — `SET + SET_RESULT`:** executes the current resolved Set and presents stable completed-Set result/evidence. It returns state/result/intent to the Orchestrator and does not own REST, INTRO, or global sequencing.
- **Workstream B — `REST`:** executes the current typed REST and its approved controls. It returns state/result/intent to the Orchestrator and does not own SET, INTRO, or global sequencing.

They may be delivered in one implementation run, but neither capability is a
sub-capability of the other and neither may route directly to the next global
state.

## 8. Mentor presentation boundary

Mentor/demo is a **consumer** of session state and must never own orchestration. The normal v1 target is a moving/animated, Mentor-centered demonstration; the architecture must **not mandate** Three.js, 3D, a renderer, an asset format, or tracking technology. Required: capability detection, a **degraded mode** preserving identity/static visual where available/essential cue/set-progress state/mode-aware progress/controls, and **recognisable-and-instructive** fidelity.

## 9. Progress contract

One mode-aware progress capability: `REP_BASED` → `completed/target` (e.g. `6 / 10`); `TIME_BASED` → `remaining/elapsed` (e.g. `40 → 0`). It displays state; it never owns progression. No parallel per-mode progress subsystems.

## 10. Audio / accessibility boundary

Functional audio cues (countdown, start, end, rest-ending) are **supplementary**; no essential state may be audio-only or motion-only; the accessibility baseline (non-animation-only timers, reduced motion, accessible controls, contrast, mobile width) is part of the stage acceptance criteria. Voice/TTS stays deferred.

## 11. Ownership rules (one owner per responsibility)

| Responsibility | Sole owner |
|---|---|
| State transitions | session core (pure) |
| Sequencing/applicability/order/completion | orchestration |
| Rendering current state | presentation modules |
| Prescription semantics | resolved prescription contract |
| Deferred/skipped session state | orchestration (session-scoped) |
| Canonical prescription data | untouched by any control |

No duplicated progression logic; no module-level progression forks.

## 12. Data/state flow

```
program (identity + prescription fields)
   → resolved prescription (explicit executionMode + targets + sets + rest)
      → orchestration (module order, active block, set/rest state, deferred/skipped, completion)
         → presentation (shell + module views), mentor (demo/degraded), progress (mode-aware), audio (cues)
            → user controls → orchestration actions (never prescription writes)
```

## 13. Failure / degraded behavior

Demo/renderer failure → degraded presentation, workout fully usable; asset failure → same; no silent completion with unresolved deferred blocks; offline resume keeps the existing snapshot contract.

**Rollback:** every work package lands behind stage-level reversibility (feature flag or page-level rollback); the shipped V1 player remains the operational fallback until a stage freezes; release-level rollback follows `docs/RELEASE_POLICY.md`.

## 14. V1 branch evidence policy (read-only audit, 2026-09-15)

| Branch | Facts | Classification |
|---|---|---|
| `prototype/workout-layout-blueprint` | 19 commits ahead / **12 behind main**; 58 files vs main; contains the richest exploration (intro experience, unified set presentation, rest preview fix, 3D mentor, viewport conformance doc) | **REUSABLE_IMPLEMENTATION_EVIDENCE / DIAGNOSTIC_EVIDENCE / USEFUL_ASSET** — selectively, re-expressed against current contracts. **Never a V2 baseline** (missing 12 commits of governance/spec artifacts) |
| `prototype/ahf-3d-mentor-baseline` | 1 commit; **ancestor of blueprint**; 33 files | **USEFUL_ASSET / DIAGNOSTIC_EVIDENCE** (superseded by blueprint for exploration) |
| `diagnostic/b2-3b-rest-handoff` | 18 commits; blueprint + intro components + gated runtime handoff diagnostics (debug overlay + shell tracing) | **DIAGNOSTIC_EVIDENCE** (instrumentation; do not ship) |

Per-difference classification rule for the implementation task: `CANONICAL_REQUIREMENT` (already in spec), `REUSABLE_IMPLEMENTATION_EVIDENCE` (concept/mechanics re-implementable against contracts), `USEFUL_ASSET` (e.g. the mentor GLB, viewport conformance findings), `DIAGNOSTIC_EVIDENCE` (bugs found: START unreliability, same-exercise rest preview confusion), `LEGACY_BEHAVIOR_DO_NOT_COPY` (§2 list), `CONFLICT_WITH_CURRENT_SPEC` (any prototype state/behavior contradicting the spec), `UNKNOWN_REQUIRING_REVIEW`.

**V1 evidence worth reusing (validated against the spec):** session/state concepts (re-expressed, not copied) · deadline-based timing · pause/resume timeline preservation (an existing core behavior) · persistent mentor lifecycle · set progression & rest mechanics (as concepts) · locale routing · prototype isolation · real-device findings (START reliability, rest-preview confusion, viewport behavior) · the mentor GLB asset and the viewport/safe-area conformance findings.

## 15. Migration strategy (V1 evidence → V2)

1. V2 is built **cleanly on fresh main** after authorization; the prototype branches are **read-only evidence**.
2. Promotion of any concrete artifact (e.g. the mentor GLB, a viewport CSS pattern) requires an explicit note in the work package that owns it, with the classification above.
3. Prototype state names, timing constants, TIME_BASED-only assumptions, `REST_NEXT_PREVIEW`, THREE.js/3D mandates, pixel-perfect layout, independent `EXERCISE_TRANSITION`, and fixed 2×2 validation-fixture topology are **explicitly excluded**.
4. The legacy START interaction is treated as a **known acceptance risk** — redesigned and explicitly tested (§17), never inherited.
5. The same-exercise rest preview behavior is **not** carried forward; the spec’s set/rest/next-exercise rules govern.

## 16. Testing strategy (per `docs/CI.md` targeted-first policy)

| Layer | Used by |
|---|---|
| typecheck/lint/static | every WP |
| unit | pure modules (prescription resolution, orchestration, progress) |
| session-core contract/golden traces | WP-01/02 (`tests/session-golden-trace.test.tsx` pattern) |
| integration (adapter/orchestration wiring) | WP-02/03 |
| contract tests | prescription + module contracts |
| targeted UI tests + mobile viewport (360px) | stage WPs |
| task-scoped real-device verification | relevant stage evidence; not an Owner visual gate; complete-flow Owner visual review occurs at RUN 5 |
| broader E2E | release/integration boundaries only (nightly lane) |

Full E2E after every small work package is **not** required (governance).

## 17. START readiness (first slice)

`START_DEPENDENCIES`: session-core contract extension (module/phase vocabulary) + orchestration skeleton (lifecycle, `READY → PREPARING`, start action) + experience shell (viewport/safe-area contract) + START stage component + locale-ready copy keys.
`START_SHARED_CONTRACTS`: session-core state/command/effect additions · orchestration action interface (`start`, `pause`, `resume`) · presentation view-model shape.
`START_ALLOWED_SCOPE`: `START` + `PREPARING` presentation; start/pause/resume actions; safe-area/viewport shell; fa/en copy; reduced-motion-safe static presentation.
`START_PROHIBITED_SCOPE`: `SET` execution, REST, transitions, deferral/skip, mentor implementation, schema changes, renderer/dependency choices, any control beyond start/pause/resume.
`START_TESTS`: unit (start/pause/resume transitions), orchestration contract tests, targeted UI test on both locales at 360px, real-iPhone tap/interactivity verification (the legacy reliability risk **must be explicitly verified**, not assumed).
`START_REAL_DEVICE_VERIFICATION`: **required** as task-scoped evidence; it does not create a per-task Owner visual gate.
`START_FREEZE_CRITERIA`: accepted against the shared V2 architecture (orchestration authority, no module-owned progression), fa/en + reduced motion verified, real-device START reliability evidenced, snapshot/resume intact.

## 18. Staged validation path (acceptance order, not a global model)

`START → PREPARING → INTRO/DEMO → SET → SET_RESULT → REST → next SET or next INTRO → WORKOUT_RESULT → EXIT` is the **walkthrough** used to accept stages; it must not be encoded as a global workout model (no fixed set count, no single-Exercise assumption, and no terminal REST).

Loop per stage: contract → implement stage → task-scoped machine/agent verification → **freeze the accepted boundary** → next stage. A freeze stabilizes the accepted boundary against the shared architecture; it never authorizes an independent architecture and does not require per-stage Owner visual acceptance.

### 18.1 Owner-directed implementation roadmap (non-authorizing)

The roadmap from the current accepted START/PREPARING/INTRO boundary is:

```text
RUN 1  → SET + SET_RESULT  ∥  REST
          → task-scoped machine/agent verification + freeze evidence
RUN 2  → WORKOUT_RESULT + EXIT
          → task-scoped machine/agent verification + freeze evidence
RUN 3  → WORKOUT EXPERIENCE BLOCK-COMPLETENESS AUDIT / GATE
          → if FAIL, admit only genuinely missing reusable capability/capabilities
RUN 4  → PROGRAM-DRIVEN PROTOTYPE COMPOSITION
RUN 5  → targeted machine/agent regression verification
          → complete-flow Owner visual acceptance
          → one consolidated correction batch if required
          → machine regression → complete-flow Owner re-review → freeze
```

RUN 1 workstreams remain independent even when implemented in the same overall
run. RUN 2 must not expand into full prototype composition. RUN 4 is permitted
only after the dedicated completeness gate returns PASS.

### 18.2 Program-driven composition proof

The final composition must prove that only resolved Program data changes topology:

| Resolved prototype input | Expected topology evidence |
|---|---|
| Program A: Exercise 1 = 2 Sets; Exercise 2 = 3 Sets | Two Exercise identities with asymmetric Set counts |
| Program B: Exercise 1 = 3 Sets; Exercise 2 = 1 Set | A different executed topology from the same reusable capabilities |

The proof fails if satisfying Program B requires another SET, SET_RESULT, REST or
INTRO component, an exercise-number-specific flow, or manual route sequencing.

### 18.3 Workout Experience Block-Completeness Audit / Gate

After accepted START/PREPARING/INTRO, `SET + SET_RESULT`, `REST`, and
`WORKOUT_RESULT + EXIT`, perform a dedicated audit against the canonical capability
vocabulary and acceptance criteria. The audit must verify every reusable capability
and required cross-capability contract needed for a complete Workout Experience;
completion of planned blocks alone is not evidence of completeness. A missing
capability yields `BLOCK_COMPLETENESS = FAIL` and only that genuinely missing
capability may be admitted before re-running the audit. `RUN 4` is allowed only
when `BLOCK_COMPLETENESS = PASS`.

## 19. Non-goals (this plan)

No product semantics beyond the spec · no implementation · no V2 branch creation · no schema/storage decision · no renderer/dependency choice · no Voice/TTS · no observation/camera integration (separately gated) · no prototype branch merge/rebase.

## HANDOFF

| Field | Value |
|---|---|
| CURRENT_STATUS | `READY — implementation-ready architecture; admission NOT granted` |
| NEXT_ACTION | Owner reviews the CRITICAL implementation-admission package (PR) and authorizes or rejects `WORKOUT-V2-IMPL-01` implementation |
| NEXT_ACTION_AUTONOMOUS | `NO` |
| BLOCKERS | Owner implementation authorization (admission DENIED by design until then) |
