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
ACTIVE_TASK:                           NONE — AL-01…AL-04, CP-01, CP-02, TS-01, TS-04, CP-03 DELIVERED/CLOSED (CP-03 closed 2026-09-05: findings DECIDED Approach A; measurement gate EXECUTED for the iPhone Chrome squat cell — 9/10 = 90% PASS — all other matrix cells honestly NOT_MEASURED); no task is currently active
ACTIVE_TASK_PROFILE:                   N/A (no active task)
AHF_EXECUTION_STATE:                   ACTIVE (Owner authorized AUTONOMOUS BACKLOG EXECUTION 2026-09-03 + CP-03 spike 2026-09-03; CP-03 findings DECIDED 2026-09-03 — Approach A MoveNet/TF.js, web-first, fully on-device, v1 HIGH-coverage scope, TEMPO_DRIFT + validated RANGE_OF_MOTION only; harness REPAIRED 2026-09-04 three times (records in docs/architecture/CP-03-HARNESS-REPAIR.md + CP-03-TRACKING-REPAIR.md + CP-03-REP-HEURISTIC-REPAIR.md; smoke 32/32); CP-03 MOVEMENT-OBSERVATION OUTCOME PERSISTED 2026-09-04 (docs-only; CP-06/CP-07/MO-01 recorded NOT_YET); **CP-03 MEASUREMENT GATE EXECUTED 2026-09-05 — first counted real-device measurement: iPhone Chrome (CriOS) squat @ diagonal-90, 10 real squats → 9/10 = 90% PASS for that cell (minAngle 57°, avgConf 0.66, p95 inf 33 ms, 0 inference errors, POSES_OK throughout; export scripts/pose-measurement/results/iphone-squat-diagonal90-crios-2026-09-05.json); all other matrix cells honestly NOT_MEASURED (Android Chrome binding-constraint unmeasured; Safari unmeasured — CriOS used; push-up/hinge/lunge unmeasured; placements 1/4; battery unmeasured — iOS Battery API n/a); CP-03 review COMPLETE, task CLOSED; no further Owner squat testing requested; product implementation separately gated (CP-04 HUMAN_GATE; CP-06/CP-07 need CP-04 + TS-02)**)
ACTIVE_BRANCH:                         N/A
PREVIOUS_COMPLETED_TASK:               CP-03 feasibility + measurement review (2026-09-05 — CLOSED: first counted real-device measurement `results/iphone-squat-diagonal90-crios-2026-09-05.json` — iPhone Chrome CriOS, squat @ diagonal-90, 10 real squats → 9/10 = 90% (downs/ups 9/9, minAngle 57° — real depth below the 95° threshold, avgConf 0.66, p95 inf 33 ms, 8,436 inference calls / 7,211 pose returns / 0 inference errors, overlay hits 50, POSES_OK audits throughout); verdict PASS for that cell vs the ≥ 90% rep-count criterion + latency headroom vs the ~66 ms bound; **remaining matrix NOT_MEASURED** — Android Chrome (the spike's binding-constraint case), iPhone Safari (CriOS is a WebKit proxy, not Safari), push-up/hinge/lunge, placements diagonal-200/front-180/side-90, session battery (iOS Battery API n/a); feasibility §11 + README §7 record the per-cell table honestly; no evidence fabricated or inferred; prior completed task: CP-03 rep-heuristic diagnostic & repair 2026-09-04 (v2 'lost' latch removed → smoke 32/32), tracking-failure repair 2026-09-04, harness diagnostic & repair 2026-09-04)
NEXT_AUTHORIZED_TASK:                  **TS-03 (Account / data deletion) is the only READY task with satisfied dependencies (TS-01 CLOSED)** — but it is PROD_SENSITIVE with DB_SENSITIVITY = DATA (deletes user data) and acceptance includes **Production acceptance of the deletion flow** → a **genuine Production gate** per the autonomous mandate; **Owner decision required** (authorize CODE_NO_DEPLOY execution up to the Production line per the MG-09 precedent, or hold). TS-05 blocked on TS-02 (HUMAN_GATE legal); CP-04 HUMAN_GATE (camera authorization); CP-05/CP-06/CP-07/MO-01/SU-01 NOT_YET. Optional Owner-side: CP-03 remaining measurement matrix (NOT_MEASURED cells — zero backlog impact)
NEXT_EXPECTED_BRANCH:                 N/A (next task gated on Owner decision)
CURRENT_PHASE:                         CP-03 CLOSED (2026-09-05). Feasibility findings DECIDED (Approach A); harness repaired 2026-09-04 (3 rounds; smoke 32/32); measurement gate EXECUTED for one cell — iPhone Chrome (CriOS) squat @ diagonal-90 = 9/10 (90%) PASS; remaining matrix NOT_MEASURED recorded honestly (feasibility §11, README §7); movement-observation outcome persisted (2026-09-04, docs-only); product implementation separately gated on CP-04/CP-06/CP-07 (camera authorization + consent + observation runtime — all NOT_YET/HUMAN_GATE). Backlog next = TS-03 (genuine Production gate — Owner decision required)
LAST_UPDATED:                          2026-09-05 (CP-03 CLOSED — measurement gate executed for one cell: iPhone Chrome CriOS squat @ diagonal-90 = 9/10 (90%) PASS with healthy tracking (minAngle 57°, avgConf 0.66, p95 inf 33 ms, 0 inference errors; export results/iphone-squat-diagonal90-crios-2026-09-05.json); all other matrix cells honestly NOT_MEASURED — Android Chrome, Safari, push-up/hinge/lunge, other placements, battery (iOS Battery API n/a) — recorded in feasibility §11 + README §7; CP-03 review COMPLETE; no further Owner squat testing requested; backlog next = TS-03, which is a genuine Production gate (PROD_SENSITIVE + DB DATA deletion + Production deletion acceptance) requiring an Owner decision; prior: 2026-09-04 CP-03 movement-observation outcome persisted (docs-only; CP-06/CP-07/MO-01 NOT_YET); 2026-09-04 rep-heuristic repair (smoke 32/32); 2026-09-04 tracking-failure repair (26/26) + harness diagnostic & repair (13/13); 2026-09-03 backlog AL-01…AL-04/CP-01/CP-02/TS-01/TS-04 + CP-03 findings DECIDED Approach A; MG-09 Production apply still gated on OWNER_DECISION_GATE; no Production/DB write, no deployment)
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
