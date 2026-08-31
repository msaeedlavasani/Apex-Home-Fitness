# Documentation Index

> **STATUS: CURRENT — CANONICAL ROUTER**
>
> This file routes readers to the one canonical owner for each topic. It does
> not restate policy, current state, backlog, or product direction.

## Start here

1. [`../AGENTS.md`](../AGENTS.md) — agent behavior and repository engineering rules.
2. [`governance/DOCUMENTATION-GOVERNANCE.md`](governance/DOCUMENTATION-GOVERNANCE.md) — documentation ownership, precedence, read order, and Decision Persistence.
3. [`CURRENT_STATE.md`](CURRENT_STATE.md) — current repository/Production/task manifest.
4. [`TASKS.md`](TASKS.md) — the **only executable backlog**.

## Canonical owners

| Topic | Canonical owner |
|---|---|
| Executable work: approved, active, blocked, next | [`TASKS.md`](TASKS.md) |
| Current operational snapshot | [`CURRENT_STATE.md`](CURRENT_STATE.md) |
| Human/agent handoff context | [`HANDOFF.md`](HANDOFF.md) |
| Product purpose and accepted/deferred product decisions | [`product/PRODUCT-VISION.md`](product/PRODUCT-VISION.md) |
| Product advisory, competitor evidence, North Star ideas | [`TRANSFORMATION_ROADMAP.md`](TRANSFORMATION_ROADMAP.md) |
| Workout V2 advisory vision and unresolved questions | [`product/WORKOUT-EXPERIENCE-V2.md`](product/WORKOUT-EXPERIENCE-V2.md), [`product/WORKOUT-EXPERIENCE-V2-OPEN-QUESTIONS.md`](product/WORKOUT-EXPERIENCE-V2-OPEN-QUESTIONS.md) |
| Architecture principles and accepted architecture decisions | [`architecture/ARCHITECTURE-PRINCIPLES.md`](architecture/ARCHITECTURE-PRINCIPLES.md), [`adr/README.md`](adr/README.md) |
| Admin Auth V1 architecture decision | [`adr/0004-dedicated-admin-authentication.md`](adr/0004-dedicated-admin-authentication.md) |
| Architecture stabilization status and remaining boundaries | [`architecture/ARCHITECTURE-STABILIZATION-PLAN.md`](architecture/ARCHITECTURE-STABILIZATION-PLAN.md) |
| UI/accessibility | [`DESIGN_SYSTEM.md`](DESIGN_SYSTEM.md) |
| AI/API contracts | [`AI_API.md`](AI_API.md) |
| Assets/offline/media | [`ASSETS.md`](ASSETS.md) |
| Public user auth and OTP launch readiness | [`OTP_LAUNCH_READINESS.md`](OTP_LAUNCH_READINESS.md) |
| Administrator authentication V1 | [`ADMIN_AUTH.md`](ADMIN_AUTH.md), [`adr/0004-dedicated-admin-authentication.md`](adr/0004-dedicated-admin-authentication.md) |
| Environment variables and classification | [`ENVIRONMENT_CONTRACT.md`](ENVIRONMENT_CONTRACT.md), [`.env.example`](../.env.example) |
| Data schema | [`../prisma/schema.prisma`](../prisma/schema.prisma) |
| Release requirements | [`RELEASE_POLICY.md`](RELEASE_POLICY.md) |
| Task-to-Production procedure | [`FEATURE_TO_PRODUCTION.md`](FEATURE_TO_PRODUCTION.md) |
| Branch lifecycle and `DOCS_DIRECT_MAIN` fast path | [`BRANCHING_POLICY.md`](BRANCHING_POLICY.md) |
| Deployment operations | [`RELEASING.md`](RELEASING.md) |
| Constrained Production deployment capability | [`PRODUCTION_DEPLOYMENT_GATEWAY.md`](PRODUCTION_DEPLOYMENT_GATEWAY.md) |
| Validation policy | [`CI.md`](CI.md) |
| Production checkpoints | [`PRODUCTION_CHECKPOINTS.md`](PRODUCTION_CHECKPOINTS.md) |
| Production incident index and reusable lessons | [`PRODUCTION_INCIDENT_LEDGER.md`](PRODUCTION_INCIDENT_LEDGER.md), [`PITFALLS/`](PITFALLS/) |
| Change-report contract | [`AI_CHANGE_TEMPLATE.md`](AI_CHANGE_TEMPLATE.md) |
| Runtime governance tooling | [`GOVERNANCE_RUNTIME.md`](GOVERNANCE_RUNTIME.md), [`PITFALL_GUARDRAILS.md`](PITFALL_GUARDRAILS.md) |
| Supporting autonomous-development workflow | [`AI_DEVELOPMENT_SYSTEM.md`](AI_DEVELOPMENT_SYSTEM.md) |

## Historical evidence

Historical and superseded documents remain available for traceability, but are
not current guidance:

- [`EXECUTION_ROADMAP.md`](EXECUTION_ROADMAP.md) — archived execution history;
- [`governance/REPOSITORY-DOCUMENTATION-AUDIT.md`](governance/REPOSITORY-DOCUMENTATION-AUDIT.md) and [`governance/DOCUMENTATION-CONFLICT-MATRIX.md`](governance/DOCUMENTATION-CONFLICT-MATRIX.md) — 2026-08-27 audit/decision record;
- files explicitly marked `PROPOSAL`, `SUPERSEDED`, `HISTORICAL`, or development-time analysis;
- S02/S03 phase documents under [`architecture/`](architecture/) — implementation evidence; current status is owned by the stabilization plan and S03 closure.

Historical evidence never authorizes work. Only `TASKS.md` can do that.
