# SPEC 0001 — Workout Experience (Guided Workout Player)

| Field | Value |
|---|---|
| STATUS | `CURRENT — Workout Experience V2 product implementation authorized; downstream product-integration work is staged before RUN-5 acceptance` |
| SPEC_CLASS | `STANDARD` (docs-only artifact; the eventual implementation is expected to be CRITICAL — see §0.1) |
| TASK_PROFILE | `CODE_NO_DEPLOY` |
| OWNER_GATE | **D2 APPROVED** (2026-09-14) + product-integration decision **AUTHORIZED 2026-09-19** — `SPEC_READINESS = READY`, remaining blocking product decisions = **NONE** |
| TASKS.md entry | [`../../TASKS.md`](../../TASKS.md) → `SPECKIT-PILOT-01` |
| Date | 2026-09-14 · Baseline: main `80b6eb5` · Prototype evidence: DEV `prototype/workout-layout-blueprint` @ `a62a7ce` |

```yaml
SPEC_READINESS: READY
BLOCKING_OWNER_DECISIONS: NONE
```

(The fenced block above is the machine-readable admission marker consumed by
`scripts/governance-runtime.mjs admission` — trust-boundary CHECK C.)

Labels: **CONFIRMED** (binding — owner decision or canonical authority) · **EXISTING** (implementation evidence only; never a source of intent, DOCUMENTATION-GOVERNANCE §2.6) · **DEFERRED** (explicitly non-blocking, non-authorizing — see §16).

**REMAINING_BLOCKING_PRODUCT_DECISIONS: NONE.**

## 0.1 Classification rationale

`STANDARD` for this artifact (specification/design documentation only — no source, schema, security-boundary, dependency, or deployment change). The **implementation** task is expected to be **CRITICAL**: it will touch the session-core contract (ADR-0002 boundary), the media/presentation boundary (MG-07), and possibly observation wiring.

## 0.2 Artifact set & template mapping

Owner-mandated pilot artifact set (`spec.md` + `plan.md` + prospective `tasks.md` + `pilot-assessment.md`), recorded as an owner-driven exception to the standing directory contract (`docs/specs/README.md` reserves `plan.md`/`tasks.md` to CRITICAL work). Template mapping: CURRENT_STATE_EVIDENCE → §1, §14, §19 · PRODUCT_REQUIREMENTS → §5 · NON_GOALS → §3, §15 · ACCEPTANCE_CRITERIA → §17 · ARCHITECTURE_IMPACT → §2 + plan §2–§3 · SECURITY_PRIVACY_IMPACT → §12 · LOCALIZATION_IMPACT → §8 · TESTING_REQUIREMENTS → plan §16 · ROLLBACK → plan §13 · HANDOFF → end. Open questions were **resolved** by owner decisions (see §19) and are no longer carried as unknowns.

---

## 1. Problem / user need

**CONFIRMED.** The current `/workout` route behaves like a *Workout Logger*: the user reads an exercise name, must already know how to perform it, counts repetitions, taps controls, and repeatedly returns attention to the screen. Beginners are the hardest-hit audience (`docs/product/PRODUCT-VISION.md` §3).

**CONFIRMED.** Canonical product principles framing the fix: “Guided and beginner-first — Show, don’t just tell” and “Hands-free by default — minimum interaction during exercise” (`PRODUCT-VISION.md` §4).

## 2. Scope and product model

**CONFIRMED — scope.** This specification defines the *product behavior* of the guided workout execution surface (the evolution of today’s `/workout` experience), independent of the program generator and independent of any renderer (ARCHITECTURE-PRINCIPLES §8, V2 §25).

**CONFIRMED — the session is a composition, not a fixed timeline.** Workout Experience is an ordered composition of independently defined, reusable capabilities. The canonical V2 capability vocabulary is:

`START` · `PREPARING` · `INTRO` · `SET` · `SET_RESULT` · `REST` · `WORKOUT_RESULT` · `EXIT`

These are product/architecture capabilities, **not** a required component or file inventory. Existing implementation identifiers such as `EXERCISE_INTRO` and `WORK_SET` may be compatibility labels for `INTRO` and `SET`, but they must not create a separate topology. `EXERCISE_TRANSITION` is not an independent top-level capability in the canonical model; exercise-boundary transition semantics are owned by orchestration around `REST` and the next `INTRO`.

**CONFIRMED — orchestration owns composition.** The session/orchestration layer owns: module applicability · sequencing · transitions · Exercise Block ordering · session-level actions · completion eligibility. Individual modules own only their local behavior. **No module may become a hidden global workout state machine.** A session is resolved from: the workout prescription · the active exercise · the current session state · future authorized session rules.

**CONFIRMED — Exercise Block.** An exercise is representable as a reusable composition:

```
INTRO → SET → SET_RESULT → REST → SET → SET_RESULT   (illustrative only)
```

This illustration must not imply exactly 3 sets, mandatory REST after every set, one execution mode, a fixed rep target, a fixed time target, or a fixed rest duration. The actual composition is derived from the **resolved prescription**.

**CONFIRMED — extensibility.** Future modules (`WARMUP`, `COOLDOWN`, `EQUIPMENT_SETUP`, `HYDRATION`, `ASSESSMENT`, `RECOVERY`) must be addable without redesigning the experience. They are **FUTURE EXAMPLES ONLY — NOT AUTHORIZED FOR V1**.

**CONFIRMED — resolved session shape.** The architecture is `WorkoutSession → Exercise[0..N] → Set[0..S_i]`. Exercise count/order, set count, execution mode, rep target and duration are resolved from the Program/Prescription. A current `2 Exercises × 2 Sets` walkthrough is a validation fixture only; it is not an architectural constant or a completion rule.

**CONFIRMED — authority boundaries.** Program/Prescription owns *what is prescribed*. The Workout Session Orchestrator owns *where the session is and what comes next*. The Execution Engine owns *how the current Set executes*. The Pose/Skeleton Harness supplies physical movement evidence. Presentation modules render resolved state and do not own global sequencing.

**CONFIRMED — program-driven composition.** Workout Experience V2 is the current product implementation. It consumes a resolved Workout Program through the reusable shared contract; it is not a manually authored sequence of screens, Sets, Rests, or exercise-specific routes. The Orchestrator derives runtime topology from the resolved Program and reuses the same `INTRO`, `SET`, `SET_RESULT`, and `REST` capabilities for every Exercise and Set. Changing only resolved program/prescription data must be capable of changing the executed topology without adding capability or exercise-number-specific flow components.

**CONFIRMED — asymmetric validation fixture.** Product integration must validate with a small persisted QA Program containing multiple Exercises, asymmetric Set counts, both `REP_BASED` and `TIME_BASED` prescriptions, and applicable between-set/between-exercise rest. A second program-only variant must be able to change topology without changing presentation components. These are validation inputs, not architectural constants; exercise identity, order, mode, targets, duration, fallback duration and Set counts remain resolved from the Program/Prescription.

**CONFIRMED — normal product entry.** An authenticated user reaches Workout Experience V2 through the existing Dashboard/Program/workout navigation and the persisted Program/Prescription domain path. An isolated review route is not an acceptance path, and product behavior must not branch on test identity.

## 3. Non-goals

- No program-generation change (generator stays source-independent).
- No camera/pose feature authorization — observation remains gated (CP-04/CP-05; TS-02; ADR-0021).
- No unrelated implementation or deployment in this artifact; the authorized downstream integration work is represented by `WP-15` and `WP-16` in the executable backlog.
- No renderer, animation format, asset pipeline, or tracking-technology selection.
- No schema/storage, event, persistence, or analytics representation decisions.
- The §2 future module examples are **not** v1 scope.

## 4. Experience intent

**CONFIRMED.** Bilingual (fa/en, RTL parity), mobile-first, offline-tolerant, accessible per `docs/DESIGN_SYSTEM.md` and ADR-0005.

**CONFIRMED — mobile posture: `WEB-SPECIFIC`** (browser-presentation experience; no native equivalent claimed; no new client storage beyond the existing offline contract) — ADR-0005 guardrail 3 / PRINCIPLES §13.3.

**CONFIRMED — “One tap to start. Minimum interaction until finish.”** After `Start Workout`, the session advances automatically; the user is not required to operate the app between ordinary sets.

**CONFIRMED — Mentor-centered presentation.** The intended **normal** v1 experience includes a **moving/animated exercise demonstration** as part of the Mentor-centered active workout experience. Guided motion is part of the primary experience, not an optional decorative enhancement. `MOVING DEMONSTRATION != 3D REQUIREMENT` (§5.7).

**CONFIRMED — mode-aware progress.** One conceptual progress capability whose presentation follows the active prescription mode (§5.4).

**CONFIRMED — quiet, low-noise feedback** (CP-01 companion posture; prototype cue copy is EXISTING evidence only).

## 5. Requirements

| ID | Requirement | Label |
|---|---|---|
| FR-1 | A session executes as an ordered composition of experience modules derived from the resolved prescription for the day | CONFIRMED |
| FR-2 | The UI renders session state; it does not own sequencing — orchestration owns applicability/sequencing/transitions | CONFIRMED |
| FR-3 | Session resumes correctly after page refresh / lost connection (no lost progress) | EXISTING + CONFIRMED (offline contract: ADR-0005 guardrail 2; S-05) |
| FR-4 | Workout remains playable offline (program cached; completed sets queued) | CONFIRMED (PRODUCT-VISION §4) |
| FR-5 | Exercise identity display uses canonical identity where resolvable; display names stay display-only | CONFIRMED (ADR-0001; PRINCIPLES §7) |
| FR-6 | One-tap start; automatic progression through sets/rests/transitions | CONFIRMED |
| FR-7 | “Next Exercise” preview appears **only** for an actual upcoming **different** exercise identity | CONFIRMED |
| FR-8 | A countdown may precede applicable module starts (placement and values per §16) | CONFIRMED (placement) |
| FR-9 | Pause/resume preserves the current session position and continues the same execution context | CONFIRMED |
| FR-10 | `WORKOUT_RESULT` is reached only when the composed session is fully resolved (no unresolved deferred Exercises) and then exits through `EXIT` | CONFIRMED |
| FR-11 | Both locales render the full experience (copy, numerals, direction) | CONFIRMED |
| FR-12 | Exercise demonstration media is self-hosted with content-integrity rules; no third-party CDN for product media (when media is introduced) | CONFIRMED (MG-07; ADR-0010) |
| FR-13 | Execution mode is explicit on the **resolved prescription** (`REP_BASED` \| `TIME_BASED`); the UI must not infer it from arbitrary values | CONFIRMED |
| FR-14 | A moving/animated demonstration is part of the intended normal v1 experience; **no** renderer/3D/format/pipeline/tracking mandate | CONFIRMED |
| FR-15 | Degraded mode keeps the workout fully usable when the demonstration cannot load/render (§5.7) | CONFIRMED |
| FR-16 | Functional audio cues are allowed/intended; audio is supplementary (never the only source of essential information) | CONFIRMED |
| FR-17 | The v1 session controls are exactly the set in §5.6 | CONFIRMED |

### 5.1 Prescription semantics (execution mode)

**CONFIRMED.** Exactly **two first-class v1 execution modes: `REP_BASED` and `TIME_BASED`.** Neither is deprecated, and neither is modelled as a workaround for the other.

**CONFIRMED.** `EXERCISE IDENTITY != WORKOUT PRESCRIPTION`. An exercise defines *what movement it is*; a workout/program prescription defines *how it is prescribed in that context*. The same exercise may be prescribed differently in different contexts (exercise type, program, user readiness/experience, future authorized personalization): e.g. Squat — 10 reps, **or** Squat — 40 seconds.

**CONFIRMED.** The **resolved prescription must carry explicit execution semantics before the session consumes it**; the UI must not infer mode from arbitrary values.

**CONFIRMED — source independence.** AI-generated and rules-generated prescriptions must ultimately **resolve into the same canonical prescription semantics**; provenance must not create incompatible execution semantics.

**CONFIRMED — HOLD.** HOLD is **not** a third first-class execution mode in v1. A static hold (e.g. Plank) may use `TIME_BASED` with **distinct movement/coaching semantics** indicating position maintenance rather than repetitions. **Execution mode and movement/coaching semantics are separate concerns.** No schema field for HOLD is mandated. *Revisit only if future evidence proves static holds require a fundamentally different session lifecycle that `TIME_BASED` cannot express.*

### 5.2 Modular composition (see §2)

**CONFIRMED.** Composition + orchestration ownership + Exercise Block + extensibility, as stated in §2. No global assumptions: no module may globally assume one exercise, three sets, one execution mode, fixed rest/prepare/countdown durations, fixed exercise order, Intro between every set, or Next-Exercise after every rest.

### 5.3 Exercise Intro / REST / Next Exercise

**CONFIRMED.** `INTRO` belongs to the **Exercise Block lifecycle**: it occurs **once when entering a new exercise identity, before its first Set**. Additional Sets of the **same** Exercise do **not** re-run Intro.

**CONFIRMED.** `REST` is an **independent** experience capability. REST does **not** own Intro, exercise identity, permanent workout order, or Next-Exercise semantics.

**CONFIRMED.** “Next Exercise” means an **actual change of Exercise identity**. Moving from Set 1 to Set 2 of Squat is **not** Next Exercise. Same-exercise flow: `SET → SET_RESULT → REST(BETWEEN_SETS) → next SET` (without re-introduction or Next-Exercise context). An exercise-boundary flow is `SET → SET_RESULT → REST(BETWEEN_EXERCISES) → INTRO(next Exercise) → first SET(next Exercise)`.

### 5.4 WORK_SET and progress modularity

**CONFIRMED.** `SET` is **one conceptual capability** supporting `REP_BASED` **or** `TIME_BASED`. Two separate Workout Experience architectures for the two modes are explicitly **not** created. `WORK_SET` is a compatibility implementation label only where required by existing contracts.

**CONFIRMED.** Progress is **one conceptual reusable capability** with mode-aware presentation: `REP_BASED` → target/completed reps (e.g. `6 / 10`); `TIME_BASED` → remaining/elapsed prescribed time (e.g. `40 → 39 → … → 0`). Unit/presentation changes; the conceptual role does not. Unrelated parallel progress systems are not created unless later evidence proves necessity.

### 5.5 Progression policy

**CONFIRMED.** `AUTO-ADVANCE` is the **default** when the next applicable module can safely begin without user intervention. It is **not an absolute global rule**: an applicable transition may require explicit user confirmation when the prescription/session context requires it — conceptually `AUTO` **or** `CONFIRMATION_REQUIRED`. No schema representation is mandated.

**CONFIRMED.** Within the **same exercise**, normal set/rest progression minimizes interaction: no repeated READY/NEXT/CONTINUE between ordinary sets unless a future authorized prescription/session rule requires it. REST remains interruptible via `SKIP REST`.

**CONFIRMED.** **Exercise boundaries are semantically different** and provide the user a reasonable opportunity to act on the upcoming/current Exercise Block (§5.6).

### 5.6 Session controls, actions and outcome semantics (v1)

**CONFIRMED — control set.**

- **In v1:** `PAUSE / RESUME` · `EXIT WORKOUT` · `SKIP REST` · `RESTART CURRENT SET` · `DO EXERCISE LATER` · `SKIP EXERCISE FOR THIS SESSION`.
- **Not required for v1:** `SKIP SET` · `EXTEND REST` · `REDUCE REST`. (SKIP REST already provides intentional early rest ending.) These excluded controls must not reappear elsewhere in the artifacts.

**CONFIRMED — `DO EXERCISE LATER` (first-class v1).** When selected, the user chooses: **A)** move this Exercise to the end of today’s workout, or **B)** do not perform this Exercise today. A moves it into the current-session deferred order; prescription order `Squat → Push-up → Plank` may become `Push-up → Plank → Squat`. B marks it `SKIPPED_FOR_SESSION`. Both are current-session decisions only and **do not mutate the canonical prescription**. A deferred Exercise is **OUTSTANDING** — **not** completed and **not** skipped. **Before `WORKOUT_RESULT`, every deferred Exercise must be surfaced again**, resolved as `PERFORM NOW` **or** `SKIP FOR THIS SESSION`. No silent completion may occur while unresolved deferred Exercises remain.

**CONFIRMED — `SKIP EXERCISE FOR THIS SESSION` (first-class v1).** The user may intentionally omit an Exercise Block from the **current** session (many situational reasons). **The product must not require disclosure of a medical reason.** Skipping means: not completed · not failed · no longer outstanding in the current session · workout may continue · canonical prescription unchanged. Session-only decision.

**CONFIRMED — outcome distinction.** The product preserves three distinct session outcomes: `COMPLETED` · `OUTSTANDING / DEFERRED` · `SKIPPED FOR THIS SESSION`. Persistence/event/analytics representation is not decided here (§16). `DEFERRED` is not terminal; `SKIPPED_FOR_SESSION` is terminal for the current session only.

**CONFIRMED — control semantics.**
- `RESTART CURRENT SET`: restarts **only the active `SET`** from its beginning (TIME_BASED: restart current-set timer/progress; REP_BASED: restart current-set progress). Does not restart previous completed Sets; does not mutate the prescription. Accidental-action protection is a later UX detail.
- `SKIP REST`: ends **only the current REST** early and follows normal orchestration. It must **not** mean skip set / skip exercise / skip next exercise.
- `PAUSE / RESUME`: preserves current session position and continues the same execution context. (Prototype pause/deadline behavior is EXISTING evidence.) Persistence across app restart is **not** resolved here (§16).
- `EXIT WORKOUT`: **distinct from normal `COMPLETE`**. Resume-after-exit, partial persistence, analytics, and resume granularity are **not** defined here (§16).

**CONFIRMED — modularity of controls.** Every control operates through orchestration: `DO LATER` and `SKIP FOR THIS SESSION` act on an Exercise Block; `SKIP REST` on the current REST module; `RESTART CURRENT SET` on the current `SET`; `PAUSE/RESUME` on current session execution; `EXIT` on the Workout Session lifecycle. No control may create unrelated exercise-specific branching across modules.

**CONFIRMED — pause and restart boundaries.** Pause freezes the relevant work, REST and transition timelines, including hidden completion/progression; resume continues the preserved state. `RESTART CURRENT SET` resets only current-Set execution progress and restarts that same prescribed Set. It does not reset INTRO, previous completed Sets, the entire Exercise, the entire Workout, or the prescription.

### 5.7 Mentor / guided motion (U-5)

**CONFIRMED.** A moving/animated demonstration is part of the **intended normal v1 experience** (Mentor-centered). **No mandate** for Three.js, 3D, a renderer, an animation format, an asset pipeline, or a tracking technology — those remain implementation/design decisions.

**CONFIRMED — fidelity contract.** `RECOGNISABLE AND INSTRUCTIVE` — the demonstration must communicate the intended exercise clearly enough to function as guidance. Photorealism is not required. Exact visual fidelity/asset acceptance thresholds are evaluated against the eventual implementation candidate.

**CONFIRMED — failure / degraded mode.** Failure or unavailability of the moving demonstration must **not** make the workout unusable. The active workout remains operational, preserving at least: exercise identity · static exercise visual/poster where available · essential coaching/exercise cue · current set/progress state · `REP_BASED`/`TIME_BASED` progress · required session controls. The fallback is a **DEGRADED/FAILURE MODE — not the intended normal v1 experience**.

**CONFIRMED — reduced motion.** Reduced-motion preferences must **not** make the workout incomprehensible: non-essential animation/motion is reduced or removed where appropriate, while **essential exercise understanding and progress/timing information remain available**; the user must never depend on animation alone. Exact rendering strategy is deferred (§16).

**CONFIRMED — presentation capability boundary.** Mentor/demo is a **presentation capability** that reacts to authoritative session state; it must not own sequencing, progression, completion, or Exercise Block ordering.

### 5.8 Accessibility (U-12)

**CONFIRMED.** The existing AHF accessibility baseline applies to Workout Experience **from v1**; timed/countdown phases and session-level controls **extend** it rather than deferring accessibility. The contract requires:

- active timers/countdowns have an accessible **non-animation-only** representation;
- essential workout information is **not audio-only** and **not motion-only**;
- session controls have accessible interaction semantics;
- **reduced-motion** preference is respected (without removing essential understanding);
- contrast/readability baseline remains applicable;
- the existing **mobile-width** accessibility baseline remains applicable.

ARIA implementation, announcement frequency, focus management, screen-reader copy, and component mechanics are deferred design/implementation decisions (§16).

### 5.9 Audio (v1 functional cues) and voice coaching

**CONFIRMED.** v1 is **not strictly visual-only**: short **functional audio cues** are allowed/intended for useful workout events — e.g. countdown cue · start-of-set cue · end-of-set cue · rest-ending cue (category examples, not exact sound design).

**CONFIRMED — audio accessibility.** Audio is **supplementary**; no essential information may exist **only** in audio; every essential audio cue must correspond to an understandable visual or otherwise accessible state; the experience remains usable **without hearing**. **No new audio settings system is invented**; if an existing AHF global preference governs audio, reference it.

**CONFIRMED — capability boundary.** Audio cues are supporting capabilities that react to session state; they must not own progression.

**CONFIRMED — Voice/TTS.** A spoken Voice Coach / TTS system is **NOT REQUIRED FOR V1** (`NON_BLOCKING_DEFERRED`). Functional audio cues and Voice/TTS coaching are **separate capabilities**. (Future voice coaching is not prohibited.)

### 5.10 Canonical session completion and deferral

**CONFIRMED.** After every completed `SET`, the reusable `SET_RESULT` capability presents stable completed-Set result/evidence. `SET_RESULT` does not choose the next global destination. The Orchestrator then evaluates the resolved session state:

```text
SET → SET_RESULT
  ├─ another Set in the current Exercise
  │    └─ REST(BETWEEN_SETS) → next SET
  ├─ current Exercise complete and another eligible Exercise exists
  │    └─ REST(BETWEEN_EXERCISES) → INTRO(next Exercise) → first SET
  └─ no normal Exercise remains, but deferred obligations exist
       └─ resolve deferred Exercise(s) before WORKOUT_RESULT
```

There is **no terminal REST after the final Set of the final resolved Exercise**. `WORKOUT_RESULT → EXIT` is reachable only when no required unresolved Exercise obligation remains. Completion is semantic, not an array-position check such as `exerciseIndex === last index`.

Runtime coordinates such as `currentExerciseIndex` and `currentSetIndex` may locate the active state, but they are not semantic routing authorities. Routing must account for remaining Sets, eligible next Exercises, `DEFERRED` obligations, `SKIPPED_FOR_SESSION` Exercises and completed Exercises. Array position alone must not determine the next Exercise, Workout completion, or entry into `WORKOUT_RESULT`.

`SET_RESULT` viewing does not consume prescribed REST time. A prescribed REST countdown begins only after `SET_RESULT`, and REST is classified at least as `BETWEEN_SETS` or `BETWEEN_EXERCISES`.

The session conceptually distinguishes `PENDING`, `ACTIVE`, `COMPLETED`, `DEFERRED`, and `SKIPPED_FOR_SESSION`. `DEFERRED` is not terminal. `SKIPPED_FOR_SESSION` is terminal for the current session and never silently mutates the long-term prescription.

### 5.11 Execution strategy, tracked repetitions and tracking loss

**CONFIRMED.** Prescription mode and runtime execution strategy are separate:

| Resolved prescription | Runtime strategy |
|---|---|
| `REP_BASED` + usable Camera/Pose capability | `TRACKED_REP` |
| `REP_BASED` + declined/unavailable/unready Camera/Pose capability | `TIMED_FALLBACK` |
| `TIME_BASED` | `TIMED` |

Runtime fallback never rewrites the original prescription mode. Every `REP_BASED` prescription that supports camera-less execution must resolve a `fallbackDuration`; Workout Experience must not invent a REP→seconds conversion or use a magic multiplier. `HOLD` remains `TIME_BASED` with hold-specific coaching semantics, not a third mode.

For `TRACKED_REP`, detected physical movement attempts drive performed-repetition progression. Quality classification is separate: `performedRepCount != validRepCount`, and evidence may be `VALID`, `INVALID`, or `UNCERTAIN`. An invalid or uncertain detected attempt is not silently discarded from performed progress solely because of quality classification. REP Set completion uses the prescribed performed-rep target.

Tracking loss follows `TRACKED_REP → TRACKING_LOST → attempt REACQUIRE`; recovery returns to `TRACKED_REP`, and unrecoverable loss enters `TIMED_FALLBACK` while preserving completed performed-rep progress. The mid-Set remaining-time policy after unrecoverable loss is intentionally deferred.

### 5.12 Pre-workout capability gate

**CONFIRMED — admission boundary.** Before entering Workout Experience, Dashboard/Workout Launch passes through a `PRE_WORKOUT_CAPABILITY_GATE`. This is not a Workout Exercise state and is not another workout module:

```text
Dashboard / Workout Launch
  → PRE_WORKOUT_CAPABILITY_GATE
  → Workout Experience
  → START → PREPARING → INTRO → …
```

The Gate silently checks Camera permission/capability and Pose/Skeleton Harness readiness on every launch. Valid capability proceeds without interruption or repeated prompting. If capability is unavailable or not granted, the user receives a clear explanation that Camera access enables movement tracking and may choose to enable it. `YES` requests permission, initializes the Harness, and completes required calibration before Workout Experience. `NO` enters Workout Experience without tracking; supported `REP_BASED` prescriptions use `TIMED_FALLBACK` with their resolved `fallbackDuration`.

Permission granted is not equivalent to Harness readiness. Calibration failure provides corrective guidance and Retry, but also always provides `Continue without camera tracking`; the user must not be trapped and no first-time permission/calibration flow may interrupt an active Set.

The privacy boundary remains the accepted CP-04/TS-01 contract: raw camera imagery is processed locally and is not sent to the AHF server in the normal movement-tracking pipeline. Only structured/derived movement information actually required by an explicitly authorized product contract may cross the local camera boundary; no exact JSON schema is fixed here.

### 5.13 Checkpoint, Exit and recovery

**CONFIRMED.** The canonical persistence checkpoint is the **successful end of a Set**. Current Workout progress is retained until the end of that day. Exact persistence technology is implementation-deferred, and component-local UI state is never the sole authority for session-critical recovery data.

`EXIT` asks for confirmation. On confirmation, the user leaves Workout Experience and returns to the Dashboard. If Exit occurs during an active Set, a later return that day restarts that same Set from its beginning while preserving the prior successful Set checkpoint. If Exit occurs during REST, the preceding Set is already checkpointed and the next Set starts directly on return; interrupted REST is not replayed.

After refresh or a short interruption, the system continues the same Set from recovered live state when safe and prompt; otherwise it restarts the current Set from its beginning using the last completed-Set checkpoint. The exact storage/expiry/cross-device mechanism remains deferred.

## 6. Module/state behavior

| Concept | Label | Note |
|---|---|---|
| Initial loading / PREPARING | CONFIRMED (module) | Presented before the first exercise; exact duration DEFERRED |
| Exercise intro (`INTRO`) | CONFIRMED | Exercise-lifecycle; once per new identity (§5.3) |
| Active Set (`SET`) | CONFIRMED | Mode-aware (`REP_BASED`/`TIME_BASED`); progress per §5.4 |
| Completed Set result (`SET_RESULT`) | CONFIRMED | Stable completed-Set result/evidence; orchestration chooses the next destination |
| Paused | CONFIRMED | Preserves position; resume continues context |
| Rest | CONFIRMED | Independent module; skippable via `SKIP REST` |
| Exercise-boundary transition semantics | CONFIRMED | Orchestration-owned `REST(BETWEEN_EXERCISES) → INTRO(next Exercise)`; no independent top-level transition module |
| Exercise boundary decision point | CONFIRMED | Opportunity to act: DO LATER / SKIP FOR THIS SESSION |
| Workout result | CONFIRMED | Reached only when all required Exercises are resolved (incl. deferred obligations) |
| Exit | CONFIRMED | Leaves Workout Experience after confirmation and returns to Dashboard |
| Deferred / outstanding Exercise | CONFIRMED | Must be re-surfaced before WORKOUT_RESULT |
| Skipped for this session | CONFIRMED | Session-only; not completed, not failed |
| Mentor unavailable / degraded | CONFIRMED | Degraded mode per §5.7 |
| Asset load failure | CONFIRMED | Degraded mode per §5.7 |
| Offline / reconnect | EXISTING + CONFIRMED (offline contract) | Snapshots + sync outbox exist today |

## 7. Error / fallback behavior

**CONFIRMED.** Existing resilience contracts remain: no silent behavior change; fail-closed over fail-open (RELEASE_POLICY RULE 4; constitution C11); offline must not lose completed work (existing conflict policy).

**CONFIRMED — degraded presentation.** When the moving demonstration cannot load/render, the workout continues in degraded mode (§5.7) — usable, with identity, cue, progress and controls preserved.

**CONFIRMED.** No silent completion while unresolved deferred blocks remain (§5.6).

## 8. Localization expectations

**CONFIRMED.** Full fa/en parity, RTL correctness, Persian-safe content, localized numerals/timers per DESIGN_SYSTEM; movement localization keys per MG-07 (ADR-0010).

**CONFIRMED.** Cue/coach copy is keyed and localized. (Prototype copy is EN-only prototype text — EXISTING only.)

## 9. Mentor contract (renderer-agnostic)

| Aspect | Label | Statement |
|---|---|---|
| Role | CONFIRMED | Visual center of the active workout experience; demonstration/companion of the movement |
| Centrality | CONFIRMED | Primary visual anchor of the active experience; exercise identity and coaching cue remain visible but secondary |
| Moving demonstration | CONFIRMED | Part of the intended normal v1 experience |
| Rendering medium (3D/2D/format/pipeline) | DEFERRED | No mandate; implementation/design decision (§16) |
| Sync with exercise timing/state | DEFERRED | Not resolved |
| Interaction expectations | DEFERRED | Not specified |
| Failure handling | CONFIRMED | Degraded mode, workout remains usable (§5.7) |
| Fidelity | CONFIRMED | Recognisable and instructive; no photorealism; thresholds vs candidate |
| Mobile framing | CONFIRMED (constraints) | Safe-area/viewport rules apply (ADR-0005); mentor-specific framing per implementation |

## 10. Accessibility expectations

Per §5.8 (contract) and §16 (deferred mechanics).

## 11. Performance constraints

**CONFIRMED (contract-level).** No runtime changes in this artifact; existing verification policy applies (CI.md); real-browser acceptance required for browser-facing changes (RELEASE_POLICY RULE 6/7). Exact performance budget and low-end-device floor are DEFERRED (§16).

## 12. Security / privacy impact

**CONFIRMED.** No new data collection in this specification. Camera/pose remains behind the pre-workout capability gate, consent-gated, on-device, non-persistent by default, and **not newly authorized** here (TS-01; ADR-0014/0021). “Raw video never leaves the device” remains binding. Future integration of observation signals (CP-02) into the experience must continue to satisfy the separate camera/observation gates.

## 13. Analytics / observability expectations

**CONFIRMED.** Existing first-party analytics route is log-only (`/api/analytics/events`); no persistence table. Event/analytics representation — including for deferred/skipped blocks and partial sessions — is **DEFERRED** (§16).

## 14. Prototype evidence (DEV — EXISTING ONLY, never a requirement)

Source: `prototype/workout-layout-blueprint` @ `a62a7ce`. The shipped `/workout` route is **untouched** by DEV (0 files changed) — the prototype is additive.

| Evidence | Observed | Confidence | Status |
|---|---|---|---|
| `/[locale]/prototype/workout` route | Isolated prototype surface | HIGH | Experimental |
| `prototypeFlow.ts` | Scripted demo timeline (fixed durations) — **not** a prescription-driven engine | HIGH | EXISTING |
| `workoutState.ts` | State vocabulary incl. PREPARE / INTRO / WORK_* / REST_* / TRANSITION / COMPLETE | HIGH | EXISTING (names not canonical) |
| `QuietCoach.tsx` | Feedback cues tied to tracking states | HIGH | EXISTING (EN-only) |
| `MentorStage.tsx` + `MentorViewport.tsx` | Three.js + GLB, lazy `ssr:false`, loading/ready/failed, fallback, 15-bone projection | HIGH | EXISTING (medium NOT mandated) |
| `tracking.ts`, overlays | Skeleton projection feeding a tracking overlay | HIGH | EXISTING (observation gated) |
| `startWorkoutBridge.ts` | iOS standalone first-tap workaround | HIGH | EXISTING |
| Viewport conformance doc (DEV) | `vh→svh→dvh`, safe-area vars, no page scroll; real-iPhone validation NOT claimed | HIGH | EXISTING |
| `three@^0.180.0`, CSP `connect-src += blob:`, `.gitignore += /.tmp/` | Prototype-only dependency + CSP relaxation | HIGH | NOT approved for main |
| START tap reliability | Multi-tester reports of unreliable/broken START | HIGH | **ACCEPTANCE / IMPLEMENTATION FINDING** |
| Legacy end-of-rest preview | Confusing; does not reliably match intended same-exercise set flow | HIGH | **ACCEPTANCE / IMPLEMENTATION FINDING** |

Valid implementation evidence to preserve (per owner): state-machine experimentation · deadline-based timing · pause/resume · persistent Mentor lifecycle · set progression · REST mechanics · locale routing · beta isolation · prior real-device findings. Presentation choices are **not** promoted to product requirements.

### 14.1 Prototype / product gap table

| Requirement | Current prototype | Gap | Action |
|---|---|---|---|
| Prescription modes | Single fixed timed demo flow; no prescription | IMPLEMENTATION_GAP | Resolved product contract (§5.1); implementation later |
| Modular composition | Page-owned scripted flow | ARCHITECTURE_REVIEW_REQUIRED | Session-contract extension (CRITICAL when authorized) |
| Intro ownership | Intro once per demo run | NONE | Contract resolved (§5.3) |
| REST independence | Legacy `REST_NEXT_PREVIEW` naming | IMPLEMENTATION_GAP (naming/semantics) | Conform implementation to contract (§5.3) |
| Same-exercise set flow | Legacy preview confuses | ACCEPTANCE FINDING | Implementation must conform (§5.3) |
| Mode-aware progress | Timed-only presentation | IMPLEMENTATION_GAP | One progress capability (§5.4) |
| Progression policy | Fully scripted | IMPLEMENTATION_GAP | Contract resolved (§5.5) |
| v1 controls | Partial (pause/resume; start bridge) | IMPLEMENTATION_GAP | Contract resolved (§5.6) |
| Deferred/skipped outcomes | Absent | IMPLEMENTATION_GAP | Contract resolved (§5.6) |
| Mentor motion + fallback | Three.js demo + fallback label | NONE (pattern) / OWNER_DECISION CLOSED | Contract resolved (§5.7); medium deferred |
| Accessibility (timed/audio) | Not addressed | DESIGN_GAP | Contract resolved (§5.8) |
| Functional audio cues | None (synthesized cues only in shipped player) | DESIGN_GAP | Contract resolved (§5.9) |
| Localization | EN-only prototype copy | DESIGN_GAP | Localization in implementation |
| Analytics | None in prototype | DEFERRED | §16 |

## 15. Explicit non-requirements (prototype × do-not-promote)

Not canonical merely because the prototype has it: fixed timings · exactly three sets · single-exercise assumption · `TIME_BASED`-only assumption · `REST_NEXT_PREVIEW` naming · “Next Exercise” = next set · Intro inside REST · Three.js · 3D · specific media implementation · pixel-perfect prototype layout. The START/REST findings are **acceptance findings**, not architecture.

## 16. Deferred / non-authorizing items

All items below are **NON_BLOCKING · DEFERRED · NON-AUTHORIZING**. None blocks spec readiness, and none is authorized by this document.

PREPARE numeric default · REST numeric default · countdown numeric default/length · exact audio cue design · exact `SET_RESULT` visual/content/scoring · exact `WORKOUT_RESULT` visual/content/aggregation · demonstration media format / preload strategy · Voice/TTS coaching · performance budget / low-end-device floor · analytics representation (incl. deferred/skipped blocks, partial sessions) · Focus Mode (screen wake/fullscreen/orientation; not in v1) · offline media pre-cache · mid-Set remaining-time policy after unrecoverable tracking loss · calibration confidence thresholds · reacquire timeout/threshold · rep segmentation/detection algorithms · exercise-specific biomechanics · pause/exit persistence technology, expiry and cross-device mechanics · accidental-action protection · exact labels/layout · reduced-motion implementation · ARIA/focus/announcement implementation · audio settings mechanics · prescription storage/schema · session outcome/event representation · orchestration implementation · state-machine library · exact component structure · renderer / animation format / asset pipeline · tracking technology · future adaptation/prescription policy.

**REMAINING_BLOCKING_PRODUCT_DECISIONS: NONE.**

## 17. Acceptance criteria (for the future implementation task)

- **AC-1** A beginner completes a full workout with a single start interaction and no mandatory mid-set operation, verified in a real browser at 360px width, in both locales.
- **AC-2** Refresh/connection loss mid-session loses no successfully completed Set; the session continues recovered live state when safe, otherwise restarts only the current Set from the last successful-Set checkpoint.
- **AC-3** Execution mode comes from the resolved prescription; the UI never infers it from values.
- **AC-4** `SET` handles both modes through one capability; progress is mode-aware.
- **AC-5** Intro runs once per new exercise identity and never between same-exercise sets; “Next Exercise” appears only on identity change.
- **AC-6** Same-exercise progression is automatic/minimum-interaction; `CONFIRMATION_REQUIRED` is possible only when prescription/session context requires it.
- **AC-7** All six v1 controls behave per §5.6; `SKIP SET`/`EXTEND REST`/`REDUCE REST` are absent.
- **AC-8** Deferring an exercise does not mutate the prescription; a deferred block is re-surfaced before completion and resolved as perform-now or skip; no silent completion.
- **AC-9** Skipping an exercise marks it neither completed nor failed and does not fail the workout.
- **AC-10** With the demonstration unavailable, the workout remains fully usable (identity, cue, progress, controls).
- **AC-11** Reduced-motion never removes essential understanding; timers have a non-animation-only representation.
- **AC-12** No essential information is audio-only or motion-only; the experience is usable without hearing.
- **AC-13** No new data leaves the device without an explicit purpose/retention decision; the camera remains unrequired.
- **AC-14** Both `/en` and `/fa` render correctly (RTL) with localized copy and numerals.
- **AC-15** After each completed Set, `SET_RESULT` is presented before orchestration selects same-Exercise REST, exercise-boundary REST/INTRO, deferred resolution, or `WORKOUT_RESULT`; there is no terminal REST after the final required Set.
- **AC-16** The pre-workout capability gate silently proceeds when Camera/Pose capability is already valid; otherwise it offers enable/calibration or Continue without camera tracking, and never traps or interrupts an active Set.
- **AC-17** `REP_BASED` execution selects `TRACKED_REP` only with usable Camera/Pose capability and otherwise uses the resolved `fallbackDuration` as `TIMED_FALLBACK`; tracking loss preserves performed progress and does not invent a REP→seconds conversion.
- **AC-18** Exit confirmation and successful-end-of-Set recovery preserve the checkpoint semantics in §5.13; controls never mutate the long-term prescription.
- **AC-19** Final prototype composition is program-driven: the asymmetric 2-Set/3-Set validation fixture and a program-only 3-Set/1-Set variant execute different topologies through the same reusable capabilities, without exercise-number-specific flow components or manually rewritten route sequencing.
- **AC-20** Before full Prototype Composition, a dedicated Workout Experience Block-Completeness Audit verifies every required reusable capability in the canonical vocabulary is implemented and accepted; a missing capability fails the gate and must be admitted/implemented before composition.

## 18. Out of scope (implementation details deliberately unspecified)

Renderer/framework/format · asset pipeline · component structure · orchestration implementation · state-machine library · schema/storage/event representation · CSP details · exact ARIA/copy/focus mechanics · exact numeric defaults — all deferred (§16).

## 19. Traceability

| Source | Role |
|---|---|
| **Owner product-decision deltas (2026-09-14: U-1 · HOLD · U-2 · U-3 · U-4 · U-5 · U-12 · v1 audio · U-7 · modularity)** | **Authoritative product input for this specification** |
| **Owner recovery canonicalization delta (WORKOUT-V2-RECOVERY-CANONICALIZATION-DELTA-01)** | **Authoritative consolidation of the resolved session, orchestration, capability-gate, privacy, fallback, tracking-loss, result, checkpoint and legacy-supersession contracts** |
| [`../../governance/OWNER_DECISION_GATE.md`](../../governance/OWNER_DECISION_GATE.md) | D2 approval + decision-phase record |
| `docs/product/PRODUCT-VISION.md` | Canonical product principles |
| `docs/product/WORKOUT-EXPERIENCE-V2.md` + `-OPEN-QUESTIONS.md` | Original registered direction (open questions now resolved by owner decisions) |
| ADR-0001 · ADR-0002 · ADR-0005 · ADR-0010 · ADR-0014 · ADR-0021 | CONFIRMED architecture rules |
| `docs/architecture/ARCHITECTURE-PRINCIPLES.md` §7/§8/§13.3/§13.4 | CONFIRMED rules |
| `docs/architecture/MG-07-LOCALIZATION-MEDIA.md` | CONFIRMED media/localization contract |
| `docs/CURRENT_SYSTEM_BASELINE.md` · DEV `prototype/workout-layout-blueprint` @ `a62a7ce` | Observed facts / EXISTING evidence (never requirements) |

## HANDOFF

| Field | Value |
|---|---|
| CURRENT_STATUS | `SPEC_FINALIZED` — awaiting owner merge review |
| NEXT_ACTION | Owner merges PR #66 (or requests changes); any implementation requires a **separate** explicit authorization and is expected CRITICAL-class |
| NEXT_ACTION_AUTONOMOUS | `NO` |
| BLOCKERS | None (blocking product decisions = 0; deferred items are non-authorizing) |
