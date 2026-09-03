# Batch Delivery V2 — Governed SINGLE_TASK / BATCH_5 Delivery Modes

> **STATUS: AUTHORIZED 2026-09-04** — Owner TASK DELTA "BATCH DELIVERY V2".
> Supersedes [`BATCH_DELIVERY_V1.md`](BATCH_DELIVERY_V1.md) for all new batch
> work; V1 remains the historical record for the closed V1 batches
> (ADMIN-DS Batch 1/2, STABILIZATION S06+S05, 2026-09-01).
> Registered in `docs/TASKS.md` (registered decisions), `docs/INDEX.md`, and
> `docs/CURRENT_STATE.md`; the branch-lifecycle interplay is recorded in
> `docs/BRANCHING_POLICY.md` § B/H/K.
>
> This document defines the delivery **modes only**. Adoption authorizes NO
> task and NO batch: every batch still requires explicit Owner authorization
> and a recorded manifest in `docs/TASKS.md` (the only executable backlog)
> before any branch, commit, or CI run. Nothing here weakens an existing
> gate, profile, check, or protection.

## 1. Delivery modes

| Mode | Eligible work | Delivery vehicle |
|---|---|---|
| **SINGLE_TASK** (default, always available) | Gated, Production-sensitive, security-sensitive, DB-touching, or otherwise incompatible work — and everything not eligible for BATCH_5 | Existing governed lifecycle per task: own branch → validation → PR/CI → merge → exact-merge-SHA Main CI PASS → retirement (§ J of `BRANCHING_POLICY.md`) → close-out docs → Owner report |
| **BATCH_5** | Up to five **compatible, low-risk** tasks (all of § 2 must hold) | One batch branch → per-member targeted validation → one batch-level integration validation → **one PR** → **one full CI** → **one merge** → **one exact-merge-SHA Main CI PASS** → retirement → per-member close-outs and Owner reports referencing the shared CI evidence |

A batch never replaces SINGLE_TASK for work that is not eligible for BATCH_5.
When in doubt, fail closed: use SINGLE_TASK.

## 2. BATCH_5 eligibility (cumulative — every rule must hold)

1. **Size:** 2–5 member tasks. Fewer is better than an artificial five.
2. **Authorized + manifest:** the batch is explicitly Owner-authorized and its
   manifest is recorded in `docs/TASKS.md` **before** any execution, per the
   Promotion rule. Members keep their own `TASK_ID`s and acceptance criteria.
3. **Ready and un-gated:** every member has `AUTONOMOUS_ELIGIBILITY = READY`;
   no member (or its required dependency) carries an `OWNER_DECISION_GATE`,
   `HUMAN_GATE`, `ARCHITECTURE_GATE = REQUIRED`, or `RESEARCH_ONLY` marker.
4. **Low-risk profile only:** every member is `DOCS_ONLY` or `CODE_NO_DEPLOY`;
   `PRODUCTION_SENSITIVITY = NONE`; `DB_SENSITIVITY = NONE`;
   `UI_CHANGED = NO` per member (no UI-conformance-bearing changes); no
   dependency upgrades; no changes to CI workflows, executable tooling
   (`scripts/**` that alters behavior), or `governance-runtime.mjs` /
   runtime-governed contracts.
5. **Not security-sensitive:** no member touches authn/authz, secrets/OTP,
   the admin surface, the deployment gateway, or protected operators.
6. **Dependency-safe order:** each member's `DEPENDENCIES` are `NONE`, already
   CLOSED on `main`, or satisfied by an **earlier member of the same batch**
   (intra-batch dependency allowed only with an explicit, recorded order;
   provider commits land before consumer commits on the batch branch).
7. **File-disjoint:** member file sets do not overlap. Any overlap → those
   members are not BATCH_5-compatible (SINGLE_TASK or different batches).
8. **Reviewable as one unit:** the whole batch diff stays small and
   independently reviewable member-by-member in ONE PR (V1 invariant 3/4).

Anything not satisfying all of § 2 runs as SINGLE_TASK. Examples that are
**never** BATCH_5 members: Production-bound work, DB/schema/migration work,
releases, hotfixes, incidents, security changes, dependency upgrades,
UI changes, tooling/runtime-governance changes, and any task behind a gate.

## 3. BATCH_5 lifecycle (authorized)

```text
Owner authorizes batch + manifest recorded in docs/TASKS.md
  → ONE batch branch batch/<id> from current origin/main
  → members execute serially in recorded dependency order,
      each as its own attributable commit(s) on the branch:
        per-member: targeted validation (member unit tests,
          typecheck on member scope, member lint, member profile/docs
          checks) + member evidence captured separately
        member FAIL → quarantine that member's commits; do NOT merge
          without it; reduction/continuation per § 5
  → batch-level integration validation on the batch branch:
      full typecheck + full unit suite + lint + governance:check (+ build)
  → ONE PR (title = BATCH_ID + member IDs; body = members, acceptance,
      evidence pointers; diff reviewed as ONE unit)
  → ONE full CI on the batch head SHA (build + e2e + governance) = PASS
  → merge (squash — required_linear_history) → ONE new main SHA
  → ONE exact-merge-SHA Main CI PASS on the merged SHA (build + e2e)
      = the batch's shared CI evidence (run/job IDs recorded)
  → retirement: § J gate applies to the batch branch (PASS + ancestry
      proof → mandatory; verify local AND remote deletion)
  → close-out: per-member STATUS CLOSED rows in docs/TASKS.md (each
      member references the shared merge SHA + PR + Main CI run and its
      own evidence), CURRENT_STATE.md / INDEX.md updated
  → reports: ONE Owner report PER MEMBER (identity + own acceptance
      criteria + own targeted evidence) each referencing the shared
      batch CI evidence block; no member report may claim closure until
      the shared exact-SHA Main CI PASS holds
```

No `DOCS_DIRECT_MAIN` inside a batch: docs members ride the batch branch and
the single PR. The batch head is pushed to `main` only after CI PASS on the
exact SHA (the same push-time gating that applies to every delivery).

## 4. Identity and evidence model (member ≠ merged commit on main)

Each member keeps separate identity end-to-end even though the merge produces
one main commit:

- **Per member:** own `TASK_ID`, own acceptance criteria, own targeted
  validation evidence, own close-out row, own Owner report.
- **On the branch:** one or more attributable commits per member, in order;
  pre-squash member commit SHAs are captured in the manifest and close-outs
  for attribution after the squash merge.
- **Shared CI evidence block** (identical in every member close-out/report):
  `BATCH_ID`, PR number, batch head SHA, merged main SHA, exact-merge-SHA
  Main CI run/job IDs, retirement verification.

## 5. Fail-closed rules

1. **Any gate anywhere stops batching:** if a gate (Owner/Human/Production/
   architecture) is discovered on a member before or during a batch, the
   batch freezes at that point — do not merge a batch containing a gated or
   failed member.
2. **No partial/silent reduction:** a batch may be reduced (members removed)
   only with an explicit recorded Owner authorization or a reduction posture
   pre-authorized in the batch manifest; otherwise remaining members finish
   as SINGLE_TASK deliveries after the batch decision is recorded.
3. **No merge with a failing member:** the batch merges only when every
   member passed its targeted validation AND the batch-level integration
   validation AND the one full CI run.
4. **No weakened validation:** per-member targeted validation plus one full
   integration validation is a floor, never a ceiling; UI Conformance and
   Report Delivery contracts bind per member as in SINGLE_TASK.
5. **Required checks bind the batch:** the merge happens only with required
   checks (`build`, `e2e`) PASS; § J retirement applies to the batch branch;
   per-member reports validate against the existing runtime report contract.

## 6. Conflict audit vs current governance and branch protection (2026-09-04)

Authoritative verification this date: `enforce_admins = true`; required
status checks `build` + `e2e` (`strict: true`); `required_linear_history =
true`; force-push and deletion blocked; `required_pull_request_reviews =
null`; no repository rulesets. Classic protection on `main` is compatible
with BATCH_5: the single batch PR satisfies the required checks, the squash
merge preserves linear history, and post-merge verification is the same
exact-SHA Main CI PASS used by SINGLE_TASK.

| Existing governance | BATCH_5 interplay (delta recorded here) |
|---|---|
| `BRANCHING_POLICY.md` § B — next task starts only when the previous independently deployable task is CLOSED (merged + retired) | **Authorized delta:** within ONE authorized BATCH_5, members integrate as a unit and close together at the batch merge; the strict § B gate continues to govern between independent deliveries and for any member that exits the batch (it must then complete as SINGLE_TASK). |
| `BRANCHING_POLICY.md` § H — "Do not silently bundle tasks"; multi-subtask branch only with `ATOMIC_RELEASE_REQUIRED = YES` | **Authorized delta:** a BATCH_5 branch is an explicitly authorized, manifest-recorded, never-silent bundling; § H continues to govern every non-BATCH_5 branch. |
| `BRANCHING_POLICY.md` § I — `DOCS_DIRECT_MAIN` fast path | Does NOT apply inside a batch; docs members ride the batch branch + one PR. |
| `BRANCHING_POLICY.md` § J — exact-merge-SHA Main CI PASS, mandatory retirement, verify local + remote deletion | Unchanged; applies to the single batch merge SHA and the batch branch. |
| `GOVERNANCE_RUNTIME.md` profiles + `scripts/governance-runtime.mjs` | **BATCH_5 is a delivery mode, not a runtime profile.** Members keep their own profiles; per-member reports must pass the existing runtime `report` contract. Machine validation of batch manifests would change executable tooling and therefore requires a separately authorized tooling task (per `GOVERNANCE_RUNTIME.md`, documentation-only work must not silently change executable tooling). This document changes no runtime/CI/workflow file. |
| Branch protection (verified above) | Compatible — no protection change required or requested. |
| Report Delivery + UI Conformance contracts | Bind per member, unchanged. |

**Conflicts requiring Owner action: NONE.** No governance or protection rule
blocks BATCH_5; the deltas above are explicit, authorized, and confined to
this document and the `BRANCHING_POLICY.md` § K cross-reference.

## 7. What this document does NOT change

- `docs/RELEASE_POLICY.md`, `docs/FEATURE_TO_PRODUCTION.md`,
  `docs/PRODUCTION_DEPLOYMENT_GATEWAY.md`, `docs/GOVERNANCE_RUNTIME.md`, and
  the UI/Report delivery contracts are not modified by this document.
- No task is authorized, no batch is registered as executable, no branch/PR/
  CI is created by adopting this mode.
- SINGLE_TASK remains the default and the only mode for gated, Production,
  security-sensitive, or incompatible work.
