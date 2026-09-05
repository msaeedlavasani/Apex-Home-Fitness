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
ACTIVE_TASK:                           NONE — AL-01…AL-04, CP-01, CP-02, TS-01, TS-04, CP-03, TS-03 DELIVERED/CLOSED (CP-03 closed 2026-09-05: findings DECIDED Approach A; measurement gate EXECUTED for the iPhone Chrome squat cell — 9/10 = 90% PASS — all other matrix cells honestly NOT_MEASURED; TS-03 delivered 2026-09-05 as CODE_NO_DEPLOY — irreversible confirmation-gated account deletion, ADR-0020, Production deletion acceptance Owner-gated); no task is currently active
ACTIVE_TASK_PROFILE:                   N/A (no active task)
AHF_EXECUTION_STATE:                   ACTIVE (Owner authorized AUTONOMOUS BACKLOG EXECUTION 2026-09-03 + CP-03 spike 2026-09-03 + TS-03 CODE_NO_DEPLOY 2026-09-05 + BATCH_5 delivery; CP-03: findings DECIDED Approach A, harness repaired thrice 2026-09-04 (smoke 32/32), movement-observation outcome persisted 2026-09-04, MEASUREMENT GATE EXECUTED 2026-09-05 — iPhone Chrome (CriOS) squat @ diagonal-90 = 9/10 (90%) PASS, remaining matrix honestly NOT_MEASURED, task CLOSED; **TS-03 DELIVERED 2026-09-05 (CODE_NO_DEPLOY, batch lifecycle with the CP-03 review): irreversible, confirmation-gated account deletion across both data planes — Prisma user-owned rows + PhoneOtp by phone in ONE transaction with shared Programs de-owned, Supabase workout_exercise_logs + avatar + auth identity deleted LAST (service-role; retries idempotent), typed fail-closed errors (400/401/404/502/503), DELETE /api/account/delete + ProfileView typed-DELETE section (FA/EN), 11 new offline tests, ADR-0020 ACCEPTED; Production deletion acceptance NOT covered — Owner-gated (gateway)**)
ACTIVE_BRANCH:                         N/A
PREVIOUS_COMPLETED_TASK:               TS-03 Account / data deletion (2026-09-05 — CODE_NO_DEPLOY, batch-delivered with the CP-03 measurement review; src/services/accountDeletionService.ts + DELETE /api/account/delete + ProfileView delete-account section with typed DELETE confirmation (FA/EN keys); cascade = Prisma User/WeightEntry/WorkoutSession(+exercises)/QuizResponse/ProgramGenerationRequest/PhoneOtp-by-phone in one transaction, shared Programs de-owned (never deleted), catalog + admin identities untouched; Supabase outbox rows + avatar + auth identity last; fail-closed typed errors; 11 new offline tests incl. transaction table coverage + ordering + failure paths; ADR-0020; prior completed task: CP-03 feasibility + measurement review 2026-09-05 (iPhone Chrome CriOS squat 9/10 = 90% PASS cell; matrix NOT_MEASURED recorded))
NEXT_AUTHORIZED_TASK:                  **None autonomously executable** — TS-03 delivered CODE_NO_DEPLOY (Production apply gated); every remaining candidate is gated: TS-05 needs TS-02 (HUMAN_GATE legal), CP-04 HUMAN_GATE (camera authorization), CP-05/CP-06/CP-07/MO-01/SU-01 NOT_YET. Continuing requires an Owner decision (promote a NOT_YET task; authorize CP-04 architecture; or execute the TS-03 Production deletion acceptance via the gateway)
NEXT_EXPECTED_BRANCH:                 N/A (next task gated on Owner decision)
CURRENT_PHASE:                         TS-03 CLOSED (CODE_NO_DEPLOY) + CP-03 CLOSED (2026-09-05). Deletion flow implemented and offline-validated; **Production deletion acceptance is the open Owner gate** (real deletion against the Production Supabase project requires explicit authorization + gateway environment). Backlog: no further autonomous-READY task with satisfied dependencies — all remaining candidates gated (TS-05/TS-02 legal, CP-04 camera HUMAN_GATE, others NOT_YET)
LAST_UPDATED:                          2026-09-05 (TS-03 delivered CODE_NO_DEPLOY + CP-03 closed — one batch: CP-03 measurement review (iPhone Chrome CriOS squat 9/10 = 90% PASS cell; matrix NOT_MEASURED honestly) + TS-03 account deletion (service + route + ProfileView typed-DELETE section, FA/EN; 11 new tests; ADR-0020; Production deletion acceptance Owner-gated); governance PASS, typecheck clean, full suite green, lint 0; prior: 2026-09-05 CP-03 measurement review; 2026-09-04 CP-03 outcome persisted (docs-only; CP-06/CP-07/MO-01 NOT_YET) + harness repairs (13/13 → 26/26 → 32/32); 2026-09-03 backlog AL-01…AL-04/CP-01/CP-02/TS-01/TS-04 + CP-03 findings DECIDED Approach A; MG-09 Production apply still gated on OWNER_DECISION_GATE; no Production/DB write, no deployment)
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

- **BATCH DELIVERY V2 = AUTHORIZED (2026-09-04, docs-only).** Governed
  delivery modes: **SINGLE_TASK** (default — gated, Production-sensitive,
  security-sensitive, or incompatible work) and **BATCH_5** (up to five
  compatible low-risk tasks: dependency-safe order; separate identity +
  acceptance criteria + targeted validation per member; ONE batch branch →
  ONE PR → ONE full CI → ONE exact-merge-SHA Main CI; per-member close-outs
  and Owner reports each referencing the shared batch CI evidence).
  Supersedes `BATCH_DELIVERY_V1`. Fail-closed: any Owner/Human/Production
  gate or DB/Production/security/UI/file-overlap ineligibility disqualifies
  batching. Conflict audit (2026-09-04) in `BATCH_DELIVERY_V2.md` §6 +
  `BRANCHING_POLICY.md` §K: branch protection compatible (`enforce_admins`,
  `build`/`e2e` strict, linear history, no rulesets); §B/§H/§I deltas
  authorized; batch manifests are delivery records — machine validation is
  a separately authorized tooling task (runtime unchanged). No batch
  authorized and no backlog task executed by this change. `origin/main`
  advance: `docs(governance)` BATCH_DELIVERY_V2.

- **AUTONOMOUS BACKLOG EXECUTION (2026-09-03).** Owner TASK DELTA:
  execute `docs/TASKS.md` one READY task at a time in dependency order, no
  Owner confirmation between normal tasks, STOP only at genuine
  Owner/Human/Production/architecture gates. AL-01 (Workout outcome /
  feedback model) DELIVERED/CLOSED — PR #35 merged `89ec8a1`, Main CI PASS
  on exact SHA (run `33735023618`), branch retired (local + remote
  verified).  Branch protection enforcement also hardened the same day:
  `enforce_admins` enabled on `main` (required `build`/`e2e` checks now bind
  the Owner; docs commits `92e909b`, `168d5c5`) — direct-main pushes are
  push-time gated; merges use PRs with CI PASS. AL-02 (Personal Movement
  Profile data contract) DELIVERED/CLOSED — PR #36 merged `c7f509b`, Main
  CI PASS on exact SHA (run `33738933578`), branch retired (local + remote
  verified).

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
