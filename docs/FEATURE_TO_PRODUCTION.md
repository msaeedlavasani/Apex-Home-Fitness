# Feature → Production — Operational Runbook

Rules live in [`RELEASE_POLICY.md`](RELEASE_POLICY.md). This document is the
exact execution sequence for taking an independently deployable task from
definition to a verified Production checkpoint.

Verified checkpoints are recorded in
[`PRODUCTION_CHECKPOINTS.md`](PRODUCTION_CHECKPOINTS.md). Branch lifecycle
rules live in [`BRANCHING_POLICY.md`](BRANCHING_POLICY.md). Reusable incident
lessons live in [`PITFALLS/`](PITFALLS/).

**Before starting any dependent development task, read `RELEASE_POLICY.md`,
`BRANCHING_POLICY.md` and `CURRENT_STATE.md` first.**

## Task status / closure model

Lifecycle: `PLANNED → ACTIVE → SOURCE_VALIDATED → BRANCH_CI_PASS →
READY_FOR_PRODUCTION → DEPLOYED → PRODUCTION_PASS → MAINLINE_INTEGRATED →
CLOSED` (terminal/exceptional: `BLOCKED`, `ROLLED_BACK`).

**`PRODUCTION_PASS != CLOSED`.** A task is CLOSED only after: Production
checkpoint PASS + recorded + branch integrated into main + remote main
verified + completed branch retired (or documented retention). Then the Owner
authorizes the next task, which branches from fresh main (pre-task mainline
gate — see BRANCHING_POLICY).

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
  printing secret values. Before building, require non-empty build args for
  `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, and
  `NEXT_PUBLIC_SITE_URL` where applicable; fail/stop the release if required
  args are empty.
- Keep build-time public config separate from runtime server config/secrets;
  never pass `SUPABASE_SERVICE_ROLE_KEY`, `SMS_IR_API_KEY`, or other secrets as
  public build args.
- Record immutable identity: `IMAGE_TAG`, `IMAGE_ID`, `NEXT_BUILD_ID`, and
  architecture.
- Verify build-time config (Rule 5) — runtime env inspection is NOT sufficient
  for `NEXT_PUBLIC_*` values compiled into the artifact. Include the relevant
  real-browser feature flow before Production acceptance.

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

- Transfer the exact locally validated immutable artifact using a writable
  temporary path such as `/tmp` when SCP is required
  (`docker save | gzip | ssh <host> 'gunzip | docker load'`). Do not broaden
  protected deployment-directory or `.env` permissions merely for transfer.
- **Verify the remote loaded image ID equals the locally validated image ID**
- **SQLite volume ownership:** the runner image runs as `nextjs` (uid 100).
  If the DB volume was (re)created by a root process, restore ownership so
  the app can write — e.g. `docker run --rm -v <volume>:/data alpine chown -R
  100:101 /data` (compose's `migrate` service does this automatically). The
  image's startup preflight (`scripts/preflight-db.mjs`) fails fast with an
  actionable message if the volume is not writable. A read-only volume makes
  every DB write (OTP ledger, user sync, program save) fail while HTTP smoke
  stays green — see `docs/PITFALLS/`.
- Preserve topology unless changing it is explicitly part of the task
- Preserve previous container (rename, do not delete) until stabilization
- Change only the application image reference for an artifact-only release;
  recreate only the application service and preserve the DB volume.

## K. PRODUCTION ACCEPTANCE

- Fresh browser context, listeners BEFORE navigation (`pageerror`, console
  errors, `requestfailed`, >= 500 responses)
- Test the full route matrix relevant to the release
- HTTP-only smoke is insufficient for browser-facing releases (Rule 6)
- Correlate browser/network outcomes with server logs; no crash does not prove
  authentication/session establishment succeeded.
- If the Playwright package exists but its browser executable is unavailable,
  classify this as a test-harness/execution-environment blocker, not an
  application failure; record it and use approved manual acceptance if needed.

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

## O. MAINLINE INTEGRATION AND CLOSURE

After the Production checkpoint passes and the Owner authorizes integration:

1. Re-fetch remote `main`; re-audit divergence (Rule G — divergence gate).
2. Integrate the completed branch into `main` (merge commit when divergent;
   no force, no history rewrite, no squashing verified checkpoint lineage).
3. Push `main`; require the normal main CI triggered by the push to PASS.
4. Verify remote `main` contains the required commits (ancestry proof).
5. Retire the completed branch (remote + local) ONLY after ancestry proof and
   main CI PASS. Keep Production rollback artifacts (Rule 13).
6. Update `CURRENT_STATE.md` (minimal docs-only commit on main when needed).
7. `TASK = CLOSED` → Owner authorizes the next task from fresh main.

## P. FEATURE ACCEPTANCE CONTRACTS

Acceptance classes (see RELEASE_POLICY Rule 15):

- **ROUTE_ACCEPTANCE** — HTTP 200 (transport only; never sufficient alone).
- **SYSTEM_ACCEPTANCE** — real-browser render without errors (fresh context,
  listeners before navigation, no Application/RSC errors, no 5xx).
- **FEATURE_ACCEPTANCE** — the actual user capability works end-to-end in
  Production.

For user-visible business features the Production checkpoint MUST test the
actual capability, not merely the page's existence.

Any task with `UI_CHANGED = YES` MUST satisfy the
[UI Conformance Gate](governance/UI-CONFORMANCE-GATE.md) before acceptance:
functional correctness alone is NOT sufficient for UI-changing work. The
report must carry `UI_CONFORMANCE=PASS`, a `REUSE`/`EXTEND`/`AUTHORIZED_PARALLEL`
decision, and an evidence file; the runtime (`governance-runtime.mjs report`
and `ui`) enforces the machine-checkable parts.

## Q. AUTH FEATURE ACCEPTANCE CONTRACT

Mock-OTP CI coverage is useful but NOT sufficient to declare Production login
working. A real Production login task must prove the authorized real journey:

```
REQUEST_OTP
→ RECEIVE/VERIFY_OTP
→ AUTHENTICATED_SESSION_CREATED
→ PROTECTED_ROUTE_ACCESS
→ REFRESH OR FRESH NAVIGATION RETAINS VALID SESSION
→ LOGOUT
→ PROTECTED_ROUTE BLOCKED/REDIRECTED AGAIN
```

Where provider restrictions require a trusted test identity, use only an
explicitly authorized test account/number. Never print OTP values, auth
tokens, cookies, secrets, or provider credentials. For AUTH-FIX-01, CI PASS
alone is NOT sufficient; real Production feature acceptance is mandatory.

## R. DATABASE MIGRATION VALIDATION

DB-changing tasks must pass BOTH gates (RELEASE_POLICY Rule 11):

- **FRESH DATABASE GATE** — full migration chain from empty DB.
- **UPGRADE PATH GATE** — current verified checkpoint state + pending
  migration(s) only.

Never edit an already-applied migration (checksum drift breaks `migrate
deploy`); add a new migration instead. Tasks with `DB_CHANGED = NO` treat any
migration/schema change as a STOP condition.

## S. HOTFIX / EMERGENCY

See `docs/BRANCHING_POLICY.md` — hotfix section. `EMERGENCY_OVERRIDE = YES`,
`OWNER_AUTHORIZED = YES`, `REASON = …`, smallest fix, focused CI, immutable
build, rollback, deploy, real acceptance, checkpoint, immediate merge-back,
verify remote main, retire hotfix branch, incident report.

## T. SOURCE-CHANGE ACCOUNTING

Reports and checkpoints MUST distinguish four independent facts:

```
APPLICATION_SOURCE_CHANGED     — did the code tree change? (YES even for
                                 compile-time/type-only changes)
RUNTIME_BEHAVIOR_CHANGED       — is an intended runtime behavior change?
PRODUCTION_SOURCE_CHANGED      — did the source OF THE PRODUCTION ARTIFACT
                                 change?
PRODUCTION_MUTATED             — was Production itself modified?
```

A compile-time/type-only source change (e.g. aligning a contract field to a
branded identity type) is `APPLICATION_SOURCE_CHANGED = YES` even when
`RUNTIME_BEHAVIOR_CHANGED = NO`. Never report `SOURCE_CHANGED = NO` merely
because the intended runtime behavior is unchanged.

Reference classification for the Governance v2 merge resolution:

```
APPLICATION_SOURCE_CHANGED: YES — merge-resolution/type-level canonical
                            identity alignment (SessionExercise.exerciseId/
                            slug → branded ExerciseId/ExerciseSlug)
RUNTIME_BEHAVIOR_CHANGED:  NO intended runtime behavior change
PRODUCTION_SOURCE_CHANGED: NO
PRODUCTION_MUTATED:        NO
```
