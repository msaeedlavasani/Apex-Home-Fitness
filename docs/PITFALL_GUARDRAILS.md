# Executable Delivery Guardrails

## Purpose

Pitfalls that can be checked are connected to a repository-native check and a blocked lifecycle transition. This document is the policy layer; `scripts/guardrail-check.mjs` is the executable manifest gate.

## Pitfall → guardrail registry

| Pitfall / risk | Check ID | Pass condition | Blocks |
|---|---|---|---|
| Next.js public config drift | `BUILD_CONFIG_PREFLIGHT` | All required `NEXT_PUBLIC_*_PRESENT` fields are true and `BUILD_TIME_PUBLIC_CONFIG_CHECK=PASS` | artifact acceptance |
| Stale/ambiguous immutable build | `ARTIFACT_IDENTITY_CHECK` | source SHA, image tag, image ID, timestamp and build mode are present | release manifest |
| Architecture mismatch | `IMAGE_ARCH_CHECK` | `IMAGE_ARCHITECTURE=linux/amd64` | Production readiness |
| Runtime/public secret boundary | `SECRET_BOUNDARY_CHECK` | check is PASS and no secret variable/value appears in manifest | release manifest |
| DB replacement risk | `DB_VOLUME_PRESERVATION_CHECK` | approved persistent volume is recorded and check is PASS | Production preflight |
| Missing rollback | `ROLLBACK_READINESS_CHECK` | rollback image/config evidence is present and PASS | Production mutation |
| HTTP-only acceptance | `BROWSER_ACCEPTANCE_GATE` | applicable real-browser acceptance is PASS | Production checkpoint |
| Uncorrelated auth/log failure | `LOG_ACCEPTANCE_CHECK` | browser/network and server-log acceptance are PASS | auth closure |
| Protected deployment state / unsafe transfer | `TRANSFER_PATH_CHECK` | temporary artifact uses a writable temporary path; protected config remains protected | transfer/deploy |
| Local/VPS context confusion | `EXECUTION_CONTEXT_CHECK` | target context/hostname is verified before path-sensitive operations | privileged operation |
| Docker privilege expansion | `DOCKER_ACCESS_CHECK` | access is limited to the actual deployment operator | access bootstrap |
| Missing mandatory incident evidence | `REPORT_HANDOFF_CHECK` | report exposes current/next state and blocker fields on every termination path | state transition |

## Release manifest contract

Production-bound release manifests must be secret-free JSON and contain the fields in `scripts/release-manifest.example.json`, including source/image identity, architecture, build-time public configuration presence, runtime contract status, secret boundary, DB volume preservation, port binding, local acceptance, rollback evidence, migration status, Production preflight/deployment/runtime/browser/log acceptance, and `PRODUCTION_BOUND=true`. Only presence/status/fingerprint evidence is allowed; never record secret values.

`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, and `NEXT_PUBLIC_SITE_URL` are build-time public inputs where applicable. `SUPABASE_SERVICE_ROLE_KEY`, `SMS_IR_API_KEY`, database credentials, tokens, and private keys are runtime/server secrets and must never become public build args or manifest content.

## Canonical state machine

```text
TASK_ACCEPTED
→ PREFLIGHT_PASS
→ IMPLEMENTED
→ STATIC_VALIDATION_PASS
→ TARGETED_TESTS_PASS
→ LOCAL_PROD_BUILD_PASS
→ LOCAL_PROD_ACCEPTANCE_PASS
→ RELEASE_MANIFEST_PASS
→ PRODUCTION_PREFLIGHT_PASS
→ PRODUCTION_DEPLOYED
→ PRODUCTION_RUNTIME_PASS
→ PRODUCTION_BROWSER_ACCEPTANCE_PASS
→ PRODUCTION_CHECKPOINTED
→ MAIN_INTEGRATED
→ MAIN_CI_PASS
→ BRANCH_RETIRED
→ CLOSED
```

Each deterministic transition is `AUTO`. A failed applicable check is `BLOCKED`. A material product, architecture, security, destructive-data, cost, or scope choice is `HUMAN_GATE`; it must expose `HUMAN_DECISION_REQUIRED=YES`, the precise decision, options, impacts, and recommendation. Docs-only tasks use `node scripts/guardrail-check.mjs <manifest> --docs-only` and do not require Production transitions.

## WIP and deployment-debt control

`MAX_UNCLOSED_PRODUCTION_BOUND_TASKS = 1`. A new Production-bound lifecycle must not be accepted while another is open, unless an explicit material decision documents isolation and why parallel work cannot be mistaken for release readiness. Reports must expose `PRODUCTION_VERIFIED_SHA`, `CURRENT_MAIN_SHA`, `UNDEPLOYED_PRODUCTION_BOUND_COMMITS`, and `OPEN_RELEASE_LIFECYCLES`.

## Definition of Done

A Production-bound task is CLOSED only when implementation, validation, exact artifact identity, local Production acceptance, Production preflight, deployment, runtime/browser/log/DB acceptance, checkpoint, main integration, Main CI, branch retirement, and mandatory report all PASS. `CODE_COMPLETE=YES` alone is never CLOSED. Docs-only tasks close after docs validation, applicable CI, remote verification, branch retirement, and report completion.

## Autonomous agent and handoff contract

Routine deterministic transitions are autonomous; reports are evidence/state artifacts, not permission requests. Every report exposes:

```text
TASK_ID
TASK_TYPE
SOURCE_SHA
CURRENT_STATE
NEXT_STATE
NEXT_ACTION
NEXT_ACTION_AUTONOMOUS
HUMAN_DECISION_REQUIRED
BLOCKER
PRODUCTION_BOUND
PRODUCTION_DEPLOYED
PRODUCTION_ACCEPTANCE
MAIN_INTEGRATED
MAIN_CI
BRANCH_RETIRED
TASK_STATUS
```

When `NEXT_ACTION_AUTONOMOUS=YES`, orchestration continues. When `HUMAN_DECISION_REQUIRED=YES`, orchestration stops for the exact decision. Session boundaries are not workflow boundaries: state must be reconstructable from Git, CI, Release Manifest, Production checkpoint, and AgentReport. `REPORT_REQUIRED_ON_ALL_TERMINATION_PATHS=YES`.

## Self-test matrix

`npm run guardrail:test` covers valid manifests, missing public build config, artifact identity mismatch, wrong architecture, missing rollback evidence, docs-only behavior, secret rejection, and autonomous transition fields. No Production mutation is used by these tests.
