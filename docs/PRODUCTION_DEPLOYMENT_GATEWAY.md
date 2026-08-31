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
