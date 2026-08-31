# Current State — Operational Manifest

Concise canonical snapshot of the repository and Production state. Read this
BEFORE starting any implementation. Rules: `docs/RELEASE_POLICY.md`; runbook:
`docs/FEATURE_TO_PRODUCTION.md`; branches: `docs/BRANCHING_POLICY.md`;
checkpoints: `docs/PRODUCTION_CHECKPOINTS.md`. No secrets are stored here.

```
CURRENT_VERIFIED_PRODUCTION_CHECKPOINT: AUTONOMOUS-PROD-OPS-01 (PRE-HARDENING RELEASE)
CURRENT_PRODUCTION_SOURCE:             fde82c1a8fb33edaa1af60e43f6a9d6eb149d0a2
CURRENT_PRODUCTION_IMAGE:              apex-home-fit:release-fde82c1a8fb3
CURRENT_PRODUCTION_BUILD_ID:           (gateway exact-SHA build; image sha256:05f2c97591d5)
CURRENT_DB_TYPE:                       SQLite (Prisma)
CURRENT_DB_VOLUME:                     apexhomefit_prod_db:/data (owned 100:101)
CURRENT_DB_MIGRATION_COUNT:            13
CURRENT_MAINLINE_BASELINE_COMMIT:       fde82c1a8fb33edaa1af60e43f6a9d6eb149d0a2 (PR #12 merged)
ACTIVE_TASK:                           AUTONOMOUS-PROD-OPS-01
ACTIVE_TASK_PROFILE:                   RELEASE
ACTIVE_BRANCH:                         feat/autonomous-prod-ops-01 (MERGED; retention documented)
PREVIOUS_COMPLETED_TASK:               ADMIN-AUTH-PROD-01 (CLOSED; PRODUCTION_PASS)
PREVIOUS_COMPLETED_BRANCH:             fix/admin-auth-sameorigin-01 (RETIRED)
NEXT_AUTHORIZED_TASK:                  NONE (ADMIN-CONSOLE-01 deferred behind active task)
NEXT_EXPECTED_BRANCH:                 N/A
CURRENT_PHASE:                         HUMAN_CHECKPOINT: PRIVILEGE_REVOCATION_READY
LAST_UPDATED:                          2026-08-31 (pre-hardening gateway release PASS; awaiting post-revocation sequence)
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

- `apexadmin` retains both unrestricted passwordless sudo and Docker group
  membership. `AUTONOMOUS-PROD-OPS-01` preserved these during bootstrap and
  the pre-hardening release, and **they must remain untouched** at the current
  `HUMAN_CHECKPOINT: PRIVILEGE_REVOCATION_READY`. The replacement gateway has
  been proven end-to-end (bootstrap, socket-only client, fail-closed tests,
  exact-main release, rollback verification). Only after the Owner authorizes
  the hardening step may the proof-gated removal of `NOPASSWD: ALL` and Docker
  group membership occur, followed by a fresh-SSH post-hardening release.

## Gateway (AUTONOMOUS-PROD-OPS-01) verified state

- Root-owned daemon `apex-deploy-gateway` active on host `sabtbrooker`; socket
  `/run/apex-deploy-gateway/gateway.sock` owned `root:apexdeploy` mode 0660;
  unprivileged client `/usr/local/bin/apex-deploy` uses only that Unix socket
  (no sudo/subprocess; `AF_UNIX` only).
- Pre-hardening exact-main release through the unprivileged client:
  `release_id=prodops01-preharden`, `source_sha=fde82c1a8fb3…` (authoritative
  GitHub `main` HEAD), image
  `apex-home-fit:release-fde82c1a8fb3`, DB-unchanged (`db_changed=false`),
  health `PASS`, secret boundary `PROTECTED`. Proof written root-only to
  `/var/lib/apex-deploy-gateway/proof-pre-hardening.json`.
- Rollback evidence: `/opt/apex-home-fit/compose.yml.rollback-prodops01-preharden`
  (root-only 0600); `verify-rollback` through the client returned PASS
  (`previous_image AVAILABLE`); marker
  `/var/lib/apex-deploy-gateway/rollback-verified` present (root-only).
- Fail-closed verified live: arbitrary `command` field rejected, `db_change`
  requests rejected, non-authoritative source SHA rejected.
- Protected boundary: `/opt/apex-home-fit/.env` remains `root:root` 0600 and is
  unreadable by `apexadmin`; gateway returns sanitized JSON only.
- Legacy privileges intentionally still present, awaiting Owner authorized
  hardening.

- Dual compose config on the Production host: both `/opt/apex-home-fit/compose.yml`
  (selected) and `/opt/apex-home-fit/docker-compose.yml` (root-owned) exist;
  `docker compose` warns and uses `compose.yml`. Do not clean up during a
  deployment; needs canonical Governance authorization.
- Admin-route favicon 404: the admin layout (`src/app/admin/layout.tsx`) sets no
  metadata icons, so `/favicon.ico` 404s (console-only) on `/admin/login`. The
  main site sets icons in `src/app/[locale]/layout.tsx`.

## Notes

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
