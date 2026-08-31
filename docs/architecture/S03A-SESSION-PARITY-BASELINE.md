# S03-A — Session Parity Baseline

`STATUS: HISTORICAL PHASE EVIDENCE — S03-A COMPLETE; S03 NOW CLOSED`

At the S03-A checkpoint the core extraction had not started. The current S03
status is complete; see [`S03-SESSION-CORE-CLOSURE.md`](./S03-SESSION-CORE-CLOSURE.md).

Phase: `S03-A — Session Contracts + Golden Trace Baseline` (Architecture
Stabilization, S-03). GATE B APPROVED (GB-01..GB-10) — see
[`S03-SESSION-CORE-GATE-B.md`](./S03-SESSION-CORE-GATE-B.md).

**Purpose:** freeze the `useWorkoutEngine` behavior BEFORE extraction. The
current hook was the pre-extraction reference; after S03-C the Session Core is
runtime-active and the hook is the adapter. The artifacts here are
`contracts + golden traces + parity tests + documentation` only.

## 1. Current public behavior (frozen reference)

The reference is the current `useWorkoutEngine` (unchanged). Public surface:
`WorkoutPhase` ('READY' | 'EXERCISING' | 'RESTING' | 'COMPLETED'),
`WorkoutExercise`, `WorkoutEngineState` (10 fields), `WorkoutEngineHydrateInput`,
`WorkoutEngineOptions` (autoAdvance, now, onPhaseChange, onSetComplete,
onExerciseComplete, onWorkoutComplete, onStateChange), `UseWorkoutEngineResult`
(commands + derived values), `clampSets`.

## 2. State contract (SessionState)

Pinned to the current 10 `WorkoutEngineState` fields (see
`src/lib/workout/sessionContracts.ts`): phase, currentExerciseIndex, currentSet,
completedSets, totalSets, phaseElapsedSeconds, totalElapsedSeconds, isRunning,
startedAt, completedAt. Exact optional/nullability semantics preserved.
`restTarget` is internal (reconstructed on hydrate) — NOT part of the state
contract. `SNAPSHOT SHAPE CHANGE REQUIRES GATE C`.

## 3. Command contract

Only current commands (GB-06): START, PAUSE, RESUME, COMPLETE_SET, SKIP_REST,
NEXT_EXERCISE, PREVIOUS_EXERCISE, JUMP_TO(index), RESET, RESTART,
HYDRATE(input), plus the internal time input ACCOUNT(elapsedSeconds).

## 4. Effect contract

Semantic effects = the current callbacks (GB-07): PHASE_CHANGED, SET_COMPLETED,
EXERCISE_COMPLETED, WORKOUT_COMPLETED(summary), STATE_CHANGED(state). No event
bus; no audio/media effects. Transport stays in consumers.

## 5. Callback order semantics (NEW — frozen)

The golden traces assert EXACT callback order, which S03-B..F must preserve:

- **START:** `state` → `phase` (snapshot effect declared before the phase
  effect; both post-commit).
- **Auto-advance set→rest:** `set` (synchronous in completeSet) → `state` → `phase:RESTING`.
- **Final completion:** `set` → `exercise` → `workout` (synchronous) → `state` → `phase:COMPLETED`.
- **Hydrate:** `state` only — the phase callback is suppressed (first render
  and hydrate) and hydrate only works while READY.
- Snapshot emission fires once per transition (never on timer ticks).

## 6. Time semantics baseline

Freezes (via `wallClock` — untouched, used as the reference mechanism):
- elapsed accumulation floors real wall-clock deltas (3.5s → 3s);
- no double counting (idempotent `account()` across interval + lifecycle);
- auto-advance at `elapsed ≥ duration`, once;
- pause freezes time (accumulator paused); resume restarts a fresh baseline;
- background catch-up is exact (90s away ⇒ 90s added).

## 7. Hydration semantics baseline

Restores paused; clamps index/set to plan; validates phase; caps `phaseElapsed`
at `duration − 1`; reconstructs `restTarget` from
`(phase RESTING, currentSet ≥ exercise.sets) → 'exercise' else 'set'`;
`completedAt = now` fallback for COMPLETED; no-op unless READY; phase callback
suppressed.

## 8. Golden scenarios (GT-01..GT-12)

Implemented in `tests/session-golden-trace.test.tsx` via the test-only harness
`tests/helpers/goldenTrace.tsx` (injectable `now` + `mock.timers` + lifecycle
stubs; no sleeps):

| ID | Scenario |
|---|---|
| GT-01 | Initial / Start — exact state + effect order |
| GT-02 | Timed exercise auto-advance into RESTING |
| GT-03 | Multi-set work → rest → work |
| GT-04 | Pause / resume — paused time never counts |
| GT-05 | Skip rest → next exercise |
| GT-06 | Manual set completion (completeSet + skipRest cycle) |
| GT-07 | Exercise navigation (next/previous/jumpTo + clamps) |
| GT-08 | Background catch-up (lifecycle accounting, exact, no double count) |
| GT-09a..d | Hydration (restore paused / clamp+cap / COMPLETED / READY-only) |
| GT-09b′ | Hydrate RESTING last-set → restTarget reconstruction |
| GT-10 | Completion — summary + exact callback order |
| GT-11 | Reset vs restart |
| GT-12 | Repeated canonical exercise — steps stay distinct, position-indexed |

## 9. Existing-test crosswalk

| Existing test (workout-engine.test.tsx) | Golden trace | Covered behavior | Gap |
|---|---|---|---|
| timer advances with real elapsed time | GT-02/GT-08 | tick accounting, no snapshot on ticks | — |
| timer catches up on background return | GT-08 | lifecycle catch-up, idempotent | — |
| auto-advance fires while backgrounded | GT-02/GT-08 | background auto-advance | — |
| paused time never counts + snapshots isRunning | GT-04 | pause freeze | — |
| skipRest and completing final set → COMPLETED | GT-05/GT-10 | skip + completion summary | — |
| hydrate restores position paused | GT-09a | hydrate paused | — |
| hydrate is a no-op after start | GT-09d | READY-only guard | — |
| hydrate clamps + keeps one tick | GT-09b | clamp + cap | — |
| hydrate of COMPLETED | GT-09c | completed hydrate | — |
| hydrate RESTING last set → next exercise | GT-09b′ | restTarget reconstruction | — |
| onStateChange fires once per transition | GT-01/GT-02 | coherent single snapshot | callback ORDER newly frozen |
| restart resets position/timers/markers | GT-11 | reset + restart | — |
| — (new) | GT-03 | work→rest→work within a multi-set exercise | previously implicit |
| — (new) | GT-06 | full manual set cycle without auto-advance | previously implicit |
| — (new) | GT-07 | navigation clamps | previously implicit |
| — (new) | GT-12 | step identity with shared canonical exerciseId | new (S02-D2) |

## 10. Old snapshot constraint

Existing IndexedDB records (`WorkoutEngineState` 10-field shape) must hydrate
identically after extraction — the state contract is pinned; any shape change
requires GATE C.

## 11. Exercise-vs-step identity invariant

State indexing is position/step based (`currentExerciseIndex`, step `id`);
canonical `exerciseId` is movement identity only and never collapses or dedups
steps (GT-12).

## 12. Baseline drift detection

The S03-A tests fail if a future S03-B..F change alters: timer thresholds,
callback order, rest transitions, hydration clamps/caps, pause semantics, step
identity, snapshot emission behavior, or any of the frozen state values. The
current hook remains the behavioral authority for extraction.

## 13. S03-B parity requirements

S03-B implements the first pure core transition logic; it MUST satisfy every
GT-01..GT-12 trace (same states, same effect order) plus keep the existing
`workout-engine.test.tsx`, `workout-timer.test.ts`, `workout-persistence.test.ts`,
`offline-conflict.test.ts`, and `workout-plan-identity.test.ts` suites green.

## Files

- Contracts (pure): `src/lib/workout/sessionContracts.ts`
- Harness (test-only): `tests/helpers/goldenTrace.tsx`
- Golden traces: `tests/session-golden-trace.test.tsx` (17 tests)
- This document.

**Implementation status: S03-A baseline complete.** The subsequent S03-B pure
core and S03-C adapter delegation are complete; S03-F closure confirms the
baseline remains green.
