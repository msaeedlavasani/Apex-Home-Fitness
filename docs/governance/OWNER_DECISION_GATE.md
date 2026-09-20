# OWNER_DECISION_GATE — AHF Architecture Audit + Spec Kit Adoption

`STATUS: DECISION RECORD — D1/D4/D5 DECIDED 2026-09-14; D2 DECIDED 2026-09-14 (Stage-4 pilot product-decision phase COMPLETE); D3 DEFERRED; D6 SAFE_TO_DEFER`
> **Provenance:** placed into the repository 2026-09-14 via `docs/spec-kit-adoption-stage-0` (Stage 0 of the approved migration). Original gate text below is preserved unmodified; decision outcomes are recorded in the block immediately following this header.

## Owner decision record (2026-09-14)

| Decision | Status | Outcome |
|---|---|---|
| **D1 — Adopt Spec Kit brownfield design + authorize Stages 0–3** | **DECIDED / APPROVED — OPTION A** | Thin/by-reference design adopted; Stages 0–3 authorized autonomously; **Stage 4 NOT authorized** |
| **D2 — Stage-4 pilot vehicle** | **DECIDED / APPROVED 2026-09-14 — PRODUCT DECISION PHASE COMPLETE** | Workout Experience Specification is the first official Stage 4 Spec Kit pilot. Authorization boundary: specification / clarification / design-plan / task decomposition / independent review / pilot evaluation **only — implementation NOT AUTHORIZED**. **Owner product-decision phase COMPLETE: `SPEC_READINESS = READY`; `REMAINING_BLOCKING_PRODUCT_DECISIONS = NONE`** (all accumulated owner deltas — U-1 · HOLD · U-2 · U-3 · U-4 · U-5 · U-12 · v1 audio · U-7 · modularity — integrated into the spec; deferred items are explicitly non-authorizing). Pilot spec: [`../specs/0001-workout-experience/spec.md`](../specs/0001-workout-experience/spec.md) (task `SPECKIT-PILOT-01`; PR #66 awaiting owner merge review) |
| **WORKOUT-V2-IMPL-01 — Owner implementation authorization** | **DECIDED / OWNER_AUTHORIZED 2026-09-15** | Implementation of the canonical Workout V2 program is **authorized** under the approved shared architecture. **First executable slice = `START + PREPARING` (+ only the minimum approved DAG dependencies)**; later stages remain staged (dependencies → targeted verification → stage acceptance → freeze). Canonical references: [`../specs/0001-workout-experience/spec.md`](../specs/0001-workout-experience/spec.md) · [`plan.md`](../specs/0001-workout-experience/plan.md) · [`dependencies.md`](../specs/0001-workout-experience/dependencies.md) · [`tasks.md`](../specs/0001-workout-experience/tasks.md) · admission record [`../admissions/WORKOUT-V2-IMPL-01.admission.json`](../admissions/WORKOUT-V2-IMPL-01.admission.json). No new product decisions; product semantics unchanged. |

### WORKOUT-V2-IMPL-01 — implementation authorization (2026-09-15)

- **Owner decision:** AUTHORIZE WORKOUT-V2-IMPL-01 IMPLEMENTATION. Recorded here because this file is the canonical CRITICAL authorization source required by the Development Admission Gate (`docs/governance/DEVELOPMENT-ADMISSION.md` §11.1, CHECK B).
- **Basis:** Spec Kit pilot completed · Stage 6 Development Admission Gate active on main · canonical spec `READY` with `BLOCKING_OWNER_DECISIONS = NONE` · CRITICAL preparation merged (PR #70 → main `b79585be80782b7d8ec7f410346e2b826eb50df1`: architecture plan, dependency analysis, work-package decomposition) · independent review `PASS`.
- **Scope:** the implementation program may **begin**; execution remains **staged**. The first executable slice is `START + PREPARING` plus only the minimum shared-architecture dependencies required by the approved DAG. Later Workout stages remain governed by their prepared work-package dependencies, targeted verification, stage acceptance and freeze sequence — the parent authorization does not activate later slices.
- **Binding architecture preserved:** Workout Session = Resolved Prescription + Session Orchestration + Composed Experience Modules; one orchestration authority; `REP_BASED` + `TIME_BASED` as first-class configurations of the same `WORK_SET` capability. No competing global state machine, no presentation-owned sequencing, no Mentor-owned session state, no TIME-only architecture, no fixed-three-set or single-exercise global assumptions, no Three.js/3D product requirement, no prototype vocabulary as canonical architecture.
- **Admission transition:** `IMPLEMENTATION_AUTHORIZATION = OWNER_AUTHORIZED` with `AUTHORIZATION_SOURCE = docs/governance/OWNER_DECISION_GATE.md`.
- **No new product decisions** are introduced by this record; it references the canonical package rather than restating product requirements.

### WORKOUT-V2-PRODUCT-INTEGRATION-01 — normal product path and QA Program authorization (2026-09-19)

- **Owner decision:** AUTHORIZE the downstream Workout V2 product-integration work packages `WP-15` and `WP-16`. The existing Run-4 implementation is the current Workout Experience V2 product implementation, not disposable prototype code.
- **Required product path:** the normal authenticated Dashboard/Program/workout route must launch the shared V2 ExperienceShell through the existing Program/Prescription domain path; an isolated `/workout/v2` route may remain only as historical compatibility/evidence and is not an acceptance path.
- **Required QA path:** a small persisted QA Program/fixture may be used for verification, but it must use the existing Program/Prescription persistence and resolution path. No phone, user, account, or test-identity conditional may enter product behavior.
- **Binding boundary:** Program/Prescription owns exercise identity/order, set count, mode/targets, fallback duration, and rest semantics. Workout consumes the shared WP-13 contract; orchestration derives presentation topology.
- **Acceptance boundary:** RUN-5 remains one complete-flow Human Gate after the new product-integration checkpoint. No per-task visual acceptance is introduced. Production remains unauthorized. Beta remains a separate deployment-authority decision under the permanent checkpoint policy.
- **Canonical work packages:** `WP-15-REAL-PRODUCT-ENTRY-INTEGRATION` and `WP-16-QA-PROGRAM-DOMAIN-PATH` are authorized only within the existing Spec Kit, DAG, admission, and checkpoint authorities.

### WORKOUT-V2-BETA-DEPLOYMENT-01 — Beta deployment authorization (2026-09-19)

- **Owner decision:** AUTHORIZE deployment of the current verified Workout Experience V2 candidate to the existing AHF Beta environment for complete-flow validation and RUN-5 Owner acceptance.
- **Scope:** Beta only. Production deployment remains unauthorized, PR #72 remains unmerged, and all existing CI, rollback, security, deployment-checkpoint, and verification requirements remain binding.
- **Canonical acceptance path:** authenticated application → normal Dashboard → assigned QA Program/workout → normal localized workout route → Workout Experience V2 → complete Program-derived workout → Workout Result/Exit → Dashboard.
- **Reconciliation result:** the repository contains no Beta deployment workflow, GitHub environment, deployment record, target mapping, or Beta-capable deployment gateway. The existing gateway is Production-only: it requires authoritative `main` HEAD and the Production compose/volume allowlist. The authorization is therefore persisted as accepted, but the derived Beta deployment capability remains BLOCKED until a canonical Beta path is established within deployment governance.
- **No inference:** this decision does not authorize Production, PR merge, a new deployment authority, arbitrary host/compose/secret values, or bypass of the existing Production gateway security model.

### WORKOUT-V2-BETA-CAPABILITY-01 — Establish canonical Beta deployment path (2026-09-19)

- **Owner decision:** AUTHORIZE `BETA-DEPLOYMENT-CAPABILITY` to design, implement, configure, and verify the minimum governed AHF Beta deployment path required for Workout Experience V2 validation.
- **Canonical target:** `beta.apexhomefit.ir` on the existing AHF host, with explicit Beta-only Compose, loopback port, persistent volume, environment boundary, deployment source/build identity, and rollback evidence.
- **Reuse boundary:** extend the existing constrained Deployment Gateway and host patterns; do not create a parallel scheduler, weaken Production safeguards, or target Production resources.
- **Safety boundary:** Beta must fail closed on ambiguous target identity, must preserve the Production app/volume/configuration, and must not expose secret values.
- **Scope:** Beta only; Production deployment, PR #72 merge, and any bypass of CI/admission/checkpoint/rollback requirements remain unauthorized.

### WORKOUT-V2-RUN-5-CORRECTION-01 — consolidated Owner acceptance correction cycle (2026-09-20)

- **Owner decision:** REJECT the first integrated Desktop + real-iPhone RUN-5 review and authorize one consolidated correction cycle before the next complete-flow acceptance. The current Workout Experience V2 implementation remains the product implementation; historical work packages remain CLOSED/FROZEN.
- **Canonical correction scope:** derive and execute repository-owned correction work for the INTRO→SET orchestration boundary and state binding, the existing Exercise/Movement authority extension into an Exercise Passport read-model, protected Mentor-stage/adaptive composition invariants, the controlled two-entry Squat-only QA validation fixture, and the required integrated machine regression/deployment checkpoints.
- **Authorized correction work packages:** `WP-17`, `WP-18`, and `WP-19` are authorized within the existing Spec Kit, DAG, admission, and checkpoint authorities; their order is repository-derived, not prompt-scheduled.
- **Preserved boundaries:** Program/Prescription owns WHAT; the Session Orchestrator owns sequencing and lifecycle; Workout Experience owns HOW/presentation; no test-identity conditional, fixed topology, parallel scheduler, second Exercise authority, Production deployment, or PR #72 merge is authorized.
- **MENTOR_STAGE_ANCHOR_AND_ADAPTIVE_COMPOSITION:** ACCEPTED for this correction cycle. Within a layout class, the Mentor stage is a protected centered/grounded composition zone; secondary UI reflows/compacts/collapses/overlays before changing that anchor. Breakpoints may define different valid geometries; runtime control changes may not translate the anchor within one class.
- **EXERCISE_PASSPORT:** ACCEPTED as a semantic extension of the existing canonical Exercise/Movement authority, not a duplicate database. Stable exercise identity, coaching/setup metadata, Mentor capability, and future sensing references belong to that authority; Program/Prescription remains dosage/order authority.
- **QA visual fixture:** ACCEPTED as validation data only: exactly two exercise entries, both resolving through the supported Squat Mentor path. This does not constrain arbitrary Program topology.
- **Skip-all completion semantics:** **OWNER DECISION REQUIRED.** Existing authorities distinguish terminal session obligation resolution from outcome completion kinds, but the persisted product path currently has no canonical `RESOLVED/ENDED` state distinct from success/adherence credit. Do not infer whether an all-skipped session should be recorded as an ended non-credit session, `DID_NOT_START`, `ABANDONED`, or another product outcome. The correction DAG must fail closed at this decision and must not begin RUN-5 acceptance until resolved.
- **Acceptance boundary:** RUN-5 remains one complete-flow Human Gate. No per-task visual review is introduced. Production remains unauthorized and PR #72 remains unmerged.

### SKIP-ALL-COMPLETION-SEMANTICS-DECISION — resolved Owner product decision (2026-09-20)

- **Decision:** When every required Exercise obligation reaches
  `SKIPPED_FOR_SESSION` and zero Sets are completed, the session is terminal /
  resolved but is **not** a successfully completed workout.
- **Canonical outcome:** record `ENDED_WITHOUT_COMPLETION` as the session
  outcome. Preserve the per-session skipped Exercise outcomes for history,
  analytics, and future adaptation; do not award completed-workout or
  adherence credit and do not increment Dashboard completed-session counts.
- **Lifecycle boundary:** `SESSION_TERMINALITY != WORKOUT_COMPLETION_CREDIT`.
  The persisted session must be terminal without using the success-credit
  marker. The outcome vocabulary therefore distinguishes
  `COMPLETED_FULLY`, `COMPLETED_PARTIALLY`, and
  `ENDED_WITHOUT_COMPLETION`.
- **Scope limit:** this decision resolves only the all-skipped + zero-set
  case. It does not define a new PARTIAL classification or adherence policy;
  existing PARTIAL behavior remains unchanged unless a later canonical
  decision changes it.
- **Execution authorization:** the bounded downstream capability work needed
  to persist and project this distinction is authorized through the existing
  Spec Kit / DAG / admission / checkpoint authorities. No Production deploy,
  PR #72 merge, or per-task Owner visual gate is authorized.
- **Canonical work package:** `WP-20` is the repository-derived bounded
  implementation package for this decision; it may be admitted only within
  the existing Development Admission Gate and remains downstream of this
  resolved decision.

### Stage 4 pilot — product decision phase complete (2026-09-14)

- **Workout Experience: `SPEC_READINESS = READY`.** The spec is finalized (`docs/specs/0001-workout-experience/`), with all accumulated owner product decisions integrated into canonical sections and all deferred items marked **NON_BLOCKING · DEFERRED · NON-AUTHORIZING**.
- **`REMAINING_BLOCKING_PRODUCT_DECISIONS = NONE`.**
- **Implementation: NOT authorized.** Any implementation requires a separate explicit owner authorization and is expected **CRITICAL**-class.
- **Constitution: unchanged** — remains `PROPOSED / NON-BINDING` (no ratification by this record).
- **PR #66** carries the finalized spec for owner merge review (not merged).
| **D3 — Supabase / Principle-12 evaluation scheduling** | **DEFERRED (NON-BLOCKING)** | No Supabase migration or architectural change |
| **D4 — SQLite→PostgreSQL trigger runbook** | **DECIDED / APPROVED — OPTION A** | Runbook authored now as docs-only artifact ([`../architecture/DB-MIGRATION-TRIGGERS.md`](../architecture/DB-MIGRATION-TRIGGERS.md)); migration itself NOT authorized |
| **D5 — Node/Bun runtime** | **RESOLVED — KEEP NODE 22 / TRIGGER-BASED REVISIT** | No runtime migration; revisit only on documented evidence triggers (audit §8) |
| **D6 — Quiz JS island TS port** | **SAFE_TO_DEFER** | Stays WHEN-TOUCHED per repo register R-03 |

Companion docs: [`AHF-ARCHITECTURE-SCALE-READINESS-AUDIT.md`](../architecture/AHF-ARCHITECTURE-SCALE-READINESS-AUDIT.md) (evidence), [`AHF-SPECKIT-BROWNFIELD-ADOPTION-DESIGN.md`](./AHF-SPECKIT-BROWNFIELD-ADOPTION-DESIGN.md) (design), [`AHF-ARCHITECTURE-SPECKIT-DECISION-BRIEF.md`](../architecture/AHF-ARCHITECTURE-SPECKIT-DECISION-BRIEF.md) (summary).
Counts at gate time: **BLOCKING = 1 · NON-BLOCKING = 2 · SAFE_TO_DEFER = 3** (plus a reminder list of pre-existing owner gates not reopened by that audit).

---

# Original gate document (preserved as issued)

Counts: **BLOCKING = 1 · NON-BLOCKING = 2 · SAFE_TO_DEFER = 3** (plus a reminder list of pre-existing owner gates not reopened by this audit).

---

## D1 — BLOCKING

**DECISION_ID:** D1
**TOPIC:** Adopt GitHub Spec Kit in the proposed brownfield shape and authorize docs-only Stages 0–3.
**STATUS:** BLOCKING
**WHY_DECISION_IS_REQUIRED:** Initializing Spec Kit artifacts (constitution, templates, `docs/specs/`) creates new repository governance surfaces. Under `docs/governance/DOCUMENTATION-GOVERNANCE.md` (Find-Before-Create, authority hierarchy) and the task's own safety rules, no new governance artifact may be created — even docs-only — without explicit owner authorization. This is also the point where "adopt vs extend-current-system-only" is a materially different fork with lasting process consequences.
**EVIDENCE:**
- Existing governance already covers behavior/policy: `AGENTS.md`, `DOCUMENTATION-GOVERNANCE.md` §2/§4, `RELEASE_POLICY.md`, `governance-runtime.mjs` (8 machine-validated task profiles), 21 ADRs, single backlog `TASKS.md`.
- Gap: no repeatable artifact-based feature-spec workflow; spec quality today is one-off effort (MG-*/AL-*/CP-* pattern); doc drift exists (React 18/19 in `MODULARITY-AUDIT.md` vs `package.json`).
- DEV branch shows prototype→product promotion is imminent territory (19 commits, +3200 lines) with no spec/plan artifact to review — exactly the flow Spec Kit would govern.

**OPTION_A — Adopt as designed (thin, by-reference constitution; `docs/specs/`; LIGHT/STANDARD/CRITICAL mapped to existing task profiles; Stages 0–3 docs-only now; pilot later)**
PROS:
- Fills the real gap (feature spec workflow) without duplicating any existing authority; respects Find-Before-Create and the one-backlog rule.
- Docs-only until Stage 4; every stage independently revertible; failure residue is still-useful baseline + constitution-router docs.
- Directly applicable to the next authorized task (Workout Experience Specification) and the DEV prototype promotion question.
- Machine-checkable later by extending `governance-runtime.mjs` (existing pattern, existing precedent).
CONS:
- Adds artifact overhead for STANDARD/CRITICAL tasks (mitigated by line budgets + LIGHT exemption).
- One more system for agents to learn; templates need maintenance.
- Governance-runtime extension (Stage 6) is a future machine-governance change requiring its own care (governance §2.13).

**OPTION_B — Adopt with a restated (self-contained) constitution instead of by-reference**
PROS:
- Single-file readability for new agents/models; no cross-document traversal to learn the rules.
CONS:
- Directly violates repository governance §2.2 (Update Before Duplicate / no restating authority).
- Creates a second authority copy that will drift (already-proven drift mode in this repo) — the exact failure the governance system was built (2026-08-27) to stop.
- Higher token cost on every constitution read.

**OPTION_C — Do not adopt Spec Kit; extend the current system only (e.g., hand-written spec template + convention in AGENTS.md)**
PROS:
- Zero new tooling; smallest possible change; the existing system demonstrably produced high-quality specs already.
CONS:
- Leaves the actual gap (repeatable specify→clarify→plan→tasks loop with review surface) unfilled; future specs will keep being one-offs with variable depth.
- Forfeits Spec Kit's maintained templates/workflow prompts; reinventing them costs more than adopting.
- No structured home for clarifications/open questions (today free-floating, e.g. `WORKOUT-EXPERIENCE-V2-OPEN-QUESTIONS.md`).

**RECOMMENDATION:** OPTION_A.
**CONFIDENCE:** HIGH (on the design fit; the adoption-vs-not fork is genuinely the owner's call).
**DEFAULT_IF_OWNER_APPROVES_RECOMMENDATION:** Execute Stage 0–3 as one docs-only task branch (`docs/spec-kit-adoption-stage-0`, or DOCS_DIRECT_MAIN-eligible per its strict eligibility rules), each stage a separate revertible commit, `npm run governance:check` green, close-out report per `AI_CHANGE_TEMPLATE.md`. Constitution lands as PROPOSED (non-binding). Nothing else changes.
**CONSEQUENCE_OF_DEFERRING:** No structural harm — the repo keeps functioning under current governance. Cost of deferral: the Workout Experience Specification task (next authorized) will run without a spec artifact; the DEV prototype promotion decision will lack its review surface; each subsequent feature adds unstandardized spec docs that later need reconciling.

---

## D2 — NON-BLOCKING

**DECISION_ID:** D2
**TOPIC:** Pilot vehicle for Stage 4 (Spec Kit first real use).
**STATUS:** NON-BLOCKING (decides only after D1; does not block anything before then)
**WHY_DECISION_IS_REQUIRED:** Stage 4 performs the first non-pure-docs use of the workflow and touches an owner-authorized task; task selection is an owner prerogative under `TASKS.md` rules.
**EVIDENCE:** `docs/TASKS.md` names "Workout Experience Specification" as `NEXT_AUTHORIZED_TASK`; DEV branch `prototype/workout-layout-blueprint` (19 commits, 3D mentor prototype, isolated namespace) is its natural evidence base; audit §14 (pilot criteria) verifies fit.
**OPTION_A — Workout Experience Specification as design-only STANDARD pilot (recommended)**
PROS: meaningful (real next task); reversible (docs output); representative (full specify→clarify→review loop); low blast radius (zero runtime change); resolves the prototype-promotion question with evidence.
CONS: it is a product-heavy spec — owner must invest attention in the clarify round.
**OPTION_B — Code-touching pilot: TS port of one quiz step component (R-03)**
PROS: exercises implementation-side workflow (tasks/checklist); bounded.
CONS: behavior-parity risk; burns the WHEN-TOUCHED item on process testing; less meaningful.
**OPTION_C — No pilot; adopt Stages 0–3 only and revisit after the next feature is authorized**
PROS: minimal process exposure.
CONS: adoption never validates; friction issues surface later on a real feature instead of a controlled pilot.
**RECOMMENDATION:** OPTION_A.
**CONFIDENCE:** HIGH.
**CONSEQUENCE_OF_DEFERRING:** Stage 4 simply waits; no technical debt accrues.

---

## D3 — NON-BLOCKING

**DECISION_ID:** D3
**TOPIC:** When to run the already-accepted Supabase dependency-criticality evaluation (Architecture Principle 12).
**STATUS:** NON-BLOCKING
**WHY_DECISION_IS_REQUIRED:** The repository accepted the evaluation need but deferred execution (Principle 12 status header). Scheduling is owner's; this audit only quantifies the stakes (identity coupling is the #2 expensive-later item).
**EVIDENCE:** `ARCHITECTURE-PRINCIPLES.md` §12; audit §5 C-1, §9 E-2; Supabase facts (plan/region/limits) are UNKNOWN in-repo (audit U-1).
**OPTION_A — Schedule within the next 2–4 weeks alongside Spec Kit Stage 4.**
PROS: while the workout spec is being clarified, identity assumptions get examined together.
CONS: splits owner attention.
**OPTION_B — Tie to a concrete trigger: first Supabase reachability incident, plan/cost change, or the first cross-plane feature.**
PROS: evidence-driven; zero cost now.
CONS: incidents are the most expensive possible teacher.
**RECOMMENDATION:** OPTION_B, with one cheap exception now: record Supabase plan/limits/region facts into `ENVIRONMENT_CONTRACT.md` (owner provides facts, ~10 minutes).
**CONFIDENCE:** MEDIUM-HIGH.
**CONSEQUENCE_OF_DEFERRING:** Coupling deepens gradually; the eventual evaluation faces more supabase consumers.

---

## D4 — SAFE_TO_DEFER

**DECISION_ID:** D4
**TOPIC:** Authoring the SQLite→Postgres trigger runbook now vs at trigger time.
**STATUS:** SAFE_TO_DEFER (recommended folding into Stage 0 docs since it is ~1 page; not required)
**WHY/EVIDENCE:** audit §9 E-1 — highest expensive-later item; trigger conditions defined; runbook is docs-only.
**OPTIONS:** (A) write now inside Stage 0 (recommended, trivial cost) / (B) write at first trigger.
**RECOMMENDATION:** A when convenient; deferring has no technical consequence until a trigger fires.

## D5 — SAFE_TO_DEFER

**DECISION_ID:** D5
**TOPIC:** Node/Bun runtime revisit.
**STATUS:** SAFE_TO_DEFER
**WHY/EVIDENCE:** audit §8 — no evidenced runtime bottleneck; revisit triggers documented (official Bun-standalone support for this exact deployment shape; measured build pain; CPU-bound server workload appearing).
**OPTIONS:** (A) keep Node 22, revisit only on triggers (recommended) / (B) CI tooling experiment with Bun.
**RECOMMENDATION:** A. Deferring is the correct default; no consequence.

## D6 — SAFE_TO_DEFER

**DECISION_ID:** D6
**TOPIC:** Quiz JS island TS port timing.
**STATUS:** SAFE_TO_DEFER
**WHY/EVIDENCE:** repo's own register R-03/R-08 sets urgency WHEN-TOUCHED; quiz is stable today.
**OPTIONS:** (A) keep WHEN-TOUCHED (recommended) / (B) schedule proactive port.
**RECOMMENDATION:** A. Deferring matches existing policy; divergence risk is the known cost.

---

## Pre-existing owner gates (reminder — NOT reopened by this audit)

1. MG-09 Production apply (Movement Graph persisted storage adoption) — gated on owner + gateway.
2. TS-03 Production deletion acceptance (real deletion against Production Supabase requires explicit authorization).
3. CP-05 physical-device acceptance evidence.
4. Dual compose config on Production host (`compose.yml` + `docker-compose.yml`) cleanup authorization.
5. OTP public-launch Go/No-Go checklist (`OTP_LAUNCH_READINESS.md`).

These remain owned by their existing decision records; this audit adds no new position on them.

---

## STOP STATEMENT

The original audit stopped here on D1 (BLOCKING). D1 has since been decided (see the Owner decision record above): **APPROVED — OPTION A**, Stages 0–3 authorized. Later decisions — D1–D6 and the **`WORKOUT-V2-IMPL-01` implementation authorization of 2026-09-15** — are recorded above and supersede this statement for their respective scopes. (No Spec Kit feature pilot or Stage-4 activity was authorized by the original audit itself.)
