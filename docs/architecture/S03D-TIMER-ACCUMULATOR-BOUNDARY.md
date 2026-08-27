# S03-D — Timer / Accumulator Boundary

`STATUS: VERIFIED / HARDENED — OBSERVABLE BEHAVIOR UNCHANGED`

## Scope reassessment

S03-C already moved elapsed-state mutation, threshold checks, and auto-advance
into `sessionCore`. `wallClock.ts` remains measurement-only and the React hook
owns interval/lifecycle integration. No runtime source change was necessary;
S03-D added focused lifecycle regression coverage only.

## Ownership

| Concern | Owner |
|---|---|
| elapsed wall-clock measurement/baseline | `WallClockAccumulator` |
| interval and browser lifecycle | React adapter (`useWorkoutEngine`) |
| elapsed session state | Session Core |
| threshold and auto-advance | Session Core |
| countdown presentation/cues | `WorkoutPlayer` UI |
| persistence | offline persistence layer |

## Lifecycle model

The adapter creates one accumulator per hook instance, starts it only when the
core mirror is running in an active phase, pauses it otherwise, and submits its
idempotent whole-second delta to core ACCOUNT from the heartbeat or lifecycle
handlers. `visibilitychange`, `pagehide`, `pageshow`, and `focus` can safely
call `account()` repeatedly because the accumulator advances its baseline.

Hydration restores the core paused, so the adapter does not start accounting
until explicit resume. Reset pauses and re-zeroes core state; restart starts a
new core session and the adapter establishes a fresh accumulator baseline.
COMPLETED stops the interval and causes lifecycle accounting to return zero.

## Large deltas and pause semantics

ACCOUNT applies explicit floored elapsed seconds and performs the current single
threshold transition. It does not invent multi-phase catch-up. Paused time is
excluded by the accumulator baseline and core `isRunning` guard.

## Presentation boundary

`WorkoutPlayer` derives display countdown/progress and triggers countdown audio
cues from hook-derived values. These are presentation effects only; they do not
measure time or mutate session timing, and remain outside the core.

## Verification

Added `tests/timer-boundary.test.tsx` covering heartbeat + visibility/focus
exactly-once accounting, paused hydration, reset/restart baseline safety, and
post-completion lifecycle safety. Existing timer, background, pause/resume,
golden-trace, pure-core, persistence, and identity tests remain green. Full
suite: **460/460**.

No `wallClock` rewrite, timer-frequency change, UX change, snapshot change,
API/database change, or Production change occurred.

## S03-F closure

The timer boundary is closed for this phase. S03-E may formalize semantic effect
consumption only after owner review; it must preserve the current effect order,
callback mapping, hydration suppression, and timer ownership matrix.
