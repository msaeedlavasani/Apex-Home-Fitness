# TASKS 0001 — Workout Experience (prospective decomposition)

> **STATUS: PROPOSED — FUTURE / NOT AUTHORIZED / NOT EXECUTABLE**
>
> This file is **not** authorization to execute work and **not** a second backlog.
> `docs/TASKS.md` remains the ONLY executable backlog
> (`docs/governance/DOCUMENTATION-GOVERNANCE.md` §2.11). Every item below is a
> prospective decomposition for a future change that requires explicit owner
> authorization first (D2 approved spec/design only). Nothing here may be
> started, assigned, or branched until the owner authorizes implementation and
> the items are promoted into `docs/TASKS.md` per its Promotion rule.

| Field | Value |
|---|---|
| STATUS | `PROPOSED` (future; gated) |
| SPEC | [`spec.md`](./spec.md) |
| PLAN | [`plan.md`](./plan.md) |
| TASKS.md entry | [`../../TASKS.md`](../../TASKS.md) → `SPECKIT-PILOT-01` (spec/design only) |
| Date | 2026-09-14 |

## Preconditions before ANY item below can start

1. Owner resolves the blocking UNKNOWN decisions (spec §16) — at minimum U-5, U-1, U-2.
2. Owner authorizes an implementation task (expected **CRITICAL** class) and promotes it into `docs/TASKS.md`.
3. If any item touches schema/data-model (execution metadata) → separate **DB_CHANGE** task with its own gates.

## Prospective work breakdown (descriptions only — every item is NOT STARTABLE)

Each entry below is a *prospective description* of work that would require owner
authorization; none is a work order, none is assigned, and none may be started.

- **T-1 — Session timeline contract extension** *(prospective; would be CRITICAL-class when authorized)*. Effect: an additive extension of phase semantics (PREPARE/WORK/REST/TRANSITION/COMPLETE) plus a per-phase advance policy inside the pure session core. Would require: session-core golden-trace + contract validation.
- **T-2 — Experience shell adoption** *(prospective; UI conformance gate would apply)*. Effect: a guided presentation shell honoring the safe-area/viewport contract, fa/en + RTL, reduced motion. Would require: targeted E2E on the workout route + real-browser smoke.
- **T-3 — Mentor presentation boundary** *(prospective; blocked by U-5)*. Effect: a renderer-agnostic mentor interface with capability detection and a fallback presentation; no technology mandate.
- **T-4 — Demonstration media boundary** *(prospective; blocked by U-6/U-11; MG-07 contract)*. Effect: media manifest/caching per MG-07; no third-party CDN. Would require: asset audit scripts + offline tests.
- **T-5 — Controls & recovery semantics** *(prospective; blocked by U-3/U-4)*. Effect: skip/extend/restart/exit/resume behavior as decided, with snapshot compatibility preserved.
- **T-6 — Audio/voice boundary** *(prospective; blocked by U-7)*. Effect: a cue pipeline or an explicit "none"; accessibility implications per U-12.
- **T-7 — Telemetry** *(prospective; blocked by U-9)*. Effect: session event scope; the log sink remains unless a persistence layer is separately authorized.
- **T-8 — Convergence & release** *(prospective; per RELEASE_POLICY when production-bound)*. Effect: docs convergence, ADR(s) if architecture-relevant, Production checkpoint path if applicable.

## Convergence checklist (when the future work lands)

- [ ] Spec status updated (`CURRENT`) and this file marked `CLOSED`/`SUPERSEDED`
- [ ] ADR recorded for the session-contract change (ADR-0002 follow-on) if applicable
- [ ] `docs/TASKS.md` lifecycle fields updated
- [ ] Report per `docs/AI_CHANGE_TEMPLATE.md`

## HANDOFF

| Field | Value |
|---|---|
| CURRENT_STATUS | `BREAKDOWN_DRAFTED` (future; gated) |
| NEXT_ACTION | None — requires owner authorization of implementation |
| NEXT_ACTION_AUTONOMOUS | `NO` |
| BLOCKERS | Owner decisions (spec §16) + implementation authorization |
