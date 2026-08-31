# Operational Handoff

> **STATUS: CURRENT — SUPPORTING SNAPSHOT**
>
> This file supplies concise context for the next human or agent. It does not
> own policy, backlog, product direction, architecture status, or history.

## Current handoff

- Active task: **AUTONOMOUS-PROD-OPS-01** (`RELEASE`).
- Branch: `feat/autonomous-prod-ops-01`, based on `origin/main` at `2601961`.
- `ADMIN-AUTH-PROD-01`, `ADMIN-AUTH-01`, `DOCUMENTATION-CONSOLIDATION-01`, and
  `AUTH-PERF-01` are closed; their task branches are retired
  (`fix/admin-auth-sameorigin-01`, `feat/admin-auth-01`).
- Production mutation authorized/performed: **YES for ADMIN-AUTH-PROD-01**
  (Admin Auth migration applied + image-only app switch on the preserved
  `apexhomefit_prod_db` volume; nothing else).
- Application behavior/source mutation: **ADMIN-AUTH-01 + PR #11 fixes only**;
  public OTP behavior was not changed.
- Executable work and dependencies: [`TASKS.md`](TASKS.md).
- Machine-oriented state: [`CURRENT_STATE.md`](CURRENT_STATE.md).

## Stable operational context

- Current verified Production checkpoint: `ADMIN-AUTH-PROD-01`, source
  `3cf9cb6`, image `apex-home-fit:adminauth-3cf9cb6` (ID
  `sha256:dec85f49…fe0e`), 13 Prisma migrations, SQLite volume
  `apexhomefit_prod_db:/data`; authoritative evidence is in
  [`PRODUCTION_CHECKPOINTS.md`](PRODUCTION_CHECKPOINTS.md).
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

`AUTONOMOUS-PROD-OPS-01` is active. The constrained root-owned Unix-socket
gateway must pass pre-hardening release and rollback proof before unrestricted
sudo/Docker access is removed, then pass a second release from a freshly
authenticated unprivileged session. `ADMIN-CONSOLE-01` remains deferred and
must not resume until the ops task reaches CLOSED and is explicitly promoted.
