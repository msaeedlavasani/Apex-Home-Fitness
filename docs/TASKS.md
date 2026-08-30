# Executable Backlog

> **STATUS: CURRENT — THE ONLY CANONICAL EXECUTABLE BACKLOG**
>
> A task appears here only after explicit owner authorization. Product visions,
> roadmaps, audits, risk registers, open questions, and architecture plans are
> advisory or decision records; they cannot authorize execution.

## Lifecycle now

| Field | Value |
|---|---|
| Active task | `DOCUMENTATION-CONSOLIDATION-01` |
| Profile | `DOCS_ONLY` |
| Branch | `docs/documentation-consolidation-01` |
| State | `ACTIVE` |
| Production-bound | `NO` |
| Next authorized task | `AUTH-PERF-01` after this task closes |

## Approved queue

### DOCUMENTATION-CONSOLIDATION-01 — ACTIVE

- **Authorization:** owner prompt, 2026-08-31.
- **Scope:** consolidate documentation ownership, executable backlog, decision persistence, and link graph.
- **Production:** no mutation; no product/application behavior change.
- **Exit:** governance/link validation, main integration, durable report, branch retirement.

### AUTH-PERF-01 — APPROVED / NOT STARTED

- **Authorization:** preserved from the verified AUTH-FIX-01 handoff.
- **Scope:** evidence-backed investigation of reported performance, persistence,
  and EN/FA parity degradation; do not assume a root cause.
- **Expected branch:** `fix/auth-perf-production-degradation` from current remote `main`.
- **Dependency:** `DOCUMENTATION-CONSOLIDATION-01 = CLOSED`.
- **Production:** any later mutation requires the Production-bound workflow and
  separate evidence; this entry does not authorize a deploy by itself.

## Registered decisions — not executable

These are deliberately **not backlog tasks**. Their canonical decision owners
preserve them until the owner separately authorizes bounded execution:

| Decision/direction | Status | Canonical owner |
|---|---|---|
| Dedicated administrator authentication independent of the public OTP journey | ACCEPTED DIRECTION / DEFERRED; no implementation or auth mechanism selected | [`product/PRODUCT-VISION.md`](product/PRODUCT-VISION.md) |
| Iran/international-connectivity resilience and external/Supabase dependency evaluation | ACCEPTED EVALUATION NEED / DEFERRED; no provider migration selected | [`architecture/ARCHITECTURE-PRINCIPLES.md`](architecture/ARCHITECTURE-PRINCIPLES.md) |
| Iranian competitor research gap | KNOWN ADVISORY GAP / RESEARCH NOT PERFORMED | [`TRANSFORMATION_ROADMAP.md`](TRANSFORMATION_ROADMAP.md) |
| Workout Experience V2 | PRODUCT VISION / NOT AUTHORIZED | [`product/WORKOUT-EXPERIENCE-V2.md`](product/WORKOUT-EXPERIENCE-V2.md) |
| Transformation roadmap capabilities | PROPOSED / NOT AUTHORIZED | [`TRANSFORMATION_ROADMAP.md`](TRANSFORMATION_ROADMAP.md) |
| S02-E and S-04..S-06 | PLANNED OR DEFERRED / OWNER CHECKPOINT REQUIRED | [`architecture/ARCHITECTURE-STABILIZATION-PLAN.md`](architecture/ARCHITECTURE-STABILIZATION-PLAN.md) |

## Recently closed

| Task/checkpoint | Outcome | Evidence owner |
|---|---|---|
| `GOVERNANCE-RUNTIME-01` | CLOSED; repository governance runtime enforced | [`GOVERNANCE_RUNTIME.md`](GOVERNANCE_RUNTIME.md) and Git history through `7edfb89` |
| `AUTH-FIX-01` | CLOSED; Production PASS | [`PRODUCTION_CHECKPOINTS.md`](PRODUCTION_CHECKPOINTS.md) |
| S03 Session Core | CLOSED; architecture/runtime refactor complete | [`architecture/S03-SESSION-CORE-CLOSURE.md`](architecture/S03-SESSION-CORE-CLOSURE.md) |
| S02 Production recovery | PASS | [`PRODUCTION_CHECKPOINTS.md`](PRODUCTION_CHECKPOINTS.md) |

Older batch history is preserved in Git and the explicitly archived
[`EXECUTION_ROADMAP.md`](EXECUTION_ROADMAP.md). It is not duplicated here.

## Promotion rule

To promote an advisory/deferred item into executable work, update this file
*before implementation* with: task ID, explicit authorization source, bounded
scope, dependencies, task profile, branch, Production classification, and
acceptance. Decision Persistence in
[`governance/DOCUMENTATION-GOVERNANCE.md`](governance/DOCUMENTATION-GOVERNANCE.md)
applies before workflow continuation.
