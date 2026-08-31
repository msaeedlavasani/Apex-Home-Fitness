# Executable Backlog

> **STATUS: CURRENT — THE ONLY CANONICAL EXECUTABLE BACKLOG**
>
> A task appears here only after explicit owner authorization. Product visions,
> roadmaps, audits, risk registers, open questions, and architecture plans are
> advisory or decision records; they cannot authorize execution.

## Lifecycle now

| Field | Value |
|---|---|
| Active task | `ADMIN-CONSOLE-01` |
| Profile | `CODE_NO_DEPLOY` → Production-deliverable via the gateway |
| Branch | `feat/admin-console-01` |
| State | `ACTIVE` |
| Production-bound | `YES` |
| Next authorized task | `NONE` |

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

### ADMIN-CONSOLE-01 — ACTIVE

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
| Admin impersonation / View-as-User | DEFERRED / NOT AUTHORIZED; any future implementation requires an audit log, persistent and unambiguous viewing-as banner, constrained permissions, and an immediate exit guard | [`ADMIN_AUTH.md`](ADMIN_AUTH.md) |
| Owner-free Production deployment operations | ACCEPTED AND PROMOTED TO ACTIVE `AUTONOMOUS-PROD-OPS-01`; must use a constrained deployment gateway/capability that consumes protected configuration internally without exposing secrets or arbitrary root shell access | [`RELEASING.md`](RELEASING.md) |
| Iran/international-connectivity resilience and external/Supabase dependency evaluation | ACCEPTED EVALUATION NEED / DEFERRED; no provider migration selected | [`architecture/ARCHITECTURE-PRINCIPLES.md`](architecture/ARCHITECTURE-PRINCIPLES.md) |
| Iranian competitor research gap | KNOWN ADVISORY GAP / RESEARCH NOT PERFORMED | [`TRANSFORMATION_ROADMAP.md`](TRANSFORMATION_ROADMAP.md) |
| Workout Experience V2 | PRODUCT VISION / NOT AUTHORIZED | [`product/WORKOUT-EXPERIENCE-V2.md`](product/WORKOUT-EXPERIENCE-V2.md) |
| Transformation roadmap capabilities | PROPOSED / NOT AUTHORIZED | [`TRANSFORMATION_ROADMAP.md`](TRANSFORMATION_ROADMAP.md) |
| S02-E and S-04..S-06 | PLANNED OR DEFERRED / OWNER CHECKPOINT REQUIRED | [`architecture/ARCHITECTURE-STABILIZATION-PLAN.md`](architecture/ARCHITECTURE-STABILIZATION-PLAN.md) |

## Recently closed

| Task/checkpoint | Outcome | Evidence owner |
|---|---|---|
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

## Promotion rule

To promote an advisory/deferred item into executable work, update this file
*before implementation* with: task ID, explicit authorization source, bounded
scope, dependencies, task profile, branch, Production classification, and
acceptance. Decision Persistence in
[`governance/DOCUMENTATION-GOVERNANCE.md`](governance/DOCUMENTATION-GOVERNANCE.md)
applies before workflow continuation.
