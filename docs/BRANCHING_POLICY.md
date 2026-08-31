# Branch Lifecycle Policy

Supporting rules for how task branches are created, integrated, and retired.
The canonical authority precedence and lifecycle/report terminology are owned
by `docs/governance/DOCUMENTATION-GOVERNANCE.md` and `docs/RELEASE_POLICY.md`. Rules live in [`RELEASE_POLICY.md`](RELEASE_POLICY.md); the execution
sequence lives in [`FEATURE_TO_PRODUCTION.md`](FEATURE_TO_PRODUCTION.md); the
verified checkpoint ledger is in [`PRODUCTION_CHECKPOINTS.md`](PRODUCTION_CHECKPOINTS.md);
the current operational state is in [`CURRENT_STATE.md`](CURRENT_STATE.md).

## A. TASK BRANCHES ARE EPHEMERAL

Feature/fix/recovery/refactor branches are implementation vehicles, not
permanent development trunks. Every task branch must be integrated into `main`
and retired when its work is complete (see Closure below).

## B. NEXT TASK MAY NOT START UNTIL PREVIOUS TASK IS CLOSED

A previous independently deployable task is **CLOSED** only when ALL hold:

- `PRODUCTION_CHECKPOINT = PASS`
- checkpoint recorded in `PRODUCTION_CHECKPOINTS.md`
- branch integrated into `main`
- remote `main` verified (all required commits are ancestors of remote main)
- completed branch retired, or explicitly retained with a documented reason

## C. PRE-TASK MAINLINE GATE

Before changing application source for a new task, resolve the ACTUAL remote
state dynamically (Git is authoritative for current HEAD — `CURRENT_STATE.md`
is not) and record:

```
git fetch <authoritative-remote> main
ACTUAL_REMOTE_MAIN_HEAD=<resolved SHA>
CURRENT_VERIFIED_PRODUCTION_CHECKPOINT
CURRENT_MAINLINE_BASELINE_COMMIT        (from CURRENT_STATE.md)
MAINLINE_CLASSIFICATION                 (see below)
PREVIOUS_COMPLETED_BRANCH
PREVIOUS_BRANCH_MERGED_TO_MAIN
REMOTE_MAIN_VERIFIED
PREVIOUS_BRANCH_RETIRED
WORKTREE_CLEAN
NEW_TASK_BRANCH_BASE
```

Compare `ACTUAL_REMOTE_MAIN_HEAD` with the documented baseline:

- `MATCH` — no commits since the baseline.
- `EXPECTED_DOCS_ONLY_ADVANCE` — only `docs/**` advanced.
- `EXPECTED_INTEGRATION_ADVANCE` — a verified, recorded task integration.
- `UNEXPECTED_DRIFT` — **STOP**; inspect before any task.

If any mandatory condition fails: `PRE_TASK_GATE = FAIL` and no application
development begins.

## D. NEW TASK BRANCH BASE

New task branches MUST be created from current remote `main`. Never branch
from old fix/feature branches.

## E. NO BRANCH GRAVEYARD

After successful remote-main verification, retire completed task branches
unless a documented retention reason exists. Never delete a branch before
proving `main` contains all of its unique commits (ancestry proof).

## F. NO HISTORY REWRITE

No force push. No destructive reset of shared history. No rebase of completed
shared checkpoint history.

## G. DIVERGENCE GATE

If `main` and the completed branch diverged non-trivially: STOP and inspect.
Do not blindly merge. Analyze the conflict set, resolve deliberately, and
verify the merged tree (typecheck/tests/CI) before pushing.

## H. ATOMIC RELEASE EXCEPTION

A branch may remain open across multiple subtasks only when
`ATOMIC_RELEASE_REQUIRED = YES` and the minimum inseparable release unit is
documented before continuation. Do not silently bundle tasks.

## I. DOCS_DIRECT_MAIN fast path

`DOCS_DIRECT_MAIN` is an accepted controlled delivery path for future strictly
documentation-only, low-risk work. It is a lifecycle classification, not a
bypass of validation, reporting, or exact-SHA CI.

Eligibility requires all of the following before mutation:

- local `main` is clean and exactly synchronized with authoritative
  `origin/main`;
- every intended change is human-readable documentation only;
- no application code, runtime behavior, application configuration,
  database/schema/migration, dependency, CI workflow, Production artifact, or
  executable tooling changes;
- no machine-consumed Governance change that alters executable behavior;
- the task is atomic, independently revertible, and non-Production-bound.

Lifecycle:

```text
CLEAN_SYNCHRONIZED_MAIN → DOC_EDIT → RELEVANT_VALIDATION
→ ATOMIC_MAIN_COMMIT → PUSH → MAIN_CI_PASS_ON_EXACT_SHA
→ DURABLE_REPORT → CLOSED
```

The final Main CI must verify the exact pushed SHA. A mandatory report remains
required on success and every interruption path. If scope escapes eligibility,
fail closed before the out-of-scope mutation and use the normal task-branch
lifecycle. Never rewrite or restart an existing task branch merely to use this
fast path; finish that branch normally.

## Task lifecycle / status model

The lifecycle below is the canonical Production-bound vocabulary. Guardrail
registry state names are implementation mappings only; they do not define a
second lifecycle.

Canonical vocabulary:

```
PLANNED → ACTIVE → SOURCE_VALIDATED → BRANCH_CI_PASS → READY_FOR_PRODUCTION
→ DEPLOYED → PRODUCTION_PASS → MAINLINE_INTEGRATED → CLOSED
(terminal/exceptional: BLOCKED, ROLLED_BACK)
```

For non-Production profiles such as `DOCS_ONLY`, inapplicable Production states
are skipped. Closure requires source validation, required validation, mainline
integration, a durable report, and branch retirement; it never requires a fake
Production checkpoint.

Important:

- `PRODUCTION_PASS != CLOSED`. CLOSED requires mainline integration and
  branch lifecycle completion.
- `DEPLOYED` means the artifact is running; it is NOT a quality statement.
- `APPLICATION_SOURCE_CHANGED` is a factual code-tree statement, not a
  behavior statement: a compile-time/type-only source change is still
  `APPLICATION_SOURCE_CHANGED = YES` even when `RUNTIME_BEHAVIOR_CHANGED =
  NO` (see `FEATURE_TO_PRODUCTION.md` — source-change accounting).

Every task records:

```
TASK_ID
PARENT
DEPENDS_ON
BRANCH
BASE_COMMIT
DEPLOYABLE
ATOMIC_RELEASE_REQUIRED
PRODUCTION_CHECKPOINT
MAINLINE_INTEGRATION
STATUS
NEXT_AUTHORIZED_TASK
```

## Hotfix / emergency workflow

Production incident → owner authorizes HOTFIX mode
(`EMERGENCY_OVERRIDE = YES`, `OWNER_AUTHORIZED = YES`, `REASON = …`) →

1. branch from current authoritative `main` (or the verified Production
   source when main is behind Production)
2. smallest attributable fix
3. focused mandatory CI/validation where feasible
4. clean immutable build with exact source identity
5. rollback prepared
6. Production deploy
7. real Production acceptance (feature-level where the fix is user-visible)
8. Production checkpoint recorded
9. immediate merge-back to `main`
10. verify remote `main`
11. retire hotfix branch
12. incident report / new Pitfall when the class is new

Emergency mode may reduce unrelated validation but MUST NOT bypass: exact
source identity, task branch CI/focused validation where feasible, rollback
preparation, Production acceptance, checkpoint recording, mainline merge-back.

## Enforcement status

`BRANCH_PROTECTION_VERIFICATION = NOT_VERIFIABLE` — GitHub branch protection on
`main` could not be verified from the available tooling during the Governance
v2 checkpoint (API returned `Requires authentication`); do NOT claim it is
enabled. Treat the following as repository governance debt until an
Owner/admin confirms or enables them:

- block force pushes to `main`
- block branch deletion of `main`
- require pull-request review / status checks before merge to `main`
- require the CI workflow to pass before merge to `main`

Do not weaken any existing protection; confirm exact settings with the Owner
before applying changes.
