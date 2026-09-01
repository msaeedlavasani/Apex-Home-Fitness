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
| State | `ADMIN-DS-BATCH-2 CLOSED` (2026-09-01; Production PASS via gateway release `c6a4e59`) |
| Production-bound | `YES` (completed) |
| Next authorized task | `NONE` (S-04 DELIVERED/CLOSED 2026-09-01; next candidates: ADMIN-THEME-SWITCH-01 batch or new owner-assigned work) |
| Pending owner review | Next-batch authorization; ADMIN-THEME-SWITCH-01 stays deferred; ADMIN-IMPERSONATION-01 deferred/not authorized; MOBILE-READINESS guardrails + typography contract RATIFIED (ADR-0005 / DESIGN_SYSTEM.md §4.1) |

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
| Admin Console design-system alignment (Batch 1 `ADMIN-DS-01…04` DELIVERED/CLOSED; Batch 2 `ADMIN-DS-05` + `ADMIN-DS-06` DELIVERED/CLOSED 2026-09-01 via PR #16 + gateway release `c6a4e59`; `ADMIN-THEME-SWITCH-01` deferred debt; `MOBILE-READINESS-01` audit EXECUTED + guardrails RATIFIED; `S-04` Session Core Contract Adoption DELIVERED/CLOSED 2026-09-01 via PR #17 + gateway release `8e06d70`) | **PROPOSED phase COMPLETE for Admin DS** — UI Conformance Gate + report delivery contract IN FORCE; Batch 1 DELIVERED/CLOSED via PR #15 + `4de75ae`; Batch 2 DELIVERED/CLOSED via PR #16 + `c6a4e59`; typography contract RATIFIED (DESIGN_SYSTEM.md §4.1); `MOBILE-READINESS-01` guardrails RATIFIED (ADR-0005); `S-04` DELIVERED/CLOSED via PR #17 + `8e06d70` (UI_CHANGED=NO, DB_CHANGED=NO); `ADMIN-THEME-SWITCH-01` stays DEFERRED; `ADMIN-IMPERSONATION-01` DEFERRED/NOT AUTHORIZED | [`architecture/ADMIN-DESIGN-SYSTEM-AUDIT-01.md`](architecture/ADMIN-DESIGN-SYSTEM-AUDIT-01.md), [`architecture/MOBILE-READINESS-01.md`](architecture/MOBILE-READINESS-01.md), [`architecture/MOBILE-READINESS-01-REPORT.md`](architecture/MOBILE-READINESS-01-REPORT.md), [`adr/0005-mobile-readiness-guardrails.md`](adr/0005-mobile-readiness-guardrails.md) |
| Owner-free Production deployment operations | ACCEPTED AND PROMOTED TO ACTIVE `AUTONOMOUS-PROD-OPS-01`; must use a constrained deployment gateway/capability that consumes protected configuration internally without exposing secrets or arbitrary root shell access | [`RELEASING.md`](RELEASING.md) |
| Iran/international-connectivity resilience and external/Supabase dependency evaluation | ACCEPTED EVALUATION NEED / DEFERRED; no provider migration selected | [`architecture/ARCHITECTURE-PRINCIPLES.md`](architecture/ARCHITECTURE-PRINCIPLES.md) |
| Iranian competitor research gap | KNOWN ADVISORY GAP / RESEARCH NOT PERFORMED | [`TRANSFORMATION_ROADMAP.md`](TRANSFORMATION_ROADMAP.md) |
| Workout Experience V2 | PRODUCT VISION / NOT AUTHORIZED | [`product/WORKOUT-EXPERIENCE-V2.md`](product/WORKOUT-EXPERIENCE-V2.md) |
| Transformation roadmap capabilities | PROPOSED / NOT AUTHORIZED | [`TRANSFORMATION_ROADMAP.md`](TRANSFORMATION_ROADMAP.md) |
| Mobile-readiness architecture guardrails (6 rules: UI-framework-free domain logic, portable persistence contracts, mobile-posture declaration, S03 session-core boundary, platform-neutral health contract, no-stack-without-spike) | **RATIFIED / BINDING 2026-09-01** — owner ratification via POST-MOBILE-READINESS-RATIONALIZATION-01; recorded as `ADR-0005`; mobile implementation triggers, HealthKit/Health Connect scope, and the technology-selection spike DEFERRED until documented triggers; NO mobile stack selected | [`adr/0005-mobile-readiness-guardrails.md`](adr/0005-mobile-readiness-guardrails.md), [`architecture/ARCHITECTURE-PRINCIPLES.md`](architecture/ARCHITECTURE-PRINCIPLES.md) §13 |
| Shared typography contract (fa → Vazirmatn from the official project, en → Inter; both self-hosted; shared across consumer app and Admin — NO separate Admin font stack; locale determines the primary font; system sans-serif fallbacks preserved) | **RATIFIED / BINDING 2026-09-01** — Owner decision in ADMIN DESIGN SYSTEM BATCH 2; implemented by `ADMIN-DS-05`; recorded in [`DESIGN_SYSTEM.md`](DESIGN_SYSTEM.md) §4.1 (contract) + §4.2 (Admin i18n/RTL architecture) | [`DESIGN_SYSTEM.md`](DESIGN_SYSTEM.md) §4.1–4.2 |
| Session Core Contract Adoption — `S-04` Stable Session State Contract | **DELIVERED/CLOSED 2026-09-01** via PR #17 + gateway release `8e06d70` (UI_CHANGED=NO, DB_CHANGED=NO); promoted 2026-09-01 as the high-priority mobile-readiness architecture debt; reconciles the MOBILE-READINESS-01 "session-core extraction" finding onto the S03/S04 lineage — S03 extraction stays closed (pure core exists, hook delegates); execution removed residual consumer coupling (`workoutPersistence.ts`/`samplePlan`/route/player → canonical contracts; new pure `plan.ts`; boundary consumer tests) | [`TASKS.md` `S-04` entry](#s-04--stable-session-state-contract-session-core-contract-adoption--delivered-closed), [`architecture/ARCHITECTURE-STABILIZATION-PLAN.md`](architecture/ARCHITECTURE-STABILIZATION-PLAN.md) |
| S02-E and S-05..S-06 | PLANNED OR DEFERRED / OWNER CHECKPOINT REQUIRED | [`architecture/ARCHITECTURE-STABILIZATION-PLAN.md`](architecture/ARCHITECTURE-STABILIZATION-PLAN.md) |

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

## Approved queue — promoted 2026-09-01 (not started)

### S-04 — Stable Session State Contract (Session Core Contract Adoption) — DELIVERED / CLOSED 2026-09-01

- **Authorization:** owner direction in `POST-MOBILE-READINESS-RATIONALIZATION-01`
  (2026-09-01): promote the identified Session Core Extraction requirement into
  the canonical executable backlog as the high-priority mobile-readiness
  architecture debt, preserving/reconciling the S03/S04 lineage; recorded in
  ADR-0005. **This entry authorizes the backlog record only — implementation
  requires the ordinary batch-start authorization and is explicitly NOT
  performed by the promoting task.**
- **Reconciliation of the "session-core extraction" finding:** on-disk
  verification shows S03 extraction is CLOSED — `src/lib/workout/sessionCore.ts`
  exists and `src/components/workout/useWorkoutEngine.ts` delegates to it
  (`createSessionCore`, `core.transition(command, now)`, `core.derive(state)`).
  The residual high-priority debt is the S-04 contract-adoption edge:
  `src/lib/offline/workoutPersistence.ts` imports `WorkoutEngineState` /
  `WorkoutExercise` / `WorkoutEngineHydrateInput` from the hook component
  (`src/components/workout/useWorkoutEngine`), and `sessionContracts.ts`
  carries a stale "do not import until the extraction wiring exists" note.
  No duplicate task is created.
- **DEPENDENCIES:** S-03 (CLOSED — pure core + React adapter);
  MOBILE-READINESS-01 guardrails (RATIFIED). No dependency on Admin work.
- **EXECUTION_CLASS:** SEQUENTIAL (public-app engine domain; behavior-
  preserving refactor with its own parity gate).
- **ISOLATION_REQUIREMENT:** own branch; one reviewable change (contract
  module + consumer migration).
- **Bounded scope:** formalize the stable Session State read-model/event
  surface (proposed `src/lib/workout/sessionState.ts`); migrate WorkoutPlayer
  and persistence import points to the canonical contract; consumer contract
  tests; no new engine semantics, no V2 features.
- **VALIDATION_REQUIREMENT:** parity baseline preserved (S03A golden traces
  GT-01..GT-12, `tests/session-golden-trace.test.tsx`), pure-core unit tests,
  existing workout/persistence/timer suites, typecheck, lint, production
  build; consumer contract tests (player integration + persistence
  compatibility); targeted E2E per `docs/CI.md`; governance checks.
- **PRODUCTION_IMPACT:** public-app workout engine refactor — behavior
  preserved, `UI_CHANGED = NO` (no visual change), `DB_CHANGED = NO`
  (IndexedDB snapshot shapes unchanged until S-05); rollback = plain git
  revert; Production delivery via the canonical gateway when authorized.
- **RISK:** LOW-MEDIUM (behavior-preserving, parity-gated).
- **Acceptance (exit criteria):** player/persistence consume only the stable
  contract; no consumer imports hook internals; full suite green; mobile-
  readiness posture recorded as CLIENT-AGNOSTIC.
- **EXECUTION (2026-09-01, DELIVERED/CLOSED):** implemented as its own
  lifecycle via PR #17 → merged `8e06d70bc75f9b02e585c091c96272e043149246` →
  gateway release `apex-home-fit:release-8e06d70bc75f` (health PASS,
  `db_changed=false`, secret boundary PROTECTED, rollback
  `compose.yml.rollback-s04-session-core-contract`). New pure
  `src/lib/workout/plan.ts` (`clampSets` — contracts module stays types-only by
  test contract); `sessionContracts.ts` canonical boundary docstring; the hook
  re-exports canonical types (no local duplicates); consumers migrated:
  `workoutPersistence`, `samplePlan`, workout route, `WorkoutPlayer` adapter;
  `tests/session-contract-consumers.test.ts` enforces the boundary. Branch
  CI PASS (build + e2e, run `33486695026`); Main CI PASS (merge run
  `33487427362`); local validation typecheck PASS, eslint 0 errors, unit
  524/524 (golden traces GT-01..GT-12 parity preserved), production build
  PASS, real-browser workout-route E2E 5/5 (incl. live player session);
  Production real-browser acceptance 8/8 (public regression, workout route
  auth boundary + locale preservation, zero fatal console errors). Pre-existing
  `rtl-layout.spec.ts` drift (2 specs — public nav-order + quiz radiogroup
  scope) reproduced identically on clean main; not part of CI's e2e gate;
  flagged for separate spec-reconciliation, not addressed by S-04
  (UI_CHANGED=NO).

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
| `S-04` Session Core Contract Adoption | CLOSED; stable session-state contract adopted as the canonical consumer boundary; PR #17 → merged `8e06d70`; gateway release `release-8e06d70bc75f`; branch retired; Main CI PASS on `8e06d70` (run `33487427362`) | [`PRODUCTION_CHECKPOINTS.md`](PRODUCTION_CHECKPOINTS.md), durable AgentReport `AHF-FB-20260901-S04-SESSION-CORE-CONTRACT.md` |
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
| `ADMIN-DS-01` — Admin foundation: dark mode, self-hosted fonts, metadata/favicon on the admin root layout | EXECUTED (commit `1442574`) and DELIVERED via Batch 1 PR #15 / merged `4de75ae`; **CLOSED** 2026-09-01 | `EXECUTION_CLASS=ISOLATED`; `UI_CONFORMANCE=PASS` (REUSE); validation: typecheck/lint/build PASS; Production: admin login renders with title metadata, theme script, no favicon 404 |
| `ADMIN-DS-02` — Admin shared primitives (PageSection/Stat/Table/EmptyState/Badge) in `src/components/admin`; behavior-neutral refactor of the six console pages | EXECUTED (commit `c87d0a8`) and DELIVERED via Batch 1 PR #15 / merged `4de75ae`; **CLOSED** 2026-09-01 | `EXECUTION_CLASS=PARALLEL_SAFE`; `UI_CONFORMANCE=PASS` (EXTEND); validation: typecheck/lint/unit (7 tests) PASS; Production: all six surfaces redirect unauthenticated visitors, no credential material rendered |
| `ADMIN-DS-03` — Platform-kit adoption for admin controls (login form, nav, logout) | EXECUTED (commit `bf116eb`) and DELIVERED via Batch 1 PR #15 / merged `4de75ae`; **CLOSED** 2026-09-01 | `EXECUTION_CLASS=PARALLEL_SAFE`; `UI_CONFORMANCE=PASS` (REUSE); validation: typecheck/lint/design-audit PASS; Production signed-in acceptance PENDING (operator-held credential see Batch 1 note) |
| `ADMIN-DS-04` — Admin state boundaries + accessibility pass (`loading`/`error`/`not-found` boundaries, table captions/scope, focus rings, a11y spec coverage) | EXECUTED (commit `61e62ef`) and DELIVERED via Batch 1 PR #15 / merged `4de75ae`; **CLOSED** 2026-09-01 | `EXECUTION_CLASS=PARALLEL_SAFE`; `UI_CONFORMANCE=PASS` (REUSE + bounded EXTEND); validation: typecheck/lint/design-audit/unit PASS; Production: labelled nav + accessible table structure verified live |
| `ADMIN-DS-05` — Admin Persian/RTL + i18n parity | **DELIVERED / CLOSED (2026-09-01)** via Batch 2 PR #16 / merged `c6a4e59`; commit `fd8650f`; Production gateway release `batch2-admin-ds-05-06` | `EXECUTION_CLASS=SEQUENTIAL`; `UI_CONFORMANCE=PASS` (REUSE + bounded EXTEND); shared next-intl catalogs (`admin.*` namespace), `admin-locale` cookie persistence, `html lang/dir`, localized pages/nav/login/boundaries, fa-IR dates, logical utilities; validation: typecheck/lint/unit 519/519/build PASS; local real-browser 6/6 PASS (admin-console + admin-i18n: switching, RTL, typography, persistence); Production 4/4 PASS; signed-in Production recheck PENDING (credential, standing batch-1 item) |
| `ADMIN-DS-06` — KIT-FIRST decision record + `DESIGN_SYSTEM.md` reconciliation | **DELIVERED / CLOSED (2026-09-01)** via Batch 2 PR #16 / merged `c6a4e59`; commit `b92e3a8` | `DOCS_ONLY`; recorded the ratified shared typography contract (`DESIGN_SYSTEM.md` §4.1 — fa → Vazirmatn, en → Inter, self-hosted, shared consumer+Admin, no separate Admin stack) + Admin i18n/RTL architecture (§4.2); KIT-FIRST formalized; INDEX route + TASKS registered-decision row added |
| `ADMIN-THEME-SWITCH-01` — Admin Light/Dark theme switch (currently Dark-only, no visible switch) | DEFERRED / NOT AUTHORIZED (observed 2026-09-01) | Future implementation MUST reuse the shared theme architecture (`ThemeProvider`/tokens), support persistent Light/Dark selection, preserve ADMIN-DS-01 dark-mode default, follow the UI Conformance Gate; spec: [`architecture/ADMIN-THEME-SWITCH-01.md`](architecture/ADMIN-THEME-SWITCH-01.md) |
| `MOBILE-READINESS-01` — mobile-lock-in / web-coupling architecture audit | **EXECUTED 2026-09-01** (docs-only; no app/DB change; no mobile build; no stack selection). Guardrails **RATIFIED / BINDING** via ADR-0005 (2026-09-01); decision items RESOLVED: triggers/health/spike DEFERRED until documented triggers; the high-severity finding was reconciled onto `S-04` (Session Core Contract Adoption) and PROMOTED to the approved queue | `AUDIT`/architecture task — complete. Report: [`architecture/MOBILE-READINESS-01-REPORT.md`](architecture/MOBILE-READINESS-01-REPORT.md); guardrails RATIFIED in [`architecture/ARCHITECTURE-PRINCIPLES.md`](architecture/ARCHITECTURE-PRINCIPLES.md) §13; decision record [`adr/0005-mobile-readiness-guardrails.md`](adr/0005-mobile-readiness-guardrails.md). Findings: 12 dimensions classified; high-priority debt = S-04 contract adoption (S03 extraction itself verified CLOSED — pure core exists; `workoutPersistence.ts` still imports hook internals); notifications/background = net-new capability gap; key-value + outbox + auth + health-contract items low-effort; owner decisions remaining: next-batch authorization only |

| First Batch Delivery V1 batch (ADMIN-DS-01…04) | **DELIVERED / CLOSED (2026-09-01)** — PR #15 merged `4de75ae`; Main CI PASS (run `33454929053`); Production gateway release `batch1-admin-ds-01-04` → image `apex-home-fit:release-4de75ae969c8` health PASS, `db_changed=false`, rollback captured; Production real-browser acceptance 4/4 PASS (boundaries, dark-mode wiring, metadata/favicon, public regression, console errors). Signed-in Production recheck PENDING — operator-held credential required (see report `AHF-FB-20260901-ADMIN-DS-BATCH-1`). Branch `batch/admin-ds-01-04` retired. Full member matrix in [`architecture/ADMIN-DESIGN-SYSTEM-AUDIT-01.md`](architecture/ADMIN-DESIGN-SYSTEM-AUDIT-01.md) §8 |
| Second Batch Delivery V1 batch (ADMIN-DS-05 + ADMIN-DS-06) | **DELIVERED / CLOSED (2026-09-01)** — PR #16 merged `c6a4e59`; branch CI PASS (run `33482319310`); Main CI PASS (run `33482982507`); Production gateway release `batch2-admin-ds-05-06` → image `apex-home-fit:release-c6a4e591c1e3` health PASS, `db_changed=false`, rollback captured; Production real-browser acceptance 4/4 PASS (public regression, protected-boundary redirects, admin login EN/fa switching + RTL + typography + persistence, zero console errors). Typography contract RATIFIED (DESIGN_SYSTEM.md §4.1). Signed-in Production recheck PENDING — operator-held credential (standing item). Branch `batch/admin-ds-05-06` retired. **Post-batch standing:** `S-04` (Session Core Contract Adoption) promoted but NOT started — recommended as its own lifecycle; `ADMIN-THEME-SWITCH-01` DEFERRED; `ADMIN-IMPERSONATION-01` DEFERRED/NOT AUTHORIZED |

These proposals do not alter, delete, or supersede any existing approved,
closed, or registered item above. Existing deferred items (e.g.
`ADMIN-AUTH-PASSKEY-01`, `ADMIN-IMPERSONATION-01`, `ADMIN-THEME-SWITCH-01`,
S02-E/S-05/S-06, Workout V2) keep their status. `ADMIN-DS-05` (REQUIRED
remediation) and `ADMIN-DS-06` were **DELIVERED / CLOSED** in Batch 2
(2026-09-01, PR #16). `S-04` is promoted in the approved queue above (NOT
started). Mobile-readiness guardrails are RATIFIED (ADR-0005); the shared
typography contract is RATIFIED (DESIGN_SYSTEM.md §4.1). Current state =
awaiting batch-start authorization for the next lifecycle (S-04 is the
standing high-priority candidate).

## Promotion rule

To promote an advisory/deferred item into executable work, update this file
*before implementation* with: task ID, explicit authorization source, bounded
scope, dependencies, task profile, branch, Production classification, and
acceptance. Decision Persistence in
[`governance/DOCUMENTATION-GOVERNANCE.md`](governance/DOCUMENTATION-GOVERNANCE.md)
applies before workflow continuation.
