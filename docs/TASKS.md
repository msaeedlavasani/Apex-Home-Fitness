# Executable Backlog

> **STATUS: CURRENT — THE ONLY CANONICAL EXECUTABLE BACKLOG**
>
> A task appears here only after explicit owner authorization. Product visions,
> roadmaps, audits, risk registers, open questions, and architecture plans are
> advisory or decision records; they cannot authorize execution.

## Lifecycle now

| Field | Value |
|---|---|
| Active task | `NONE` |
| Profile | `N/A` |
| Branch | `N/A` |
| State | `ADMIN-CONSOLE-01 CLOSED` |
| Production-bound | `YES` (completed) |
| Next authorized task | `NONE` |
| Pending owner review | Batch `admin-ds-01-04` EXECUTED LOCALLY on `batch/admin-ds-01-04` (4 member commits) — integration validation complete; consolidated push/PR/Main CI/Production lifecycle NOT started (awaiting owner) |

## Approved queue

### AUTONOMOUS-PROD-OPS-01 — CLOSED

- **Authorization:** explicit owner sequencing correction and execution
  authorization in the 2026-08-31 Apex Home Fit continuation task.
- **Depends on:** `ADMIN-AUTH-PROD-01` — CLOSED / Production PASS.
- **Profile / branch:** `RELEASE` / `feat/autonomous-prod-ops-01`, based on the
  current authoritative `origin/main` after a passing pre-task gate.
- **Primary acceptance:** one complete authorized Apex Home Fit Production
  release reaches `CLOSED` without the Owner manually running SSH, sudo,
  Docker, Compose, migration, provisioning, or deployment commands.
- **Bounded scope:** implement and validate a narrow allowlisted Production
  Deployment Capability/Gateway for the canonical Apex Home Fit host and
  deployment only. It validates approved source identity, consumes protected
  configuration internally without returning values, builds immutable images
  deterministically with pinned tooling, preserves the external database
  volume and ownership, captures rollback evidence before cutover, performs
  sanitized health/acceptance orchestration, and fails closed on unexpected
  host/source/image/compose/migration/environment state.
- **Security constraints:** do not expose secrets or `.env` values; do not make
  Production `.env` broadly readable; do not grant arbitrary root shell access;
  every privileged operation must be allowlisted, attributable, bounded, and
  return sanitized evidence only.
- **Explicit exclusions:** no Admin Console feature code; no public Phone + OTP
  behavior change; no unrelated application feature/schema change; no dynamic
  `npx`/npm migration resolution; no dual-compose cleanup unless this task's
  verified design and Governance update explicitly include it.
- **Acceptance:** gateway threat model and operational contract; focused
  fail-closed/security tests; governance checks; lint/typecheck/unit/build as
  affected; task-branch CI; PR/Main CI; constrained host installation;
  authorized no-op or release-candidate exercise proving exact-source build,
  rollback capture, DB invariants, automated health evidence, sanitized output,
  and zero manual Owner commands; durable report; integration and retirement.

### ADMIN-CONSOLE-01 — CLOSED

- **Authorization:** explicit owner task-delta in the 2026-08-31 Apex Home
  Fit continuation task promoting `ADMIN-CONSOLE-01` to the executable
  backlog and authorizing autonomous execution under repository Governance.
- **Depends on:** `ADMIN-AUTH-01` and `ADMIN-AUTH-PROD-01` — both CLOSED;
  current Production checkpoint PASS; `AUTONOMOUS-PROD-OPS-01` CLOSED with the
  Production Deployment Gateway operational.
- **Sequencing:** promoted to ACTIVE after the blocking ops task closed. Prior
  discovery/inventory (read-only Overview, Users, Workout Plans, Exercises,
  Operations, Admin Sessions) was verified against current `main` and reused;
  no stale feature code was retained.
- **Bounded scope:** replace the protected placeholder dashboard with a real,
  read-oriented Admin Console V1 covering Overview, Users, Workout Plans,
  Exercises, Operations, and Admin Sessions. Every surface uses only current
  Prisma schema, source-controlled exercise catalog, runtime policy, and
  services/routes that actually exist in the repository.
- **Security boundary:** preserve dedicated Admin Auth and require server-side
  authorization for every `/admin/*` console surface. Preserve public Phone +
  OTP behavior unchanged. Do not expose password hashes, session token hashes,
  secrets, OTP values, or other credential material.
- **Explicit exclusions:** no destructive actions, data mutation, public admin
  registration, general RBAC, impersonation/View-as-User, schema/migration,
  provider, or public-auth behavior change.
- **Data classification:** read-only application queries; `DB_CHANGED = NO`.
- **Production classification:** independently deployable browser-facing
  feature. Production delivery uses the canonical Production Deployment
  Gateway established by `AUTONOMOUS-PROD-OPS-01` — that path must not be
  bypassed or weakened.
- **Acceptance:** focused Admin Console data/UI/security tests; existing Admin
  Auth and public OTP regression tests; governance checks; lint; typecheck;
  unit suite; Production build; targeted browser coverage; task-branch CI; PR
  integration CI; exact-source Production release (via gateway) with rollback
  and fresh-browser acceptance; Main CI; remote-main verification; branch
  retirement; durable Report Watchdog handoff on every termination path.

### AUTH-PERF-01 — CLOSED / NO REPRODUCIBLE DEFECT

- **Authorization:** preserved from the verified AUTH-FIX-01 handoff.
- **Scope:** evidence-backed investigation of reported performance, persistence,
  and EN/FA parity degradation; no root cause was assumed.
- **Outcome:** focused auth/session, persistence, analytics, profile, and EN/FA
  parity tests passed; no reproducible application defect was found and no
  application source change was required.
- **Evidence:** durable AgentReport
  `AHF-FB-20260831-NEXT-AUTHORIZED-WORK.md` under the configured AgentReports
  directory.
- **Launch readiness:** [`OTP_LAUNCH_READINESS.md`](OTP_LAUNCH_READINESS.md)
  remains the canonical readiness contract for the related auth surface.
- **Browser limitation:** local Playwright could not start its configured dev
  server on port 3000; this is test-environment evidence, not a Production or
  application failure. No Production browser claim is made.
- **Production:** no deployment or Production mutation was authorized or
  performed by this investigation.

### ADMIN-AUTH-01 — CLOSED / CODE_NO_DEPLOY

- **Authorization:** owner decision in this task; architecture recorded in ADR-0004.
- **Scope:** dedicated `/admin/login` Email + Password authentication, manual provisioning, one `ADMIN` role, server-side protected admin surface, secure password/session boundary.
- **Outcome:** V1 implemented and integrated; public OTP behavior remained isolated; no Production deployment was authorized or performed.
- **Explicit exclusions:** no public admin registration, no general RBAC, no Passkey/WebAuthn V1. Passkey/WebAuthn remains persisted as `ADMIN-AUTH-PASSKEY-01`.
- **Acceptance:** focused auth/security tests, typecheck, lint, build, PR CI, Main CI, main integration, and branch retirement all passed.
- **Evidence:** durable report `AHF-FB-20260831-ADMIN-AUTH-01.md` under the configured AgentReports directory; PR #10; integrated main commit `9339317`.
- **Canonical contract:** [`ADMIN_AUTH.md`](ADMIN_AUTH.md).

## Registered decisions — not executable

These are deliberately **not backlog tasks**. Their canonical decision owners
preserve them until the owner separately authorizes bounded execution:

| Decision/direction | Status | Canonical owner |
|---|---|---|
| Dedicated administrator authentication independent of the public OTP journey | ACCEPTED AND PROMOTED TO `ADMIN-AUTH-01`; Email + Password V1, manual provisioning, one `ADMIN` role, no Passkey in V1 | [`ADMIN_AUTH.md`](ADMIN_AUTH.md), [`adr/0004-dedicated-admin-authentication.md`](adr/0004-dedicated-admin-authentication.md) |
| Admin impersonation / View-as-User | DEFERRED / NOT AUTHORIZED; mandatory future requirements (actor/target identity, durable audit trail, start/end timestamps, persistent banner, safe exit, session isolation, no credential use, restricted sensitive operations, server-side enforcement, security review gate) persisted in the dedicated capability spec | [`ADMIN_IMPERSONATION_01.md`](ADMIN_IMPERSONATION_01.md), [`ADMIN_AUTH.md`](ADMIN_AUTH.md) |
| Batch Delivery V1 operating model (one active session, serial isolated tasks, one consolidated integration/CI/release lifecycle) | ACCEPTED / ADOPTED 2026-09-01 (`GOVERNANCE-HARDENING-PROMOTION-01`) — model in force; each batch still requires separate execution authorization; runtime constraint basis in the orchestration investigation record | [`BATCH_DELIVERY_V1.md`](BATCH_DELIVERY_V1.md), [`orchestration/FREEBUFF-ORCHESTRATION-INVESTIGATION-01.md`](orchestration/FREEBUFF-ORCHESTRATION-INVESTIGATION-01.md) |
| Admin Console design-system alignment (first batch `ADMIN-DS-01…04`; `ADMIN-DS-05` REQUIRED remediation sequenced after foundational work; `ADMIN-DS-06` KIT-FIRST doc reconciliation; `MOBILE-READINESS-01` audit proposal) | PROPOSED / NOT AUTHORIZED — audit complete, remediation not implemented; UI Conformance Gate + report delivery contract IN FORCE from 2026-09-01 (hardening CLOSED), so batch members can proceed once batch-start is authorized | [`architecture/ADMIN-DESIGN-SYSTEM-AUDIT-01.md`](architecture/ADMIN-DESIGN-SYSTEM-AUDIT-01.md), [`architecture/MOBILE-READINESS-01.md`](architecture/MOBILE-READINESS-01.md) |
| Owner-free Production deployment operations | ACCEPTED AND PROMOTED TO ACTIVE `AUTONOMOUS-PROD-OPS-01`; must use a constrained deployment gateway/capability that consumes protected configuration internally without exposing secrets or arbitrary root shell access | [`RELEASING.md`](RELEASING.md) |
| Iran/international-connectivity resilience and external/Supabase dependency evaluation | ACCEPTED EVALUATION NEED / DEFERRED; no provider migration selected | [`architecture/ARCHITECTURE-PRINCIPLES.md`](architecture/ARCHITECTURE-PRINCIPLES.md) |
| Iranian competitor research gap | KNOWN ADVISORY GAP / RESEARCH NOT PERFORMED | [`TRANSFORMATION_ROADMAP.md`](TRANSFORMATION_ROADMAP.md) |
| Workout Experience V2 | PRODUCT VISION / NOT AUTHORIZED | [`product/WORKOUT-EXPERIENCE-V2.md`](product/WORKOUT-EXPERIENCE-V2.md) |
| Transformation roadmap capabilities | PROPOSED / NOT AUTHORIZED | [`TRANSFORMATION_ROADMAP.md`](TRANSFORMATION_ROADMAP.md) |
| S02-E and S-04..S-06 | PLANNED OR DEFERRED / OWNER CHECKPOINT REQUIRED | [`architecture/ARCHITECTURE-STABILIZATION-PLAN.md`](architecture/ARCHITECTURE-STABILIZATION-PLAN.md) |

## Approved queue — hardening (closed in this promotion)

### GOVERNANCE-UI-GATE-01 — CLOSED / CODE_NO_DEPLOY

- **Authorization:** Owner DELIVERING delta `GOVERNANCE-HARDENING-PROMOTION-01`
  (2026-09-01) explicitly authorizing the UI Conformance Gate promotion.
- **Bounded scope:** project-wide UI Conformance Gate — every task with
  `UI_CHANGED=YES` must discover the existing Apex Design System, reuse
  providers/tokens/typography/primitives/shared components where applicable
  (KIT-FIRST), preserve theme/dark-mode and localization/RTL architecture,
  follow responsive/a11y conventions, justify new visual primitives, and
  declare `REUSE | EXTEND | AUTHORIZED_PARALLEL` with evidence; parallel
  visual systems fail closed; functional correctness alone is not sufficient
  UI acceptance.
- **Outcome:** contract adopted [`governance/UI-CONFORMANCE-GATE.md`](governance/UI-CONFORMANCE-GATE.md);
  machine-enforced via new report fields (`UI_CHANGED`, `UI_CONFORMANCE`,
  `UI_CONFORMANCE_DECISION`, `UI_CONFORMANCE_EVIDENCE`) in
  `governance-runtime.mjs report`, new `governance-runtime.mjs ui` static
  scan (MUI allowlist + UI-kit allowlist, fail-closed), `governance:check`
  wiring (`docs` + `ui`), and 20-pass runtime test suite. Review-enforced
  parts documented (reuse quality, dark-mode/RTL/a11y preservation,
  justification quality).
- **Production impact:** none — tooling/docs only; `DB_CHANGED = NO`;
  `PRODUCTION_BOUND = NO`. No Admin UI remediation was implemented.
- **Evidence:** commit `GOVERNANCE-HARDENING-PROMOTION-01` (SHA in the
  durability report), the ATTACHED Owner report
  `AHF-FB-20260901-GOVERNANCE-HARDENING-PROMOTION-01.md`.

### GOVERNANCE-REPORT-DELIVERY-01 — CLOSED / CODE_NO_DEPLOY

- **Authorization:** same Owner delta as above.
- **Bounded scope:** report delivery contract — distinguish
  `REPORT_PERSISTED` / `REPORT_VALIDATED` / `REPORT_DELIVERED` / `REPORT_PATH`
  / `OWNER_REPORT_PATH`; every final/Analysis-Gate Owner report must be
  exported to the established Owner report destination
  `/Users/msl/Documents/ApexHFAgentReports/` (change-protected; repo-local
  `reports/` is temporary/runtime-only and must never enter Git);
  `REPORT_DELIVERED=YES` requires successful Owner-path export; both paths
  recorded where applicable; drift root cause documented.
- **Outcome:** contract adopted [`governance/REPORT-DELIVERY-CONTRACT.md`](governance/REPORT-DELIVERY-CONTRACT.md);
  machine-enforced (path-existence rules, delivered⇒owner-exported rule,
  persisted⇒path rules) in `governance-runtime.mjs report` + tests;
  `AI_CHANGE_TEMPLATE.md` and `GOVERNANCE_RUNTIME.md` extended.
- **Production impact:** none — tooling/docs only; `DB_CHANGED = NO`.
- **Evidence:** same promotion report as above.

## Recently closed

| Task/checkpoint | Outcome | Evidence owner |
|---|---|---|
| `ADMIN-CONSOLE-01` | CLOSED; read-oriented Admin Console V1 (Overview, Users, Workout Plans, Exercises, Operations, Admin/Sessions) delivered via the Production Deployment Gateway; exact-main release `2d131fc`; real-browser acceptance 14/14; unauthenticated boundary verified on Production; public OTP unchanged; `DB_CHANGED = NO`; Main CI PASS on `2d131fc` (run `33419999889`) and spec follow-up `e29d311` (run `33425058638`); branch retired | [`PRODUCTION_CHECKPOINTS.md`](PRODUCTION_CHECKPOINTS.md), [`ADMIN_AUTH.md`](ADMIN_AUTH.md), durable AgentReport `AHF-FB-20260831-ADMIN-CONSOLE-01.md`, PR #13, PR #14 |
| `AUTONOMOUS-PROD-OPS-01` | CLOSED; constrained Production deployment gateway proven end-to-end with zero manual Owner commands; pre- and post-hardening exact-main releases PASS; rollback verified; legacy `apexadmin` NOPASSWD sudo and Docker-group membership revoked after proof; branch retired; Main CI PASS on merge `fde82c1` (run `33411342851`) and docs `f2387cc` (run `33413935668`) | [`PRODUCTION_DEPLOYMENT_GATEWAY.md`](PRODUCTION_DEPLOYMENT_GATEWAY.md), [`PRODUCTION_CHECKPOINTS.md`](PRODUCTION_CHECKPOINTS.md), durable AgentReport `AHF-FB-20260831-AUTONOMOUS-PROD-OPS-01.md`, PR #12 |
| `DOCUMENTATION-CONSOLIDATION-01` | CLOSED; canonical ownership, decision persistence, link routing, and docs-only lifecycle consolidated | Git history through `c80a1bb` and durable task report |
| `GOVERNANCE-RUNTIME-01` | CLOSED; repository governance runtime enforced | [`GOVERNANCE_RUNTIME.md`](GOVERNANCE_RUNTIME.md) and Git history through `7edfb89` |
| `AUTH-PERF-01` | CLOSED; no reproducible defect in focused auth/performance/persistence/EN-FA investigation; no source fix required | durable handoff report; no Production mutation |
| `ADMIN-AUTH-PROD-01` | CLOSED; Admin Auth V1 Production PASS (deterministic migration via pinned Prisma 6.19.3; same-origin/provisioning fixes via PR #11; real-browser acceptance 22/22) | [`PRODUCTION_CHECKPOINTS.md`](PRODUCTION_CHECKPOINTS.md), durable AgentReport `AHF-FB-20260831-ADMIN-AUTH-PROD-01.md`, PR #11, Main CI run `33401625615` |
| `ADMIN-AUTH-01` | CLOSED; dedicated Email + Password administrator authentication V1 integrated with no Production deployment | [`ADMIN_AUTH.md`](ADMIN_AUTH.md), durable AgentReport, PR #10, Main CI run `33392689051` |
| `AUTH-FIX-01` | CLOSED; Production PASS | [`PRODUCTION_CHECKPOINTS.md`](PRODUCTION_CHECKPOINTS.md) |
| S03 Session Core | CLOSED; architecture/runtime refactor complete | [`architecture/S03-SESSION-CORE-CLOSURE.md`](architecture/S03-SESSION-CORE-CLOSURE.md) |
| S02 Production recovery | PASS | [`PRODUCTION_CHECKPOINTS.md`](PRODUCTION_CHECKPOINTS.md) |

Older batch history is preserved in Git and the explicitly archived
[`EXECUTION_ROADMAP.md`](EXECUTION_ROADMAP.md). It is not duplicated here.

## PROPOSED — not authorized (pending owner review)

> Items here are **proposals only**. They are NOT executable backlog entries.
> Nothing in this section authorizes work. Promotion to the approved queue
> happens only through the Promotion rule below after explicit owner
> authorization.

| Proposal | Status | Details |
|---|---|---|
| `ADMIN-DS-01` — Admin foundation: dark mode, self-hosted fonts, metadata/favicon on the admin root layout | EXECUTED on batch branch (commit `1442574`); CLOSED pending consolidated lifecycle | `EXECUTION_CLASS=ISOLATED`; `UI_CONFORMANCE=PASS` (REUSE); validation: typecheck/lint/build PASS |
| `ADMIN-DS-02` — Admin shared primitives (PageSection/Stat/Table/EmptyState/Badge) in `src/components/admin`; behavior-neutral refactor of the six console pages | EXECUTED on batch branch (commit `c87d0a8`); CLOSED pending consolidated lifecycle | `EXECUTION_CLASS=PARALLEL_SAFE`; `UI_CONFORMANCE=PASS` (EXTEND); validation: typecheck/lint/unit (7 tests) PASS |
| `ADMIN-DS-03` — Platform-kit adoption for admin controls (login form, nav, logout) | EXECUTED on batch branch (commit `bf116eb`); CLOSED pending consolidated lifecycle | `EXECUTION_CLASS=PARALLEL_SAFE`; `UI_CONFORMANCE=PASS` (REUSE); validation: typecheck/lint/design-audit PASS |
| `ADMIN-DS-04` — Admin state boundaries + accessibility pass (`loading`/`error`/`not-found` boundaries, table captions/scope, focus rings, a11y spec coverage) | EXECUTED on batch branch (commit `61e62ef`); CLOSED pending consolidated lifecycle | `EXECUTION_CLASS=PARALLEL_SAFE`; `UI_CONFORMANCE=PASS` (REUSE + bounded EXTEND); validation: typecheck/lint/design-audit/unit PASS |
| `ADMIN-DS-05` — Admin Persian/RTL + i18n parity | REQUIRED REMEDIATION / NOT AUTHORIZED (owner decision 2026-09-01; NOT deferred; sequenced AFTER the foundational batch) | `EXECUTION_CLASS=SEQUENTIAL`; `DEPENDENCIES`: ADMIN-DS-01 (shares admin root layout/provider wiring), then ADMIN-DS-02/03 (primitives + kit adoption it should consume); own worktree/branch; admin-only; fa parity tests (next-intl messages, dir handling, RTL alignment); candidate member of the post-batch-1 batch with ADMIN-DS-06 |
| `ADMIN-DS-06` — KIT-FIRST decision record + `DESIGN_SYSTEM.md` MUI drift reconciliation | PROPOSED / NOT AUTHORIZED | `DOCS_ONLY` candidate; records KIT-FIRST as the current Admin UI rule (reuse platform kit first; MUI only on a concrete documented unmet requirement); `DESIGN_SYSTEM.md` §3.0 already amended locally and uncommitted; candidate member of the post-batch-1 batch with ADMIN-DS-05 |
| `MOBILE-READINESS-01` — mobile-lock-in / web-coupling architecture audit | PROPOSED / NOT AUTHORIZED | `AUDIT`/architecture task; does NOT build iOS/Android; inspects current architecture for future mobile blockers across 12 dimensions (business logic↔UI coupling, API/data-contract portability, auth/session assumptions, browser-only storage, workout-session portability, media/video, navigation, offline/resume, notifications/background, localization/RTL, tokens vs platform UI, HealthKit/Health Connect boundaries); outputs: client-agnostic-now list, stays-web-specific list, development guardrails, mobile-implementation triggers, later tech-selection spike (RN/Expo vs alternatives — no stack selected now). Spec: [`architecture/MOBILE-READINESS-01.md`](architecture/MOBILE-READINESS-01.md) |

| First Batch Delivery V1 batch (ADMIN-DS-01…04) | EXECUTED — integration order `ADMIN-DS-02 → 01 → 03 → 04` on `batch/admin-ds-01-04` (commits `c87d0a8`, `1442574`, `bf116eb`, `61e62ef`); batch integration validation PASS; consolidated push/PR/Main CI/Production release NOT started (awaiting owner). Post-batch sequencing: `MOBILE-READINESS-01` audit → batch 2 (`ADMIN-DS-05` + `ADMIN-DS-06`). Full member matrix in [`architecture/ADMIN-DESIGN-SYSTEM-AUDIT-01.md`](architecture/ADMIN-DESIGN-SYSTEM-AUDIT-01.md) §8 |

These proposals do not alter, delete, or supersede any existing approved,
closed, or registered item above. Existing deferred items (e.g.
`ADMIN-AUTH-PASSKEY-01`, `ADMIN-IMPERSONATION-01`, S02-E/S04..S06, Workout
V2) keep their status. `ADMIN-DS-05` is **REQUIRED remediation** (owner
decision 2026-09-01) sequenced after the foundational batch — not deferred.
`BATCH-DELIVERY-AND-ADMIN-AUDIT-01` remains in the ANALYSIS GATE until the
Owner reviews the interim report.

## Promotion rule

To promote an advisory/deferred item into executable work, update this file
*before implementation* with: task ID, explicit authorization source, bounded
scope, dependencies, task profile, branch, Production classification, and
acceptance. Decision Persistence in
[`governance/DOCUMENTATION-GOVERNANCE.md`](governance/DOCUMENTATION-GOVERNANCE.md)
applies before workflow continuation.
