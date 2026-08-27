# ADR-0002: Pure Workout Session Core

`STATUS: ACCEPTED — 2026-08-27`

## Context

Before S03, the workout session engine was logically headless but **physically
implemented as a React hook**: `src/components/workout/useWorkoutEngine.ts` (~690 LOC) imports
only React + `src/lib/workout/wallClock.ts` and is consumed by
`WorkoutPlayer.tsx`. Because the engine lives inside a React component hook:

- non-React consumers (future Voice Coach, other UI surfaces, background/PWA
  session handling) cannot consume session state without a hook;
- the session logic is harder to unit-test in isolation;
- Workout Experience V2 (PREPARE / WORK / REST / TRANSITION timeline) would
  enlarge an already-large hook.

This was audit risk R-02 (`docs/architecture/COUPLING-RISK-REGISTER.md`) and
the "UI / Domain Separation" gap in Architecture Principle §5.

## Decision

**ACCEPTED.** Split the workout session engine conceptually into:

### Pure Session Core

A **framework-independent** workout session state machine and timeline module.
It MUST NOT depend on React, UI, Lottie, media or browser components. It owns
session logic:

- session state;
- timeline progression;
- phase transitions;
- set progression;
- timing decisions (consuming `wallClock` semantics);
- pause/resume semantics;
- auto-advance policy;
- state serialization contract.

### React Adapter

`useWorkoutEngine` (or its successor) becomes an **adapter** between the React
lifecycle and the pure session core. It owns React integration:

- lifecycle wiring;
- subscription / render-trigger integration;
- browser-lifecycle integration where appropriate.

### Required Goal (achieved by S03)

Future consumers — Workout Player, Voice Coach, persistence, tests, other UI
surfaces — can consume a **stable Session State contract** without depending on
hook internals (see `ARCHITECTURE-STABILIZATION-PLAN.md` S-04).

## Compatibility

Existing `WorkoutPlayer` behavior must remain **unchanged** during extraction.
Existing workout-engine tests must continue passing; behavior-parity tests are
added before the extraction is complete.

## Consequences

Enables:

- Voice Coach and alternative session surfaces;
- pure unit testing of the session machine;
- smaller UI blast radius for session changes;
- Workout V2 phases (PREPARE / TRANSITION) as additive states of the core.

Costs/risks:

- extraction must preserve behavior exactly (parity test plan required — GATE B);
- a new boundary must be maintained (core public contract vs adapter internals);
- risk of over-abstracting the core — the contract stays small and cohesive, no
  giant "SessionManager".

## Not Decided Yet

Unresolved Workout V2 **product behavior** (PREPARE/REST/TRANSITION durations,
countdowns, rep→duration, recovery rules) is intentionally NOT decided here —
see `docs/product/WORKOUT-EXPERIENCE-V2-OPEN-QUESTIONS.md`. The core may
*support* future states without implementing them.

## Relationship

- Decision id: AD-2 (approved 2026-08-27).
- Implements: Architecture Principle §5 (UI / Domain Separation).
- Follow-up: `docs/architecture/ARCHITECTURE-STABILIZATION-PLAN.md` S-03 / S-04.
