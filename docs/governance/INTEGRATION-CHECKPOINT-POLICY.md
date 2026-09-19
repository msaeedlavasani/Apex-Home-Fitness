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
- `VERIFIED_SOURCE_SHA` — the product/source commit verified by local and
  task-scoped integration checks;
- `CHECKPOINT_EVIDENCE_SHA` — the existing commit that carries the recorded
  checkpoint evidence; evidence-only commits may sit above the known-good
  source commit and must not be presented as product verification;
- `AUTHORITATIVE_CI` — GitHub Actions `CI` PASS evidence tied to
  `KNOWN_GOOD_SHA` for both the branch push and the synchronized PR check,
  including provider, workflow, run IDs, URLs, statuses, and commit SHAs;
- `VERIFICATION_EVIDENCE` — one or more named checks, each with a command,
  `STATUS: PASS`, and a concise evidence summary;
- `WORKTREE_CLEAN: YES` and `LOCAL_REMOTE_PARITY: YES`;
- `DEPLOYMENT_IDENTITY: NOT_APPLICABLE` for integration checkpoints, or a
  machine-checked deployed SHA/build identity for deployment checkpoints.

The validator fails closed for missing evidence, non-existent SHAs, failed
checks, failed or mismatched authoritative CI, dirty/parity failures,
mismatched deployment identity, and malformed records. A later investigation
can therefore bound a regression against the latest `KNOWN_GOOD_SHA` without
relying on chat history.

The SHA relationship is explicit: `VERIFIED_SOURCE_SHA` identifies the
product candidate, `KNOWN_GOOD_SHA` identifies the candidate whose required
authoritative CI passed, and `CHECKPOINT_EVIDENCE_SHA` identifies the commit
that records the PASS result. A later evidence-only commit may be above the
known-good candidate; it does not silently change the product baseline, but it
must receive its own applicable verification before it can become `CURRENT_HEAD`.

The authoritative branch/PR workflow checks out complete Git history because
the validator must be able to prove that all recorded SHAs are real commits.
Neither branch-only nor PR-only success satisfies a complete-flow checkpoint.

## Failure and continuation semantics

An unsatisfied or failed checkpoint, including missing or failing
authoritative CI, blocks every downstream DAG node that
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
gateway and `RELEASE_POLICY.md` remain authoritative for Production. The Owner
has explicitly authorized Workout V2 Beta deployment in
`OWNER_DECISION_GATE.md`, but that decision does not create a deployment path.
The repository currently has no Beta workflow, GitHub environment, target
mapping, or gateway allowlist. The existing gateway is Production-only and
requires authoritative `main` plus the Production compose/volume topology.
The canonical Beta capability and deployment checkpoint therefore remain
blocked until a compatible Beta path is established and machine-verified.
Production remains unauthorized.
