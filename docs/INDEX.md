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
| Comprehensive product strategy (parent/master; PROPOSED / NON-EXECUTABLE) | [`product/PRODUCT-STRATEGY.md`](product/PRODUCT-STRATEGY.md) |
| Movement Intelligence strategy (deep-dive specialist; PROPOSED / NON-EXECUTABLE) | [`product/MOVEMENT-INTELLIGENCE-STRATEGY.md`](product/MOVEMENT-INTELLIGENCE-STRATEGY.md) |
| Workout V2 advisory vision and unresolved questions | [`product/WORKOUT-EXPERIENCE-V2.md`](product/WORKOUT-EXPERIENCE-V2.md), [`product/WORKOUT-EXPERIENCE-V2-OPEN-QUESTIONS.md`](product/WORKOUT-EXPERIENCE-V2-OPEN-QUESTIONS.md) |
| Architecture principles and accepted architecture decisions | [`architecture/ARCHITECTURE-PRINCIPLES.md`](architecture/ARCHITECTURE-PRINCIPLES.md), [`adr/README.md`](adr/README.md) |
| Admin Auth V1 architecture decision | [`adr/0004-dedicated-admin-authentication.md`](adr/0004-dedicated-admin-authentication.md) |
| Architecture stabilization status and remaining boundaries | [`architecture/ARCHITECTURE-STABILIZATION-PLAN.md`](architecture/ARCHITECTURE-STABILIZATION-PLAN.md) |
| UI/accessibility | [`DESIGN_SYSTEM.md`](DESIGN_SYSTEM.md) |
| UI Conformance Gate (mandatory for `UI_CHANGED=YES` tasks) | [`governance/UI-CONFORMANCE-GATE.md`](governance/UI-CONFORMANCE-GATE.md) |
| Report delivery contract (persisted / validated / delivered / path) | [`governance/REPORT-DELIVERY-CONTRACT.md`](governance/REPORT-DELIVERY-CONTRACT.md) |
| AI/API contracts | [`AI_API.md`](AI_API.md) |
| Assets/offline/media | [`ASSETS.md`](ASSETS.md) |
| Public user auth and OTP launch readiness | [`OTP_LAUNCH_READINESS.md`](OTP_LAUNCH_READINESS.md) |
| Administrator authentication V1 | [`ADMIN_AUTH.md`](ADMIN_AUTH.md), [`adr/0004-dedicated-admin-authentication.md`](adr/0004-dedicated-admin-authentication.md) |
| Admin impersonation / View-as-User capability spec (DEFERRED) | [`ADMIN_IMPERSONATION_01.md`](ADMIN_IMPERSONATION_01.md) |
| Freebuff orchestration capability (one active CLI per account; no true parallel workers) | [`orchestration/FREEBUFF-ORCHESTRATION-INVESTIGATION-01.md`](orchestration/FREEBUFF-ORCHESTRATION-INVESTIGATION-01.md) |
| Batch Delivery operating model (serial isolated tasks, consolidated lifecycle) | [`BATCH_DELIVERY_V1.md`](BATCH_DELIVERY_V1.md) |
| Admin Console design-system posture / audit + KIT-FIRST control rule | [`architecture/ADMIN-DESIGN-SYSTEM-AUDIT-01.md`](architecture/ADMIN-DESIGN-SYSTEM-AUDIT-01.md) |
| Shared typography contract (fa → Vazirmatn, en → Inter; RATIFIED) + Admin Console i18n/RTL architecture | [`DESIGN_SYSTEM.md`](DESIGN_SYSTEM.md) §4.1–4.2 |
| Mobile readiness — audit (EXECUTED + RATIFIED 2026-09-01), binding guardrails, deferred triggers/spike/health scope | [`architecture/MOBILE-READINESS-01.md`](architecture/MOBILE-READINESS-01.md), [`architecture/MOBILE-READINESS-01-REPORT.md`](architecture/MOBILE-READINESS-01-REPORT.md), [`adr/0005-mobile-readiness-guardrails.md`](adr/0005-mobile-readiness-guardrails.md) |
| Governed Production DB mutation capability (gateway v2 `db-operation`: read-only dry-run evidence + dry-run-gated backfill/migration; proven without mutation) | [`architecture/GOVERNED-DB-MUTATION-01.md`](architecture/GOVERNED-DB-MUTATION-01.md), [`PRODUCTION_DEPLOYMENT_GATEWAY.md`](PRODUCTION_DEPLOYMENT_GATEWAY.md) §db-operation |
| S02-E Exercise Identity Backfill — preflight/capability-gap record + final lifecycle (DELIVERED/CLOSED 2026-09-01: governed apply via gateway v2 as 0-row no-op; ambiguous row left unmapped; deferred alias-collision debt `EXERCISE-CATALOG-DISAMBIGUATION-01`) | [`architecture/S02E-BACKFILL-PREFLIGHT.md`](architecture/S02E-BACKFILL-PREFLIGHT.md) |
| Post-S-04 architecture backlog re-rank (S-06 → S-05 → S02-E; batchability) | [`architecture/POST-S04-PRIORITY-01.md`](architecture/POST-S04-PRIORITY-01.md) |
| Exercise library / catalog role (S-06 decision: catalog = canonical; library page = sample/demo) | [`architecture/S06-CATALOG-ROLE.md`](architecture/S06-CATALOG-ROLE.md) |
| Movement Graph canonical schema / domain contract (MG-01 — DELIVERED 2026-09-01; type-level movement knowledge shape; pure, no persistence change) | [`architecture/MG-01-MOVEMENT-GRAPH-CONTRACT.md`](architecture/MG-01-MOVEMENT-GRAPH-CONTRACT.md), [`adr/0006-movement-graph-domain-contract.md`](adr/0006-movement-graph-domain-contract.md) |
| Movement taxonomy vocabulary (MG-02 — DELIVERED 2026-09-01; closed canonical tokens for patterns/muscles/equipment/difficulty/impact/symmetry/home-suitability/constraints with FA/EN maps; provisional FA flagged for MG-07) | [`architecture/MG-02-MOVEMENT-TAXONOMY.md`](architecture/MG-02-MOVEMENT-TAXONOMY.md), [`adr/0007-movement-taxonomy-vocabulary.md`](adr/0007-movement-taxonomy-vocabulary.md) |
| Source/provenance contract (MG-03 — DELIVERED 2026-09-01; hardened provenance record + sha256 hash contract + license-compatibility rules + confidence model; unchanged MG-01 contract) | [`architecture/MG-03-SOURCE-PROVENANCE.md`](architecture/MG-03-SOURCE-PROVENANCE.md), [`adr/0008-source-provenance-contract.md`](adr/0008-source-provenance-contract.md) |
| MG-04 source-selection decision gate (CLOSED 2026-09-01; primary source free-exercise-db Unlicense; DATA-ONLY media posture; does NOT authorize execution) | [`architecture/MG-04-DECISION-GATE-SOURCE-SELECTION.md`](architecture/MG-04-DECISION-GATE-SOURCE-SELECTION.md) |
| Governed ingestion pipeline (MG-04 — DELIVERED 2026-09-01; staged pin→parse→normalize→fail-closed identity→taxonomy→provenance→MovementObject; dry-run only, no media, no DB writes) | [`architecture/MG-04-INGESTION-PIPELINE.md`](architecture/MG-04-INGESTION-PIPELINE.md), [`adr/0009-governed-ingestion-pipeline.md`](adr/0009-governed-ingestion-pipeline.md) |
| Normalization / dedup / identity resolution (MG-05 — DELIVERED 2026-09-01; FA/EN normalization, deterministic S02-E-model classifier, AMBIGUOUS never auto-resolved, dedup + collision + suggestion evidence report; pure module, no runtime change) | [`architecture/MG-05-IDENTITY-RESOLUTION.md`](architecture/MG-05-IDENTITY-RESOLUTION.md) |
| Relationship model (MG-06 — DELIVERED 2026-09-01; typed progression/regression/substitution edges, fail-closed graph validation — no cycles/dangling/self-loops/duplicates, expressibility exemplars over the real canonical catalog; pure module, no runtime change) | [`architecture/MG-06-RELATIONSHIP-MODEL.md`](architecture/MG-06-RELATIONSHIP-MODEL.md) |
| Localization + media architecture (MG-07 — DELIVERED 2026-09-01; FA/EN localization key structure for every user-facing movement field; self-hosted media manifest — sha256 content-hash integrity, no-third-party-CDN rules, resilience fallbacks; no media imported — DATA-ONLY posture respected) | [`architecture/MG-07-LOCALIZATION-MEDIA.md`](architecture/MG-07-LOCALIZATION-MEDIA.md), [`adr/0010-localization-media-architecture.md`](adr/0010-localization-media-architecture.md) |
| Test debt ledger (confirmed stale E2E expectations; TD-01/TD-02) | [`TEST-DEBT.md`](TEST-DEBT.md) |
| Session Core Contract Adoption (`S-04`) — promoted high-priority architecture debt (not started) | [`TASKS.md`](TASKS.md), [`architecture/ARCHITECTURE-STABILIZATION-PLAN.md`](architecture/ARCHITECTURE-STABILIZATION-PLAN.md) |
| Admin Light/Dark theme switch capability spec (DEFERRED) | [`architecture/ADMIN-THEME-SWITCH-01.md`](architecture/ADMIN-THEME-SWITCH-01.md) |
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
