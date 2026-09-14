# Development Admission Contract

> **STATUS: CURRENT — BINDING from Stage 6 (2026-09-14, owner-authorized)**
> This document defines the **Spec Kit development-admission gate**: the specification/decision/authorization
> prerequisites that STANDARD and CRITICAL implementation work must pass *before* entering AHF's
> existing development lifecycle. It is enforced by `scripts/governance-runtime.mjs` (`admission` /
> `admissions` commands) and CI (`npm run admission:check`, `npm run admission:test`).

## 0. The invariant

> **No STANDARD or CRITICAL implementation may begin unless its required specification /
> decision / authorization gates have passed.**

`SPEC_READY` and `IMPLEMENTATION_AUTHORIZED` are **distinct states**. A feature may legally be
`SPEC_STATUS = READY` while `IMPLEMENTATION_AUTHORIZATION = NOT_AUTHORIZED` — that is the current
state of Workout Experience (see §7). A READY spec is never permission to code.

Existing governance remains authoritative for task lifecycle, branch policy, authority, testing,
CI, release, deployment and retirement. This gate adds the **admission prerequisites** before
eligible work enters that lifecycle — it is not a parallel governance system.

## 1. When is Spec Kit required?

| Class | Spec Kit admission | Typical work (see `docs/CI.md` + task profiles) |
|---|---|---|
| **LIGHT** | **Not required.** Only a scope declaration is permitted (`LIGHT_SCOPE = ISOLATED_LOCAL`) | Typo/copy fix · isolated visual fix · strictly local refactor without contract change · low-risk dependency patch (`DOCS_ONLY`-class docs work) |
| **STANDARD** | **Required** — a controlling spec must be READY and admission granted | Ordinary feature/behavior changes behind existing surfaces (`CODE_NO_DEPLOY`) |
| **CRITICAL** | **Required, strongest fail-closed form** — spec READY **+** architecture plan READY **+** work packages READY **+** dependency analysis READY **+** explicit owner implementation authorization | auth/AI behavior/security · schema/DB (`DB_CHANGE`) · deployment/topology (`PRODUCTION_BOUND`) · cross-plane data changes |

`LIGHT` must **not** be used for: architecture changes · product-behavior changes · auth/security
changes · schema/data-plane changes · AI/provider behavior changes · deployment changes ·
cross-module changes · significant new UX behavior.

## 2. What blocks implementation? (fail-closed)

The admission record (`docs/admissions/<TASK_ID>.admission.json`, shape:
`scripts/admission.example.json`) is validated by
`node scripts/governance-runtime.mjs admission <file>`. Implementation is **denied** when any of:

- `SPEC_STATUS != READY` (missing spec, `NOT_READY` spec, or `SPEC_PATH` outside `docs/specs/<dir>/spec.md` — prototype files, code and arbitrary docs are **not** specifications);
- `BLOCKING_OWNER_DECISIONS != NONE`;
- `IMPLEMENTATION_AUTHORIZATION != OWNER_AUTHORIZED` (spec readiness alone never authorizes);
- **CRITICAL additionally:** architecture plan missing/`NOT_READY`, work packages `NOT_READY`, dependency analysis `NOT_READY`.

Malformed records are `ADMISSION_INVALID` and fail CI (`npm run admission:check` validates every
`docs/admissions/*.admission.json`). A **denied** record is a valid task state (e.g. spec READY,
awaiting authorization) and does not fail CI — it fails the *task-start* gate.

## 3. Who can resolve Owner Unknowns?

Only the **Owner**. Agents/agents-of-record surface unknowns as explicit
`UNKNOWN / OWNER DECISION` items (never invent answers), record them in the controlling spec
(§ Open questions), and stop the affected work. `BLOCKING_OWNER_DECISIONS` must be `NONE`
before admission.

## 4. What does READY mean?

`SPEC_STATUS = READY` means: the controlling specification states the product contract, has **no
blocking owner decisions**, and its acceptance criteria are testable. It does **not** mean:
implemented, authorized, or complete. Deferred items inside a READY spec are explicitly
`NON_BLOCKING · DEFERRED · NON-AUTHORIZING`.

## 5. What constitutes implementation authorization?

`IMPLEMENTATION_AUTHORIZATION = OWNER_AUTHORIZED` with an `AUTHORIZATION_SOURCE` pointing at the
canonical record (normally the `docs/TASKS.md` entry). It is **separate** from spec readiness and
must be granted **explicitly** by the Owner per task (per class, per batch — per existing delivery
policy). Agents must never self-authorize.

## 6. What happens when scope changes? (reclassification)

If work classified LIGHT turns out to touch shared/cross-module behavior, architecture, auth,
schema, AI, deployment, or product behavior: **stop the affected work immediately**, reclassify to
STANDARD/CRITICAL, and run the full admission. The validator enforces this mechanically: a LIGHT
record with `LIGHT_SCOPE = CROSS_MODULE_OR_SHARED` or `SPEC_REQUIRED = YES` is denied with
`RECLASSIFICATION_REQUIRED`. Classification must never become a bypass.

## 7. How are prototype findings treated?

Prototype/implementation behavior is **EXISTING evidence** — never a product requirement.
Requirements enter the controlling spec only through owner decisions. See
`docs/specs/0001-workout-experience/spec.md` §14–§15 for the worked example (prototype states,
timings, Three.js, CSP relaxation are all recorded as evidence/non-requirements).

## 8. How does a developer find the controlling spec?

1. `docs/TASKS.md` entry → the task's admission record (`docs/admissions/<TASK_ID>.admission.json`) → `SPEC_PATH`.
2. `docs/specs/` directory (one directory per capability, `NNNN-slug/`).
3. `docs/INDEX.md` routes canonical topics.

## 9. How does staged implementation work?

Shared canonical spec → shared implementation architecture (plan) → stage/module work packages →
implement → targeted verification → owner acceptance where required → **freeze the accepted
boundary** → next work package. A freeze stabilizes the accepted boundary; later stages must stay
consistent with the canonical spec, shared architecture and shared contracts — a freeze never
authorizes an independent architecture.

## 10. Relationship between spec-local tasks and docs/TASKS.md

`docs/TASKS.md` remains the **only** executable backlog. Spec-local `tasks.md` files are planning
artifacts: non-executable, non-authorizing, always linked **from** a `docs/TASKS.md` entry.

## 11. Machine usage (fail-closed commands)

```bash
node scripts/governance-runtime.mjs admission docs/admissions/<TASK_ID>.admission.json  # task-start gate
npm run admission:check   # CI: structural validation of every docs/admissions/*.admission.json
npm run admission:test    # scenario tests (A–H) proving fail-closed behaviour
```

Templates: `scripts/admission.example.json`. Scenario coverage: `tests/admission-runtime.test.mjs`.

## 11.1 Trust boundary (CHECK A–E model)

The gate is only as strong as its provenance rules. The audit-verified boundary:

- **CHECK A — missing record:** executable (code-class) tasks cannot file their governance artifacts without a GRANTED admission record. `TASK_PROFILE ∈ {CODE_NO_DEPLOY, PRODUCTION_BOUND, DB_CHANGE, HOTFIX, RELEASE}` receipts (task start) and reports (close-out) **fail closed** unless `ADMISSION_PATH` points at a valid, GRANTED, TASK_ID-matching record. Exempt profiles: `DOCS_ONLY` (docs work), `AUDIT` (read-only), `INCIDENT` (urgent incident response must not be blocked by spec admission).
- **CHECK B — authorization provenance:** `IMPLEMENTATION_AUTHORIZATION = OWNER_AUTHORIZED` requires `AUTHORIZATION_SOURCE` to be an **existing repository artifact from the canonical owner-authorization set** (`docs/TASKS.md` or `docs/governance/OWNER_DECISION_GATE.md`) **that actually references the TASK_ID**. An agent cannot make a CRITICAL task admissible by editing its own admission JSON: the provenance check denies records whose source is missing, non-canonical, or does not name the task. **Trust root:** canonical artifacts change only through Owner-reviewed/merged PRs.
- **CHECK C — readiness provenance:** `SPEC_STATUS = READY` / `BLOCKING_OWNER_DECISIONS = NONE` must match the controlling spec's own machine markers (`SPEC_READINESS: READY` / `BLOCKING_OWNER_DECISIONS: NONE` — fenced block in the spec header). Missing/unparseable markers → INVALID; mismatch → DENIED.
- **CHECK D — preparation ownership:** CRITICAL preparation artifacts (`ARCHITECTURE_PLAN_PATH`, `WORK_PACKAGES_PATH`, optional `DEPENDENCY_ANALYSIS_PATH`) must **exist and live in the same spec directory** as the controlling spec (no cross-directory ownership, no meaningless strings).
- **Residual boundary (documented):** a task that files NO governance artifacts at all is outside machine reach; that gap is closed by the documented pre-task gate + close-out report contract and review — not by this validator.

## 12. Workout Experience handoff status (as of this gate)

| Field | Value |
|---|---|
| `WORKOUT_V2_PRODUCT_READY` | YES |
| `WORKOUT_V2_SPEC_READY` | YES |
| `WORKOUT_V2_BLOCKING_PRODUCT_DECISIONS` | NONE |
| `WORKOUT_V2_IMPLEMENTATION_AUTHORIZED` | **NO** |
| Admission record | [`docs/admissions/WORKOUT-V2-IMPL-01.admission.json`](../admissions/WORKOUT-V2-IMPL-01.admission.json) (currently `ADMISSION_DENIED: IMPLEMENTATION_NOT_AUTHORIZED` — the expected handoff state) |
| Future V2 baseline | Fresh canonical main **after** this Stage-6 merge. The DEV prototype (`prototype/workout-layout-blueprint`) remains V1 implementation evidence — **not** a V2 baseline, not to be wholesale merged. |

Workout V2 remains **blocked from code** until a separate explicit CRITICAL
implementation-preparation/authorization task is authorized by the Owner.
