# S03-B — Pure Workout Session Core

`STATUS: IMPLEMENTED IN PARALLEL — NOT YET RUNTIME-ACTIVE`

## Scope

S03-B implements `src/lib/workout/sessionCore.ts` as a framework-independent,
stateful core facade. `useWorkoutEngine` remains the runtime/reference
implementation; S03-C is intentionally not started.

## Boundary

The module imports only `sessionContracts.ts`. It has no React, browser,
wallClock, persistence, network, service, or ambient-clock dependencies. The
caller supplies explicit `now` values for timestamped commands and explicit
whole-second `ACCOUNT` deltas for elapsed time.

## Public API

`createSessionCore(plan)` clones the ordered plan and returns:

- `plan`: immutable-by-convention cloned plan;
- `state`: current 10-field `SessionState` snapshot;
- `derive(state?)`: current exercise, totals, progress, phase duration, and
  seconds remaining;
- `transition(command, now?)`: new state plus semantic `SessionEffect[]`.

The plan is position/step based. `exerciseId` is optional metadata and never a
state key; repeated canonical movements remain separate steps.

## Commands and effects

The implemented commands are the approved current set: START, PAUSE, RESUME,
COMPLETE_SET, SKIP_REST, NEXT_EXERCISE, PREVIOUS_EXERCISE, JUMP_TO, RESET,
RESTART, HYDRATE, and ACCOUNT. Effects are the approved semantic effects:
`STATE_CHANGED`, `PHASE_CHANGED`, `SET_COMPLETED`, `EXERCISE_COMPLETED`, and
`WORKOUT_COMPLETED`.

Phase-changing transitions emit state before phase, matching the frozen hook
callback order. Completion emits set, exercise, workout, state, phase. Hydrate
emits state only.

## Timing and restTarget

The core never owns a timer or calls `Date.now()`. ACCOUNT adds floored,
non-negative explicit seconds only while running in an active phase. A duration
threshold performs one current auto-advance, without multi-phase catch-up.
`restTarget` is internal and distinguishes next-set rest from next-exercise
rest; it is reconstructed during RESTING hydration and never serialized.

## Hydration and snapshots

Hydration is accepted only from READY, clamps index/set, validates the current
phase union, caps configured phase elapsed at duration minus one, restores
paused, preserves total elapsed, and supplies `completedAt` for COMPLETED when
needed. The serialized state remains the existing ten fields. No snapshot,
IndexedDB, persistence, or schema code changed.

## Validation and parity

The original 17 S03-A reference golden tests remain green and are unchanged.
New pure tests cover initialization, exact effect order, timed progression,
rest, hydration, immutability, repeated canonical steps, and determinism.
The full suite passes 456/456. The hook remains the behavioral authority until
S03-C runs the same scenarios against both implementations through an adapter
parity seam.

## S03-C handoff

S03-C may introduce delegation in `useWorkoutEngine` only after owner review.
It must preserve callback suppression, snapshot emission gating, wallClock
ownership, public hook API, and all S03-A traces. The initial adapter seam
should map hook commands to `transition`, then separately preserve React
rendering and effect timing; no persistence or snapshot changes are authorized.
