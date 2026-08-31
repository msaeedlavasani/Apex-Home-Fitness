# Operational Handoff

> **STATUS: CURRENT — SUPPORTING SNAPSHOT**
>
> This file supplies concise context for the next human or agent. It does not
> own policy, backlog, product direction, architecture status, or history.

## Current handoff

- **ADMIN-CONSOLE-01 is CLOSED** (PRODUCTION_PASS). No active task.
- `AUTONOMOUS-PROD-OPS-01`, `ADMIN-AUTH-PROD-01`, `ADMIN-AUTH-01`,
  `DOCUMENTATION-CONSOLIDATION-01`, `AUTH-PERF-01` are closed; their task
  branches retired.
- Admin Console V1 (read-oriented Overview, Users, Workout Plans, Exercises,
  Operations, Admin/Sessions) integrated via **PR #13** (main `2d131fc`)
  and browser-acceptance spec via **PR #14** (main `e29d311`); Main CI PASS
  (runs `33419999889` and `33425058638`).
- Production now runs `apex-home-fit:release-2d131fc60453` from exact source
  `2d131fc60453…`, delivered through the Production Deployment Gateway with
  zero privilege elevation; DB unchanged (13 migrations, integrity `ok`);
  rollback verified; real-browser acceptance 14/14 PASS.
- Gateway (`sabtbrooker`) remains the canonical deployment path: socket-only
  client `/usr/local/bin/apex-deploy`, root-only proofs/audit; `apexadmin`
  holds `apexdeploy` plus standard `sudo`/`users` membership (no passwordless
  grant); direct sudo/Docker/`.env` all fail.
- Executable work and dependencies: [`TASKS.md`](TASKS.md).
- Machine-oriented state: [`CURRENT_STATE.md`](CURRENT_STATE.md).

## Stable operational context

- Current verified Production checkpoint: `ADMIN-CONSOLE-01`, source
  `2d131fc604531f8327446f1f36a5acf142f11d2a`, image
  `apex-home-fit:release-2d131fc60453` (ID `sha256:68ff5b32…`), 13 Prisma
  migrations, SQLite volume `apexhomefit_prod_db:/data`; authoritative
  evidence is in [`PRODUCTION_CHECKPOINTS.md`](PRODUCTION_CHECKPOINTS.md).
- Immediate rollback checkpoint: `AUTONOMOUS-PROD-OPS-01` post-hardening
  release, source `f2387cc3a5b8…`; app-level rollback compose evidence
  retained on the host (`compose.yml.rollback-adminconsole-01`, plus the
  prior gateway rollback snapshots).
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

`ADMIN-CONSOLE-01` reached CLOSED (2026-08-31). Admin Console V1 is live via
the Production Deployment Gateway, with a self-provisioning real-browser
acceptance spec in the full E2E suite (`tests/admin-console.spec.ts`). No
active task; the next authorized task must be explicitly promoted in
`docs/TASKS.md` before any implementation, with a fresh pre-task gate at the
current `main` baseline.
