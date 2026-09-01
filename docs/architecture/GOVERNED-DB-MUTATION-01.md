# GOVERNED-DB-MUTATION-01 — Governed Production DB Mutation Capability

> **STATUS: EXECUTED / CLOSED — 2026-09-01.** Owner-approved Option 1 of the
> S02-E preflight (`docs/architecture/S02E-BACKFILL-PREFLIGHT.md` §5): extend
> the existing constrained Production Deployment Gateway with a minimum,
> bounded, reusable governed capability for (1) read-only Production DB
> inspection/dry-run evidence and (2) explicitly authorized, dry-run-gated
> DB_CHANGED=YES backfill/migration execution. **S02-E was NOT executed in
> this task** (dry-run evidence against the real Production DB was produced;
> the apply was proven only as a rehearsal against a byte-identical clone).
> The capability was proven in Production without any real Production DB
> mutation. After closure, S02-E returns to next-authorized status with the
> capability in place.

## 1. Why (root cause)

The Production Deployment Gateway V1 (the only Production capability) served
`status | release | verify-rollback` and hard-rejected `db_change != false`
("database-changing releases unsupported"). It also had no read-only row-access
surface. S02-E (Exercise Identity Backfill, GATE A GA-07 — classify → dry-run →
apply → verify) therefore could not execute its dry-run or apply through the
approved boundary, and no governed path existed for ANY future Production DB
data mutation or applied migration.

## 2. Design

### 2.1 New daemon action: `db-operation`

Gateway daemon v2 (`ops/deploy-gateway/apex_deploy_gateway.py`, `GATEWAY_VERSION=2`)
adds one action with a strict allowlist:

| Request field | Meaning |
|---|---|
| `action: "db-operation"` | the new governed DB operation |
| `schema_version: 1` | unchanged |
| `operation_id` | MUST be in the daemon allowlist (see below) |
| `mode` | `dry-run` (read-only) \| `apply` (real mutation) \| `rehearsal` (apply pipeline against a clone of app.db; real DB untouched) |
| `source_sha` | full 40-hex SHA; MUST equal authoritative GitHub `main` HEAD (same as `release`) — the caller can never supply code |
| `dry_run_evidence_sha` | required for `apply` only; must equal the SHA-256 of the stored dry-run evidence report for the same (operation_id, source_sha) |

### 2.2 Bounded operation allowlist (initial)

| operation_id | kind | Runner (from the authoritative repo archive) |
|---|---|---|
| `s02e-exercise-identity-backfill` | script | `scripts/gateway-db-ops/s02e-exercise-identity-backfill.mjs` (dry-run = SELECT-only report; apply = idempotent `slug` write for APPLY rows only, GATE A GA-07/GA-05) |
| `prisma-migrate-deploy` | migrate | pinned `./node_modules/.bin/prisma migrate deploy` (apply) / `migrate status` (dry-run) — same pinned Prisma 6.19.3 as releases |

The caller can only select an identity; the daemon executes the checked-in
script/command from the archive at the authoritative SHA. **No arbitrary SQL,
shell, Docker, Compose, or migration commands are ever accepted.**

### 2.3 Security-boundary preservation (unchanged from V1, verified)

- No arbitrary SQL / shell / Docker / Compose access; request keys are
  allowlisted and unknown fields fail (`unknown request fields`).
- No secret exposure: the daemon reads the root-owned `.env` internally and
  returns sanitized JSON only (never values).
- Exclusive Production DB operation: a crash-resilient `db-op-active` lock
  (pid-checked) is held by `db-operation` AND `release`; a stale marker from a
  dead process is reclaimed.
- Mandatory pre-mutation backup: `apply` quiesces `app`, copies
  `app.db → gateway-backup-<opid>-<sha12>.db` (chown 100:101), records
  before/after SHA-256, restores the backup on failure, and restarts `app`.
- Dry-run evidence gate: `apply` is refused without a matching stored dry-run
  report hash from THIS daemon.
- Idempotency: the backfill writes `slug` only where `slug is null` (never
  overwrites, never touches `name`/other columns, never maps
  BLOCKED_COLLISION/AMBIGUOUS/UNRESOLVED rows); re-running is a no-op.
- Post-mutation verification: the operation prints a verification report
  (re-classification; every APPLY row carries its exact slug; no skipped row
  was mapped) and the daemon returns it with DB hashes.
- Rollback/forward recovery: the pre-mutation backup + replayable additive
  fields mean the operation is forward-recoverable; the backup is restorable
  exactly like the release DB backup mechanism.
- Caller identity: socket `SO_PEERCRED` uid allowlist unchanged (root /
  apexadmin uid 1000); request size ≤16 KB.

### 2.4 Rehearsal mode (proof without mutation)

`mode: "rehearsal"` executes the full apply pipeline against a clone
(`app.db.rehearsal-<token>` inside the volume): clone → run apply against the
clone → hash real app.db before/after (must be identical — real DB untouched)
→ hash the clone before/after (must differ — mutation applied to the clone) →
delete the clone. This proves the entire apply path (backup → runner →
verification → recovery evidence) without performing the real mutation.

## 3. Evidence produced in Production (no real mutation)

1. `db-operation` dry-run for `s02e-exercise-identity-backfill` against the
   real Production DB (read-only mount): classification report + stored
   dry-run evidence hash → **read-only inspection capability proven** (also
   the real S02-E dry-run evidence, ready for the future authorized apply).
2. `db-operation` rehearsal for `s02e-exercise-identity-backfill`: full apply
   pipeline against a clone; real DB hash unchanged; clone mutated + verified;
   evidence returned → **apply pipeline proven without mutation**.
3. `prisma-migrate-deploy` dry-run (migrate status) + apply with **zero
   pending migrations** (no-op, DB hash unchanged): proves the migration
   execution path with no data/schema change.
4. Fail-closed negatives: unallowlisted operation, missing/mismatched dry-run
   evidence, unknown fields, invalid SHA — all rejected.

## 4. Explicitly out of scope (per the task)

- **S02-E apply on the real Production DB was NOT executed.** S02-E becomes
  the next authorized isolated lifecycle, now with a governed path.
- No generic database-administration API; no arbitrary query surface; no
  self-update mechanism (gateway upgrades remain a documented root install —
  see `ops/deploy-gateway/install-gateway.sh`).
- The existing `release` / `verify-rollback` / `status` contract is unchanged
  (`release` still requires `DB_CHANGED=false`).

## 5. Upgrade path

`ops/deploy-gateway/install-gateway.sh` (root, host + invariant guarded,
idempotent) installs the daemon + client, runs `py_compile` + `--self-test`,
restarts the service, and verifies `version: 2`. This is the ONLY supported
way to change the daemon (it has no self-update surface by design).
