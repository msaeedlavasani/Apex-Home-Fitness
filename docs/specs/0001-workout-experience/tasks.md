# TASKS 0001 — Workout Experience (prospective decomposition)

> **STATUS: PROPOSED — FUTURE / NON-EXECUTABLE / NON-AUTHORIZING**
>
> This file is **not** authorization to execute work and **not** a second backlog.
> `docs/TASKS.md` remains the ONLY executable backlog (`docs/governance/DOCUMENTATION-GOVERNANCE.md` §2.11).
> Every item is a *prospective description* for a future change that requires a separate
> explicit owner authorization. None may be started, assigned, or branched. The spec is
> finalized ([`spec.md`](./spec.md)); implementation is **NOT authorized**.

| Field | Value |
|---|---|
| STATUS | `PROPOSED` (future; gated) |
| SPEC | [`spec.md`](./spec.md) · PLAN: [`plan.md`](./plan.md) |
| TASKS.md entry | [`../../TASKS.md`](../../TASKS.md) → `SPECKIT-PILOT-01` (spec/design only) |
| Date | 2026-09-14 |

## Preconditions before ANY item can start

1. Owner authorizes an implementation task (expected **CRITICAL** class) and promotes it into `docs/TASKS.md`.
2. If any item touches schema/data-model (prescription mode or outcome representation) → separate **DB_CHANGE** task with its own gates.
3. Observation-related integration (if ever proposed) stays behind its own gates (CP-04/CP-05; TS-02; privacy).

## Prospective work breakdown (descriptions only — every item is NOT STARTABLE)

- **T-1 — Prescription resolution contract** *(prospective; would be CRITICAL-class)*. Effect: the resolved prescription carries explicit execution semantics (`REP_BASED` / `TIME_BASED`) consumed by the session, with one canonical resolution for AI and rules; static holds expressed via `TIME_BASED` + distinct coaching semantics. Storage location remains a deferred design decision.
- **T-2 — Modular session/orchestration contract** *(prospective; CRITICAL)*. Additive modular composition (START · PREPARING · EXERCISE_INTRO · WORK_SET · REST · EXERCISE_TRANSITION · COMPLETE) with orchestration owning applicability/sequencing/transitions/block ordering/completion eligibility; progression policy (`AUTO` default, `CONFIRMATION_REQUIRED` permitted). Would require: session-core golden-trace + contract validation.
- **T-3 — Exercise Block lifecycle** *(prospective)*. Intro once per new exercise identity; same-exercise set flow without re-introduction; Next-Exercise only on identity change; REST independence.
- **T-4 — WORK_SET + mode-aware progress** *(prospective)*. One capability, two mode configurations; one reusable progress capability with mode-aware presentation.
- **T-5 — v1 session controls + outcome semantics** *(prospective)*. PAUSE/RESUME · EXIT · SKIP REST · RESTART CURRENT SET · DO LATER · SKIP FOR THIS SESSION (deferred-block re-surfacing before completion; no silent completion; completed/outstanding/skipped distinction). Excluded: SKIP SET · EXTEND REST · REDUCE REST.
- **T-6 — Mentor presentation + degraded mode** *(prospective)*. Moving demonstration as normal experience with capability detection and a usable degraded mode; renderer-agnostic boundary; no technology mandate.
- **T-7 — Accessibility & audio** *(prospective)*. Timed/countdown accessibility (non-animation-only timer representation; not audio-only; not motion-only; reduced motion), session-control a11y, functional audio cues (supplementary), respecting any existing global audio preference.
- **T-8 — Experience shell adoption** *(prospective; UI conformance gate would apply)*. Guided shell honoring the safe-area/viewport contract, fa/en + RTL, reduced motion. Would require: targeted E2E on the workout route + real-browser smoke.
- **T-9 — Convergence & release** *(prospective; per RELEASE_POLICY when production-bound)*. Docs convergence, ADR(s) for the session-contract change, Production checkpoint path.

## Convergence checklist (when the future work lands)

- [ ] Spec status/implementation state updated; this file marked `CLOSED`/`SUPERSEDED`
- [ ] ADR recorded for the session-contract change (ADR-0002 follow-on)
- [ ] `docs/TASKS.md` lifecycle fields updated; report per `docs/AI_CHANGE_TEMPLATE.md`

## HANDOFF

| Field | Value |
|---|---|
| CURRENT_STATUS | `BREAKDOWN_DRAFTED` (future; gated) |
| NEXT_ACTION | None — requires separate owner implementation authorization |
| NEXT_ACTION_AUTONOMOUS | `NO` |
| BLOCKERS | Implementation authorization (owner); deferred design decisions (non-blocking) |
