# Task-by-Task Production Checkpoint Policy

This document is the **authoritative high-level release policy** for Apex Home
Fitness. The operational execution sequence lives in
[`FEATURE_TO_PRODUCTION.md`](FEATURE_TO_PRODUCTION.md); verified checkpoints
are recorded in [`PRODUCTION_CHECKPOINTS.md`](PRODUCTION_CHECKPOINTS.md); and
reusable incident lessons live in [`PITFALLS/`](PITFALLS/).

Every independently deployable task must pass, in order:

1. Source validation
2. Focused tests
3. Production build
4. Local runtime smoke
5. Production readiness
6. Production deployment
7. Production post-deploy smoke

A task is authoritative only after Production deployment and post-deploy smoke
pass. A dependent task must not begin before that checkpoint.

If deployment or post-deploy smoke fails, stop the next task and either fix
only the attributable task or roll back to the previous verified checkpoint.
Before any mutation, capture the current image, source/build marker,
configuration, environment shape, mounts, database identity, verified database
backup, and executable rollback procedure.

Intentionally incomplete work that cannot operate independently must be
explicitly classified as `NON_DEPLOYABLE` and grouped only with the minimum
inseparable work required for an atomic release.

Record every successful Production checkpoint with the source SHA, immutable
image ID, deployment time, database identity/hash, and mount topology. Never
deploy or migrate a database without explicit approval and a verified rollback
plan. For a newly authorized empty Production database, apply the checked-in
migrations explicitly before serving traffic; never copy a diagnostic fixture
into Production.

## Permanent release lifecycle

```
Task
→ Source / Focused Validation
→ Local Production Build / Runtime Smoke
→ Production Readiness
→ Backup / Rollback Prepared
→ Production Deploy
→ Production Post-Deploy Real-Browser Smoke
→ Production Checkpoint
→ Next Dependent Task
```

## Formal rules

### RULE 1 — TASK COMPLETION
A task is NOT complete merely because code was written, unit tests pass,
typecheck passes, `npm build` passes, Docker build passes, `curl` returns HTTP
200, the server responds, or local development mode works. An independently
deployable task becomes complete only after its Production checkpoint passes.

### RULE 2 — DEPENDENCY GATE
A dependent task MUST NOT begin until the previous independently deployable
task has `PRODUCTION_CHECKPOINT = PASS` (e.g. R6 before R7, R7 before R8). This
prevents downstream development from being built on a faulty Production
foundation.

### RULE 3 — ATOMIC RELEASE EXCEPTION
If a task is intentionally incomplete/non-deployable in isolation, do NOT fake
a Production checkpoint. Identify the minimum inseparable dependent task that
forms a deployable atomic release, record `ATOMIC_RELEASE_REQUIRED = YES` and
explain why. Do not silently bundle several tasks.

### RULE 4 — IMMUTABLE BUILD
Production releases are built from an exact source commit. Record
`SOURCE_COMMIT_FULL`, `IMAGE_TAG`, `IMAGE_ID`, and `NEXT_BUILD_ID` where
applicable. Prefer a clean source context (e.g. `git archive`). Do not allow
stale `.next`, `node_modules`, generated clients, temporary diagnostics,
uncommitted source, or old Docker build contexts to contaminate release
evidence.

### RULE 5 — BUILD-TIME CONFIG
For frameworks such as Next.js where `NEXT_PUBLIC_*` values can be compiled
into artifacts, runtime environment inspection is NOT sufficient. Release
validation must distinguish BUILD-TIME CONFIG from RUNTIME CONFIG. Never print
secret values; report state only where possible: `PRESENT_VALID` /
`PRESENT_EMPTY` / `ABSENT` / `INVALID`.

### RULE 6 — HTTP IS NOT BROWSER ACCEPTANCE
HTTP status alone is NOT sufficient acceptance for browser applications. A
route returning HTTP 200 may still crash during RSC rendering, fail during
hydration, throw client-side exceptions, render briefly then collapse, fail
after navigation, or fail due to stale/client artifact interaction. Production
acceptance must include a real browser for browser-facing features/releases.

### RULE 7 — REAL-BROWSER LISTENERS
For Production browser acceptance attach listeners BEFORE navigation:
`pageerror`, console errors, `requestfailed`, and HTTP >= 500 responses.
Capture requested route, initial status, final URL, rendered content evidence,
redirects, browser errors, failed requests, and server errors. Do not treat
HTTP 200 alone as PASS.

### RULE 8 — FRESH CONTEXT
Use fresh browser contexts (no previous cookies/session, no stale application
cache assumptions) for acceptance. Service Worker/cache-specific testing is
added only when current evidence makes it relevant; do not perform historical
cache archaeology by default.

### RULE 9 — DELAYED RECHECK
For high-risk browser releases, perform a second fresh-browser acceptance
after approximately 30–60 seconds to detect delayed hydration, transition,
cache, startup, or restart failures.

### RULE 10 — ROLLBACK BEFORE MUTATION
Before any Production mutation preserve: previous image identity, previous
container configuration, network, aliases, ports, mounts/volumes, restart
policy, environment shape, and executable rollback commands/script. Rollback
must be practical, not theoretical.

### RULE 11 — DATABASE INVARIANTS
Before/after deployment record relevant DB state: location/volume, integrity,
migration count, latest migration, schema expectations, and DB hash where
practical. If a task does not require DB changes, `DB_CHANGED` must remain
NO. Unexpected migration/schema requirements are a STOP condition unless
explicitly authorized.

### RULE 12 — STOP ON FAILURE
If a Production checkpoint fails, do NOT start the next dependent task. Either
fix only the failure attributable to the current task or roll back to the
previous verified Production checkpoint. Do not automatically begin broad
historical forensics.

### RULE 13 — PREVIOUS CHECKPOINT PRESERVATION
Do not immediately delete the previous verified image/container/rollback
artifact after a successful release. Retain it for a defined stabilization
period; cleanup is a separate maintenance task.
