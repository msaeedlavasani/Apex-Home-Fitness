# Feature → Production — Operational Runbook

Rules live in [`RELEASE_POLICY.md`](RELEASE_POLICY.md). This document is the
exact execution sequence for taking an independently deployable task from
definition to a verified Production checkpoint.

Verified checkpoints are recorded in
[`PRODUCTION_CHECKPOINTS.md`](PRODUCTION_CHECKPOINTS.md). Reusable incident
lessons live in [`PITFALLS/`](PITFALLS/).

**Before starting any dependent development task, read `RELEASE_POLICY.md` and
`PRODUCTION_CHECKPOINTS.md` first.**

---

## A. DEFINE TASK

- Task ID/name
- Scope (exactly what will and will not change)
- Dependencies (previous task must already be `PRODUCTION_CHECKPOINT = PASS`)
- Explicit exclusions
- Expected runtime/UI/DB impact
- Independently deployable? `YES` / `NO` (if `NO`, see Rule 3 — atomic release)

## B. RECONSTRUCT CURRENT STATE

When modifying an existing system:

- Inspect the current implementation first.
- Inspect the relevant historical implementation only as a reference.
- Classify every historical change:
  `REUSE_AS_IS` · `ADAPT` · `OBSOLETE` · `LATER_TASK` · `UNSAFE/UNRELATED`

Historical commits are references, not automatic cherry-pick targets. Never
blindly import unrelated historical changes.

## C. IMPLEMENT MINIMUM TASK

- Smallest coherent change
- No unrelated refactors
- Preserve existing behavior
- Maintain canonical domain models (e.g. canonical Exercise identity: `id` /
  `slug` / `faName` — never regress to display-name identity)
- No future-task leakage (do not implement later tasks inside this one)

## D. FOCUSED VALIDATION

Start cheap and targeted, escalate only as needed:

```
static checks
→ unit / focused tests
→ integration / contract tests
→ production build
→ targeted browser / E2E
```

Do not repeatedly run expensive full E2E suites after every small edit.

## E. SOURCE CHECKPOINT

- Clean worktree containing only intentional task changes
- Task-only commit with a clear message
- Record the FULL commit SHA
- No temporary diagnostics in the release commit
- No unrelated documentation noise where avoidable

## F. CLEAN PRODUCTION BUILD

- Build the exact committed SHA from a clean source context
  (e.g. `git archive <SHA> | tar -x -C <dir>`)
- No stale `.next`, `node_modules`, generated Prisma client, or old Docker
  build context
- Use the project lockfile and the established npm registry
  (`https://package-mirror.liara.ir/repository/npm/` for Iranian deployments)
- Preserve the known Production `NEXT_PUBLIC_*` build configuration without
  printing secret values
- Record immutable identity: `IMAGE_TAG`, `IMAGE_ID`, `NEXT_BUILD_ID`
- Verify build-time config (Rule 5) — runtime env inspection is NOT sufficient
  for `NEXT_PUBLIC_*` values compiled into the artifact

## G. LOCAL PRODUCTION-MODE GATE

- Run the exact release artifact locally in Production mode (not dev mode)
- Use a fresh/qualified 12-migration DB copy; never the Production DB
- For browser-facing changes, run a real-browser smoke (fresh context,
  listeners before navigation — see Pitfall 2)

## H. PRODUCTION READINESS

Read-only Production inspection before any mutation:

- Current verified checkpoint (from `PRODUCTION_CHECKPOINTS.md`)
- Running image / container / network / alias / ports / restart policy
- DB volume, `DATABASE_URL` shape, integrity, migration count, latest
  migration, DB hash
- Environment variable NAMES (never values)
- Restart count

Ensure Production has not drifted unexpectedly.

## I. ROLLBACK PREPARATION

Prepare rollback BEFORE mutation (Rule 10):

- Previous image identity (tag it, e.g. `<name>:rollback-<timestamp>`)
- Previous container full config snapshot
- Network / alias / ports / mounts / restart policy / env shape
- Executable rollback script (stop/rm new container, restore previous
  container, start)
- DB volume identity + DB hash

Rollback must be practical, not theoretical.

## J. CONTROLLED DEPLOYMENT

- Transfer the exact locally validated immutable artifact
  (`docker save | gzip | ssh <host> 'gunzip | docker load'`)
- **Verify the remote loaded image ID equals the locally validated image ID**
- Preserve topology unless changing it is explicitly part of the task
- Preserve previous container (rename, do not delete) until stabilization

## K. PRODUCTION ACCEPTANCE

- Fresh browser context, listeners BEFORE navigation (`pageerror`, console
  errors, `requestfailed`, >= 500 responses)
- Test the full route matrix relevant to the release
- HTTP-only smoke is insufficient for browser-facing releases (Rule 6)

## L. DELAYED ACCEPTANCE

- Wait approximately 30–60 seconds, then repeat the fresh-browser matrix once
- Catches delayed hydration / transition / cache / startup / restart failures

## M. INFRASTRUCTURE / DB SANITY

Verify after acceptance:

- Container running, restart count 0/stable
- Proxy health (no 502)
- DB invariants unchanged: integrity `ok`, migration count and latest
  migration unchanged (unless the task explicitly includes a migration)
- DB hash unchanged when the task must not modify the DB (`DB_CHANGED = NO`)
- Expected data preservation

## N. PRODUCTION CHECKPOINT

Record in `PRODUCTION_CHECKPOINTS.md`:

```
TASK
SOURCE_COMMIT
IMAGE_TAG
IMAGE_ID
BUILD_ID
DEPLOY_TIME
DB_STATE
ROLLBACK_REFERENCE
BROWSER_ACCEPTANCE
FINAL_STATUS
```

Only after `PRODUCTION_CHECKPOINT = PASS` may dependent work begin. Then stop
for Owner review before the next dependent task (Rule 2 / Rule 12).
