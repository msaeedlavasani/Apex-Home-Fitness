# AHF — GitHub Spec Kit Brownfield Adoption Design

`STATUS: APPROVED — ADOPTED 2026-09-14 (OWNER DECISION D1, OPTION A) — STAGES 0–3 AUTHORIZED; STAGE 4 NOT AUTHORIZED`
> **Provenance:** placed into the repository 2026-09-14 via `docs/spec-kit-adoption-stage-0` (Stage 0 of the approved migration). The owner decision record lives in [`OWNER_DECISION_GATE.md`](./OWNER_DECISION_GATE.md).
Companion to: `AHF-ARCHITECTURE-SCALE-READINESS-AUDIT.md` (evidence base, [`../architecture/AHF-ARCHITECTURE-SCALE-READINESS-AUDIT.md`](../architecture/AHF-ARCHITECTURE-SCALE-READINESS-AUDIT.md))
Date: 2026-09-14. Audit refs: MAIN `ff1202c6`, DEV `prototype/workout-layout-blueprint` @ `a62a7ce`.

---

## 1. Executive Recommendation

**Adopt GitHub Spec Kit as the forward-looking specification layer for feature work — in a deliberately thin, by-reference form that plugs into AHF's existing governance instead of duplicating it. Do not adopt it as a parallel process system.**

Rationale in one paragraph: AHF already owns most of what Spec Kit provides. It has an authoritative agent-behavior file (`AGENTS.md`), a documentation governance system with an explicit authority hierarchy and Find-Before-Create rule (`docs/governance/DOCUMENTATION-GOVERNANCE.md`), exactly one executable backlog (`docs/TASKS.md`), 21 ADRs, machine-validated task profiles (`scripts/governance-runtime.mjs`), release/branch policies, and an incident ledger. What AHF lacks is a **repeatable, artifact-based specification workflow for new features** — today, feature specs are hand-authored one-off documents in `docs/architecture/` (excellent ones: MG-*, AL-*, CP-*), but nothing requires or shapes them for ordinary feature work, and nothing separates "observed current behavior" from "product requirement" in a machine-checkable way. Spec Kit's specify→clarify→plan→tasks→implement flow fills exactly that gap. Everything else Spec Kit ships (constitution, templates) must be converged with the existing documents, not restated.

The adoption is staged, docs-only until Stage 4, reversible at every stage, and gated on one owner decision (see `OWNER_DECISION_GATE.md`).

---

## 2. Adoption Principles

1. **Find-Before-Create applies to Spec Kit too.** `DOCUMENTATION-GOVERNANCE.md` §2.1/§2.2 is authoritative: any Spec Kit artifact that would restate an existing canonical document must reference it instead. The constitution references `AGENTS.md`/`ARCHITECTURE-PRINCIPLES.md`; it does not copy them.
2. **One backlog remains.** `docs/TASKS.md` is the only executable backlog (governance §2.11). Spec Kit `tasks.md` files are per-feature work breakdowns **linked from** a `TASKS.md` entry — they never authorize work on their own.
3. **Forward-looking only.** No retro-speccing of the existing app (the audit's `CURRENT_SYSTEM_BASELINE` doc is the single bounded exception, Phase 13 of the task).
4. **Code = implementation evidence, not intent** (governance §2.6). Specs state requirements; they never "promote" observed behavior into requirements by default.
5. **Workflow classes prevent bureaucracy.** LIGHT work (typos, copy fixes, isolated fixes) never touches Spec Kit artifacts.
6. **Status discipline is mandatory.** Every Spec Kit artifact carries the repo's status vocabulary (`CURRENT / PROPOSED / NOT YET IMPLEMENTED / HISTORICAL / DEPRECATED / SUPERSEDED`, governance §2.3).
7. **Agent/model independence.** All artifacts are version-controlled Markdown; no conversation, agent memory, or model context is the source of truth (this codifies existing governance §2.12 Decision Persistence).
8. **Machine-checkable where cheap.** Extend `scripts/governance-runtime.mjs` (or add a sibling script) to validate Spec Kit artifact presence/status for STANDARD/CRITICAL tasks — the repo already does exactly this for task profiles and report contracts.
9. **No vendor binding.** Spec Kit's prompts/templates are tool-agnostic; nothing in the adoption may assume a specific agent, model, or vendor.
10. **Existing behavior is authoritative; unknown stays unknown.** Inherited from the task brief and `AGENTS.md` §1 status labels (`CURRENT/TARGET/CONSTRAINT/DEBT/UNKNOWN`).

---

## 3. What Spec Kit Should Solve (evidence-based gaps)

1. **A repeatable feature-spec entry point.** Today the quality of MG-01…AL-04/CP-01… specs came from one-off effort; nothing standardizes the next one. Evidence: `docs/TASKS.md` metadata table has no spec-artifact field; `AGENTS.md` PLAN mode is prose, not an artifact.
2. **A bounded clarification loop.** Product open questions exist as separate docs (`docs/product/WORKOUT-EXPERIENCE-V2-OPEN-QUESTIONS.md`); Spec Kit's clarify step gives them a home attached to the spec instead of free-floating files.
3. **Separation of observed behavior vs product requirement.** The audit found doc drift already (React 19 vs ^18; MODULARITY-AUDIT). A baseline doc + per-spec "current state" section with status labels institutionalizes the distinction.
4. **Plan/tasks as reviewable artifacts.** The DEV branch shows 19 commits of prototype iteration with a conformance doc (`WORKOUT-PROTOTYPE-VIEWPORT-CONFORMANCE.md`) — good — but no spec/plan/task breakdown exists to review before promotion from prototype to product. Spec Kit provides that review surface.
5. **Cross-model handoff.** The repo is developed by agents under owner supervision (261/265 commits by one human author + bots; `AI_DEVELOPMENT_SYSTEM.md`). Spec artifacts make "another model can plan/implement" safe because the knowledge lives in-repo (governance §2.12 already mandates persistence; Spec Kit supplies the artifact shapes).
6. **A constitution hook for new contributors/models.** A thin, by-reference constitution gives any new agent (or model) a single entry point to the rules — valuable precisely because the real rules are spread across AGENTS.md + governance + release policy.

## 4. What Spec Kit Must NOT Do

1. **Not become a second authority hierarchy.** `DOCUMENTATION-GOVERNANCE.md` §4 owns precedence; Spec Kit artifacts sit below it.
2. **Not create a parallel backlog or task store** (governance §2.11 violation).
3. **Not retro-spec the existing app** (no "spec the current system" sweep; only the single bounded baseline doc).
4. **Not restate policy.** The constitution must reference, not copy — restatement creates divergence (the React 18/19 drift is the local proof it happens).
5. **Not gate LIGHT work.** No specify/clarify/plan artifacts for typos, copy fixes, isolated visual fixes, low-risk dependency patches, strictly local refactors.
6. **Not replace the task profiles, release policy, or CI policy.** Workflow classes map onto existing profiles (`CODE_NO_DEPLOY`, `PRODUCTION_BOUND`, `DB_CHANGE`…); they do not replace them.
7. **Not touch runtime/deployment.** Adoption itself is docs-only until an owner authorizes the pilot.
8. **Not capture implementation details in specs.** Specs own what/why + acceptance; plans own how-at-a-glance; code owns how. (Failure-mode F-9.)
9. **Not freeze wrong decisions.** Constitution ships as PROPOSED-CANDIDATE with explicit owner ratification; no rule becomes binding by being written.

---

## 5. Proposed Constitution Categories

The constitution is a **router document** (by-reference) plus a small set of Spec-Kit-specific amendments. Category sources are all existing authoritative docs — listed with their canonical owners.

| # | Principle (category) | Source (canonical owner) | Classification |
|---|---|---|---|
| 1 | Reuse first: reuse → extend → compose → create | `AGENTS.md` §3 | **CONFIRMED** (already binding) |
| 2 | One-way dependency direction (Presentation → Domain → Infrastructure) | `ARCHITECTURE-PRINCIPLES.md` §4 | **CONFIRMED** |
| 3 | UI/domain separation; framework-independent core + adapter | `ARCHITECTURE-PRINCIPLES.md` §5; ADR-0002; binding rule §13.4 | **CONFIRMED** |
| 4 | Side-effect isolation with injectable seams | `ARCHITECTURE-PRINCIPLES.md` §6 | **CONFIRMED** |
| 5 | Durable identity over display labels (`exerciseId`) | ADR-0001; `ARCHITECTURE-PRINCIPLES.md` §7 | **CONFIRMED** |
| 6 | Source independence (Program from AI/rules/coach/manual) | `ARCHITECTURE-PRINCIPLES.md` §8 | **CONFIRMED** |
| 7 | Backward-compatible, additive evolution | `ARCHITECTURE-PRINCIPLES.md` §9 | **CONFIRMED** |
| 8 | Explicit public vs internal module boundaries | `ARCHITECTURE-PRINCIPLES.md` §10 | **CONFIRMED** |
| 9 | Documentation with change; status headers; supersession | `DOCUMENTATION-GOVERNANCE.md` §2.3/2.4/2.7 | **CONFIRMED** |
| 10 | Production safety: task complete only at verified checkpoint; real-browser acceptance | `RELEASE_POLICY.md` RULE 1/6/7 | **CONFIRMED** |
| 11 | No silent behavior change; fail-closed over fail-open | RELEASE_POLICY RULE 4 + FEATURE_TO_PRODUCTION §T; AI fallback design (`provider.ts`); privacy posture (TS-01) | **CONFIRMED** |
| 12 | Testing proportionality (targeted verification over repeated full E2E) | `docs/CI.md`; ci.yml/ci-full-e2e.yml split | **CONFIRMED** |
| 13 | Deployment identity (immutable builds, exact-SHA, build-time config distinction) | `RELEASE_POLICY.md` RULE 4/5 | **CONFIRMED** |
| 14 | Privacy/safety boundaries (raw video never leaves device; fitness-not-medical; DATA-ONLY media) | TS-01/ADR-0014, ADR-0021, MG-04 gate | **CONFIRMED** |
| 15 | Localization (en/fa parity; RTL; movement-domain keys per MG-07) | `AGENTS.md` §4/§6; ADR-0010 | **CONFIRMED** |
| 16 | Accessibility & mobile-first behavior (360px, keyboard, reduced motion; mobile posture declaration) | `AGENTS.md` §6; ADR-0005 | **CONFIRMED** |
| 17 | Evidence-before-migration; unknown stays unknown (no migration on synthetic benchmarks alone — working rule) | Task brief; `AGENTS.md` §1 UNKNOWN label; audit §8E runtime-revisit triggers | **CONFIRMED** (as working rule) |
| 18 | Owner escalation at genuine gates (product, tradeoff, irreversible risk) | `AGENTS.md` EXECUTE mode; governance §2.12 | **CONFIRMED** |
| 19 | Spec-first for STANDARD/CRITICAL changes (new — Spec Kit specific) | this design | **CANDIDATE** (needs owner ratification) |
| 20 | Identity-seam discipline: supabase-js confined to the audit's 9-file list; userId opaque outside it (new) | audit §5 C-1; Principle 12 | **CANDIDATE** |
| 21 | Prototype isolation: prototype code stays in `prototype/` namespace until spec treatment (new; DEV branch precedent) | DEV delta; `WORKOUT-PROTOTYPE-VIEWPORT-CONFORMANCE.md` | **CANDIDATE** |
| 22 | State ownership: client state in Dexie via offline contracts; no new localStorage/IndexedDB without KV contract | ADR-0005 Decision item 1, guardrail 2 (= ARCHITECTURE-PRINCIPLES §13.2) | **CONFIRMED** (already binding) |
| 23 | Dependency boundaries: no new runtime dependency without profile + governance note | KIT-FIRST/MUI allowlist pattern; `governance-runtime.mjs` | **CANDIDATE** (generalize the existing pattern) |
| 24 | Security boundaries: CSP relaxation requires documented justification per origin | `next.config.mjs` CSP comments | **CONFIRMED** (pattern exists) |

**NEEDS OWNER APPROVAL** items are exactly: ratifying the constitution file itself (as PROPOSED→ACCEPTED), and any CANDIDATE row. Nothing in the constitution may contradict a higher authority; if it appears to, the authority wins and the constitution is corrected.

---

## 6. LIGHT / STANDARD / CRITICAL Workflow Classes

Mapped onto existing task profiles (`governance-runtime.mjs` profiles in parentheses). The workflow class is declared in the `TASKS.md` entry; the profile remains the machine-checkable contract.

| Dimension | **LIGHT** (docs-only, DOCS_ONLY) | **STANDARD** (CODE_NO_DEPLOY; ordinary feature/fix) | **CRITICAL** (PRODUCTION_BOUND, DB_CHANGE, HOTFIX, auth/AI/security/deployment) |
|---|---|---|---|
| `specify` required? | No | Yes — thin spec (`docs/specs/NNNN-slug/spec.md`) | Yes — full spec |
| `clarify` required? | No | Yes — one pass; open questions recorded or resolved | Yes — owner participates on product questions |
| `plan` required? | No (commit message suffices) | Yes — short plan inside spec or `plan.md` | Yes — separate `plan.md` |
| `tasks` required? | No | Optional — checklist in spec | Yes — `tasks.md` linked from `TASKS.md` entry |
| `analyze` (cross-artifact consistency) required? | No | Optional | Yes (cheap: checklist review of spec↔plan↔tasks) |
| `implement` gate? | Standard validation | Branch CI green | Branch CI + targeted E2E + (if UI) conformance gate |
| `converge` (post-implementation spec sync) required? | n/a | Yes — spec status → CURRENT or NOT YET IMPLEMENTED | Yes + `CURRENT_STATE.md` update if material |
| Test scope | none/relevant | targeted unit + related specs (per `docs/CI.md` matrix) | full affected lanes; full E2E on release path (nightly covers the rest) |
| Review scope | self + governance:check | PR review | PR review + owner report per `AI_CHANGE_TEMPLATE.md` |
| Architecture review? | No | If new module boundary | Required (ADR or explicit "no ADR needed" note) |
| Deployment gate? | No | No (CODE_NO_DEPLOY) | Release policy lifecycle mandatory |
| Owner gate? | No | Only if scope changes | Production/security/schema per existing policy |

Token/bureaucracy guard: a STANDARD spec targets **≤ ~150 lines**; CRITICAL ≤ ~300 before appendices. Clarify rounds are capped at one pass for STANDARD. If a spec grows beyond that, the work is mis-classified or should split.

---

## 7. Agent / Model Independence Strategy

- **Artifacts are the interface.** Spec, plan, tasks, decisions, and statuses live in version-controlled Markdown; any model can pick up any stage. (Already the repo's culture: `AI_CHANGE_TEMPLATE.md`, `HANDOFF.md`, Decision Persistence §2.12.)
- **No conversation is canonical.** Chats may *propose*; only repo artifacts *decide* (governance §2.12: chat history is not durable product knowledge).
- **Stage-tool fit.** Cheaper models can run: artifact validation (`governance-runtime`), checklist conformance, status sweeps, LIGHT execution. Stronger models are for: specify/clarify ambiguity resolution, plan tradeoffs, CRITICAL review. This is guidance, not machinery — no vendor/model-specific config may enter the repo.
- **Handoff contract.** Every Spec Kit artifact ends with a `## Handoff` block: current status, next action, `NEXT_ACTION_AUTONOMOUS` yes/no, blockers — mirroring the existing task-profile fields so `governance-runtime.mjs` can later consume them without new vocabulary.
- **Model-rotation test.** A spec is considered well-formed when a different agent than its author can produce the plan from the spec alone. (Pilot acceptance criterion, §15.)

---

## 8. Proposed Directory & Artifact Structure

Minimum useful structure, adjusted to this repo (Spec Kit's default `.specify/` kept for tooling templates; feature specs live with the docs, not in code):

```text
.specify/                          # Spec Kit tooling templates (version-controlled)
  constitution.md                  # THIN: by-reference router + CANDIDATE amendments (§5)
  templates/                       # spec/plan/tasks templates (Spec Kit defaults, adjusted)
docs/
  specs/                           # NEW home for forward-looking feature specs
    NNNN-slug/
      spec.md                      # what/why + clarifications + acceptance + status header
      plan.md                      # (CRITICAL only) technical approach
      tasks.md                     # (CRITICAL only) checklist; linked FROM docs/TASKS.md
  CURRENT_SYSTEM_BASELINE.md       # one bounded baseline doc (see §9)
docs/adr/                          # unchanged owner of architecture decisions
docs/architecture/                 # unchanged owner of contracts/stabilization records
docs/TASKS.md                      # unchanged — the ONLY executable backlog
```

Rules:

- **Source of truth**: requirements → `docs/specs/…/spec.md`; decisions → `docs/adr/` (or `TASKS.md` decision records for non-architecture); current operational state → `CURRENT_STATE.md`; observed system facts → `CURRENT_SYSTEM_BASELINE.md`.
- **Generated content**: none initially. If Spec Kit tooling generates artifacts later, generated files are reviewed and committed like any doc.
- **Duplication avoidance**: specs link to canonical policy docs; they never restate them. `INDEX.md` gains one new row: "Forward-looking feature specs → docs/specs/".
- **Relationship to existing docs**: `docs/architecture/*` continues to own *contracts and records* (MG/AL/CP); `docs/specs/*` owns *future feature intents* before they become contracts. Promotion path: spec → implementation → (if architecture-relevant) ADR + architecture doc; spec then marked `SUPERSEDED` by the ADR or updated to `CURRENT`.

---

## 9. Current-System Baseline Strategy

One bounded document: `docs/CURRENT_SYSTEM_BASELINE.md` (docs-only change; content is essentially audit §3–§4 distilled, with a strict four-label vocabulary):

- `OBSERVED CURRENT STATE` — verified facts with file evidence (e.g., "SQLite via Prisma; 10 files import `@/lib/prisma`").
- `PRODUCT REQUIREMENT` — stated policy from canonical docs (e.g., "both /en and /fa must always work — AGENTS.md §4").
- `ARCHITECTURAL RULE` — binding rules with their authority (e.g., "session transitions only through sessionCore — ARCHITECTURE-PRINCIPLES §13.4").
- `UNKNOWN / OWNER DECISION` — the audit's U-1…U-5 list.

Anti-goals: it must NOT rewrite history, MUST NOT exceed ~2 pages, and MUST carry `STATUS: CURRENT — snapshot @ <SHA>` with a refresh rule (updated only with `CURRENT_STATE.md` in the same change, or marked stale). This is the single permitted "describe the whole system" artifact; no per-feature retro-specs.

---

## 10. Feature Adoption Rules (what gets full Spec Kit treatment)

**Full treatment (STANDARD or CRITICAL):**
- New user-facing feature or new route (e.g., anything promoting prototype/ code to product).
- Architecture change: new module boundary, new dependency (first `three` case already exists on DEV), new framework-adjacent choice.
- Schema change (`DB_CHANGE` profile) or cross-plane data change (Prisma ↔ Supabase ↔ Dexie).
- New external provider/integration (SMS-like, AI provider addition, storage, identity).
- Significant UX behavior change (e.g., workout session flow semantics — the DEV prototype's exact territory).
- Security-sensitive: auth, CSP change, secrets handling, rate limiting, privacy posture.
- Deployment model change (host, image base, compose topology, gateway).

**LIGHT (no Spec Kit artifacts):**
- Copy/typo/message fixes (both locales updated together).
- Isolated visual fix inside one component with existing primitives (conformance gate still applies if UI).
- Low-risk dependency patch (same major, no API change).
- Strictly local refactor with no contract change (typecheck+tests green).
- Docs-only changes (existing `DOCS_DIRECT_MAIN` path covers eligibility).

Tie-breaker rule: when unsure, STANDARD; when the change touches auth/AI/schema/deployment/production, CRITICAL. The class is declared in the `TASKS.md` entry and is reviewable.

---

## 11. Migration Stages (each: scope / files touched / risk / rollback / acceptance)

**Stage 0 — Baseline + branch** *(docs-only; can use `DOCS_DIRECT_MAIN` eligibility rules)*
- Scope: land `AHF-*` audit reports + this design under `docs/` (or keep owner-side copies; owner choice); record the owner decision on the gate doc.
- Files: new docs only. Risk: ~zero. Rollback: delete files (no code refs).
- Acceptance: `npm run governance:check` green; `INDEX.md` rows added; statuses correct.

**Stage 1 — Spec Kit scaffolding (manual, reviewed)**
- Scope: add `.specify/templates/` (adjusted Spec Kit templates) + `docs/specs/` with a README; **manual authorship of templates, not an unreviewed `specify init` mutation of the tree**. If the CLI is used, it runs on a task branch and its diff is reviewed like code.
- Files: `.specify/`, `docs/specs/README.md`, `INDEX.md` row. Risk: low (no machine-consumed governance yet). Rollback: revert branch.
- Acceptance: governance:check green; no other file touched by tooling.

**Stage 2 — Candidate Constitution**
- Scope: `.specify/constitution.md` as by-reference router (CONFIRMED items cite their canonical owner) + CANDIDATE items 19–21/23 marked PROPOSED. NOT binding until owner ratifies.
- Files: 1. Risk: low; explicit non-binding status prevents accidental authority. Rollback: delete or mark HISTORICAL.
- Acceptance: cross-check by a second agent against `AGENTS.md`/governance (contradiction list empty).

**Stage 3 — Current-system baseline**
- Scope: `docs/CURRENT_SYSTEM_BASELINE.md` from audit §3–4 + UNKNOWN list.
- Files: 1. Risk: low (must not contradict `CURRENT_STATE.md` — cross-linked, different purposes). Rollback: delete.
- Acceptance: four-label vocabulary used; every claim cites a file.

**Stage 4 — One bounded pilot (first non-docs step; requires owner authorization of the pilot task itself)**
- Scope: run the STANDARD flow on the next authorized design-stage task — recommended: **Workout Experience Specification** (the existing `NEXT_AUTHORIZED_TASK` in `docs/TASKS.md`), consuming the DEV prototype as evidence. Output: `docs/specs/NNNN-workout-experience/spec.md` (+ clarifications), no runtime change.
- Files: docs only (spec); optional plan checklist. Risk: low. Rollback: mark spec HISTORICAL.
- Acceptance: model-rotation test (§7) passes; owner confirms spec matches product intent; open questions either resolved by owner or recorded.

**Stage 5 — Friction review**
- Scope: owner + agents review the pilot: token cost, artifacts overhead, where the process helped/hurt; adjust workflow-class thresholds and templates.
- Files: templates + this design's amendments. Rollback: revert.

**Stage 6 — Default workflow adoption**
- Scope: make STANDARD the default for qualifying tasks in `TASKS.md` metadata (`SPEC_CLASS: LIGHT/STANDARD/CRITICAL` field), extend `governance-runtime.mjs` to validate spec presence/status for STANDARD/CRITICAL profiles, and add the identity-seam + prototype-isolation rules to the ratified constitution.
- Files: `TASKS.md` metadata convention, 1 script, constitution status flip. Risk: medium-low (machine governance changes are explicitly called out in governance §2.13 as requiring care — this is a separately authorized tooling task). Rollback: revert script + metadata convention.

Sequencing note: Stages 0–3 are pure docs and could land as one batch (existing BATCH_5 policy allows docs batching) — but each remains independently revertible.

---

## 12. Rollback Strategy (adoption-level)

- Everything is additive Markdown until Stage 6. Any stage can be abandoned by marking artifacts `HISTORICAL` (not deleting — governance §2.5 Historical Preservation) or by reverting the docs branch.
- The constitution never gains authority without an explicit owner ratification record (Decision Persistence §2.12) — so "rollback" of authority is simply never ratifying, or a later `SUPERSEDED` decision.
- If Spec Kit proves net-negative at Stage 5, the residue is: a useful baseline doc, a useful constitution router (if ratified), and one spec — all independently valuable regardless of Spec Kit tooling fate. Adoption is designed so failure is cheap.

---

## 13. Failure Modes & Prevention / Detection / Recovery

| Failure mode | Prevention | Detection | Recovery |
|---|---|---|---|
| F-1 Invented requirements (agent hallucinates product intent) | Spec must cite `PRODUCT-VISION`/`TASKS.md`/owner input for every requirement; clarify round forces owner eyes on product claims | Owner review at Stage 4+; model-rotation test | Correct spec; mark correction in spec changelog; if implemented, treat as behavior-change task |
| F-2 Stale specs | Status headers mandatory; converge step (§6) after implementation; `SUPERSEDED` must name successor | governance check on spec status for linked tasks; INDEX sweep | Update status in the same change that lands code (Documentation With Change) |
| F-3 Code/spec divergence | Converge step; specs describe contracts, not internals | Contract tests (repo already has many) flag behavior drift | Either spec was wrong (update) or code is (bug) — decide explicitly |
| F-4 Duplicate docs (parallel sources of truth) | Find-Before-Create applies; specs link, never restate; single new home `docs/specs/` | `INDEX.md` ownership table; second-agent cross-check | Merge content into canonical owner; mark duplicate HISTORICAL |
| F-5 Excessive bureaucracy / token waste | Workflow classes; line budgets (§6); LIGHT exempt | Friction review (Stage 5); task metadata reports time-to-merge | Reclassify thresholds; simplify templates |
| F-6 Workflow bypass (implementing without spec) | `TASKS.md` class field + Stage-6 machine check | governance-runtime validation on task profile | Revert-or-spec decision by owner; incident note if production-bound |
| F-7 Bad assumption becomes constitutional rule | Constitution ships PROPOSED; CANDIDATE items separate from CONFIRMED; owner ratification required | Stage-2 second-agent contradiction check | Amend constitution via explicit decision; ADR if architecture-relevant |
| F-8 Agent hallucination generally | Evidence citations in specs/baseline; UNKNOWN label required instead of guessing | Review; tests | Correct artifact; the four-label vocabulary makes guesses visible |
| F-9 Implementation details polluting specs | Template structure: spec owns what/why/acceptance; plan owns approach | Review checklist item | Move content to plan/ADR; spec slims down |
| F-10 Frozen wrong decisions | Decision Persistence records status + review conditions; "revisit trigger" fields (audit §9 pattern) | Trigger conditions surface in pre-task gate | New decision supersedes; ADR chain preserved |

---

## 14. Pilot Recommendation

**Primary pilot: the Workout Experience Specification** — the task `docs/TASKS.md` already names as `NEXT_AUTHORIZED_TASK` ("Workout Experience Specification after AHF Design Brain vNext P0 approval"), executed as a **design-only (CODE_NO_DEPLOY) STANDARD-class Spec Kit flow**.

Why it satisfies every pilot criterion:

- **Meaningful**: it is the actual next product step; the DEV branch (`prototype/workout-layout-blueprint`, 19 commits, 3D mentor, rest/intro/complete stages) is its evidence base — the spec formalizes what the prototype explored.
- **Reversible**: output is one spec doc; no runtime change.
- **Representative**: exercises specify→clarify→(light plan)→owner review — the core value loop; it also stress-tests the "observed prototype behavior ≠ product requirement" separation, the riskiest failure mode here.
- **Easy to validate**: governance:check + owner read + model-rotation test.
- **Low blast radius**: zero code touched; the prototype branch stays isolated.

**Alternative pilot** (if the owner prefers a code-touching trial): TS port of one quiz step component (`R-03` WHEN-TOUCHED item) — bounded and testable, but it carries behavior-parity risk and burns the WHEN-TOUCHED opportunity on process testing; **recommended against** as the first pilot.

**If no pilot were acceptable**, the honest fallback is: adopt Stages 0–3 only (baseline + constitution + templates) and revisit after the next real feature is authorized. The design degrades gracefully.

---

## 15. Pilot Acceptance Criteria (for Stage 4)

1. Spec exists at `docs/specs/NNNN-workout-experience/spec.md` with status header, four-label usage, and every requirement either owner-sourced or explicitly `UNKNOWN / OWNER DECISION`.
2. Clarify pass produced ≤ 10 open questions, each with an owner-decision or evidence path.
3. A model other than the spec's author produced a plan outline from the spec alone (recorded).
4. `governance:check` green; `INDEX.md` updated; no application file changed.
5. Owner confirms the spec matches product intent (or amends it) — this confirmation is the pilot's exit gate.

---

## 16. Owner Decisions Required (summary; details in `OWNER_DECISION_GATE.md`)

- **D1 (BLOCKING)**: Adopt the brownfield Spec Kit design (constitution-by-reference + `docs/specs/` + workflow classes) and authorize Stages 0–3 as docs-only work.
- **D2 (NON-BLOCKING)**: Pilot vehicle = Workout Experience Specification (recommended) vs alternative vs no pilot (Stages 0–3 only).
- **D3 (NON-BLOCKING)**: Scheduling of the Supabase/Principle-12 dependency-criticality evaluation (affects constitution item 20's priority).
- **D4 (SAFE_TO_DEFER)**: Postgres trigger runbook approval — could be folded into Stage 0 docs if desired.
- **D5 (SAFE_TO_DEFER)**: Runtime (Bun) revisit triggers — documented in audit §8; no action.
- **D6 (SAFE_TO_DEFER)**: Quiz TS port timing — stays WHEN-TOUCHED.

## 17. Exact Proposed Next Step

Upon owner approval of D1: create task branch `docs/spec-kit-adoption-stage-0` implementing Stage 0 (audit + design + gate docs into `docs/`, `INDEX.md` rows, statuses) followed by Stages 1–3 in the same or a subsequent docs-only change, each with `npm run governance:check` and a close-out report per `AI_CHANGE_TEMPLATE.md`. No Spec Kit CLI, no code, no config, no dependencies. The pilot (Stage 4) starts only when the owner authorizes the Workout Experience Specification task.
