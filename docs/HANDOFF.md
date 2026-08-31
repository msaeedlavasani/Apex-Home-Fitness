# Operational Handoff

> **STATUS: CURRENT — SUPPORTING SNAPSHOT**
>
> This file supplies concise context for the next human or agent. It does not
> own policy, backlog, product direction, architecture status, or history.

## Current handoff

- Active task: **NONE**.
- Branch: `main` at integrated commit `9339317`.
- `ADMIN-AUTH-01`, `DOCUMENTATION-CONSOLIDATION-01`, and `AUTH-PERF-01` are
  closed; their task branches are retired.
- Production mutation authorized/performed: **NO** for ADMIN-AUTH-01.
- Application behavior/source mutation: **ADMIN-AUTH-01 only**; public OTP
  behavior was not changed.
- Executable work and dependencies: [`TASKS.md`](TASKS.md).
- Machine-oriented state: [`CURRENT_STATE.md`](CURRENT_STATE.md).

## Stable operational context

- Current verified Production checkpoint: `AUTH-FIX-01`, source `ce91a4f`, 12
  Prisma migrations, SQLite volume `apexhomefit_prod_db:/data`; authoritative
  evidence is in [`PRODUCTION_CHECKPOINTS.md`](PRODUCTION_CHECKPOINTS.md).
- Immediate rollback checkpoint: `R6`, source `aee28d1`.
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

`ADMIN-AUTH-01` is closed. Its accepted architecture, security boundary, and
explicit Passkey/WebAuthn deferral remain owned by [`ADMIN_AUTH.md`](ADMIN_AUTH.md)
and ADR-0004. No next executable task is currently authorized; a future task
must be promoted in `TASKS.md` with explicit scope, dependencies, profile,
acceptance, and any Production classification before execution.
