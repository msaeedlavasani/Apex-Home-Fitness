# S03-E — Effect Boundary

`STATUS: VERIFIED / HARDENED — OBSERVABLE BEHAVIOR UNCHANGED`

## Scope reassessment

S03-C already established a cohesive adapter-local effect consumer and kept
Session Core side-effect free. S03-E added regression tests for callback
freshness, optional callbacks, hydration suppression, and post-completion
idempotence. No runtime source change was required.

## Effect inventory and ownership

| Domain effect | Adapter consumer | Downstream consequence |
|---|---|---|
| STATE_CHANGED | `onStateChange` | snapshot persistence in WorkoutPlayer |
| PHASE_CHANGED | `onPhaseChange` | audio/haptic/presentation response |
| SET_COMPLETED | `onSetComplete` | set haptic/presentation response |
| EXERCISE_COMPLETED | `onExerciseComplete` | optional application integration |
| WORKOUT_COMPLETED | `onWorkoutComplete` | summary/session completion API |

The core determines semantic occurrence, payload, and order. The adapter invokes
fresh callback refs. WorkoutPlayer owns audio/haptics and presentation;
analytics and persistence remain application layers. No generic event bus was
introduced.

## Payloads and order

- `STATE_CHANGED`: the ten-field serialized session state.
- `PHASE_CHANGED`: current phase.
- `SET_COMPLETED`: workout exercise index and one-based set.
- `EXERCISE_COMPLETED`: workout exercise index.
- `WORKOUT_COMPLETED`: total exercises, total sets, completed sets, duration.

The frozen order is preserved: phase-changing state then phase; set completion
then state/phase; final completion set → exercise → workout → state → phase.
Hydration emits state without the normal phase callback.

## Adapter boundary

`consumeEffect` is adapter-local and uses callback refs. Missing callbacks are
optional and do not block transitions. Callback errors are not swallowed; they
retain normal propagation semantics. Core never receives callbacks or performs
application effects.

The core remains framework-independent and side-effect-free: no React,
browser, services, network, persistence, analytics, audio, haptics, emitter, or
global listener registry.

## Exactly-once and stability

The adapter does not synthesize duplicate state/phase callbacks. Completion
cannot re-emit after COMPLETED, and ordinary callback prop rerenders do not reset
the plan-scoped core. New focused tests plus the original golden traces verify
these properties.

## Validation

TypeScript and ESLint pass. Full unit suite passes **464/464**. No API, database,
snapshot, wallClock, timer, UI, or Production changes occurred.

## S03-F handoff

S03-F may perform final adapter cleanup only after owner review. Preserve the
semantic effect contract, callback ordering, hydration suppression, callback
freshness, and current application integration boundaries.
