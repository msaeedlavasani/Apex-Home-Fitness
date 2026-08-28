# Current State — Operational Manifest

Concise canonical snapshot of the repository and Production state. Read this
BEFORE starting any implementation. Rules: `docs/RELEASE_POLICY.md`; runbook:
`docs/FEATURE_TO_PRODUCTION.md`; branches: `docs/BRANCHING_POLICY.md`;
checkpoints: `docs/PRODUCTION_CHECKPOINTS.md`. No secrets are stored here.

```
CURRENT_VERIFIED_PRODUCTION_CHECKPOINT: R6
CURRENT_PRODUCTION_SOURCE:             aee28d12e2368206e2d9f788afc2ecd19983e5f6
CURRENT_PRODUCTION_IMAGE:              apex-home-fit:r6-aee28d1
CURRENT_PRODUCTION_BUILD_ID:           W9SvU21TmqkpMtwQ_VWUm
CURRENT_DB_TYPE:                       SQLite (Prisma)
CURRENT_DB_VOLUME:                     apexhomefit_prod_db:/data
CURRENT_DB_MIGRATION_COUNT:            12
CURRENT_MAINLINE_BASELINE_COMMIT:      00ced463391de5f8fdccca6c41522e5802b47a85
ACTIVE_TASK:                           NONE
ACTIVE_BRANCH_EXPECTATION:             main
PREVIOUS_COMPLETED_TASK:               R6 + GOVERNANCE v1/v2 + mainline integration
PREVIOUS_COMPLETED_BRANCH:             fix/governance-v2-micro-correction (RETIRED)
NEXT_AUTHORIZED_TASK:                  AUTH-FIX-01
NEXT_EXPECTED_BRANCH:                  fix/auth-login-production
LAST_UPDATED:                          2026-08-28 (Governance v2 micro-correction)
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

- Governance v2 and its micro-correction are repository-mainline/documentation
  changes only; they do NOT create a new Production checkpoint. Production
  remains at R6.
- AUTH-FIX-01 (real provider login) is the next authorized product task and
  requires real Production feature acceptance (see
  `FEATURE_TO_PRODUCTION.md` — auth journey contract); CI PASS alone is NOT
  sufficient.
- The historical S02 incident is closed; do not reopen its RSC/digest
  investigation.
