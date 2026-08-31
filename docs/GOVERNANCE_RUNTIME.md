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

`DOCS_DIRECT_MAIN` is currently a governed branch-lifecycle fast path, not a
runtime profile accepted by `governance-runtime.mjs`. Its authoritative
eligibility and exact-SHA Main CI contract live in `BRANCHING_POLICY.md`.
Machine enforcement may be added only through a separately authorized tooling
task; documentation-only work must not silently change executable tooling.

## Context receipt

A session may emit a secret-free JSON receipt containing `TASK_ID`,
`TASK_PROFILE`, `READ_FILES`, and a governance revision marker. The receipt
proves the context paths consumed, not human permission or production access.

## Report handoff

Reports validated by the runtime must expose the canonical lifecycle and
handoff fields defined by `docs/AI_CHANGE_TEMPLATE.md`. A report cannot claim
`TASK_STATUS=CLOSED` unless its current state is `CLOSED` and its next state is
`NONE`.

## Report contract extensions

Since 2026-09-01 (proposed, see
[`governance/UI-CONFORMANCE-GATE.md`](governance/UI-CONFORMANCE-GATE.md) and
[`governance/REPORT-DELIVERY-CONTRACT.md`](governance/REPORT-DELIVERY-CONTRACT.md)):

- Reports must declare `UI_CHANGED`, `UI_CONFORMANCE`, `UI_CONFORMANCE_DECISION`,
  `UI_CONFORMANCE_EVIDENCE` (UI conformance gate) and `REPORT_PERSISTED`,
  `REPORT_VALIDATED`, `REPORT_DELIVERED`, `REPORT_PATH`, `OWNER_REPORT_PATH`
  (report delivery contract).
- `report` fails closed when `UI_CHANGED=YES` lacks PASS + decision + an
  existing evidence file, when `REPORT_PERSISTED=YES` lacks an existing
  `REPORT_PATH` or `OWNER_REPORT_PATH`, or when `REPORT_DELIVERED=YES` is
  claimed without a persisted export in the **Owner report destination**
  (`OWNER_REPORT_PATH` must exist). The Owner-facing destination
  `/Users/msl/Documents/ApexHFAgentReports/` is change-protected by
  governance decision; repo-local `reports/` is temporary/runtime-only.
- `ui [TARGET]` (default `src`) statically enforces KIT-FIRST: no
  `@mui/material` imports outside the registered allowlist
  (`src/components/providers/MuiProvider.tsx`, `src/lib/ui/muiTheme.ts`) and
  no unregistered UI kit directories under `src/components/ui` (fails
  closed). Authorized exceptions are allowlist diffs reviewed by the Owner;
  there is no runtime escape hatch.

`npm run governance:check` now runs `docs` + `ui` scans. `governance:test`
covers the new contract fields and guards.

## CI

The normal CI build job runs governance validation, governance runtime tests,
and guardrail self-tests before the existing application checks. This is
repository enforcement only; external branch protection and owner-level
settings remain outside this task.
