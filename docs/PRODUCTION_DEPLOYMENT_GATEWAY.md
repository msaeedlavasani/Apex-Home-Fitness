# Production Deployment Gateway

> **STATUS: CURRENT — AUTONOMOUS-PROD-OPS-01 SECURITY CONTRACT**
>
> **PROGRESS: **DONE/CLOSED (2026-08-31)** — the full proof-before-revocation
> sequence completed on `sabtbrooker`: bootstrap, fail-closed tests, exact-main
> pre-hardening release, rollback verification, proof-gated hardening (legacy
> `NOPASSWD: ALL` and Docker group membership removed), fresh-SSH proof that
> sudo/Docker/`.env` all fail, and an exact-main post-hardening release +
> rollback verification — all via the unprivileged socket client with zero
> manual Owner commands. `apexadmin` retains only `apexdeploy` (plus standard
> `sudo`/`users` membership; no passwordless grant).**

The root-owned gateway service is the only target Production deployment
capability. FreeBuff/`apexadmin` invokes `/usr/local/bin/apex-deploy` without
`sudo`; the client can only exchange a bounded JSON message over a Unix socket
owned by `root:apexdeploy`. It never invokes Docker or reads protected files.

## Beta (Workout V2) — bounded extension of the same gateway

The Owner-authorized Beta capability extends this daemon with a separate
`beta-status`, `beta-release`, and `beta-verify-rollback` action. These actions
do not alter the Production `release`, `db-operation`, or rollback contract.
The repository-owned topology is installed by
`ops/deploy-gateway/install-beta-path.sh` from
`ops/deploy-gateway/beta-compose.yml`.

Beta is explicitly identified as:

- `https://beta.apexhomefit.ir` on host `sabtbrooker`;
- `/opt/ahf-beta/compose.yml` and `/opt/ahf-beta/.env` (`root:root 0600`);
- `127.0.0.1:3100` → container port `3000`;
- `ahf_beta_db` only; never `apexhomefit_prod_db`;
- `ahf-home-fit:beta-*` images; never the Production `apex-home-fit:release-*`
  namespace.

The Beta action accepts only the canonical Workout V2 feature-branch/PR
candidate and requires the requested full SHA to match the branch head, open
PR head, and successful authoritative branch and PR CI runs. It builds from
that exact archive, records image IDs and Next build identity, snapshots the
Beta Compose/SQLite state, and switches only the Beta app. `DB_CHANGED=false`
requires the existing no-op hash gate. `DB_CHANGED=true` is allowed only on
Beta and first runs Prisma migration deploy against a byte-identical clone,
requiring the clone to demonstrate a schema change before applying the same
checked-in migration to the backed-up Beta volume. Any ambiguous target,
missing protected configuration, failed CI, failed migration preflight,
failed rollback, or failed health check fails closed. Production is never
stopped, recreated, mounted, or selected by a Beta request.

The same constrained gateway also exposes the narrowly bounded
`beta-db-operation` action for the canonical QA data setup. Its only
allowlisted operation is `beta-qa-program-assign`: it runs from the exact
deployed Beta migration image, mounts only `ahf_beta_db`, reads the protected
Beta QA allowlist without returning it, and ensures the repository-seeded
`Apex Workout V2 QA Program` is owned by the unique available persisted account
in that allowlist (or its existing owner on retry). Ambiguous or absent
accounts fail closed. Missing canonical QA exercise rows are created only by
this bounded operation. A stale existing Program is not an Owner decision: the
dry-run reports sanitized field-level shape differences and plans the minimum
idempotent canonical repair; apply replaces only that Program's scalar metadata
and ordered `ProgramExercise` rows from the source-controlled fixture. Dry-run
evidence is required before apply; the Beta app is quiesced, backed up,
hash-verified, restored on failure, and restarted. This is operational test
data, not a product identity conditional, and it cannot select Production
resources. Because the operation executes from the deployed Beta migration
image, changing the operation implementation requires the existing governed
capability-install/release mechanism; direct host script replacement is not an
approved activation path.

## Authorization and allowlist

- exact host: `sabtbrooker`;
- canonical repository: `msaeedlavasani/Apex-Home-Fitness`;
- source: full SHA must equal authoritative GitHub `main` HEAD, downloaded by
  the root service rather than supplied by the caller;
- compose: `/opt/apex-home-fit/compose.yml`, always passed explicitly with
  `-f`; the legacy second compose file is not selected or deleted;
- service/port/volume: `app`, loopback `127.0.0.1:3000`, external
  `apexhomefit_prod_db:/data`;
- image: `apex-home-fit:release-<12-character SHA>`;
- base image: all Docker stages pin the validated `node:22-alpine` content
  digest; the gateway refuses a source Dockerfile that drifts from the pin;
- migrations: checked-in `./node_modules/.bin/prisma`, verified as lockfile-
  pinned Prisma `6.19.3`; dynamic `npx`/npm resolution is forbidden;
- V1 requests require `DB_CHANGED=false`; unknown fields and actions fail.
- **v2 (GOVERNED-PROD-DB-CAPABILITY-01, 2026-09-01):** one additional bounded
action `db-operation` (read-only dry-run evidence + dry-run-gated
`DB_CHANGED=YES` backfill/migration execution). The `release` contract is
unchanged (`DB_CHANGED=false` still required). See
`docs/architecture/GOVERNED-DB-MUTATION-01.md`.

The root service reads the mode-`0600`, root-owned `.env` internally. It
returns only status/identity/invariant evidence, never values. `apexadmin`
cannot provide commands, repositories, source archives, image names, compose
paths, volumes, migration commands, environment, or health targets.

## storage-hygiene — governed server storage lifecycle

The existing gateway also exposes `storage-hygiene` with `mode=audit|cleanup`.
It is not a second deployment system or a Docker-wide prune command. The daemon
reconciles Production and Beta `CURRENT` plus `VERIFIED_ROLLBACK` from its
root-only release-authority state, running-container identity, Compose rollback
evidence, and existing proof records. It never selects rollback by age,
`latest`, `beta-current`, or tag recency.

When a current Production proof names a root-only rollback snapshot, the
gateway may reconcile that snapshot against the immutable
`docs/PRODUCTION_CHECKPOINTS.md` ledger at the proof's source SHA. This is
valid only when the ledger identifies the same current checkpoint and source,
the snapshot names the same rollback image, and that image is independently a
PASS checkpoint. A stale legacy marker alone is never enough.

Every relevant AHF image, migration/dbop image, failed candidate, stopped AHF
container, dangling artifact, and builder cache is assigned exactly one of:
`RETAIN_CURRENT`, `RETAIN_ROLLBACK`, `RETAIN_ACTIVE_TRANSACTION`,
`SAFE_TO_DELETE`, or `AMBIGUOUS_DO_NOT_DELETE`. Cleanup removes only individual
gateway-classified safe container/image IDs. Database volumes, unrelated
services, ambiguous artifacts, and Docker storage-directory files are outside
scope. Application release status is persisted separately from
`STORAGE_HYGIENE_STATUS`.

The host must provide a calibrated root-only
`/var/lib/apex-deploy-gateway/storage-policy.json`, based on measured AHF
builder scope and release peaks. Before any release or migration-image build,
disk admission reserves current/rollback images, candidate app and migration
peaks, database backup space, temporary Docker overhead, bounded cache growth,
and emergency headroom. Missing or ambiguous policy/evidence blocks admission.
After rollback verification the gateway runs bounded cleanup: useful recent
cache is retained, expired cache is pruned with the host builder's bounded
prune controls (Buildx when available, legacy `docker builder prune` on the
current host), failed
transaction containers/images are removed when safe, and final filesystem
budget evidence is written to a sanitized `storage-hygiene-*.json` receipt.
The checked-in `ops/deploy-gateway/storage-policy.example.json` contains
explicit zero placeholders and is intentionally rejected until calibrated on
the host.

Storage hygiene remains cross-environment and therefore reports Production
ambiguity as `BLOCKED`. Release admission is environment-scoped: Production
release/DB admission requires Production authority, while isolated Beta
release/DB admission requires Beta authority plus the shared disk policy. For
the Beta path, every ambiguous or active Production-owned image remains a
conservative disk reserve; it is never deleted or treated as reclaimable.

## Transaction and rollback

The gateway validates host, source, current image, rendered compose topology,
protected-env mode, volume, and binding before build. It builds runner and
migration images from the canonical archive, verifies pinned Prisma, records a
root-only compose rollback copy, stops only `app`, and copies the quiesced
SQLite database inside the preserved volume. It hashes the DB before/after the
no-op migration gate, restores `100:101` ownership, atomically changes only the
app image, recreates only `app`, and verifies container topology plus loopback
health.

If a post-stop step fails, it restores the prior compose file, restores the DB
backup if migration began, and recreates the prior app. Broad privileges are
not a recovery mechanism. Old images, DB backups, and rollback compose files
remain until the separate post-rollback storage-hygiene checkpoint; that
checkpoint may remove only artifacts it classifies `SAFE_TO_DELETE` and always
preserves the rollback evidence itself.

## Proof-before-revocation sequence

1. Bootstrap installs the root daemon, Unix-socket client and service while
   preserving current sudo and Docker-group paths.
2. Schema and fail-closed tests run through the same unprivileged client.
3. A pre-hardening exact-main release passes through that client.
4. `verify-rollback` proves the root-only compose evidence and previous image
   are usable.
5. Only then may the proof-gated hardening script remove unrestricted sudo and
   Docker-group membership.
6. A new SSH authentication proves arbitrary sudo, direct Docker, and `.env`
   reads fail while the gateway client succeeds.
7. A second `post-hardening` release and acceptance run through the same client.

Final acceptance is not met until both deployments pass, rollback is verified,
and no Owner command occurs anywhere in the release lifecycle.

## db-operation (v2) — governed Production DB backfill/migration

Request shape (schema_version 1):

```json
{
  "action": "db-operation",
  "schema_version": 1,
  "operation_id": "s02e-exercise-identity-backfill | prisma-migrate-deploy",
  "mode": "dry-run | apply | rehearsal",
  "source_sha": "<40-hex authoritative GitHub main SHA>",
  "dry_run_evidence_sha": "<64-hex, REQUIRED for mode=apply>"
}
```

Contract (bounded, fail-closed, mirrors the release security model):

- `operation_id` must be in the daemon allowlist; the daemon downloads the
  authoritative archive at `source_sha` (must equal GitHub `main` HEAD) and
  executes ONLY the checked-in allowlisted runner — no arbitrary SQL, shell,
  Docker, Compose, or migration commands are accepted.
- `mode=dry-run` mounts the Production volume **read-only** and stores the
  report as root-only dry-run evidence (`/var/lib/apex-deploy-gateway/
  db-op-dryrun-<opid>-<sha12>.json`), returning `dry_run_evidence_sha`.
- `mode=apply` is refused without a matching `dry_run_evidence_sha`;
  before mutating it quiesces `app`, copies the DB
  (`gateway-backup-<opid>-<sha12>.db`, chown 100:101), records before/after
  SHA-256, restores the backup on failure, restarts `app`, and returns the
  operation's verification report. Operations are idempotent.
- `mode=rehearsal` runs the FULL apply pipeline against a byte-identical
  clone of `app.db` inside the volume; the real DB hash must be unchanged;
  the clone is mutated, verified, then deleted. Used to prove the apply path
  without a real mutation.
- Exclusive: `db-operation` and `release` share a crash-resilient
  `db-op-active` lock; both refuse to start while it is held by a live
  process.
- No secrets are ever returned (sanitized JSON only; `.env` stays root-only).

Upgrade/install: `ops/deploy-gateway/install-gateway.sh` (root, host-guarded,
idempotent; runs `py_compile` + `--self-test`, restarts the service, verifies
`version: 5`).
