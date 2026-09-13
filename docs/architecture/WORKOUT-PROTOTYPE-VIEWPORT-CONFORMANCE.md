# Workout Prototype Viewport Conformance

> **STATUS: CURRENT — scoped to `/[locale]/prototype/workout`**

## Composition map

- Semantic regions: full-surface backstage, state-specific stage, safe-area
  content chrome, and active-work zones.
- Visual anchor: the approved backstage/active Mentor presentation already
  owned by the prototype state configuration.
- Primary action: state-specific CTA or active workout control.
- Initial viewport: the live visual viewport; no page scroll is permitted.
- Responsive reflow: the shared shell uses the live `dvh` with `svh`/`vh`
  fallbacks; content safe areas are independent from the backdrop.
- Invariant anchor: backstage covers the complete shell, including the
  standalone iOS status-bar region.
- Camera/body-safe region: interactive content is inset by shared
  `--workout-safe-top` and `--workout-safe-bottom` variables.

## Implementation evidence

Before this correction, the shell had a direct `100dvh`/`max-height` contract,
duplicated safe-area expressions, and the parent locale metadata emitted
`apple-mobile-web-app-status-bar-style=default`. In standalone iOS this could
leave an opaque strip above the stage; in shorter normal-Safari visual
viewports the PREPARE content wrapper could clip its lower details because it
used `overflow:hidden` against a fixed shell allocation.

The correction is scoped to the prototype route: nested route metadata uses
`viewport-fit=cover`, a warm theme color, and `black-translucent`; the shared
prototype shell uses `vh → svh → dvh` fallback ordering, a document background
matching the stage, and shared safe-area variables for content placement.

Validation must distinguish Chromium/emulated viewport evidence from owner
real-iPhone Safari and standalone evidence. No real-iPhone validation is
claimed by this record.
