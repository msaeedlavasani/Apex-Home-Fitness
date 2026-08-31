# Current State — Operational Manifest

Concise canonical snapshot of the repository and Production state. Read this
BEFORE starting any implementation. Rules: `docs/RELEASE_POLICY.md`; runbook:
`docs/FEATURE_TO_PRODUCTION.md`; branches: `docs/BRANCHING_POLICY.md`;
checkpoints: `docs/PRODUCTION_CHECKPOINTS.md`. No secrets are stored here.

```
CURRENT_VERIFIED_PRODUCTION_CHECKPOINT: AUTH-FIX-01
CURRENT_PRODUCTION_SOURCE:             ce91a4f297951142fce1394a5ac9157378e72961
CURRENT_PRODUCTION_IMAGE:              apex-home-fit:authfix-ce91a4f
CURRENT_PRODUCTION_BUILD_ID:           TfZRMHwm3pBWUW3bBgTZc
CURRENT_DB_TYPE:                       SQLite (Prisma)
CURRENT_DB_VOLUME:                     apexhomefit_prod_db:/data (owned 100:101)
CURRENT_DB_MIGRATION_COUNT:            12
CURRENT_MAINLINE_BASELINE_COMMIT:      c80a1bb75f093c5bc8f6b17b544c7004dceb4e30
ACTIVE_TASK:                           ADMIN-AUTH-01
ACTIVE_TASK_PROFILE:                   CODE_NO_DEPLOY
ACTIVE_BRANCH:                         feat/admin-auth-01
PREVIOUS_COMPLETED_TASK:               AUTH-PERF-01 (CLOSED; no reproducible defect)
PREVIOUS_COMPLETED_BRANCH:             fix/auth-perf-production-degradation (RETIRED)
NEXT_AUTHORIZED_TASK:                  ADMIN-AUTH-01
NEXT_EXPECTED_BRANCH:                  feat/admin-auth-01
LAST_UPDATED:                          2026-08-31 (ADMIN-AUTH-01 active)
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

## Notes

- **AUTH-FIX-01 Production checkpoint = PASS and lifecycle = CLOSED** (2026-08-29). Root cause: the `apexhomefit_prod_db` volume was root-owned while the app runs as `nextjs` (uid 100), so every DB write failed (`attempt to write a readonly database`). The volume was re-owned to `100:101`, and the image now runs a startup writability preflight (`scripts/preflight-db.mjs`) that fails fast on an unwritable volume. Real login + post-login DB writes verified.
- AUTH-FIX-01 source commits and checkpoint documentation are integrated into remote `main`; `fix/auth-login-production` is retired locally and remotely.
- The historical S02 incident is closed; do not reopen its RSC/digest investigation.
- `TASKS.md` is the only executable backlog. Advisory documents cannot
  authorize work.
- DOCUMENTATION-CONSOLIDATION-01 did not alter the verified Production
  checkpoint. It is integrated at `c80a1bb`; its final state/report closure is
  documentation-only. `AUTH-PERF-01` was subsequently investigated from
  current main; focused auth/performance/persistence/EN-FA checks passed with
  no reproducible application defect, and no Production mutation occurred.
  `NEXT_AUTHORIZED_TASK = ADMIN-AUTH-01` is active on `feat/admin-auth-01`; this
  task is non-Production-bound and must complete its governed integration before
  the next task is promoted.
