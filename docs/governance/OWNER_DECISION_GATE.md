# OWNER_DECISION_GATE — AHF Architecture Audit + Spec Kit Adoption

`STATUS: DECISION RECORD — D1/D4/D5 DECIDED 2026-09-14; D2 PENDING; D3 DEFERRED; D6 SAFE_TO_DEFER`
> **Provenance:** placed into the repository 2026-09-14 via `docs/spec-kit-adoption-stage-0` (Stage 0 of the approved migration). Original gate text below is preserved unmodified; decision outcomes are recorded in the block immediately following this header.

## Owner decision record (2026-09-14)

| Decision | Status | Outcome |
|---|---|---|
| **D1 — Adopt Spec Kit brownfield design + authorize Stages 0–3** | **DECIDED / APPROVED — OPTION A** | Thin/by-reference design adopted; Stages 0–3 authorized autonomously; **Stage 4 NOT authorized** |
| **D2 — Stage-4 pilot vehicle** | **NOT YET DECIDED** | Pilot must not start; Workout Experience Specification remains pending separate owner authorization |
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

The original audit stopped here on D1 (BLOCKING). D1 has since been decided (see the Owner decision record above): **APPROVED — OPTION A**, Stages 0–3 authorized. No Spec Kit feature pilot, no implementation work, and no Stage-4 activity is authorized by this document.
