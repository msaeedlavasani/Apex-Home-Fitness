# Operational Handoff

> **STATUS: CURRENT — SUPPORTING SNAPSHOT**
>
> This file supplies concise context for the next human or agent. It does not
> own policy, backlog, product direction, architecture status, or history.

## Current handoff

- **AUTONOMOUS-PROD-OPS-01 is CLOSED** (PRODUCTION_PASS). No active task.
- `ADMIN-AUTH-PROD-01`, `ADMIN-AUTH-01`, `DOCUMENTATION-CONSOLIDATION-01`,
  `AUTH-PERF-01` are closed; their task branches retired.
- Gateway source integrated to `main` via **PR #12** (commit `fde82c1a8fb3…`);
  Main CI PASS (run `33411342851`). Docs-only state commit `f2387cc3a5b8…`
  pushed; Main CI PASS (run `33413935668`).
- Gateway installed and fully proven on host `sabtbrooker`: bootstrap,
  socket-only client, fail-closed, exact-main **pre-hardening** release PASS,
  rollback verified, proof-gated **hardening** (legacy `NOPASSWD: ALL` and
  Docker-group membership removed), then an exact-main **post-hardening**
  release + rollback verification from a fresh unprivileged session.
- Production now runs `apex-home-fit:release-f2387cc3a5b8` from exact source
  `f2387cc3a5b8…`, DB unchanged (13 migrations, integrity `ok`), `.env` and
  gateway proof files remain root-only.
- Legacy `apexadmin` NOPASSWD sudo and Docker-group membership are **removed**;
  `apexadmin` retains `apexdeploy` (gateway access) plus standard `sudo`/`users`
  membership (no passwordless grant). Direct sudo/Docker/`.env` all fail for
  `apexadmin` while `apex-deploy` succeeds.
- Executable work and dependencies: [`TASKS.md`](TASKS.md).
- Machine-oriented state: [`CURRENT_STATE.md`](CURRENT_STATE.md).

## Stable operational context

- Current verified Production checkpoint: `AUTONOMOUS-PROD-OPS-01`, source
  `f2387cc3a5b8438e1fc0ab02d36174a151d1b504`, image
  `apex-home-fit:release-f2387cc3a5b8` (ID `sha256:7227b1c5…`), 13 Prisma
  migrations, SQLite volume `apexhomefit_prod_db:/data`; authoritative
  evidence is in [`PRODUCTION_CHECKPOINTS.md`](PRODUCTION_CHECKPOINTS.md).
- Immediate rollback checkpoint: `AUTH-FIX-01`, source `ce91a4f`; app-level
  rollback compose evidence retained on the host
  (`compose.yml.rollback-adminauth-3cf9cb6`).
- Public user identity/session: phone proof through OTP, Supabase SSR session;
  canonical launch constraints are in [`OTP_LAUNCH_READINESS.md`](OTP_LAUNCH_READINESS.md).
- Deployment contract: [`RELEASING.md`](RELEASING.md). Release policy:
  [`RELEASE_POLICY.md`](RELEASE_POLICY.md).

## Important boundaries

- `TASKS.md` is the only executable backlog.
- `TRANSFORMATION_ROADMAP.md` and product vision documents do not authorize work.
- Accepted/deferred decisions must be written to their canonical owner before
  continuation, per Decision Persistence.
- Do not infer administrator authorization from the public OTP implementation;
  Admin Auth V1 is a separate Email + Password boundary documented in
  [`ADMIN_AUTH.md`](ADMIN_AUTH.md); Passkey/WebAuthn remains deferred.
- Do not infer a provider migration from the resilience evaluation need.

## Next transition

`AUTONOMOUS-PROD-OPS-01` reached CLOSED (2026-08-31). The constrained
root-owned Unix-socket gateway passed bootstrap, fail-closed, exact-main
pre-hardening release, rollback proof, proof-gated hardening (legacy
`NOPASSWD: ALL` and Docker-group membership removed), and a post-hardening
release + rollback verification from a fresh unprivileged session — all through
`/usr/local/bin/apex-deploy` with zero manual Owner commands. The task branch
`feat/autonomous-prod-ops-01` is retired.

`ADMIN-CONSOLE-01` becomes the next candidate but remains DEFERRED: it may not
resume until an explicit owner decision promotes it to active work in
`docs/TASKS.md` and a fresh pre-task gate passes at the current `main`
bio-baseline.
