# Integration Checkpoint Policy

> **STATUS: CURRENT — PERMANENT AUTONOMOUS EXECUTION POLICY**

This document defines the repository-wide machine checkpoint contract between
task close-out and downstream autonomous continuation. It extends the existing
admission/DAG/runtime authority; it is not a scheduler and does not authorize
deployment or product work.

## Purpose and authority boundary

Task-scoped verification proves that an admitted work package satisfies its
own scope. It does not prove that the integrated repository is healthy.
Integration checkpoints provide that second boundary at meaningful convergence
or deployable milestones. The canonical loop is:

```text
READY_DERIVED → ADMISSION → EXECUTION → TASK VERIFICATION
→ LIFECYCLE/CAPABILITY CLOSE-OUT → INTEGRATION CHECKPOINT (when required)
→ KNOWN_GOOD_BASELINE → DAG RECALCULATION → AUTONOMOUS CONTINUATION
```

Deployment checkpoints are a separate, stronger boundary:

```text
INTEGRATION CHECKPOINT → AUTHORIZED DEPLOYMENT CHECKPOINT
→ DEPLOYED_KNOWN_GOOD_BASELINE → downstream human/release gate
```

`docs/TASKS.md` remains the only executable backlog. Checkpoint nodes are
canonical DAG gates, not tasks that an Owner or agent manually schedules.
Human gates remain explicit and downstream; checkpoints never insert per-task
visual approval.

## When a checkpoint is required

A checkpoint is required when one or more of these architectural conditions
hold:

- multiple work packages converge into an integrated user-facing flow;
- a milestone changes reusable contracts, orchestration, topology, or cross-
  cutting runtime behavior;
- a downstream human/release gate would otherwise review an unverified
  integrated system; or
- a deployment boundary is reached and deployment authority is explicitly
  present.

There is no elapsed-task-count rule. The checkpoint's canonical DAG node owns
the required evidence path and the downstream node depends on that gate.

## Evidence contract

Each PASS record is a JSON object validated by
`node scripts/governance-runtime.mjs checkpoint <record>` and contains:

- `CHECKPOINT_ID` — stable canonical identity;
- `CHECKPOINT_KIND` — `INTEGRATION` or `DEPLOYMENT`;
- `STATUS` — only `PASS` can satisfy a gate;
- `KNOWN_GOOD_SHA` — the exact full commit SHA verified by the checkpoint;
- `VERIFICATION_EVIDENCE` — one or more named checks, each with a command,
  `STATUS: PASS`, and a concise evidence summary;
- `WORKTREE_CLEAN: YES` and `LOCAL_REMOTE_PARITY: YES`;
- `DEPLOYMENT_IDENTITY: NOT_APPLICABLE` for integration checkpoints, or a
  machine-checked deployed SHA/build identity for deployment checkpoints.

The validator fails closed for missing evidence, non-existent SHAs, failed
checks, dirty/parity failures, mismatched deployment identity, and malformed
records. A later investigation can therefore bound a regression against the
latest `KNOWN_GOOD_SHA` without relying on chat history.

## Failure and continuation semantics

An unsatisfied or failed checkpoint blocks every downstream DAG node that
depends on it. The executor may diagnose and repair technical failures within
existing authority, then rerun the checkpoint. `OWNER_DECISION_REQUIRED` is
reserved for a genuine product, architecture, deployment-authority, or human
acceptance decision; a technical checkpoint failure alone is not an Owner
decision.

On PASS, the evidence record is persisted, the checkpoint node is CLOSED/FROZEN
by canonical state, and the selector recalculates readiness in the same
completion cycle.

## Deployment authority

This policy does not infer deployment permission. The existing Production
gateway and `RELEASE_POLICY.md` remain authoritative for Production. No
canonical Beta deployment authority exists in the current repository; Beta
deployment checkpoints therefore remain `NOT_AUTHORIZED` until explicit
authority is added to the canonical governance/backlog path.
