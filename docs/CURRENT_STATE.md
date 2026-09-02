# Current State — Operational Manifest

Concise canonical snapshot of the repository and Production state. Read this
BEFORE starting any implementation. Rules: `docs/RELEASE_POLICY.md`; runbook:
`docs/FEATURE_TO_PRODUCTION.md`; branches: `docs/BRANCHING_POLICY.md`;
checkpoints: `docs/PRODUCTION_CHECKPOINTS.md`. No secrets are stored here.

```
CURRENT_VERIFIED_PRODUCTION_CHECKPOINT: STABILIZATION-S06-S05 (CLOSED; PRODUCTION_PASS)
CURRENT_PRODUCTION_SOURCE:             4ada1dae2c3ee11ac208f6908cb3fab438842eb1
CURRENT_PRODUCTION_IMAGE:              apex-home-fit:release-4ada1dae2c3e
CURRENT_PRODUCTION_BUILD_ID:           (gateway exact-SHA build; image sha256:00c48073…)
CURRENT_DB_TYPE:                       SQLite (Prisma)
CURRENT_DB_VOLUME:                     apexhomefit_prod_db:/data (owned 100:101)
CURRENT_DB_MIGRATION_COUNT:            13
CURRENT_MAINLINE_BASELINE_COMMIT:       4ada1dae2c3ee11ac208f6908cb3fab438842eb1 (PR #19 integration)
ACTIVE_TASK:                           NONE — MG-04 (Ingestion pipeline) DELIVERED/CLOSED; no task is currently active
ACTIVE_TASK_PROFILE:                   N/A (no active task)
AHF_EXECUTION_STATE:                   ACTIVE (Owner lifted the execution freeze on 2026-09-01; MG-04 is the fourth explicitly authorized backlog task and is CLOSED)
ACTIVE_BRANCH:                         N/A
PREVIOUS_COMPLETED_TASK:               MG-04 Ingestion architecture / governed pipeline (DELIVERED/CLOSED 2026-09-01 — P0; PR #28 merged 0ec424d, Main CI PASS on exact SHA; ADR-0009; data-only dry-run pipeline; no Production/DB write)
NEXT_AUTHORIZED_TASK:                  NONE — MG-05 and all subsequent backlog tasks NOT authorized; begin only on the next explicit Owner instruction
NEXT_EXPECTED_BRANCH:                 N/A
CURRENT_PHASE:                         CLOSED — MG-04 complete, Main CI PASS on exact SHA; backlog idle awaiting next explicit Owner instruction
LAST_UPDATED:                          2026-09-01 (MG-04 DELIVERED/CLOSED; no Production/DB/UI change; no deployment; MG-05+ not authorized)
```

## Reading this manifest (pre-task gate)

- `CURRENT_MAINLINE_BASELINE_COMMIT` is the **verified integration/source
  baseline** described by this manifest — a STABLE reference, never the SHA of
  the commit that contains this file.
- The Git remote is authoritative for the actual current HEAD. At every
  pre-task gate, resolve the actual state dynamically:

```
git fetch <authoritative-remote> main
ACTUAL_REMOTE_MAIN_HEAD=<resolved SHA>
```

Then compare `ACTUAL_REMOTE_MAIN_HEAD` with `CURRENT_MAINLINE_BASELINE_COMMIT`:

- `MATCH` — no commits since the baseline.
- `EXPECTED_DOCS_ONLY_ADVANCE` — main advanced only in `docs/**` since the
  baseline (governance/documentation commits).
- `EXPECTED_INTEGRATION_ADVANCE` — main advanced via a completed task
  integration that was verified and recorded.
- `UNEXPECTED_DRIFT` — anything else. **STOP** and inspect before any task.

## Known operational debt

- **`apexadmin` legacy privileges revoked (2026-08-31):** NOPASSWD:ALL
  (`/etc/sudoers.d/apexadmin`) and Docker-group membership were removed by the
  proof-gated hardening step after the pre-hardening release and rollback
  proof. A fresh SSH session confirmed direct `sudo`, `docker`, and `.env`
  reads all fail while `apex-deploy` still succeeds. `apexadmin` retains only
  its `apexdeploy` group membership (the gateway access group) plus standard
  `sudo`/`users` membership (no passwordless grant).

## Gateway (AUTONOMOUS-PROD-OPS-01) verified state — CLOSED

- Root-owned daemon `apex-deploy-gateway` active on host `sabtbrooker`; socket
  `/run/apex-deploy-gateway/gateway.sock` owned `root:apexdeploy` mode 0660;
  unprivileged client `/usr/local/bin/apex-deploy` uses only that Unix socket
  (no sudo/subprocess; `AF_UNIX` only).
- Post-hardening exact-main release through the unprivileged client:
  `release_id=prodops01-postharden`, `phase=post-hardening`,
  `source_sha=f2387cc3a5b8…` (authoritative GitHub `main` HEAD), image
  `apex-home-fit:release-f2387cc3a5b8` (ID `sha256:7227b1c5…`), DB-unchanged
  (`db_changed=false`), health `PASS`, secret boundary `PROTECTED`. Proof
  written root-only to `/var/lib/apex-deploy-gateway/proof-post-hardening.json`.
- Pre-hardening exact-main release (proof-before-revocation):
  `release_id=prodops01-preharden`, `source_sha=fde82c1a8fb3…` (authoritative
  `main` at that time), image `apex-home-fit:release-fde82c1a8fb3`, health
  `PASS`; proof root-only at
  `/var/lib/apex-deploy-gateway/proof-pre-hardening.json`.
- Rollback evidence: root-only compose snapshots
  `compose.yml.rollback-prodops01-preharden` and
  `compose.yml.rollback-prodops01-postharden` (0600); `verify-rollback`
  through the client returned PASS for both (`previous_image AVAILABLE`);
  marker `/var/lib/apex-deploy-gateway/rollback-verified` present (root-only).
- Fail-closed verified live: arbitrary `command` field rejected, `db_change`
  requests rejected, non-authoritative source SHA rejected.
- Protected boundary: `/opt/apex-home-fit/.env` remains `root:root` 0600 and is
  unreadable by `apexadmin`; gateway returns sanitized JSON only.
- Legacy privileges removed after proof; gateway operation does not depend on
  them (`apexdeploy` group membership retained for `apexadmin`).
- Prerequisite hardening preconditions consumed: `proof-pre-hardening.json`
  and `rollback-verified` both existed before `harden-after-proof.sh` ran.

- Dual compose config on the Production host: both `/opt/apex-home-fit/compose.yml`
  (selected) and `/opt/apex-home-fit/docker-compose.yml` (root-owned) exist;
  `docker compose` warns and uses `compose.yml`. Do not clean up during a
  deployment; needs canonical Governance authorization.
- Admin-route favicon 404: the admin layout (`src/app/admin/layout.tsx`) sets no
  metadata icons, so `/favicon.ico` 404s (console-only) on `/admin/login`. The
  main site sets icons in `src/app/[locale]/layout.tsx`.

## Notes

- **STABILIZATION BATCH S06+S05 = DELIVERED/CLOSED (2026-09-01).** Second
  post-S-04 architecture lifecycle completed: PR #19 → merged `4ada1da`
  (Main CI run `33501999153` PASS) → Production gateway release
  `stabilization-s06-s05` → image `apex-home-fit:release-4ada1dae2c3e` (ID
  `sha256:00c48073…`), `db_changed=false`, rollback
  `compose.yml.rollback-stabilization-s06-s05`, secret boundary `PROTECTED`.
  S-06 Exercise Library / Catalog Role DECIDED (docs-only: canonical =
  `src/lib/exercise/catalog.ts` + contracts; library page = demo/sample
  presentation) — decision record `architecture/S06-CATALOG-ROLE.md`. S-05
  Snapshot Versioning shipped (additive `snapshotVersion` format field on
  `WorkoutStateRecord` distinct from the `version` write counter; new records
  stamped v1; legacy rows read as 0; unknown-newer = additive-read +
  refuse-overwrite; merge preserves max format version; GATE C APPROVED).
  TD-01/TD-02 `rtl-layout.spec.ts` stale expectations FIXED. Local validation
  on the exact release code: typecheck PASS, eslint 0 errors, unit 534/534,
  build PASS, real-browser E2E 35/35; Production real-browser acceptance
  12/12 PASS. Signed-in Production recheck PENDING (operator-held credential;
  standing item). Branch `batch/stabilization-s06-s05` retired.

- **POST-MOBILE-READINESS-RATIONALIZATION-01 (docs-only, 2026-09-01).**
  The six mobile-readiness guardrails were **RATIFIED / BINDING**
  (ADR-0005; `ARCHITECTURE-PRINCIPLES.md` §13). Mobile triggers, HealthKit/
  Health Connect scope, and the technology-selection spike are DEFERRED until
  documented triggers; no mobile stack selected. The audit's "session-core
  extraction" finding was reconciled onto **S-04 — Session Core Contract
  Adoption** (verified: S03 extraction is CLOSED — `sessionCore.ts` exists and
  the hook delegates; residual debt = consumers such as `workoutPersistence.ts`
  still importing hook types) and PROMOTED in `docs/TASKS.md` (approved queue,
  NOT started; implementation still needs batch-start authorization).
  Next-batch proposal: Batch 2 = `ADMIN-DS-05` + `ADMIN-DS-06`; S-04 as its
  own lifecycle. `ADMIN-THEME-SWITCH-01` DEFERRED, `ADMIN-DS-05` REQUIRED,
  `ADMIN-IMPERSONATION-01` DEFERRED/NOT AUTHORIZED — all unchanged.

- **MOBILE-READINESS-01 = EXECUTED (2026-09-01, docs-only).** Mobile-lock-in / web-coupling architecture audit complete — no mobile app, no stack selection, no app/DB change, no deployment. Findings report: `docs/architecture/MOBILE-READINESS-01-REPORT.md`; proposed mobile-readiness guardrails in `ARCHITECTURE-PRINCIPLES.md` §13 (PROPOSED — awaiting owner ratification). Highest-severity finding: session engine still lives in the React hook (`useWorkoutEngine.ts`); S03 session-core extraction is the designed exit. Notifications/background work is a net-new capability gap (no web push exists). Admin follow-up debts persisted (NOT implemented): `ADMIN-THEME-SWITCH-01` (Admin is Dark-only, no Light/Dark switch) and ADMIN-DS-05 confirmation (Admin currently English-only; acceptance must include Persian/RTL/switching/locale persistence/reuse of localization architecture).

- **ADMIN-DS-BATCH-1 = DELIVERED (2026-09-01).** First Batch Delivery V1 lifecycle completed: PR #15 → merged `4de75ae` (Main CI run `33454929053` PASS) → Production gateway release `batch1-admin-ds-01-04` → image `apex-home-fit:release-4de75ae969c8` (ID `sha256:1908710b…`), `db_changed=false`, rollback `compose.yml.rollback-batch1-admin-ds-01-04`, secret boundary `PROTECTED`. Admin console now has dark-mode foundation (ThemeScript/ThemeProvider), self-hosted fonts, metadata + admin icons (favicon 404 resolved), shared primitives across all six pages, kit-based login/logout, loading/error/not-found boundaries and a11y pass. Production real-browser 4/4 PASS (boundaries, design-system wiring, public regression). Signed-in Production recheck PENDING (operator-held credential). Branch `batch/admin-ds-01-04` retired.


- **ADMIN-CONSOLE-01 = CLOSED (PRODUCTION_PASS, 2026-08-31).** Admin Console
  V1 (read-oriented Overview, Users, Workout Plans, Exercises, Operations,
  Admin/Sessions) is live on the preserved `apexhomefit_prod_db` volume via
  the canonical Production Deployment Gateway. All six surfaces are server
  components behind `requireAdmin()` with safe projections excluding password
  hashes, session-token hashes, OTP material, and any credential or secret
  values; the admin API boundary remains exactly `login`+`logout`; public
  Phone + OTP behavior unchanged; `DB_CHANGED = NO` (13 migrations, integrity
  `ok`). Exact-main release `2d131fc60453` via `/usr/local/bin/apex-deploy`
  (no privilege elevation); rollback verified; real-browser acceptance 14/14
  PASS (system Chrome) plus unauthenticated boundary verified on Production
  (all six surfaces redirect to `/admin/login`). Main CI PASS on `2d131fc`
  (run `33419999889`) and spec follow-up `e29d311` (run `33425058638`);
  branch retired.

- **AUTONOMOUS-PROD-OPS-01 = CLOSED (PRODUCTION_PASS, 2026-08-31).** The
  constrained root-owned Unix-socket deployment gateway is fully
  operational on `sabtbrooker`: exact-authoritative-`main` releases,
  digest-pinned builds, pinned Prisma, DB-invariant + rollback proof through
  the unprivileged client. Legacy `apexadmin` NOPASSWD sudo and Docker-group
  membership were removed by the proof-gated hardening step; a fresh SSH
  session confirmed sudo/docker/`.env` all fail while `apex-deploy`
  succeeds. Both a pre-hardening and a post-hardening exact-main release
  reached PASS with zero manual Owner commands.

- **ADMIN-AUTH-PROD-01 Production checkpoint = PASS and lifecycle = CLOSED**
  (2026-08-31). Admin Auth V1 is live on the preserved `apexhomefit_prod_db`
  volume (13 migrations, latest `20260831120000_add_admin_auth`). The
  migration was applied deterministically with the lockfile-pinned Prisma
  6.19.3 CLI from an ops image derived from the canonical source — never via
  dynamic `npx prisma` (see
  `docs/PITFALLS/PRISMA-NPX-PRODUCTION-MIGRATION.md`). Two acceptance-time
  defects were fixed via PR #11 (`f6f90d4`): the same-origin check behind the
  reverse proxy (standalone container rebuilds `request.url` from
  HOSTNAME/PORT — see
  `docs/PITFALLS/NEXTJS-STANDALONE-PROXY-SAME-ORIGIN.md`) and the
  provisioning helper's top-level await under CJS. Real-browser Production
  acceptance 22/22 PASS; fix branch `fix/admin-auth-sameorigin-01` retired;
  rollback evidence retained (`compose.yml.rollback-adminauth-3cf9cb6`).
- AUTH-FIX-01 remains the immediate prior checkpoint (source `ce91a4f`, 12
  migrations at that time); its volume-ownership lesson is preserved.
- The historical S02 incident is closed; do not reopen its RSC/digest
  investigation.
- `TASKS.md` is the only executable backlog. Advisory documents cannot
  authorize work.
- No next executable task is currently authorized.
