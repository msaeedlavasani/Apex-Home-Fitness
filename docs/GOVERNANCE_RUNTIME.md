# Governance Runtime

> **STATUS: CURRENT — SUPPORTING EXECUTION CONTRACT**
>
> Canonical authority remains `AGENTS.md`, `docs/INDEX.md`, and
> `docs/governance/DOCUMENTATION-GOVERNANCE.md`. This document describes how
> repository tooling consumes those contracts; it does not redefine policy.

`docs/TASKS.md` is the only executable backlog. Runtime validation does not
promote advisory/deferred items into work. Decision Persistence remains a
documentation-governance requirement even when tooling cannot infer the
semantic owner of a decision.

## Runtime checks

Use the existing package scripts:

```bash
npm run governance:check
npm run governance:test
npm run guardrail:test
```

`scripts/governance-runtime.mjs` validates known task profiles, governance
context receipts, lifecycle/report fields, terminal-state consistency, and the
canonical documentation route. Unknown profiles, missing receipt files,
invalid states, and inconsistent closed reports fail closed.

## Profiles

Supported profiles are `DOCS_ONLY`, `CODE_NO_DEPLOY`, `PRODUCTION_BOUND`,
`INCIDENT`, `AUDIT`, `RELEASE`, `HOTFIX`, and `DB_CHANGE`. Profiles resolve the
minimum authoritative documents needed for the task; they do not copy policy
prose into prompts.

## Context receipt

A session may emit a secret-free JSON receipt containing `TASK_ID`,
`TASK_PROFILE`, `READ_FILES`, and a governance revision marker. The receipt
proves the context paths consumed, not human permission or production access.

## Report handoff

Reports validated by the runtime must expose the canonical lifecycle and
handoff fields defined by `docs/AI_CHANGE_TEMPLATE.md`. A report cannot claim
`TASK_STATUS=CLOSED` unless its current state is `CLOSED` and its next state is
`NONE`.

## CI

The normal CI build job runs governance validation, governance runtime tests,
and guardrail self-tests before the existing application checks. This is
repository enforcement only; external branch protection and owner-level
settings remain outside this task.
