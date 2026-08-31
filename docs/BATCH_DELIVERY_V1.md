# Batch Delivery V1 — Operating Model

> **STATUS: AUTHORIZED — OPERATING MODEL (ADOPTED 2026-09-01)**
> via `GOVERNANCE-HARDENING-PROMOTION-01` (Owner authorization of the
> Batch Delivery V1 governance prerequisites).
>
> This document defines the operating model **only**. Adoption of the model
> does NOT authorize any task, batch, branch, CI run, or release: each
> batch still requires explicit Owner authorization in `docs/TASKS.md` (the
> only executable backlog). The first batch proposal remains listed there
> as PROPOSED pending batch-start authorization.
>
> Constraint basis: [`orchestration/FREEBUFF-ORCHESTRATION-INVESTIGATION-01.md`](orchestration/FREEBUFF-ORCHESTRATION-INVESTIGATION-01.md).

## 1. Approved operating direction (recorded)

- **One active Freebuff execution session** (runtime-enforced: "Only one CLI
  per account can be active at a time").
- **Multiple isolated task branches/worktrees** where useful — isolation is
  preserved even though parallelism is not.
- **Tasks may execute serially while remaining isolated.**
- **Successful independent task results may later be integrated into one
  batch.**
- **Prefer one batch-level integration validation, one Main CI cycle, and
  one Production release/acceptance** rather than repeating the complete
  lifecycle for every small independent task.
- **Failure of one independent task must not invalidate successful
  independent task work** — failed members are quarantined/reworked without
  re-running the whole batch lifecycle.
- **Existing Production safety, deployment gateway, rollback, reporting and
  fail-closed Governance requirements remain mandatory** — Batch Delivery
  never weakens them.
- **Batch Delivery must never reduce validation quality or permit unrelated
  changes into a release.**

## 2. Candidate classifications

| Class | Meaning | Allowed together in one batch |
|---|---|---|
| `PARALLEL_SAFE` | No shared files/segments; each result could be validated and integrated independently; no ordering constraint. | Yes — disjoint file sets, independent validation |
| `SEQUENTIAL` | Ordering or shared-surface constraint: must complete after (or before) another member (e.g. same layout/file, or consumer of another member's primitives). | Yes — with explicit order in the batch manifest |
| `ISOLATED` | Runs in its own worktree/branch touching only its own files; suitable for quarantine and late integration. | Yes — required worktree isolation; typically also `PARALLEL_SAFE` by files |

Rules:

- Members whose changes overlap the same files are `SEQUENTIAL`, not
  `PARALLEL_SAFE`; the batch manifest must state the order.
- A member that consumes another member's new primitives depends on it
  (`DEPENDENCIES` non-empty) and executes after it.
- Every batch member keeps its own validation evidence, so a failed member
  can be removed and re-executed without re-running the batch.
- After all members pass: ONE batch-level integration validation (merge all
  member branches/tree states into the batch integration branch), ONE Main
  CI cycle, ONE Production release + acceptance through the canonical
  Production Deployment Gateway.

## 3. Batch lifecycle (proposed — requires owner authorization)

```text
Owner authorizes batch in docs/TASKS.md
  → member tasks execute serially, each in its own worktree/branch (ISOLATED)
  → each member: narrow validation (typecheck/lint/unit/build, focused tests)
      member FAIL → quarantine → rework member serially → re-validate member
  → batch integration (one integration branch containing passing members only)
  → batch-level validation (integrated build + focused browser coverage)
  → branch CI on integration branch → PR / Main CI (ONE cycle)
  → Production release (ONE, via Deployment Gateway) + real-browser acceptance
  → Main CI pass on merged main → branch retirement → durable report
```

A batch may be **reduced** mid-flight (owner decision or failure quarantine):
the remaining members still deliver through the same consolidated lifecycle.

## 4. Safety invariants (non-negotiable)

1. Every member remains independently attributable (own scope, own tests,
   own evidence).
2. No member may change Production behavior outside its bounded scope.
3. The batch integration diff is reviewed as ONE unit before branch CI/PR.
4. No unrelated change rides along in a batch (each member's diff is
   member-scoped; integration is a pure merge).
5. `DB_CHANGED`, security boundary, deployment gateway, rollback, and
   fail-closed rules apply per member and to the batch as a whole.
6. The release contains every member's exact integrated source; rollback
   evidence is captured before cutover per the gateway contract.

## 5. First batch (proposed candidates)

Decomposition and per-member details (TASK_ID, EXECUTION_CLASS,
DEPENDENCIES, ISOLATION_REQUIREMENT, VALIDATION_REQUIREMENT,
PRODUCTION_IMPACT, WHY_BATCHABLE) are in
[`architecture/ADMIN-DESIGN-SYSTEM-AUDIT-01.md`](architecture/ADMIN-DESIGN-SYSTEM-AUDIT-01.md)
§8 and registered as PROPOSED in `docs/TASKS.md`.

> **Revision 2026-09-01 (POST-AUDIT-RATIONALIZATION-01):** Batch 1 stays
> `ADMIN-DS-01…04`. `ADMIN-DS-05` (fa/RTL) is REQUIRED remediation but
> deliberately NOT in Batch 1 (SEQUENTIAL; shares the admin root layout with
> ADMIN-DS-01). `MOBILE-READINESS-01` is an AUDIT with docs-only output and
> is NOT forced into Batch 1. Revised sequencing: Batch 1 →
> `MOBILE-READINESS-01` audit → Batch 2 (`ADMIN-DS-05` + `ADMIN-DS-06`
> KIT-FIRST doc reconciliation).
>
> **Revision 2026-09-01 (UI-CONFORMANCE-AND-REPORT-DELIVERY-GUARDRAILS-01):**
> Batch 1 membership is UNCHANGED, but a governance-hardening precursor
> (`GOVERNANCE-UI-GATE-01` + `GOVERNANCE-REPORT-DELIVERY-01`, one
> `CODE_NO_DEPLOY` lifecycle) is ordered BEFORE Batch 1, because every
> batch-member report must satisfy the new UI Conformance Gate and Report
> Delivery contract from day one. Those contracts also govern this document's
> own handoffs.

## 6. Relationship to existing policy

- Does NOT modify `docs/RELEASE_POLICY.md`, `docs/FEATURE_TO_PRODUCTION.md`,
  `docs/BRANCHING_POLICY.md`, `docs/PRODUCTION_DEPLOYMENT_GATEWAY.md`, or
  `docs/GOVERNANCE_RUNTIME.md`. It is an operating model layered on top of
  them; any policy delta required for batching is a separate owner-authorized
  proposal.
- Does NOT create a new backlog or parallel task store — final batch
  composition is always recorded in `docs/TASKS.md`.