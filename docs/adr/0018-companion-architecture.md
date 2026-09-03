# ADR-0018: Companion Architecture + Intervention Model

> **STATUS: ACCEPTED — 2026-09-03**
>
> **Decision owner:** Product/architecture owner
>
> **Evidence task:** `CP-01` (Companion architecture + UX behavior spec,
> delivered 2026-09-03; architecture:
> `docs/architecture/CP-01-COMPANION-ARCHITECTURE.md`; view in
> `docs/TASKS.md`)
>
> **Execution gating:** this ADR ratifies the Companion architecture and
> intervention model (spec only). It does NOT authorize any implementation,
> camera/pose work (CP-03/CP-04 — separate gates), observation-signal
> collection (CP-02 contract + TS-01 consent), or any runtime/UI change.

## Context

The strategy (§2D) promises an active companion — **«تو ورزش کن؛ ما حواسمون
بهت هست.»** — spanning workout guidance, rep/phase awareness, form
feedback, useful correction, encouragement, contextual substitutions/
regressions, and workout observation feeding future adaptation, with the
UX principle "watching over the user, not policing the user". Without an
architecture spec, future implementation would improvise intervention
behavior ad hoc and drift from that principle.

## Decision

1. **Companion = guidance + observation surface, never a decision-maker.**
   Component boundaries: pure **Companion Engine** (session state +
   observation signals + AL-04 `AdaptiveDecisionOutput` → typed
   intervention intents or explicit silence), **intervention surface**
   (keyed copy, EN-first), **observation layer** (CP-02 signal contract),
   **adaptation bridge** (renders AL-04 decisions; records nothing).
2. **"Watching over, not policing" is mechanical:** (a) silence is the
   default; (b) value over noise — every intervention must be grounded in a
   signal or decision; (c) guidance, not criticism — suggestions as offers,
   no negative labels, data-grounded encouragement only.
3. **Typed intervention model** G1–G7 (transition guidance, rep/phase
   awareness, form feedback, useful correction, encouragement, contextual
   substitution/regression, deload/stop) — each threshold-gated by signal
   confidence and cadence-capped (tables in the spec). Explicit
   stay-silent rules: no mid-rep talk, no repeats, no actionable-less
   commentary, no fabricated praise.
4. **AL-04 apply-mode contract:** `AUTO` decisions apply and are announced
   once from the decision's `humanText`; `ADVISORY` decisions are offered
   for confirmation (declined ⇒ no re-prompt); `INSUFFICIENT_DATA` basis ⇒
   neutral guidance only. The Companion never re-decides.
5. **Fitness-not-medical boundary:** AL-04 flags render as conservative
   load management; pain/discomfort triggers one gentle stop/rest message;
   no diagnosis, no medical language, no argument with the user.
6. **Privacy posture inherited from TS-01:** this stage adds no data
   classes; observation signals are C2-class (explicit granular revocable
   consent, purpose-bound, deletable); raw video never leaves the device;
   camera/pose is deferred to CP-03 (feasibility) + CP-04 (consent
   architecture), both separately gated.
7. **Copy discipline:** intervention text is keyed, EN-first, with FA only
   from a verified corpus (MG-07 rules); no free-text generation, no
   invented Persian.

## Consequences

- Future Companion work (CP-02 signals, CP-05 integration) builds against a
  fixed intervention contract instead of ad hoc behavior; the Engine is
  pure and unit-testable (threshold/cadence tables).
- Nothing is implemented, collected, or wired by this decision; observation
  collection remains blocked on CP-02 contract + TS-01 consent + CP-03/04
  gates.
- The AL-04 decision output becomes the single source of adaptive copy
  (`humanText`), keeping guidance attributable and non-diagnostic.

## Related

- `docs/architecture/CP-01-COMPANION-ARCHITECTURE.md` — the spec (this record's evidence)
- `docs/adr/0017-adaptive-training-graph-decision-layer.md` (AL-04 — apply modes, flags, humanText)
- `docs/adr/0014-privacy-safety-architecture.md` (TS-01 — data classes, consent, safety boundary)
- `docs/adr/0012-workout-outcome-model.md` (AL-01), `docs/adr/0013-personal-movement-profile.md` (AL-02)
- `docs/product/PRODUCT-STRATEGY.md` §2D (Companion), §8 (privacy), §9 (trust/safety)