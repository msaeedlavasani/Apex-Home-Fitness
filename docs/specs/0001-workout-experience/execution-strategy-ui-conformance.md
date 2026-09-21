# Workout V2 execution-strategy recovery — UI conformance evidence

Status: CURRENT for `WORKOUT-V2-EXECUTION-STRATEGY-COMPLETENESS-RECOVERY`.

## Discovery

- `docs/DESIGN_SYSTEM.md` and `src/components/ui/platform` were inspected
  before the UI wiring was changed.
- Existing `CameraConsentBanner`, `Button`, `Card`, `MentorStage`, theme
  provider, next-intl messages, and existing focus/RTL conventions were reused.
- No new UI kit, MUI import, hard-coded theme color, or parallel provider was
  introduced.

## Decision

`UI_CONFORMANCE=PASS` with `UI_CONFORMANCE_DECISION=EXTEND`.

Reuse alone was insufficient because the canonical pre-workout capability gate
and the session-owned Mentor host did not exist at the V2 route boundary. The
bounded extension adds the gate host and keeps one Mentor renderer mounted
across INTRO → SET; it does not create a second visual system or move strategy
selection into presentation.

## Conformance evidence

- The gate uses the existing consent surface and existing platform primitives.
- English and Persian messages were added together; the route continues to use
  next-intl and the existing locale direction architecture.
- The active SET renders tracked progress or timed progress from the resolved
  runtime strategy. It does not render the legacy `Record rep` primary action.
- Session outcome data remains in the model, while the previously rejected
  `Completed: 0` strip is not rendered during an active SET.
- The Mentor asset lifecycle is session-owned and remains mounted across the
  INTRO → SET handoff instead of adding per-screen duplicate renderers.
- Existing focus, keyboard, contrast, reduced-motion, and responsive behavior
  remain delegated to the reused platform components and established classes.

## Scope boundary

This is functional execution-path wiring, not Owner visual acceptance. Browser
device acceptance of camera permission, calibration, and the integrated flow
remains a downstream governed checkpoint.
