# SPEC 0001 — Workout Experience (Guided Workout Player)

| Field | Value |
|---|---|
| STATUS | `PROPOSED` — Stage 4 Spec Kit pilot (D2 APPROVED 2026-09-14; spec/design only) |
| SPEC_CLASS | `STANDARD` (work class — docs-only pilot; §0.1) · pilot artifact set is owner-mandated CRITICAL-shaped (§0.2) |
| TASK_PROFILE | `CODE_NO_DEPLOY` |
| OWNER_GATE | D2 **APPROVED** 2026-09-14 — pilot selection + spec/design boundary; implementation **NOT authorized** |
| TASKS.md entry | [`../../TASKS.md`](../../TASKS.md) → `SPECKIT-PILOT-01` |
| Date | 2026-09-14 · Baseline: main `80b6eb5` · Prototype evidence: DEV `prototype/workout-layout-blueprint` @ `a62a7ce` |

Labels: **CONFIRMED** (binding through a canonical owner — cited) · **CANDIDATE** (product direction; not yet owner-confirmed for this surface) · **UNKNOWN** (owner decision required) · **EXISTING** (implementation evidence only — records what exists today; never a source of intent, per DOCUMENTATION-GOVERNANCE §2.6).

---

## 0.1 Classification rationale (Step 2)

`STANDARD`, not `CRITICAL`: this pilot is specification/design documentation only — no source, schema, security-boundary, dependency, or deployment change is performed or authorized. It does not meet any CRITICAL trigger (auth/AI behavior/security, schema/DB, deployment/topology, cross-plane data). **Note for a future implementation task:** actual implementation will very likely touch the session-core contract (ADR-0002 boundary), media/asset architecture (MG-07), and possibly observation wiring — that task must re-classify and is expected to be **CRITICAL**.

## 0.2 Pilot artifact set & template mapping (owner-mandated)

The owner's D2 task explicitly authorized, for this pilot: specification, clarification, design/plan, task decomposition, independent review, and pilot evaluation. Accordingly this pilot emits the full artifact set (`spec.md` + `plan.md` + prospective `tasks.md` + `pilot-assessment.md`) although the standing contract (`docs/specs/README.md`) reserves `plan.md`/`tasks.md` to CRITICAL-class work — and the owner mandated an expanded section set (§1–§19 here). Both deviations are owner-driven, recorded, and pilot-scoped; neither changes standing governance. The size deviation (229 lines vs the ≤ ~150-line STANDARD guidance) is recorded as a pilot finding in `pilot-assessment.md`.

Template mapping (Stage-1 `spec-template.md` → this pilot):

| Template section | Found in |
|---|---|
| CURRENT_STATE_EVIDENCE | §1, §14, §19 |
| PRODUCT_REQUIREMENTS | §5 |
| NON_GOALS | §3, §15 |
| OPEN_QUESTIONS | §16 |
| ACCEPTANCE_CRITERIA | §17 |
| ARCHITECTURE_IMPACT | §2 + [`plan.md`](./plan.md) §2–§3 |
| SECURITY_PRIVACY_IMPACT | §12 |
| LOCALIZATION_IMPACT | §8 |
| TESTING_REQUIREMENTS | [`plan.md`](./plan.md) §5 |
| ROLLBACK | [`plan.md`](./plan.md) §6 |
| HANDOFF | §HANDOFF (end) |

## 1. Problem / user need

CONFIRMED — The current `/workout` route behaves like a *Workout Logger*: the user reads an exercise name, must already know how to perform it, counts repetitions, taps controls, and returns attention to the screen repeatedly. Beginners are the hardest-hit audience (`docs/product/PRODUCT-VISION.md` §3: users "do not know what to do, how to do it safely, or how to stay consistent"; V2 §1).

CONFIRMED — Canonical product principles that frame the fix: "Guided and beginner-first — Show, don't just tell" and "Hands-free by default — minimum interaction during exercise (V2 goal)" (`PRODUCT-VISION.md` §4).

## 2. Scope

CONFIRMED — This specification defines the *product behavior* of the guided workout execution surface (the evolution of today's `/workout` experience), independent of generator and independent of renderer technology (ARCHITECTURE-PRINCIPLES §8 source-independence; V2 §7/§25; ADR-0001 governs exercise identity, not this separation).

CANDIDATE — The experience becomes a **Guided Workout Player** over an executable **Session Timeline** (`PREPARE → WORK → REST → … → TRANSITION → … → COMPLETE`), where the application owns sequencing, timing, sets, rests, transitions, countdowns, guidance, progress and completion, and the user primarily exercises (V2 §3–§5).

## 3. Non-goals

CONFIRMED (non-goals by boundary):
- No program-generation change (generator stays source-independent; V2 §7, PRODUCT-VISION §4).
- No camera/pose feature authorization — observation remains gated (CP-04/CP-05/TS-02; ADR-0021).
- No implementation in this pilot (D2 boundary; this document only).
- No media pipeline, TTS/voice pipeline, or schema change authorized here (V2 Part 8 scope guards).

CANDIDATE (proposed non-goals, pending owner confirmation):
- No social/challenges surface in this experience.
- No desktop-first redesign — mobile-first behavior is the baseline (ADR-0005).

## 4. User experience intent

CONFIRMED — Bilingual (fa/en, RTL parity), mobile-first, offline-tolerant, accessible per `docs/DESIGN_SYSTEM.md` and ADR-0005 (min viewport 360px, reduced motion, keyboard, touch targets, contrast).

CONFIRMED (binding declaration, ADR-0005 guardrail 3 / PRINCIPLES §13.3) — **Mobile posture: `WEB-SPECIFIC`.** The guided player is a browser-presentation experience (timers, safe-area/viewport behavior, optional WebGL/media); no native equivalent is claimed, and no new client storage beyond the existing offline contract is introduced.

CANDIDATE — "One tap to start. Minimum interaction until finish." After `Start Workout`, the session advances automatically through sets/rests/transitions with countdowns, and the user is not required to operate the app between sets (V2 §2, §4).

CANDIDATE — Visual guidance accompanies each exercise ("show, don't just tell"): an animated/looping demonstration and/or a 3D mentor figure (see §9), with the exercise identity (name, set number, work/rest timers) always legible (V2 §4, §12, §24).

CANDIDATE — Quiet, low-noise feedback during work: short cues rather than constant instructions (CP-01 Companion architecture — silence-by-default / value-over-noise posture, [`docs/architecture/CP-01-COMPANION-ARCHITECTURE.md`](../architecture/CP-01-COMPANION-ARCHITECTURE.md); prototype QuietCoach messaging is OBSERVED ONLY).

## 5. Functional requirements

Numbered with source labels.

| ID | Requirement | Label | Source |
|---|---|---|---|
| FR-1 | A workout session executes as an ordered timeline of phases derived from the user's program for the day | CANDIDATE | V2 §5/§6 |
| FR-2 | The UI renders current session state; it does not own sequencing logic | CONFIRMED (architecture rule) | ADR-0002; ARCHITECTURE-PRINCIPLES §13.4; V2 §5/§6 |
| FR-3 | Session resumes correctly after page refresh / lost connection (no lost progress) | EXISTING (implementation evidence) + CONFIRMED (offline contract) | offline persistence contract (ADR-0005 guardrail 2; S-05 snapshot versioning) — evidence: `src/lib/offline/*` |
| FR-4 | Workout remains playable offline (program cached; completed sets queued) | CONFIRMED | PRODUCT-VISION §4 (offline-first) — evidence: `src/services/syncService.ts` |
| FR-5 | Exercise identity display uses canonical identity where resolvable; display names stay display-only | CONFIRMED | ADR-0001; ARCHITECTURE-PRINCIPLES §7 |
| FR-6 | One-tap start; automatic advancement through sets/rests/transitions (no per-set Start button under normal conditions) | CANDIDATE | V2 §2/§4/§13 |
| FR-7 | Rest phase shows the next-up exercise/set preview | CANDIDATE | V2 §4/§15; prototype REST_NEXT_PREVIEW (OBSERVED ONLY) |
| FR-8 | Countdown (3-2-1 style) precedes configured phase starts | CANDIDATE | V2 §17; prototype TRANSITION_COUNTDOWN (OBSERVED ONLY) |
| FR-9 | Pause/resume available without breaking accumulated timing | EXISTING (implementation evidence: pause implemented) + CANDIDATE (extended semantics) | current engine pause; V2 §21 |
| FR-10 | Session completion summary/state exists at the end of the timeline | CANDIDATE | V2 §8 COMPLETE; prototype CompleteStage (OBSERVED ONLY) |
| FR-11 | Both locales render the full experience (copy, numerals, direction) | CONFIRMED | AGENTS.md §4; ADR-0010; DESIGN_SYSTEM |
| FR-12 | Exercise demonstration media is self-hosted with content-integrity rules; no third-party CDN for product media | CONFIRMED (contract) | MG-07 (`docs/architecture/MG-07-LOCALIZATION-MEDIA.md`); ADR-0010 |
| FR-13 | Rep-based vs timed vs hold execution semantics are explicit per exercise | UNKNOWN | V2 Open Questions §1/§14 |
| FR-14 | Skip / extend-rest / reduce-rest / restart-set / exit semantics | UNKNOWN | V2 Open Questions §4; V2 §20 |
| FR-15 | Voice/audio coach | UNKNOWN | V2 §18; Open Questions §2 (visual/audio/both) |
| FR-16 | Focus Mode (screen wake / fullscreen / orientation) | UNKNOWN | V2 §11; Part 5 constraint (no wake/fullscreen handling today) |

> Code paths above appear as **implementation evidence only**; requirements cite their canonical owner. Code does not define intent (DOCUMENTATION-GOVERNANCE §2.6).

## 6. State behavior (behavior-level state model)

Classification of the states the experience *may* need. None is derived from prototype code alone.

| State | Label | Note |
|---|---|---|
| Initial loading | CANDIDATE | Program fetch + media/mentor initialization |
| Ready (pre-start) | EXISTING (implementation evidence) | Current player has a ready/start state |
| Active set (work) | CANDIDATE | Core of V2 timeline; engine extension required |
| Paused | EXISTING (implementation evidence) | Engine pause implemented |
| Rest | CANDIDATE | V2 §15; observed prototype REST_QUIET/PREVIEW |
| Exercise transition | CANDIDATE | V2 §16 |
| Countdown | CANDIDATE | V2 §17 |
| Workout completed | CANDIDATE | V2 §8 |
| Mentor unavailable / degraded presentation | UNKNOWN | Fallback requirement not yet owner-confirmed (§9) |
| Asset load failure | UNKNOWN | Same as above; prototype shows a fallback pattern |
| Offline / reconnect | EXISTING + CONFIRMED (offline contract) + CANDIDATE (UX surface) | Offline snapshots + sync outbox exist today |

## 7. Error / fallback behavior

CONFIRMED — Existing resilience contracts stay: no silent behavior change; fail-closed over fail-open (RELEASE_POLICY RULE 4; constitution C11); offline must not lose completed work (existing conflict policy).

CANDIDATE — If demonstration media or the 3D mentor fails to load, the workout remains fully playable with a text/identity fallback presentation (PRODUCT-VISION "guided" principle; observed prototype fallback pattern — *observed, not confirmed as requirement*).

UNKNOWN — Whether the mentor is required at all in v1, and what constitutes an acceptable fallback (§9, §11).

## 8. Localization expectations

CONFIRMED — Full fa/en parity, RTL correctness, Persian-safe content, localized numerals/timers per DESIGN_SYSTEM; movement localization keys per MG-07 (ADR-0010).

CANDIDATE — Cue/coach copy is keyed and localized (observed prototype copy is EN-only prototype text — **OBSERVED ONLY**).

## 9. 3D Mentor contract (renderer-agnostic)

CONFIRMED — Technology is NOT part of the product contract: no renderer/framework is mandated by this spec (V2 Part 8: media technology not selected; D2 authorizes no technology choice).

| Aspect | Label | Statement |
|---|---|---|
| Purpose | CANDIDATE | A visual demonstration/companion of the movement — instructional + motivational; exact role mix UNKNOWN |
| Centrality | CANDIDATE | Likely a central visual element (V2 §10/§12 direction; observed prototype composition) |
| Visibility rules | UNKNOWN | When it must/must not show |
| Behavior when it cannot load | UNKNOWN | Requirement is NOT confirmed; recommendation: workout must remain usable (see §7) |
| Usability without mentor | UNKNOWN | Owner decision required before implementation |
| Sync with exercise timing/state | UNKNOWN | Whether pose/animation synchronization is required |
| Fidelity (pilot vs production) | UNKNOWN | Observed prototype fidelity is for exploration only (OBSERVED ONLY) |
| Mobile framing | CONFIRMED (constraints) + UNKNOWN (mentor-specific) | Safe-area/viewport rules apply (ADR-0005; DEV conformance doc — prototype-scoped evidence); mentor framing UNKNOWN |
| Interaction | UNKNOWN | Any expected user interaction with the mentor is undefined |

## 10. Accessibility expectations

CONFIRMED — DESIGN_SYSTEM + AGENTS.md §6 rules: reduced motion honored, keyboard operability, contrast, 360px minimum, touch-target sizes, safe-area handling.

CANDIDATE — Animated mentor/media must respect reduced-motion (provide static alternative) — extension of the confirmed rule to the new surface.

UNKNOWN — Any additional requirements for timed audio cues / screen-reader announcement of phase changes (owner/product decision).

## 11. Performance constraints (where confirmed)

CONFIRMED — No runtime changes in this pilot; current performance contracts unchanged. Targeted verification policy applies (CI.md); real-browser acceptance is required for browser-facing changes (RELEASE_POLICY RULE 6/7).

UNKNOWN — A concrete performance budget for the guided player (3D/asset load time, memory, low-end device floor, offline cache size) is not documented and is an owner/engineering decision.

## 12. Security / privacy impact

CONFIRMED — No new data collection in this spec. Existing boundaries apply: camera/pose is consent-gated, on-device, non-persistent by default, and NOT authorized by this pilot (TS-01; ADR-0014/0021; CP-04/CP-06). "Raw video never leaves the device" remains binding.

CANDIDATE — If future work integrates observation signals (CP-02) into the experience, that is a separate CRITICAL-class change with its own spec and gates.

## 13. Analytics / observability expectations (if confirmed)

CONFIRMED — Existing first-party analytics route exists but is log-only (`/api/analytics/events`); no persistence table.

UNKNOWN — Which session-level events the guided experience should emit (phase transitions? abandonments?), and whether the known blind spot (partial/abandoned workouts invisible because analytics see only completed sessions — V2 Part 5) should be closed. Owner/product decision.

## 14. Prototype evidence (DEV — OBSERVED ONLY, never a requirement)

Source: `prototype/workout-layout-blueprint` @ `a62a7ce` (19 commits ahead of `ff1202c6`; rebase-incomparable SHAs, content-based inspection). The shipped `/workout` route is **untouched** by DEV (0 files changed) — the prototype is additive.

| Evidence | Observed behavior | Confidence | Product-approved? |
|---|---|---|---|
| `/[locale]/prototype/workout` route | Isolated prototype surface with its own layout | HIGH | Experimental only |
| `prototypeFlow.ts` | **Scripted demo timeline** (fixed durations: PREPARE 3s, EXERCISE_INTRO 3s, work segments, REST 25s + preview 5s, transition countdown 3s) — driven by elapsed time, **not** by a real program/session engine | HIGH | Experimental harness |
| `workoutState.ts` | State vocabulary: START, PREPARE, EXERCISE_INTRO, WORK_NORMAL, WORK_POSITIVE, WORK_CORRECTION, TRACKING_LOST, REST_QUIET, REST_NEXT_PREVIEW, TRANSITION_COUNTDOWN, COMPLETE | HIGH | Experimental |
| `QuietCoach.tsx` | Feedback surface with cues (READY / GOOD FORM / ADJUST FORM / TRACKING LOST / REST / NEXT UP / GET READY) tied to tracking states | HIGH | Experimental (EN-only copy) |
| `MentorStage.tsx` (shared dir) + `MentorViewport.tsx` | Three.js r180 + GLTFLoader loads `/prototype-assets/AHF_Mentor_Squat.glb`; dynamic `ssr:false`; statuses loading/ready/failed; `StageFallback` (`role="status"`); 15-bone projection feeding a tracking overlay | HIGH | Experimental; renderer choice NOT a requirement |
| `tracking.ts`, `MovementFeedbackOverlay`, `TrackingSkeletonOverlay` | Mentor skeleton projection used for overlay alignment with observed tracking states | HIGH | Experimental |
| `startWorkoutBridge.ts` | Capture-phase click bridge → custom event (iOS standalone first-tap workaround) | HIGH | Experimental |
| `docs/architecture/WORKOUT-PROTOTYPE-VIEWPORT-CONFORMANCE.md` (DEV) | Shell uses `vh→svh→dvh`, safe-area vars, no page scroll, standalone status-bar handling | HIGH | Prototype-scoped; real-iPhone validation NOT claimed |
| `package.json` `three@^0.180.0`; `next.config.mjs` CSP `connect-src += blob:`; `.gitignore += /.tmp/` | Prototype required a runtime dependency and a CSP relaxation | HIGH | NOT approved for main |
| Rest-timing debug instrumentation (REST_TIMING_TRACE, `?restTimingDebug=1`) | Diagnostic logging; observed uncommitted earlier, since removed by owner | HIGH | Diagnostic only |

**Prototype/product boundary:** the prototype is evidence of *exploration*, not of product intent. Per constitution candidate rule P3, prototype code remains isolated until spec treatment (this document) and owner authorization; promotion of `MentorStage.tsx`, the `three` dependency, or the CSP change requires the STANDARD/CRITICAL flow.

### 14.1 Prototype / product gap table (REQUIREMENT → CURRENT PROTOTYPE → GAP → ACTION)

One of the key pilot outputs: where each confirmed/candidate requirement stands against the observed prototype. Gaps are identified, **not fixed**.

| Requirement | Current prototype | Gap | Action |
|---|---|---|---|
| FR-2 (UI renders, does not sequence) | Prototype page owns sequencing locally (elapsed-time scripted) | **ARCHITECTURE_REVIEW_REQUIRED** — session-core contract extension | Future T-1 (CRITICAL when authorized) |
| FR-6 (one-tap auto-advance) | Scripted demo; no real program/timeline | **IMPLEMENTATION_GAP** | Future T-1/T-5 after owner decisions |
| FR-7 (rest next-up preview) | REST_NEXT_PREVIEW demonstrated | NONE (demonstrated; still CANDIDATE) | Owner confirm FR-7 |
| FR-8 (countdown) | TRANSITION_COUNTDOWN demonstrated | NONE (demonstrated; still CANDIDATE) | Owner confirm FR-8 |
| FR-9 (pause/resume) | Pause in prototype + shipped player | NONE (exists; extended semantics pending U-4) | U-4 |
| FR-10 (completion state) | CompleteStage demonstrated | NONE (demonstrated; still CANDIDATE) | Owner confirm FR-10 |
| FR-11 (fa/en + RTL) | Prototype copy EN-only, hard-coded | **DESIGN_GAP** | T-2 localization work |
| FR-12 (self-hosted media integrity) | GLB under `public/prototype-assets/` + new `three` dep | **OWNER_DECISION_REQUIRED** (U-5/U-6) + architecture review for dep/CSP | Spec treatment before any promotion |
| Mentor contract (§9) | MentorStage (Three.js + GLB, fallback) | **OWNER_DECISION_REQUIRED** (U-5) | Resolve U-5 |
| Quiet feedback (§4) | QuietCoach (EN-only, tracking-tied cues) | **OWNER_DECISION_REQUIRED** (observation features remain gated CP-04/05) | Confirm cue scope |
| Mobile viewport/safe-area | Conformance doc + svh/dvh/safe-area implementation | NONE (evidence; real-device validation NOT claimed) | Adopt pattern in T-2 |
| Analytics (§13) | No telemetry in prototype | **DESIGN_GAP** | U-9 |
| Offline/reconnect (FR-3/FR-4) | Not exercised by the scripted demo | **IMPLEMENTATION_GAP** (prototype) — existing contract already ships | Reuse existing offline contract; T-5 |

Gap tally: NONE 5 · DESIGN_GAP 2 · IMPLEMENTATION_GAP 3 · OWNER_DECISION_REQUIRED 3 · ARCHITECTURE_REVIEW_REQUIRED 1 (13 rows total).

## 15. Explicit non-requirements (prototype behaviors NOT promoted)

- The scripted demo flow and its fixed durations are **not** a requirement.
- The prototype state vocabulary (incl. WORK_POSITIVE/WORK_CORRECTION/TRACKING_LOST) is **not** a requirement — it reflects prototype exploration of tracking-driven feedback; whether tracking-driven feedback belongs in v1 is an owner decision (and observation features remain gated).
- Three.js, GLB asset format, bone projection, the CSP `blob:` relaxation, and the iOS click bridge are **implementation details of the prototype**, not requirements.
- EN-only prototype copy is **not** the localization requirement.
- The prototype's visual fidelity is **not** a production acceptance bar.

## 16. Unknown owner decisions (blocking before implementation)

| ID | Question | Why it blocks |
|---|---|---|
| U-1 | Execution types per exercise (TIMED / REP_BASED / HOLD) and who owns the data | Engine + program contract shape |
| U-2 | Timing defaults (PREPARE / REST / TRANSITION) and countdown policy | Core behavior |
| U-3 | Auto-advance exceptions (equipment setup, position change, injury check) | Core behavior + safety |
| U-4 | Controls semantics (skip, extend/reduce rest, restart set, exit, resume granularity, accidental-skip handling) | Core behavior |
| U-5 | Is the 3D mentor required in v1? Centrality? Acceptable fallback when unavailable? Fidelity bar? | Single largest scope/tech decision |
| U-6 | Demonstration media strategy (Lottie/WebM/MP4/SVG/GIF/mixed), preload/offline caching policy | Media architecture + assets |
| U-7 | Voice/audio coach: none/visual-only/both; TTS pipeline or not | Audio architecture |
| U-8 | Performance budget and low-end device floor | Acceptance criteria |
| U-9 | Analytics scope for partial/abandoned sessions | Observability |
| U-10 | Focus Mode (screen wake/fullscreen/orientation) in scope for v1? | Platform behavior |
| U-11 | Offline pre-cache policy for demonstration media (precache all / on-first-use / stream) | Storage budget + UX |
| U-12 | Accessibility additions for timed/audio phases | Compliance |
| U-13 | Rep-based conversion for Beginner Mode (safety thresholds) | Safety-critical product rule |

## 17. Acceptance criteria (for a future implementation task — not this pilot)

- AC-1 (CANDIDATE): A beginner can complete a full workout with a single start interaction and no mandatory mid-set UI operation, verified in a real browser on a 360px-wide viewport, in both locales.
- AC-2 (CONFIRMED-contract): Refresh/connection loss mid-session loses no completed work; the session resumes per the existing snapshot contract.
- AC-3 (CANDIDATE): Every phase change is announced visually and (if in scope) audibly per the resolved U-decisions.
- AC-4 (UNKNOWN): Mentor/media failure does not block workout completion — pending U-5.
- AC-5 (CONFIRMED-contract): No new data leaves the device without an explicit purpose/retention decision; camera remains unrequired.
- AC-6 (CONFIRMED-contract): Both `/en` and `/fa` render correctly (RTL) with localized copy and numerals.

## 18. Out of scope (implementation details deliberately not specified)

Renderer/framework choice · anim file format · exact GLB/asset pipeline · component structure · engine internals · API contracts · schema changes · CSP details · iOS bridge mechanics — all deferred to the future implementation task, inside the boundaries of `plan.md`.

## 19. Traceability

| Source | Role |
|---|---|
| `docs/product/PRODUCT-VISION.md` | CONFIRMED product principles |
| `docs/product/WORKOUT-EXPERIENCE-V2.md` + `-OPEN-QUESTIONS.md` | CANDIDATE direction + UNKNOWN items |
| ADR-0001, ADR-0002, ADR-0005, ADR-0010, ADR-0014, ADR-0021 | CONFIRMED architecture rules |
| `docs/architecture/ARCHITECTURE-PRINCIPLES.md` §13.4, §7 | CONFIRMED rules |
| `docs/architecture/MG-07-LOCALIZATION-MEDIA.md` | CONFIRMED media/localization contract |
| `docs/CURRENT_SYSTEM_BASELINE.md` | observed system facts |
| DEV `prototype/workout-layout-blueprint` @ `a62a7ce` | OBSERVED prototype evidence (never a requirement) |
| `docs/governance/OWNER_DECISION_GATE.md` | D2 APPROVED (spec/design boundary) |

## HANDOFF

| Field | Value |
|---|---|
| CURRENT_STATUS | `SPEC_DRAFTED` (pilot) — awaiting owner review |
| NEXT_ACTION | Owner reviews this spec + `plan.md` gaps + resolves blocking UNKNOWN owner decisions (U-5, U-1, U-2 are the highest-leverage) |
| NEXT_ACTION_AUTONOMOUS | `NO` — implementation not authorized; owner decisions required |
| BLOCKERS | UNKNOWN owner decisions §16 (implementation-blocking) |
