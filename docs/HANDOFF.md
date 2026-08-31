# Operational Handoff

> **STATUS: CURRENT — SUPPORTING SNAPSHOT**
>
> This file supplies concise context for the next human or agent. It does not
> own policy, backlog, product direction, architecture status, or history.

## Current handoff

- Active task: **NONE**.
- Branch: `main`; `DOCUMENTATION-CONSOLIDATION-01` was integrated at
  `c80a1bb` and its task branch is retired.
- Production mutation authorized/performed: **NO**.
- Application behavior/source mutation: **NO**.
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
- Do not infer an administrator auth design from the public OTP implementation;
  the dedicated admin-auth direction is persisted but deliberately unimplemented.
- Do not infer a provider migration from the resilience evaluation need.

## Next transition

The next separately authorized task is `AUTH-PERF-01`. Start it only through
the normal pre-task gate from current remote `main`; its expected branch is
`fix/auth-perf-production-degradation`.
