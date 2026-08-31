# Operational Handoff

> **STATUS: CURRENT — SUPPORTING SNAPSHOT**
>
> This file supplies concise context for the next human or agent. It does not
> own policy, backlog, product direction, architecture status, or history.

## Current handoff

- Active task: **AUTONOMOUS-PROD-OPS-01** (`RELEASE`).
- `ADMIN-AUTH-PROD-01`, `ADMIN-AUTH-01`, `DOCUMENTATION-CONSOLIDATION-01`,
  `AUTH-PERF-01` are closed; their task branches retired.
- Source work for the active task merged to `main` via **PR #12**
  (`mainline-integration` commit `fde82c1a8fb3…`); task branch
  `feat/autonomous-prod-ops-01` retained (documented) until post-hardening
  proof completes; Main CI on the merge passed (run `33411342851`).
- Gateway installed and proven on host `sabtbrooker` (bootstrap,
  socket-only client, fail-closed live rejects, exact-main pre-hardening
  release PASS, rollback verified).
- Production now runs `apex-home-fit:release-fde82c1a8fb3` from exact source
  `fde82c1a8fb3…`, DB unchanged (13 migrations, integrity `ok`), `.env` and
  gateway proof files remain root-only.
- **Current phase: `HUMAN_CHECKPOINT: PRIVILEGE_REVOCATION_READY`** — legacy
  `apexadmin` NOPASSWD sudo and Docker-group membership are intentionally
  still present and must not be removed until Owner authorization of the
  proof-gated hardening step.
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

`AUTONOMOUS-PROD-OPS-01` stands at `HUMAN_CHECKPOINT:
PRIVILEGE_REVOCATION_READY`. The constrained root-owned Unix-socket gateway
has passed bootstrap, fail-closed, exact-main pre-hardening release, and
rollback proof — all through the unprivileged client with zero manual Owner
commands, while legacy `NOPASSWD: ALL` and Docker-group membership were
preserved. The next authorized step (separately gated) is to run the
proof-gated hardening script in `ops/deploy-gateway/harden-after-proof.sh` to
remove those two legacy privilege paths, authenticate a fresh unprivileged
session, and prove a `post-hardening` release plus rollback through the same
client. `ADMIN-CONSOLE-01` remains deferred and must not resume until the ops
task reaches CLOSED and is explicitly promoted.
