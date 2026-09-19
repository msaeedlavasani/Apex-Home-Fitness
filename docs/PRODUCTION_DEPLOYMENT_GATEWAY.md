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
Beta Compose/SQLite state, requires a no-op migration hash, switches only the
Beta app, and retains an executable Beta rollback proof. Any ambiguous target,
missing protected configuration, failed CI, changed database hash, or failed
health check fails closed. Production is never stopped, recreated, mounted, or
selected by a Beta request.

The same constrained gateway also exposes the narrowly bounded
`beta-db-operation` action for the canonical QA data setup. Its only
allowlisted operation is `beta-qa-program-assign`: it runs from the exact
deployed Beta migration image, mounts only `ahf_beta_db`, reads the protected
`SMOKE_TEST_PHONE` configuration without returning it, and ensures the
repository-seeded `Apex Workout V2 QA Program` is owned by that authenticated
QA account. Dry-run evidence is required before apply; the Beta app is
quiesced, backed up, hash-verified, restored on failure, and restarted. This
is operational test data, not a product identity conditional, and it cannot
select Production resources.

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
remain until separate cleanup authorization.

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
`version: 4`).
