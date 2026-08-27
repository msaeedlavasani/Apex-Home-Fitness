# S03-C — React Adapter Delegation

`STATUS: IMPLEMENTED — PURE CORE NOW RUNTIME-ACTIVE`

## Architecture

Before S03-C, `useWorkoutEngine` owned both React integration and session
transitions. After S03-C, `createSessionCore` is the domain transition
authority. The hook owns the React mirror, callback freshness, browser
lifecycle, wall-clock accumulator, heartbeat, and public API compatibility.

## Delegation

All public domain commands—start, pause, resume, completeSet, skipRest,
next/previous/jump navigation, reset, restart, hydrate, and ACCOUNT—flow
through `core.transition`. The hook maps semantic effects to the existing
callbacks without changing their public arguments. The core instance is kept
in a ref and recreated only when the plan array identity changes, matching the
existing plan identity boundary.

## Timing

`WallClockAccumulator` remains unchanged and adapter-owned. Its single delta is
passed once as ACCOUNT to the core. The core performs elapsed accounting and
threshold auto-advance; no parallel hook threshold decision remains. Heartbeat
and visibility/page lifecycle listeners remain in the hook.

## Compatibility

Workout step `id` remains step-local; canonical `exerciseId` is metadata only.
The ten-field snapshot state is mirrored unchanged. No persistence, IndexedDB,
API, database, logging, or production code changed. Hydration remains READY-only
and paused; phase callback suppression is retained by the adapter.

## Parity

The original S03-A golden traces, S03-B pure-core tests, workout-engine tests,
timer, persistence, offline-conflict, and plan identity tests pass together:
**456/456**. Callback ordering and completion summary behavior remain covered.

## S03-F closure

S03-D and S03-E verified the timer and effect boundaries. S03-F closes the
extraction with no additional runtime cleanup; wallClock, snapshot shape, effect
ordering, and the public hook API remain unchanged. Workout V2 remains outside
scope.
