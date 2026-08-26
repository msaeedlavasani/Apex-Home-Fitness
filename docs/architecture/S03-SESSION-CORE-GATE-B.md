# S-03 — Pure Workout Session Core: GATE B Decision Package

`STATUS: PROPOSED — OWNER APPROVAL REQUIRED` (GATE B, 2026-08-27)

Phase: `S-03 — Pure Workout Session Core` (Architecture Stabilization Plan).
ADR-0002 is ACCEPTED: extract a framework-independent session/timeline core from
`useWorkoutEngine`; the React hook becomes an adapter. This document is the
technical design + owner-decision package GATE B requires. It contains **no
implementation** and **no code change**.

Baseline: S-01, S02-A..D2 complete; `WorkoutEngineState` snapshot shape unchanged
since S02-D2 (`SNAPSHOT_PAYLOAD_UNCHANGED`); Workout V2 `NOT YET IMPLEMENTED`.

> **No extraction may begin until GB-01..GB-10 are approved.** Do not modify
> `useWorkoutEngine.ts`, WorkoutPlayer, persistence, or any runtime code until
> then.

---

## 1. Current Workout Execution Architecture (evidence-based trace)

```
workout page (src/app/[locale]/workout/page.tsx)
  → builds WorkoutExercise[] plan (S02-D1/D2 enrichment)
  → <WorkoutPlayer exercises={plan} .../>
      → useWorkoutEngine(exercises, { autoAdvance, onPhaseChange, onSetComplete,
                                      onWorkoutComplete, onStateChange })
          → WallClockAccumulator (src/lib/workout/wallClock.ts) — pure, DO-NOT-REFACTOR
          → 1s setInterval heartbeat + lifecycle listeners (visibilitychange /
            pagehide / pageshow / focus) call accountElapsed()
      → onStateChange → buildWorkoutStateRecord + saveTodayWorkoutState (IndexedDB)
      → on mount: getTodayWorkoutState → hydrateFromRecord → hydrate()
      → onPhaseChange/onSetComplete → audioService + useHaptic (UI layer)
      → Start button → trackEvent(WORKOUT_STARTED) + onWorkoutStart
      → onWorkoutComplete → page → POST /api/workout/session complete
      → page onWorkoutStart → POST /api/workout/session start
```

Verified responsibilities: the hook owns **no** network, no IndexedDB, no audio,
no haptics, no analytics, no gamification. Those are consumed via callbacks in
`WorkoutPlayer` / the page. `gamificationService` is server-side (derives from
`WorkoutSession` rows). `queueCompletedExercise` (log outbox) has no live client
caller.

## 2. useWorkoutEngine Responsibility Inventory

| Responsibility | Classification |
|---|---|
| Phase state machine (READY/EXERCISING/RESTING/COMPLETED) | PURE DOMAIN |
| Position state: `currentExerciseIndex`, `currentSet` | PURE DOMAIN |
| `completeSet` (set/exercise completion, last-exercise → COMPLETED, rest routing, set increment) | PURE DOMAIN |
| `advanceFromRest` ('set' → EXERCISING same exercise; 'exercise' → next) | PURE DOMAIN |
| `goToExercise` (clamp, reset set to 1, → EXERCISING) | PURE DOMAIN |
| start / pause / resume / skipRest / next / prev / jumpTo / reset / restart guards + mutations | PURE DOMAIN |
| Auto-advance decision (elapsed ≥ duration → completeSet / advanceFromRest) | PURE DOMAIN |
| `restTarget` ('set' \| 'exercise') internal transition state | PURE DOMAIN |
| Derived: `totalSets`, `completedSets` (incl. RESTING-after-last-set nuance), `progress` | PURE DOMAIN |
| Derived: `phaseDurationSeconds`, `secondsLeft` | PURE DOMAIN |
| `hydrate` (clamp index/set, validate phase, cap phaseElapsed at duration−1, reconstruct restTarget, completedAt fallback) | PURE DOMAIN |
| useState/useMemo/useEffect binding of the above | REACT ADAPTER |
| `callbacksRef` freshness pattern | REACT ADAPTER |
| Snapshot emission gating (`markSnapshotDirty` + effect on `state` — no emit on ticks) | REACT ADAPTER |
| `onPhaseChange` suppression (first render + hydrate: `isFirstPhase`, `skipNextPhaseCallbackRef`) | REACT ADAPTER |
| Heartbeat `setInterval` (1s) + `accountElapsed` wiring | BROWSER INFRASTRUCTURE (adapter-held) |
| Lifecycle listeners → `accountElapsed` (background catch-up) | BROWSER INFRASTRUCTURE (adapter-held) |
| Accumulator start/pause effect (keyed on phase/set/index/isRunning) | BROWSER INFRASTRUCTURE (adapter-held) |
| `WallClockAccumulator` instance in a ref; injectable `now` | BROWSER INFRASTRUCTURE (adapter-held) |
| IndexedDB read/write | PERSISTENCE (WorkoutPlayer/db.ts — outside hook) |
| Record mapping (`buildWorkoutStateRecord`, `hydrateFromRecord`, `matchesPlan`, `toOfflineExercises`) | PERSISTENCE (workoutPersistence.ts — outside hook) |
| Conflict policy | PERSISTENCE (conflictPolicy.ts — outside hook) |
| Callbacks: `onPhaseChange`/`onSetComplete`/`onExerciseComplete`/`onWorkoutComplete`/`onStateChange` | SIDE EFFECT (emitted intents; consumed by adapter/UI) |
| `trackEvent(WORKOUT_STARTED)` | SIDE EFFECT (WorkoutPlayer button — NOT the hook) |
| `repsDone` tally | PRESENTATION SUPPORT (WorkoutPlayer-local state; NOT in engine, NOT persisted) |

Gray areas: the accumulator start/pause **decision** (when time counts) is domain
logic; the **mechanism** (owning the `WallClockAccumulator` instance + refs) is
adapter-held browser infrastructure. The `snapshotDirty` gating is adapter-only.

## 3. State Ownership Map

| State | Current owner | Pure Core? | Adapter? | Persistence? | Notes |
|---|---|---|---|---|---|
| phase | hook state | YES (primary) | bind | via state snapshot | 'READY' \| 'EXERCISING' \| 'RESTING' \| 'COMPLETED' |
| currentExerciseIndex | hook state | YES (primary) | bind | via snapshot | position-based (NEVER exerciseId) |
| currentSet | hook state | YES (primary) | bind | via snapshot | 1-based within exercise |
| phaseElapsed (seconds) | hook state | YES (primary) | bind | via snapshot | driven by accumulator accounting |
| totalElapsed (seconds) | hook state | YES (primary) | bind | via snapshot | since start() |
| isRunning | hook state | YES (primary) | bind | via snapshot | accumulator start/pause key |
| startedAt / completedAt | hook state | YES (primary) | bind | via snapshot | epoch ms |
| completedSets | derived | YES (derived) | read | via snapshot | RESTING-last-set nuance |
| progress | derived | YES (derived) | read | no | 0..1 |
| totalSets | derived | YES (derived) | read | via snapshot | plan-derived |
| phaseDurationSeconds | derived | YES (derived) | read | no | phase + exercise duration/rest |
| secondsLeft | derived | YES (derived) | read | no | duration − elapsed (null = open) |
| restTarget ('set'\|'exercise') | hook ref | YES (internal) | no | NO (reconstructed on hydrate) | derivable: RESTING ∧ currentSet ≥ sets → 'exercise' |
| snapshotDirty | hook ref | NO | YES | no | adapter emission gating |
| callbacksRef / nowRef / accumulatorRef | hook refs | NO | YES | no | adapter plumbing |

## 4. Event / Command Inventory

Derived from code (each maps to an existing public command):

| Command | Current trigger | State changed | Side effects today | Core? |
|---|---|---|---|---|
| START | `start()` | phase→EXERCISING, startedAt, elapsed 0, running | onPhaseChange, onStateChange | YES |
| PAUSE | `pause()` | running=false | onStateChange | YES |
| RESUME | `resume()` | running=true | onStateChange | YES |
| COMPLETE_SET | `completeSet()` | set/exercise/last-exercise, →RESTING/next/COMPLETED | onSetComplete, onExerciseComplete, onWorkoutComplete, onStateChange | YES |
| SKIP_REST | `skipRest()` → advanceFromRest | RESTING→ next set/exercise | onStateChange (+phase) | YES |
| NEXT_EXERCISE / PREVIOUS_EXERCISE / JUMP_TO | navigation controls | goToExercise (index clamp, set 1, EXERCISING) | onStateChange (+phase) | YES |
| TIMER_EXPIRED (auto-advance) | effect: elapsed ≥ duration | → COMPLETE_SET / advanceFromRest | same as those | YES (decision in core) |
| RESET | `reset()` | → READY, all zeroed | onStateChange | YES |
| RESTART | `restart()` | reset + START | onStateChange | YES |
| HYDRATE(input) | `hydrate()` (mount, READY only) | restored position/timers (paused) | onStateChange (phase cb suppressed) | YES (validate/accept) |
| TICK / ACCOUNT(seconds) | `accountElapsed()` from interval + lifecycle | phaseElapsed/totalElapsed += delta | none (no emit) | YES (time input) |

Target model (not implemented here): `transition(state, event, now) → { state, effects }`.

## 5. Current Side Effects

- Hook-emitted callbacks (intents): `onPhaseChange`, `onSetComplete`,
  `onExerciseComplete`, `onWorkoutComplete`, `onStateChange`.
- WorkoutPlayer consumes them: audio (`playStartSound`/`playEndSound`/
  `playCountdownSound`/`unlockAudio`), haptics (`haptic(...)`), IndexedDB
  persistence, countdown-tick cues (player-side effect on `secondsLeft`), and
  the Start button fires `trackEvent(WORKOUT_STARTED)` + `onWorkoutStart`.
- Page: `onWorkoutStart` → session-start API; `onWorkoutComplete` → session
  complete API.

## 6. Proposed Pure Core Boundary

**Owns (pure domain):**
- session state (the 10 `WorkoutEngineState` fields) + `restTarget` internals;
- all transitions (Section 4 commands) as pure functions of
  `(state, event, now)` / `(state, elapsedSeconds, event)`;
- derived read-model fields (`completedSets`, `progress`, `phaseDurationSeconds`,
  `secondsLeft`, `currentExercise`, `totalSets`);
- auto-advance decision;
- hydration state acceptance/validation/clamping (pure).

**Does NOT own:** React lifecycle, `setInterval`/listeners, IndexedDB, network,
audio, haptics, analytics transport, gamification, UI rendering. It must have
**zero imports** from React, services, `workoutPersistence.ts`, `db.ts`, or
`audioService`.

## 7. Proposed React Adapter Boundary

`useWorkoutEngine` (filename unchanged for compatibility) becomes an adapter:
- binds core state to React (`useState`/`useMemo`);
- exposes the exact same public API (`UseWorkoutEngineResult`) so
  WorkoutPlayer/page/persistence are unchanged;
- owns the `WallClockAccumulator`, injectable `now`, heartbeat interval,
  lifecycle listeners, accumulator start/pause wiring;
- forwards core-emitted effects to the existing callbacks
  (`onPhaseChange`, `onSetComplete`, `onExerciseComplete`, `onWorkoutComplete`,
  `onStateChange`);
- keeps the snapshot-emission gating + phase-callback suppression.

**Adapter ↔ Core interface:** the core exposes a small object/API
(see Sections 12–14); the adapter holds an instance in a ref and calls
`transition(command, now)` — no React inside the core.

## 8. Time / wallClock Model

- `wallClock.ts` is pure, framework-agnostic and **DO-NOT-REFACTOR**:
  `secondsBetween`, `advanceBaseline`, `WallClockAccumulator`.
- The engine stores **no absolute deadline**. `phaseElapsed` counts up from the
  phase anchor; `phaseDurationSeconds` is derived; `secondsLeft` is derived;
  auto-advance fires at `elapsed >= duration`. This is exactly what makes the
  core pure: transitions consume **elapsed seconds** (or `now`) as input.
- Adapter responsibilities: create/own the accumulator, call `account()`
  (interval + lifecycle), and start/pause it per core state (`isRunning` +
  active phase). The core never reads `Date.now()` itself.
- Pause = `acc.pause()` (no time counted); resume = `acc.start()`; background
  catch-up = lifecycle `account()`; hydration restores elapsed as-is (paused).

## 9. Timer Parity Requirements

After extraction, before/after must be identical:
- same initial countdown behavior (READY→EXERCISING, elapsed 0);
- same work interval duration (derived from `durationSeconds`);
- same rest duration (`restSeconds`);
- same pause (frozen) / resume (resumed deadline) semantics;
- same auto-advance timing (elapsed ≥ duration, once);
- same background-tab recovery (lifecycle catch-up, exact seconds);
- same hydration timing (restored elapsed, capped at duration−1, always paused);
- same completion timing (`completedAt = now`, `COMPLETED` phase).

## 10. Hydration / Recovery Boundary

- **Persistence layer:** IndexedDB read/write (`getTodayWorkoutState` /
  `saveTodayWorkoutState`), record mapping + `matchesPlan` validation
  (`workoutPersistence.ts`), conflict policy (`conflictPolicy.ts`) — untouched.
- **Core:** accepts a validated `WorkoutEngineHydrateInput` and produces core
  state: clamp index/set to plan, validate phase, cap `phaseElapsed` at
  `duration − 1`, reconstruct `restTarget` from `(phase, currentSet, sets)`,
  fall back `completedAt = now` for COMPLETED.
- **Adapter:** decides WHEN hydration is requested (mount, after record read)
  and applies it; suppresses `onPhaseChange` for the hydrate.

## 11. Snapshot Compatibility

- Core serializable state MUST remain exactly the current `WorkoutEngineState`
  (10 fields) so `buildWorkoutStateRecord`/`hydrateFromRecord` and existing
  IndexedDB records keep working (`SNAPSHOT_PAYLOAD_UNCHANGED`).
- `restTarget` is internal and reconstructed (derivable) — never persisted.
- New core-internal fields (if any) must be non-serialized; no snapshot version
  change in S-03 (GATE C governs that separately).

## 12. WorkoutExercise Identity Invariants (hard)

- State indexing stays **position-based** (`currentExerciseIndex`) and step
  `id`-based; the core must NEVER key session state by canonical `exerciseId`.
- `WorkoutExercise.id` = workout-step identity; `exerciseId` = movement identity
  (S02-D2). The core treats the plan as an opaque ordered list and does not
  deduplicate/collapse steps by `exerciseId`.

## 13. Rep / Set State

- Set completion is engine-owned (domain); rep *tally* (`repsDone`) is
  **UI-owned** (WorkoutPlayer local state, reset on exercise/set change).
- Reps are NOT persisted (snapshot `actualReps` has no live writer today).
- Extraction must preserve this exactly: core owns set progression; reps stay in
  the UI layer. `PARITY FIRST — REDESIGN LATER` (no Workout V2 rep→duration work).

## 14. Phase / Rest Model

- Current phases: `READY | EXERCISING | RESTING | COMPLETED`. No PREPARE /
  TRANSITION today.
- The core must model phases as an explicit union so future variants
  (PREPARE/TRANSITION) can be added without another extraction — but must NOT
  implement them now (Workout V2 product questions remain open).

## 15. Audio / Haptics Boundary

- Audio/haptics are consumed in WorkoutPlayer via `onPhaseChange` /
  `onSetComplete` + the player-side countdown-tick effect — never inside the
  hook. The core emits semantic phase/set effects; the adapter/player react.
- `audioService.ts` and `useHaptic.ts` are on the DO-NOT-REFACTOR list — no
  changes; only the effect-to-callback mapping at the adapter boundary may be
  formalized.

## 16. Analytics / Gamification Boundary

- `trackEvent(WORKOUT_STARTED)` is fired from the player's Start button (UI
  layer), not the hook. Gamification is server-side from `WorkoutSession` rows.
- Required direction preserved: core emits semantic intents; adapter/UI perform
  analytics; nothing in the core calls `analyticsService` /
  `analyticsEvents` / `gamificationService`.

## 17. Session API Boundary

- `POST /api/workout/session` start is triggered by the page's `onWorkoutStart`
  (player Start button); complete is triggered by `onWorkoutComplete`. Both are
  page-level, outside the engine.
- The core emits `SESSION_STARTED` / `SESSION_COMPLETED` intents (via
  `onWorkoutStart`-equivalent effects or state transitions); the adapter/page
  performs the network calls. The core performs no network.

## 18. Proposed Stable Session State Contract (read model)

For S-03 the public read model stays **exactly `WorkoutEngineState`**:
`phase, currentExerciseIndex, currentSet, completedSets, totalSets,
phaseElapsedSeconds, totalElapsedSeconds, isRunning, startedAt, completedAt`
plus the derived read helpers already exposed (`currentExercise`,
`phaseDurationSeconds`, `secondsLeft`, `progress`, `totalExercises`).
Refinement into a formal `SessionState` contract (S-04) must not change the
serialized shape (snapshot compatibility).

## 19. Proposed Command Contract

Exactly the current public commands (no invented ones):
`start, pause, resume, completeSet, skipRest, nextExercise, previousExercise,
jumpTo(index), reset, restart, hydrate(input)`, plus the internal time input
(`account(seconds)` / elapsed). Explicit domain commands, never a generic
`setState`.

## 20. Proposed Effect Contract

Formalize the existing callbacks as semantic effects (no event bus):
`PHASE_CHANGED`, `SET_COMPLETED`, `EXERCISE_COMPLETED`, `WORKOUT_COMPLETED`,
`STATE_CHANGED`. Adapter maps these to the current option callbacks; transport
details (audio, haptics, IndexedDB, network, analytics) stay in the consumer.

## 21. Target Module Structure (minimal)

```
src/lib/workout/sessionCore.ts      ← pure core + contracts (types, transition fn, create fn)
src/components/workout/useWorkoutEngine.ts  ← adapter (same filename, same public API)
```

Keep contracts co-located with the core (one cohesive module); split only if
import graph demands it. No `types.ts` dumping ground; no new directory sprawl.

## 22. Proposed Extraction Phases (atomic, each revertable)

- **S03-A** — Create pure-core contracts + behavior fixtures (golden traces);
  no wiring.
- **S03-B** — Implement the pure core (state init + transition fn) with Node
  unit tests (no React) mirroring the 12 existing engine behaviors.
- **S03-C** — Make `useWorkoutEngine` delegate commands to the core; keep the
  public API identical.
- **S03-D** — Move timer/auto-advance decisions into the core; wallClock stays
  in the adapter (elapsed-seconds input).
- **S03-E** — Formalize effect intents at the adapter boundary (map core effects
  → existing callbacks).
- **S03-F** — Delete duplicated transition logic from the hook; final parity
  pass.

Each step: one primary goal, targeted tests, runnable/revertable, no bundled
cleanup.

## 23. Parity Test Plan

Existing baseline (must keep green): `tests/workout-engine.test.tsx` (12 tests:
real-elapsed timer, background catch-up, auto-advance, pause semantics,
skipRest/completion summary, hydrate ×5, onStateChange coherence, restart),
`workout-timer.test.ts` (wallClock), `workout-persistence.test.ts`,
`offline-conflict.test.ts`, `workout-plan-identity.test.ts`.

New parity tests (pure core, Node, no React):
- initial session state; exercise order; set transitions; rest behavior;
- deadline/remaining-time; pause frozen; resume resumed; background catch-up
  (via injectable `now`); hydration; completion; rep state unchanged;
- old programs compatible; multiple same-canonical-exercises stay distinct.

## 24. Golden Trace Recommendation

**RECOMMENDED — YES, practical.** The engine already supports injectable `now`
and deterministic transitions; the existing tests approximate traces. Define a
`runTrace(plan, events[])` harness producing
`[state, effects]` per `{event, now}` step, and run the SAME trace against the
reference (current hook) and the pure core. Materially reduces extraction risk;
moderate effort.

## 25. Testability Improvement

Pure-core tests will require NO React renderer, NO fake IndexedDB, NO DOM
(still using Node `node:test` + injectable `now`). Adapter tests
(react-test-renderer) cover integration only. `tests/workout-engine.test.tsx`
remains as the adapter parity suite.

## 26. Blast Radius

| Class | Files |
|---|---|
| MUST CHANGE | `src/components/workout/useWorkoutEngine.ts` (adapter); new `src/lib/workout/sessionCore.ts`; `tests/workout-engine.test.tsx` (kept); new `tests/session-core.test.ts` |
| LIKELY CHANGE | none in consumers — `WorkoutPlayer.tsx`, workout page, persistence, session route keep the same hook API; `tests/workout-timer.test.ts` unchanged (wallClock untouched) |
| SHOULD NOT CHANGE | `wallClock.ts`, `workoutPersistence.ts`, `db.ts`, `conflictPolicy.ts`, `WorkoutPlayer.tsx`, workout page, session route, `audioService.ts`, `useHaptic.ts`, `analytics*`, `gamificationService`, exercise domain, Prisma schema, snapshots |

Extraction scope is contained to the engine + a new pure module + tests.

## 27. Do-Not-Refactor Boundaries (protected)

`wallClock.ts`; `conflictPolicy.ts`; offline outbox (`db.ts` exerciseLogs,
`syncService.ts`); `analyticsService.ts` / `analyticsEvents.ts`;
`gamificationService.ts`; `audioService.ts`; `useHaptic.ts`; the Exercise
identity architecture (S-01..S02-D2). Only compatibility adapters may touch them
if a step requires it (none currently do).

## 28. Rollback Strategy

Code-only atomic commits; each S03-A..F step is individually git-revertable; no
schema/data changes; snapshot shape unchanged (old snapshots hydrate through the
same `WorkoutEngineState`); no Production impact at any step.

## 29. Open Product Questions (NOT resolved by GATE B)

PREPARE duration; TRANSITION behavior; timed vs rep-based conversion; countdown
redesign; left/right execution; Voice Coach; media; rest extensions; skip
semantics beyond current behavior. GATE B is architecture-extraction only.

## 30. Risks

- Timer parity is the highest-risk area → mitigated by the golden-trace harness
  + injectable `now` tests + keeping `wallClock` untouched.
- Snapshot shape must not drift → the core's public read model is pinned to
  `WorkoutEngineState` for S-03.
- The adapter must preserve callback suppression semantics (first render +
  hydrate) exactly.
- Scope creep toward Workout V2 phases is explicitly excluded.

---

## GATE B Decisions Requested

### GB-01 — Pure Core Ownership
**Recommendation:** new `src/lib/workout/sessionCore.ts` (pure domain module),
with contracts co-located. **`PENDING OWNER APPROVAL`**

### GB-02 — Core State Boundary
**Recommendation:** the 10 `WorkoutEngineState` fields + `restTarget` internals;
derived fields computed in core. **`PENDING OWNER APPROVAL`**

### GB-03 — React Adapter Boundary
**Recommendation:** `useWorkoutEngine` (same filename/API) holds React binding,
accumulator/heartbeat/lifecycle, callback mapping + suppression. **`PENDING OWNER APPROVAL`**

### GB-04 — Time Model
**Recommendation:** transitions take elapsed-seconds (or `now`) as input; core
never reads the clock; `wallClock` unchanged and adapter-held. **`PENDING OWNER APPROVAL`**

### GB-05 — Stable Session State Read Model
**Recommendation:** public read model = `WorkoutEngineState` + existing derived
readers; serialized shape pinned (snapshot compatibility). **`PENDING OWNER APPROVAL`**

### GB-06 — Command Contract
**Recommendation:** exactly the current commands (start/pause/resume/completeSet/
skipRest/next/prev/jumpTo/reset/restart/hydrate + time input); no new commands. **`PENDING OWNER APPROVAL`**

### GB-07 — Effect/Intent Contract
**Recommendation:** formalize existing callbacks as semantic effects
(PHASE_CHANGED, SET_COMPLETED, EXERCISE_COMPLETED, WORKOUT_COMPLETED,
STATE_CHANGED); no event bus. **`PENDING OWNER APPROVAL`**

### GB-08 — Hydration Boundary
**Recommendation:** core validates/accepts hydrated state (pure); persistence
stays in `workoutPersistence.ts`/`db.ts`; adapter decides when to hydrate +
suppresses phase callback. **`PENDING OWNER APPROVAL`**

### GB-09 — Parity Test Strategy
**Recommendation:** golden-trace harness + pure-core Node tests mirroring the 12
existing engine behaviors; existing hook suite retained as adapter parity. **`PENDING OWNER APPROVAL`**

### GB-10 — Extraction Sequence
**Recommendation:** S03-A (contracts+fixtures) → B (pure core+tests) → C
(adapter delegates) → D (timer decisions into core) → E (effect intents) → F
(remove duplicated logic). **`PENDING OWNER APPROVAL`**

---

*GATE B is a stop, not a suggestion. No S-03 extraction work may begin until
GB-01..GB-10 are approved by the owner.*