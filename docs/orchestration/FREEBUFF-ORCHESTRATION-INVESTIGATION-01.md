# Freebuff Orchestration Investigation — Outcome Record

> **STATUS: CURRENT (INVESTIGATION OUTCOME) — RECORDED 2026-09-01**
>
> Persisted during `BATCH-DELIVERY-AND-ADMIN-AUDIT-01` (Analysis Gate). This
> record is evidence of a completed investigation; it does not itself
> authorize execution. Operating consequences are defined in
> [`../BATCH_DELIVERY_V1.md`](../BATCH_DELIVERY_V1.md).

## 1. Investigation summary

| Question | Finding |
|---|---|
| Are local `.agents` discoverable? | **YES** — local agent definitions under `.agents` are discoverable by the Freebuff host/runtime. |
| Was true `spawn_agents` available in the tested Freebuff CLI host/runtime? | **NO** — `spawn_agents` was **not available** in the tested Freebuff CLI host/runtime. |
| Did a custom orchestrator declaring `spawn_agents` work? | **NO** — a custom orchestrator that declared `spawn_agents` could **not** actually spawn child agents; the capability is not backed by the runtime. |
| Were multiple real Freebuff CLI processes tested? | **YES** — multiple real Freebuff CLI processes were started using **tmux** with **isolated git worktrees**. |
| Did process/worktree isolation work? | **YES** — separate processes and separate git worktrees were isolated from one another successfully. |
| Is true parallel execution of Freebuff workers on one account available? | **NO** — Freebuff enforced: **"Only one CLI per account can be active at a time."** |
| Can equivalent model/configuration retesting consume additional sessions? | **NO — do not retest without new evidence.** The constraint is a runtime/account property, not a configuration or model property. Do not burn additional sessions on re-testing this unless new evidence materially changes the constraint (new Freebuff release exposing a real `spawn_agents`, per-account parallel license change, or a runtime that supports true sub-agent spawning). |

## 2. Capability conclusion

**True parallel Freebuff workers on the same account are currently
unavailable.** Process-level isolation (tmux + git worktrees) works and
remains useful, but the "one active CLI per account" policy means those
processes cannot run as simultaneous Freebuff workers on the same account.

Consequences for this repository:

1. Orchestration must assume **one active Freebuff execution session** at a
   time.
2. Isolation (branches/worktrees) is an **isolation** mechanism, not a
   **parallelism** mechanism, for Freebuff workers on this account.
3. Independent tasks may still be executed **serially** in isolated
   contexts; their results may be integrated later into one batch.
4. Batch Delivery V1 (see [`../BATCH_DELIVERY_V1.md`](../BATCH_DELIVERY_V1.md))
   is built on this constraint: one session, serial execution, isolated task
   contexts, consolidated integration/CI/release lifecycle.

## 3. Evidence and reproducibility

- Investigation performed in the canonical Apex Home Fit repository session
  preceding this record (2026-08-31/2026-09-01 continuation work).
- Tested with real Freebuff CLI processes under tmux and isolated git
  worktrees; isolation confirmed per process.
- The CLI enforced the single-active-account policy directly at runtime.
- This document is the durable local record; the external AgentReports
  directory remains the configured home for full reports when available.

## 4. Retest policy (fail-closed)

- **NO** re-testing of equivalent model/configuration combinations.
- A re-test is justified only by **new evidence** that materially changes the
  constraint, e.g.:
  - a Freebuff release that exposes a functional `spawn_agents`; or
  - a documented per-account concurrency policy change.
- Any future re-test must be a separate, recorded investigation task — never
  a side experiment inside another task.