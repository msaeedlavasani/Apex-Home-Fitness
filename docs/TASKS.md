# Executable Backlog

> **STATUS: CURRENT — THE ONLY CANONICAL EXECUTABLE BACKLOG**
>
> A task appears here only after explicit owner authorization. Product visions,
> roadmaps, audits, risk registers, open questions, and architecture plans are
> advisory or decision records; they cannot authorize execution.
>
> **Recomposed 2026-09-01** (`AHF-FB-20260901-TASKS-RECOMPOSITION`) from the
> persisted product strategy ([`product/PRODUCT-STRATEGY.md`](product/PRODUCT-STRATEGY.md))
> and current repository state. Priority ≠ execution eligibility: a P0 task
> may still require an architecture gate or Owner decision before it is
> autonomous-eligible. The Owner lifted the AHF execution freeze on
> 2026-09-01, but **execution has NOT started** — nothing here authorizes
> or begins implementation. Task selection requires a subsequent explicit
> Owner instruction.

## Lifecycle now

| Field | Value |
|---|---|
| Active task | `NONE` — AL-01…AL-04, CP-01, CP-02, TS-01, TS-04, CP-03, TS-03 DELIVERED/CLOSED (CP-03 closed 2026-09-05: findings DECIDED Approach A; measurement gate EXECUTED for the iPhone Chrome squat cell — 9/10 = 90% PASS — all other matrix cells honestly NOT_MEASURED; TS-03 delivered same day as CODE_NO_DEPLOY — irreversible confirmation-gated account deletion, ADR-0020, Production deletion acceptance Owner-gated); no task is currently active |
| Profile | `CODE_NO_DEPLOY` |
| Branch | (none) |
| State | `READY` — backlog P0–P4 fully CLOSED or gated: AL/MG/CP-01/CP-02/CP-03/TS-01/TS-03/TS-04 CLOSED; remaining candidates all gated — **TS-05** (dep TS-02 = HUMAN_GATE legal), **CP-04** (HUMAN_GATE camera authorization), CP-05/CP-06/CP-07/MO-01/SU-01 NOT_YET; **no further autonomous-READY task with satisfied dependencies remains**. BATCH_5 delivery mode in force (2026-09-04); TS-03 was delivered via the batch lifecycle (sole eligible member — every other candidate hit a dependency/Human/Production gate) |
| Production-bound | `NO` — autonomous execution covers READY `CODE_NO_DEPLOY`/docs tasks only; Production applies remain gated (OWNER_DECISION_GATE + gateway environment) |
| Next authorized task | **None autonomously executable.** TS-03 was executed CODE_NO_DEPLOY 2026-09-05 (delivered; Production apply gated). Remaining candidates all gated: **TS-05** needs TS-02 (HUMAN_GATE — legal review); **CP-04** HUMAN_GATE (camera authorization); CP-05/CP-06/CP-07/MO-01/SU-01 NOT_YET. Continuing requires an Owner decision (e.g., promote a NOT_YET task, authorize CP-04 architecture, or execute the TS-03 Production deletion acceptance via the gateway) |
| Pending owner review | **TS-03 Production deletion acceptance (OWNER_DECISION_GATE — CODE_NO_DEPLOY delivered; real deletion against the Production Supabase project + acceptance requires explicit Owner authorization + gateway environment)**; MG-09 Production apply (OWNER_DECISION_GATE); optional CP-03 remaining measurement matrix (NOT_MEASURED cells — zero backlog impact); `ADMIN-IMPERSONATION-01` deferred |

## Strategic basis

The recomposition uses the proposed product promise as the prioritization
lens: **«تو ورزش کن؛ ما حواسمون بهت هست.»** The candidate moat is the
accumulated closed-loop knowledge across
**User ↔ Movement ↔ Workout ↔ Observation ↔ Outcome ↔ Adaptation**.

Five strategic pillars drive the priority model:

1. **Apex Movement Graph / Exercise Intelligence** (P0 — moat foundation)
2. **Personal Movement Profile** (P1 — closes the adaptive loop)
3. **Apex Adaptive Training Graph** (P1 — decision layer)
4. **Apex Companion** (P2 — the tangible experience)
5. **Trust, Safety & Knowledge Surface** (P3 — public/trust layer)

Full rationale: [`product/PRODUCT-STRATEGY.md`](product/PRODUCT-STRATEGY.md),
[`product/MOVEMENT-INTELLIGENCE-STRATEGY.md`](product/MOVEMENT-INTELLIGENCE-STRATEGY.md).

## Priority model

| Priority | Meaning | Strategic focus |
|---|---|---|
| **P0** | MOAT / CORE FOUNDATION | Movement knowledge, canonical identity, taxonomy, self-hosting/resilience |
| **P1** | CLOSE THE ADAPTIVE LOOP | Personal profile, workout outcomes, adaptation inputs, decision logic |
| **P2** | DELIVER THE COMPANION EXPERIENCE | Guidance, observation signals, pose/form capability, Workout V2 |
| **P3** | TRUST, SAFETY & KNOWLEDGE | Privacy architecture, safety framework, public surfaces, knowledge/blog |
| **P4** | SUPPORTING / LOWER-MOAT | Useful work that does not materially strengthen the moat |

**Priority ≠ autonomous execution eligibility.** Metadata per task:

| Field | Values |
|---|---|
| `PRIORITY` | P0–P4 |
| `DEPENDENCIES` | task IDs or `NONE` |
| `AUTONOMOUS_ELIGIBILITY` | `READY` / `NOT_YET` / `HUMAN_GATE` / `RESEARCH_ONLY` |
| `PARALLEL_SAFETY` | `SAFE` / `CLAIM_REQUIRED` / `SERIAL_ONLY` |
| `PRODUCTION_SENSITIVITY` | `NONE` / `RELEASE_ONLY` / `PROD_SENSITIVE` |
| `DB_SENSITIVITY` | `NONE` / `SCHEMA` / `DATA` / `SCHEMA_AND_DATA` |
| `ARCHITECTURE_GATE` | `NONE` / `REQUIRED` |
| `OWNER_DECISION_GATE` | present where applicable |

## Dependency graph

```
P0: Movement Graph foundations
  MG-01 canonical schema/domain contract
    → MG-02 taxonomy design
      → MG-03 provenance/source contract
        → MG-04 ingestion architecture
          → MG-05 normalization/dedup + identity resolution
            → MG-06 relationship model (progression/regression/substitution)
              → MG-07 localization + media architecture
                → MG-08 catalog validation + legacy seed reconciliation
                  → MG-09 Production migration/adoption (governed)

P1: Adaptive loop (depends on MG-06+)
  AL-01 workout outcome/feedback model
    → AL-02 Personal Movement Profile data contract
      → AL-03 adaptation input pipeline
        → AL-04 Adaptive Training Graph decision layer

P2: Companion (depends on AL-01+, privacy/safety prerequisites)
  CP-01 Companion architecture + UX behavior spec
    → CP-02 observation signal model (rep/phase tracking)
    → CP-03 pose/form technical feasibility spike (RESEARCH_ONLY)
    → CP-04 privacy-preserving camera architecture
      → CP-05 Workout Experience V2 integration

P3: Trust/Safety/Knowledge
  TS-01 privacy/safety architecture (prerequisite for CP-04)
  TS-02 safety/liability framework + legal surface requirements
  TS-03 account/data deletion
  TS-04 Knowledge/Journal architecture (connected to MG)
  TS-05 public trust pages (About/Contact/Support/FAQ)

P4: Supporting
  SU-01 remaining lower-moat feature breadth (deferred, not deleted)
```

---

## Mission Queue — P0: MOAT / CORE FOUNDATION

### MG-01 — Movement Graph canonical schema / domain contract — **DELIVERED / CLOSED 2026-09-01**

| Field | Value |
|---|---|
| PRIORITY | P0 |
| DEPENDENCIES | NONE |
| AUTONOMOUS_ELIGIBILITY | `READY` (architecture-gated) |
| PARALLEL_SAFETY | `SAFE` |
| PRODUCTION_SENSITIVITY | `NONE` |
| DB_SENSITIVITY | `SCHEMA` (new tables; additive migration) |
| ARCHITECTURE_GATE | `REQUIRED` |
| STATUS | **DELIVERED / CLOSED** — PR #25 merged `b5cf1a9`; Main CI PASS on exact SHA (run 33564496192); branch `feat/mg-01-movement-graph-contract` retired. No Production/DB/UI change; no deployment (`CODE_NO_DEPLOY`). |

**Authorization (2026-09-01):** Owner explicit instruction — START MG-01
(TASK DELTA). `TASK_PROFILE=CODE_NO_DEPLOY`; `BRANCH=feat/mg-01-movement-graph-contract`.
MG-02+ NOT authorized; this task's scope is the domain contract only.

**Objective:** define the canonical Movement Graph domain contract — the
type-level schema for a movement knowledge object (identity, taxonomy
fields, relationship edges, provenance, versioning, localization keys).

**Inputs:** the strategy's Movement Graph field list (see
[`product/MOVEMENT-INTELLIGENCE-STRATEGY.md`](product/MOVEMENT-INTELLIGENCE-STRATEGY.md) §1);
the existing `src/lib/exercise/catalog.ts` contracts (S-06 decision: catalog
= canonical); the current Prisma schema.

**Output:** a pure TypeScript domain module (`src/lib/movement/types.ts` or
equivalent) + a written contract doc; NO database migration in this task.

**Acceptance:** the domain module compiles; the contract doc lists every
field with its type and provenance requirement; the existing exercise
catalog can be expressed in terms of the new types (mapping documented);
typecheck + lint pass; no runtime behavior change.

**Stop conditions:** if the schema requires destructive changes to the
existing `Exercise` model, STOP and escalate to the Owner.

---

### MG-02 — Movement taxonomy design — **DELIVERED / CLOSED 2026-09-01**

| Field | Value |
|---|---|
| PRIORITY | P0 |
| DEPENDENCIES | MG-01 |
| AUTONOMOUS_ELIGIBILITY | `READY` |
| PARALLEL_SAFETY | `SAFE` |
| PRODUCTION_SENSITIVITY | `NONE` |
| DB_SENSITIVITY | `NONE` |
| ARCHITECTURE_GATE | `REQUIRED` |
| STATUS | **DELIVERED / CLOSED** — PR #26 merged `36e68ce`; Main CI PASS on exact SHA; branch `feat/mg-02-movement-taxonomy` retired. No Production/DB/UI change; no deployment (`CODE_NO_DEPLOY`). |

**Authorization (2026-09-01):** Owner explicit instruction — EXECUTE MG-02
(TASK DELTA). `TASK_PROFILE=CODE_NO_DEPLOY`; `BRANCH=feat/mg-02-movement-taxonomy`.
MG-03+ NOT authorized; builds on the MG-01 domain contract (unchanged).

**Objective:** define the canonical taxonomy vocabulary — movement patterns,
muscle groups (primary/secondary), equipment types, difficulty tiers, impact
levels, unilateral/bilateral, home-suitability ratings — as closed enums with
FA/EN display mappings.

**Inputs:** MG-01 domain contract; the existing catalog's implicit taxonomy;
standard exercise-science references.

**Output:** a taxonomy module (`src/lib/movement/taxonomy.ts`) with typed
enums + display-name maps; a doc listing each term with its FA/EN rendering.

**Acceptance:** all enums are exhaustive for the current catalog's needs;
FA/EN mappings present for every term; no `any` types; typecheck + lint pass.

---

### MG-03 — Source/provenance contract — **DELIVERED / CLOSED 2026-09-01**

| Field | Value |
|---|---|
| PRIORITY | P0 |
| DEPENDENCIES | MG-01 |
| AUTONOMOUS_ELIGIBILITY | `READY` |
| PARALLEL_SAFETY | `SAFE` |
| PRODUCTION_SENSITIVITY | `NONE` |
| DB_SENSITIVITY | `NONE` |
| ARCHITECTURE_GATE | `REQUIRED` |
| STATUS | **DELIVERED / CLOSED** — PR #27 merged `0eac3c2`; Main CI PASS on exact SHA; branch `feat/mg-03-source-provenance` retired. No Production/DB/UI change; no deployment (`CODE_NO_DEPLOY`). |

**Authorization (2026-09-01):** Owner explicit instruction — EXECUTE MG-03
(TASK DELTA). `TASK_PROFILE=CODE_NO_DEPLOY`; `BRANCH=feat/mg-03-source-provenance`.
MG-04+ NOT authorized; builds on the MG-01 domain contract (unchanged) and
MG-02 vocabulary.

**Objective:** define the provenance metadata contract — every movement
knowledge object carries its source (URL/license), ingestion timestamp,
hash, and confidence level. This is the audit trail for the self-hosting
requirement: the canonical catalog must be traceable to its upstream sources.

**Inputs:** MG-01 domain contract; the self-hosting/resilience principle
([`product/PRODUCT-STRATEGY.md`](product/PRODUCT-STRATEGY.md) §6).

**Output:** a provenance module (`src/lib/movement/provenance.ts`) + a doc
defining the required fields and the license-compatibility rules for
upstream sources.

**Acceptance:** the provenance type covers source identity, license, hash,
and confidence; the doc states which upstream licenses are acceptable for
import (permissive/attribution) and which are not; typecheck passes.

---

### MG-04 — Ingestion architecture (governed pipeline) — **DELIVERED / CLOSED 2026-09-01**

| Field | Value |
|---|---|
| PRIORITY | P0 |
| DEPENDENCIES | MG-02, MG-03 |
| AUTONOMOUS_ELIGIBILITY | `READY` (gate RESOLVED) |
| PARALLEL_SAFETY | `SERIAL_ONLY` |
| PRODUCTION_SENSITIVITY | `NONE` |
| DB_SENSITIVITY | `DATA` (writes new catalog records) |
| ARCHITECTURE_GATE | `REQUIRED` |
| OWNER_DECISION_GATE | **RESOLVED 2026-09-01** — source selected: free-exercise-db (Unlicense = permissive per MG-03); media posture DATA-ONLY (all media deferred to MG-07). Decision: [`architecture/MG-04-DECISION-GATE-SOURCE-SELECTION.md`](architecture/MG-04-DECISION-GATE-SOURCE-SELECTION.md) §7. |
| STATUS | **DELIVERED / CLOSED** — PR #28 merged `0ec424d`; Main CI PASS on exact SHA; branch `feat/mg-04-ingestion-pipeline` retired. Pipeline implemented as code, runnable in dry-run (pinned free-exercise-db snapshot `a859101d`, 876 entries); data-only; no Production/DB write; no deployment (`CODE_NO_DEPLOY`). |

**Objective:** implement the governed ingestion pipeline: external permitted
sources → ingest → normalize → deduplicate → identity resolution → Apex
canonical taxonomy → relationship enrichment → localization → media
validation → versioned Movement Graph. This is the pipeline from the
strategy §5, implemented as code (scripts + modules), NOT executed against
Production in this task.

**Inputs:** MG-02 taxonomy, MG-03 provenance contract; a selected upstream
source (requires Owner decision on which source(s) to use and their licenses).

**Output:** the ingestion pipeline as a runnable script/module with dry-run
mode; normalized intermediate format; dedup/identity-resolution logic.

**Acceptance:** the pipeline runs in dry-run mode against a sample source;
the output conforms to the MG-01 domain contract; identity resolution is
fail-closed (ambiguity surfaces, never guesses — the S02-E lesson); no
Production writes.

**Stop conditions:** if source licensing is unclear, STOP and escalate.

---

### MG-05 — Normalization / deduplication / identity resolution — **DELIVERED / CLOSED 2026-09-01**

| Field | Value |
|---|---|
| PRIORITY | P0 |
| DEPENDENCIES | MG-04 |
| AUTONOMOUS_ELIGIBILITY | `READY` |
| PARALLEL_SAFETY | `SERIAL_ONLY` |
| PRODUCTION_SENSITIVITY | `NONE` |
| DB_SENSITIVITY | `DATA` |
| ARCHITECTURE_GATE | `NONE` |
| OWNER_DECISION_GATE | Where ambiguous identities require Owner resolution (issuance of an ambiguity report; resolution decisions deferred to Owner) |
| STATUS | **DELIVERED / CLOSED** — PR #29 merged `a22d967`; Main CI PASS on exact SHA; branch `feat/mg-05-identity-resolution` retired. Deterministic FA/EN normalization + S02-E-model classifier (AUTO/ALIAS/AMBIGUOUS/UNRESOLVED), dedup + collision evidence report; `Side-Lying Leg Lift` AMBIGUOUS regression preserved; fuzzy tier emits suggestions only. No Production/DB/UI change; no deployment (`CODE_NO_DEPLOY`). |

**Objective:** implement the normalization and identity-resolution stages:
name normalization (FA/EN), alias handling, fuzzy matching with a
deterministic classifier, and fail-closed ambiguity surfacing.

**Inputs:** MG-04 pipeline; the S02-E classifier
(`scripts/gateway-db-ops/lib/classify.mjs`) as the proven pattern.

**Output:** the normalization + identity-resolution stages integrated into
the pipeline; an ambiguity report format matching the S02-E evidence model.

**Acceptance:** the classifier is deterministic (same input → same output);
ambiguous identities produce a report entry (never auto-resolve); the
`Side-Lying Leg Lift` case from S02-E would be flagged AMBIGUOUS by the new
classifier (regression test); unit tests pass.

---

### MG-06 — Relationship model (progression / regression / substitution) — **DELIVERED / CLOSED 2026-09-01**

| Field | Value |
|---|---|
| PRIORITY | P0 |
| DEPENDENCIES | MG-05 |
| AUTONOMOUS_ELIGIBILITY | `READY` |
| PARALLEL_SAFETY | `SAFE` |
| PRODUCTION_SENSITIVITY | `NONE` |
| DB_SENSITIVITY | `DATA` (relationship edges) |
| ARCHITECTURE_GATE | `NONE` |
| STATUS | **DELIVERED / CLOSED** — PR #30 merged `e83a6ec`; Main CI PASS on exact SHA; branch `feat/mg-06-relationship-model` retired. Typed progression/regression/substitution edges + fail-closed deterministic validation (no cycles/dangling/self-loops/duplicates; mirrored inverse pairs = one edge); expressibility exemplars over real canonical slugs. Edges modeled/validated in code only — no DB write; no Production/DB/UI change; no deployment (`CODE_NO_DEPLOY`). |

**Objective:** implement the relationship model: typed edges between
movement knowledge objects for progression (harder variants), regression
(easier variants), and substitution/alternative (functionally similar,
equipment/impact/constraint driven). These edges enable the Adaptive
Training Graph and Companion to make contextual decisions later.

**Inputs:** MG-05 normalized catalog; the strategy's relationship model
([`product/MOVEMENT-INTELLIGENCE-STRATEGY.md`](product/MOVEMENT-INTELLIGENCE-STRATEGY.md) §2).

**Output:** the relationship module (`src/lib/movement/relationships.ts`)
with typed edges + validation (no cycles, no dangling references).

**Acceptance:** all three relationship types are modeled; validation rejects
cycles and dangling refs; the existing catalog can express at least one
example of each relationship type; unit tests pass.

---

### MG-07 — Localization + media architecture — **DELIVERED / CLOSED 2026-09-01**

| Field | Value |
|---|---|
| PRIORITY | P0 |
| DEPENDENCIES | MG-06 |
| AUTONOMOUS_ELIGIBILITY | `READY` |
| PARALLEL_SAFETY | `SAFE` |
| PRODUCTION_SENSITIVITY | `RELEASE_ONLY` (media delivery) |
| DB_SENSITIVITY | `NONE` |
| ARCHITECTURE_GATE | `REQUIRED` |
| STATUS | **DELIVERED / CLOSED** — PR #31 merged `1d7b8d0`; Main CI PASS on exact SHA; branch `feat/mg-07-localization-media` retired. Localization key grammar + coverage validator + self-hosted media manifest (sha256 integrity, no-third-party-CDN rules, fallbacks); ADR-0010 ACCEPTED. NO media imported (DATA-ONLY posture respected); no Production/DB/UI change; no deployment (`CODE_NO_DEPLOY`). |

**Objective:** define the FA/EN localization model for movement knowledge
objects and the self-hosted media architecture (required exercise media
served from AHF-controlled infrastructure, not third-party CDNs).

**Inputs:** MG-06 catalog with relationships; the self-hosting/resilience
principle; the existing `ASSETS.md` media contract.

**Output:** localization key structure integrated into the domain module;
a media manifest format (asset ID, hash, self-hosted URL, fallback);
documentation of the media delivery architecture.

**Acceptance:** every user-facing field has a localization key; the media
manifest format supports content-hash verification; the architecture doc
states the resilience requirement (loss of upstream connectivity must not
break core workout execution); no third-party CDN dependencies.

---

### MG-08 — Catalog validation + legacy seed reconciliation — **DELIVERED / CLOSED 2026-09-01**

| Field | Value |
|---|---|
| PRIORITY | P0 |
| DEPENDENCIES | MG-07 |
| AUTONOMOUS_ELIGIBILITY | `READY` |
| PARALLEL_SAFETY | `SERIAL_ONLY` |
| PRODUCTION_SENSITIVITY | `PROD_SENSITIVE` (reads Production seed data) |
| DB_SENSITIVITY | `DATA` (reads; writes only via governed migration — NOT executed in this task) |
| ARCHITECTURE_GATE | `NONE` |
| OWNER_DECISION_GATE | Reconciliation mapping decisions (report issued; decisions deferred to Owner) |
| STATUS | **DELIVERED / CLOSED** — PR #32 merged `db7c3a1`; Main CI PASS on exact SHA; branch `feat/mg-08-reconciliation` retired. MAPPED/AMBIGUOUS/UNRESOLVED engine over canonical (72/2/0) + recorded S02-E (8/1/0) corpora; catalog collisions surfaced (`side-lying leg lift`, `glute bridge`); `EXERCISE-CATALOG-DISAMBIGUATION-01` ABSORBED; governed migration plan documented, NOT executed. No Production read/write; no catalog data mutated; no Production/DB/UI change; no deployment (`CODE_NO_DEPLOY`). |

**Objective:** validate the versioned Movement Graph against the current
Production seed exercises. Every seed record passes through catalog
reconciliation: existing slugs are NOT assumed permanently canonical. This
includes the `Side-Lying Leg Lift` ambiguity (preserved from S02-E) and the
`EXERCISE-CATALOG-DISAMBIGUATION-01` deferred debt.

**Inputs:** MG-07 versioned catalog; the Production exercise corpus
(read-only via the gateway dry-run); the S02-E ambiguity report.

**Output:** a reconciliation report mapping each Production seed record to
its Movement Graph identity (or flagging it for Owner resolution); the
`EXERCISE-CATALOG-DISAMBIGUATION-01` debt resolved or re-scoped.

**Acceptance:** every Production exercise record has a reconciliation status
(MAPPED / AMBIGUOUS / UNRESOLVED); the `Side-Lying Leg Lift` ambiguity is
surfaced with candidates (never guessed); the report is deterministic;
a governed DB migration plan exists for adopting the reconciled catalog.

**Re-evaluation of `EXERCISE-CATALOG-DISAMBIGUATION-01`:** this task
**absorbs** the deferred disambiguation work. The alias collision is a
symptom of the seed catalog's lack of canonical identity — the rebuilt
Movement Graph resolves it structurally. The deferred task is superseded by
MG-08 (traceability preserved: the original proposal remains in the
PROPOSED section below with an "absorbed into MG-08" note).

---

### MG-09 — Production migration / adoption (governed) — **DELIVERED / CLOSED 2026-09-01**

> **Lifecycle:** authorized 2026-09-01 → additive migration + governed data
> migration runner + fail-safe runtime switchover delivered (PR #33 merged
> `93e3c20`, Main CI PASS on exact SHA; ADR-0011 ACCEPTED). Rehearsal
> evidence produced locally: dry-run PASS (74 planned / 5 linked / Side-Lying
> Leg Lift AMBIGUOUS surfaced) → apply PASS (idempotent; Exercise rows
> untouched; DB hash before/after recorded). **Production apply is NOT part
> of this delivery** — it requires the recorded `OWNER_DECISION_GATE`
> (dry-run evidence + explicit apply authorization) and the gateway
> environment (server-side/root-only; Docker unavailable in the workspace).
> The runtime switchover is fail-safe: until the Production migration+data
> migration are applied, `isMovementGraphAdopted()` is false and the legacy
> path serves unchanged.

| Field | Value |
|---|---|
| PRIORITY | P0 |
| DEPENDENCIES | MG-08 |
| AUTONOMOUS_ELIGIBILITY | `HUMAN_GATE` (requires Owner authorization for DB mutation) |
| PARALLEL_SAFETY | `SERIAL_ONLY` |
| PRODUCTION_SENSITIVITY | `PROD_SENSITIVE` |
| DB_SENSITIVITY | `SCHEMA_AND_DATA` |
| ARCHITECTURE_GATE | `REQUIRED` |
| OWNER_DECISION_GATE | Required (dry-run evidence + explicit apply authorization) |

**Objective:** adopt the versioned Movement Graph in Production through a
governed migration: additive Prisma migration for the new tables, data
migration from the reconciled catalog, and runtime switchover from the seed
catalog to the Movement Graph. Uses the established gateway `db-operation`
contract (dry-run → evidence → apply).

**Inputs:** MG-08 reconciliation report; the gateway `db-operation`
capability; the additive-migration discipline.

**Output:** the Production database with the Movement Graph tables populated
from the reconciled catalog; the runtime reading from the Movement Graph.

**Acceptance:** the additive migration applies cleanly (no destructive
changes); the data migration preserves every existing exercise reference;
the runtime serves workout content from the Movement Graph; Production
acceptance passes (real-browser); rollback path proven; DB hash before/after
recorded.

---

## Mission Queue — P1: CLOSE THE ADAPTIVE LOOP

### AL-01 — Workout outcome / feedback model — **DELIVERED / CLOSED 2026-09-03**

| Field | Value |
|---|---|
| PRIORITY | P1 |
| DEPENDENCIES | MG-06 (relationship model for contextual outcomes) |
| AUTONOMOUS_ELIGIBILITY | `READY` (contract-level; no DB migration) |
| PARALLEL_SAFETY | `SAFE` |
| PRODUCTION_SENSITIVITY | `NONE` |
| DB_SENSITIVITY | `SCHEMA` (new outcome tables; additive) |
| ARCHITECTURE_GATE | `REQUIRED` |
| STATUS | **DELIVERED / CLOSED** — PR #35 merged `89ec8a1`; Main CI PASS on exact SHA (run 33735023618); branch `feat/al-01-workout-outcome-model` retired. Pure outcome contract (`src/lib/outcomes`) — completion, per-exercise performance (S-02 canonical identity), subjective difficulty/feedback (closed enums, EN display), session context (MG-02-owned constraint tokens); fail-closed validator + derived summary + pure SessionSummary adapter. ADR-0012 ACCEPTED. Additive — no change to any session/persistence type; no DB migration; no runtime wiring (`CODE_NO_DEPLOY`). |

**Authorization (2026-09-03):** Owner explicit instruction — AUTONOMOUS
BACKLOG EXECUTION (TASK DELTA): execute `docs/TASKS.md` one READY task at a
time in dependency order; do not wait for Owner confirmation between normal
tasks; STOP only at genuine Owner/Human/Production/architecture gates.
AL-01 is the first READY task (P1; dependency MG-06 CLOSED).

**Objective:** define the workout outcome/feedback data model — what the
system records after each workout session (completion, per-exercise
performance, difficulty rating, user feedback, equipment constraints
encountered). This is the "Observation / Outcome" segment of the learning
loop.

**Inputs:** the existing workout session model (`WorkoutStateRecord`);
the strategy's closed-loop model; the S-04 session contract.

**Output:** an outcome data contract (pure TypeScript types + a doc); the
recording pipeline design (when/where outcomes are captured).

**Acceptance:** the outcome model covers completion, per-exercise
performance, subjective feedback, and context; the contract is additive
(no changes to existing session records); typecheck passes.

---

### AL-02 — Personal Movement Profile data contract — **DELIVERED / CLOSED 2026-09-03**

| Field | Value |
|---|---|
| PRIORITY | P1 |
| DEPENDENCIES | AL-01 |
| AUTONOMOUS_ELIGIBILITY | `READY` (contract-level) |
| PARALLEL_SAFETY | `SAFE` |
| PRODUCTION_SENSITIVITY | `NONE` |
| DB_SENSITIVITY | `SCHEMA` (new profile tables; additive) |
| ARCHITECTURE_GATE | `REQUIRED` |
| STATUS | **DELIVERED / CLOSED** — PR #36 merged `c7f509b`; Main CI PASS on exact SHA (run 33738933578); branch `feat/al-02-personal-movement-profile` retired. Pure profile contract (`src/lib/profile`) modeling every §2B signal; observed facts structurally split from confidence/derivation/evidence-wrapped inference; projections-only privacy invariant; not-a-medical-system boundary; fail-closed validator + pure windowed activity aggregate. ADR-0013 ACCEPTED. Additive — consumes AL-01 outcomes type-only; no change to existing types; no DB migration; no runtime wiring (`CODE_NO_DEPLOY`). |

**Authorization (2026-09-03):** Owner explicit instruction — AUTONOMOUS
BACKLOG EXECUTION (TASK DELTA). AL-02 is the second READY task (P1;
dependency AL-01 CLOSED).

**Objective:** define the Personal Movement Profile data contract — the
accumulated per-user training signals: capability, training history,
movement performance, progression, recurring difficulties, asymmetries
(where reliably observable), form degradation, exercise tolerance, adherence,
available equipment, preferences, session constraints, and user feedback.
NOT a medical diagnosis system.

**Inputs:** AL-01 outcome model; the strategy's profile signal list
([`product/PRODUCT-STRATEGY.md`](product/PRODUCT-STRATEGY.md) §2B).

**Output:** a profile data contract (pure TypeScript types + a doc); the
profile update pipeline design (how outcomes feed into the profile).

**Acceptance:** every signal from the strategy is modeled; the contract
distinguishes observed data from inferred state; privacy-by-design
principles documented (data minimization, user control); typecheck passes.

---

### AL-03 — Adaptation input pipeline — **DELIVERED / CLOSED 2026-09-03**

| Field | Value |
|---|---|
| PRIORITY | P1 |
| DEPENDENCIES | AL-02 |
| AUTONOMOUS_ELIGIBILITY | `READY` (promoted from `NOT_YET` 2026-09-03) |
| PARALLEL_SAFETY | `SAFE` |
| PRODUCTION_SENSITIVITY | `NONE` |
| DB_SENSITIVITY | `DATA` |
| ARCHITECTURE_GATE | `REQUIRED` |
| STATUS | **DELIVERED / CLOSED** — PR #37 merged `cf82a82`; Main CI PASS on exact SHA (run 33747870414); branch `feat/al-03-adaptation-input-pipeline` retired. Pure adaptation-input pipeline (`src/lib/adaptive`) — canonical `AdaptationInput` schema + deterministic projection of (profile AL-02, MG-06 relationship graph, workout history); attributed inference + sorted evidence refs; fail-closed missing-profile/empty-history/empty-graph edges. ADR-0016 ACCEPTED. Additive — no existing type changed; no DB migration; no runtime wiring (`CODE_NO_DEPLOY`). |

**Authorization (2026-09-03):** Owner explicit instruction — RESUME
AUTONOMOUS CHAIN (TASK DELTA): promote and execute AL-03; AL-04 remains
`NOT_YET` and gated (OWNER_DECISION_GATE — decision-algorithm sign-off); do
not bypass AL-04 or any other Owner/Human/Production gate. Promotion record:
`AUTONOMOUS_ELIGIBILITY` `NOT_YET` → `READY`; scope unchanged (bounded pure
module; input schema for the decision layer).

**Objective:** implement the pipeline that feeds profile data + movement
knowledge + workout history into the adaptation decision layer. This is the
"Adaptation" segment of the loop — the input side of "what is the appropriate
training decision for this person now?"

**Inputs:** AL-02 profile contract; MG-06 relationship model; MG-07
localization/media.

**Output:** the adaptation input pipeline as a pure module (deterministic,
testable); the input schema for the decision layer.

**Acceptance:** the pipeline produces a well-typed adaptation input from
(profile, movement knowledge, workout history); the module is pure (no side
effects); unit tests cover the happy path and edge cases (empty history,
missing profile).

---

### AL-04 — Adaptive Training Graph decision layer

| Field | Value |
|---|---|
| PRIORITY | P1 |
| DEPENDENCIES | AL-03 |
| AUTONOMOUS_ELIGIBILITY | `READY` (promoted from `NOT_YET` 2026-09-03 — gate closed) |
| PARALLEL_SAFETY | `SERIAL_ONLY` |
| PRODUCTION_SENSITIVITY | `RELEASE_ONLY` |
| DB_SENSITIVITY | `NONE` |
| ARCHITECTURE_GATE | `REQUIRED` |
| OWNER_DECISION_GATE | Decision algorithm sign-off — **CLOSED 2026-09-03 (D1a D2a D3a D4a)** |
| STATUS | **DELIVERED / CLOSED** — PR #38 merged `f06e42f`; Main CI PASS on exact SHA (run 33756172851); branch `feat/al-04-adaptive-training-graph` retired (local + remote verified). Pure decision layer `src/lib/adaptive/decisions.ts` — `buildAdaptiveDecision` over `AdaptationInput`: L0 safety gates → L1 session frame → L2 per-movement KEEP/PROGRESS/REGRESS/SUBSTITUTE/EXCLUDE → L3 sets deltas; D2a apply modes (AUTO safety-lowering only); zero inference inside AL-04; fail-closed insufficient-data baseline; fixed-EN-template rationale (ruleId + evidenceRefs); `DECISION_POLICY` knob module (D3a). D4a additive `sessionIntent` + `lastOutcomeId` input extension (ADR-0016 addendum). ADR-0017 ACCEPTED. 30 new tests (740/740). Additive — no existing type changed; no DB migration; no runtime wiring (`CODE_NO_DEPLOY`). |

**Gate close (2026-09-03):** Owner answered the AL-04 decision gate
[`architecture/AL-04-DECISION-GATE.md`](architecture/AL-04-DECISION-GATE.md)
§9 with **D1a D2a D3a D4a**: v1 scope = adjust-over-intent; apply posture =
auto-apply safety-lowering only (advisory progressions); rule-table defaults
adopted as the sign-off baseline; session-intent input = additive AL-03
`AdaptationInput` extension. The gate is closed and AL-04 is promoted to
`READY` and executing. AL-04 remains `SERIAL_ONLY` / `RELEASE_ONLY`
(no runtime wiring, no deployment).

**Objective:** implement the decision layer that answers "what is the
appropriate training decision for this person now?" — exercise selection,
progression/regression, substitutions, volume, intensity, sequencing,
session duration, equipment constraints, recovery/context signals.

**Inputs:** AL-03 adaptation inputs; MG-06 relationships.

**Output:** the decision module (pure, deterministic); the decision output
schema (recommended exercises + adjustments + rationale).

**Acceptance:** the module produces a valid workout plan from any valid
input; the rationale is human-readable; the decisions respect equipment
constraints and recovery signals; unit tests cover the main decision paths.

---

### MO-01 — Movement Performance History (longitudinal observation store)

| Field | Value |
|---|---|
| PRIORITY | P1 |
| DEPENDENCIES | CP-07 (Movement Observation runtime), AL-01 (outcome contract), AL-02 (profile projections), consent/privacy policy (TS-02 HUMAN_GATE) |
| AUTONOMOUS_ELIGIBILITY | `NOT_YET` (depends on CP-07 + consent policy; registered 2026-09-04) |
| PARALLEL_SAFETY | `SERIAL_ONLY` |
| PRODUCTION_SENSITIVITY | `RELEASE_ONLY` |
| DB_SENSITIVITY | `SCHEMA` (longitudinal observation tables; additive when authorized) |
| ARCHITECTURE_GATE | `REQUIRED` |

**Objective:** persist structured longitudinal movement observations — the
consent-bound pipeline `Prescription → Movement Observation → Movement
Performance History → Personal Movement Profile → Adaptive Training`
(CP-03 outcome §3). The store must let the adaptation layer distinguish
actual performance evidence from measurement uncertainty.

**Inputs:** CP-07 observation records; AL-01 outcomes; AL-02 profile
contract; consent/privacy policy (TS-01/TS-02).

**Output:** the longitudinal observation schema + retention/consent design
(no implementation without consent policy).

**Acceptance:** evidence vs uncertainty separation survives from capture to
AL-03/AL-04 input; retention and consent are purpose-bound per TS-01;
observation source (`DEVICE_MEASURED`/`USER_REPORTED`/`UNKNOWN`) is
preserved end-to-end.

---

## Mission Queue — P2: DELIVER THE COMPANION EXPERIENCE

### CP-01 — Companion architecture + UX behavior spec

| Field | Value |
|---|---|
| PRIORITY | P2 |
| DEPENDENCIES | AL-04 (adaptation decisions feed Companion guidance) |
| AUTONOMOUS_ELIGIBILITY | `READY` (spec/docs only) |
| PARALLEL_SAFETY | `SAFE` |
| PRODUCTION_SENSITIVITY | `NONE` |
| DB_SENSITIVITY | `NONE` |
| ARCHITECTURE_GATE | `REQUIRED` |
| STATUS | **DELIVERED / CLOSED** — 2026-09-03 (docs-only; commit `6521696` on origin/main, Main CI PASS on exact SHA run 33760433421; vehicle branch retired; ADR-0018 ACCEPTED) — Companion architecture + UX behavior spec [`architecture/CP-01-COMPANION-ARCHITECTURE.md`](architecture/CP-01-COMPANION-ARCHITECTURE.md): pure guidance/observation surface (never a decision-maker); mechanical not-policing rules (silence-by-default, value-over-noise, guidance-not-criticism); typed threshold-gated cadence-capped interventions G1–G7 with stay-silent rules; AL-04 apply-mode contract (AUTO announced once from humanText / ADVISORY confirmed / INSUFFICIENT_DATA silent); fitness-not-medical boundary; TS-01 privacy posture; keyed EN-first copy. Authorizes no implementation; camera deferred to CP-03/CP-04. |

**Objective:** write the Companion architecture spec — the experience
promise «تو ورزش کن؛ ما حواسمون بهت هست.» made tangible: workout guidance,
rep/phase awareness, form feedback, useful correction, encouragement,
contextual substitutions/regressions, and workout observation feeding future
adaptation. UX principle: **watching over the user, not policing the user.**

**Inputs:** the strategy §2D; the AL-04 decision output schema.

**Output:** the Companion architecture doc (component boundaries, data flow,
intervention model, feedback cadence); UX behavior rules (when to intervene,
when to stay silent).

**Acceptance:** the spec covers all Companion capabilities from the strategy;
the intervention model is documented with concrete examples; the "not
policing" principle is operationalized (intervention thresholds, tone rules).

---

### CP-02 — Observation signal model (rep/phase tracking)

| Field | Value |
|---|---|
| PRIORITY | P2 |
| DEPENDENCIES | CP-01 |
| AUTONOMOUS_ELIGIBILITY | `READY` (contract-level) |
| PARALLEL_SAFETY | `SAFE` |
| PRODUCTION_SENSITIVITY | `NONE` |
| DB_SENSITIVITY | `NONE` |
| ARCHITECTURE_GATE | `REQUIRED` |
| STATUS | **DELIVERED / CLOSED** — PR #39 merged `5f7054c`; Main CI PASS on exact SHA (run 33765314949); branch `feat/cp-02-observation-signal-model` retired (local + remote verified). Pure observation contract `src/lib/observation/` — typed in-session per-set signals REP_COUNT / SET_TIMING / REP_TIMING (tempo) / REST_TIMING / FORM_PROXY, anchored to S-04 plan position + set (optional S-02 identity); closed honest sources (device-measured form proxies refused until CP-03); fail-closed validation + pure deterministic per-set aggregation; signal→AL-01 mapping documented (evidence-only in v1). ADR-0019 ACCEPTED. 15 new tests (755/755). Additive — no existing type changed; no measurement/collection/wiring (`CODE_NO_DEPLOY`). |

**Objective:** define the observation signal model — what the Companion
observes during a workout (rep counts, phase timing, tempo, form proxies)
and how those signals feed back into the outcome model (AL-01).

**Inputs:** CP-01 architecture; the existing workout engine's timer/phase
model.

**Output:** the observation signal contract (pure types); the signal-to-
outcome mapping design.

**Acceptance:** every observable signal is typed; the mapping from signals
to outcome fields is documented; the contract is additive (no changes to
existing session records).

---

### CP-03 — Pose/form technical feasibility spike

| Field | Value |
|---|---|
| PRIORITY | P2 |
| DEPENDENCIES | CP-01, TS-01 (privacy architecture must exist first) |
| AUTONOMOUS_ELIGIBILITY | `RESEARCH_ONLY` |
| PARALLEL_SAFETY | `SAFE` |
| PRODUCTION_SENSITIVITY | `NONE` |
| DB_SENSITIVITY | `NONE` |
| ARCHITECTURE_GATE | `REQUIRED` |
| OWNER_DECISION_GATE | Spike findings review — **CLOSED 2026-09-03 (Approach A decided)** |
| STATUS | **DELIVERED / CLOSED 2026-09-05 — feasibility findings DECIDED (Approach A), measurement gate EXECUTED for one cell, review COMPLETE, honest NOT_MEASURED record for the rest.** Research-only spike delivered findings (`architecture/CP-03-POSE-FEASIBILITY.md`); Owner decided **Approach A — MoveNet (TF.js), web-first, fully on-device; v1 = HIGH-coverage movements; TEMPO_DRIFT + validated RANGE_OF_MOTION only**. Harness + protocol at `scripts/pose-measurement/` repaired three times (2026-09-04: diagnostic rebuild → tracking-failure repair → rep-heuristic latch repair; smoke 32/32 incl. pose-bearing + deterministic rep-machine regression). **First counted real-device measurement (2026-09-05):** iPhone Chrome (CriOS) squat @ diagonal-90 — 10 real squats → **9/10 = 90%** (minAngle 57°, avgConf 0.66, p95 inf 33 ms, 8,436 calls / 7,211 pose returns / 0 inference errors, POSES_OK throughout; export `results/iphone-squat-diagonal90-crios-2026-09-05.json`); meets the ≥ 90% rep-count criterion **for that cell** and confirms latency headroom. **All other matrix cells NOT_MEASURED** (Android Chrome — the binding-constraint case — unmeasured; Safari unmeasured, CriOS used as WebKit proxy; push-up/hinge/lunge unmeasured; placements 1/4; battery unmeasured — iOS Battery API n/a). Review records these gaps honestly (feasibility doc §11; README §7); **no further Owner squat testing is requested**; the remaining matrix is optional Owner-side continuation with zero backlog impact. **No Companion camera functionality implemented** — product implementation remains separately gated (CP-04 HUMAN_GATE camera authorization; CP-06/CP-07 need CP-04 + TS-02). |
| HARNESS_REPAIR | **DONE 2026-09-04** — real smoke testing found the harness hung on "Loading MoveNet model…" (Chrome/mobile) or ran with a black LIVE VIEW (Safari); **no valid measurements from those attempts.** Root cause: zero error handling/timeouts in startup (any failure left the Loading text forever) + no verification that the LIVE VIEW actually renders. Repaired `scripts/pose-measurement/index.html` (staged, bounded pipeline — CDN/backend/camera/video/model/inference stages with per-stage timeouts, classified errors + remedies incl. CPU fallback, first-frame + luminance LIVE-VIEW check, trials disabled while view not verified, mirror toggle, diagnostics log in export) + README troubleshooting; automated smoke `scripts/pose-measurement/smoke.mjs` 13/13 PASS on local Chrome. Record: `architecture/CP-03-HARNESS-REPAIR.md`. Gate remains OPEN — Owner retest (§6) then real-device run required. |
| HARNESS_TRACKING_REPAIR | **DONE 2026-09-04** — post-repair real-human testing (macOS Chrome + Arc) still showed **zero poses** (RUNNING, FPS/processed fine, poseDetections=0, no skeleton, no inference error). Two compounding code bugs: (a) **`state.video` was never assigned**, so `estimatePoses(null)` silently returned zero poses every frame — reproduced here in real Chrome on the synthetic camera (identical signature: running, 109 processed, fps 13.5, detections 0, infErrors 0); (b) MoveNet 2.1.3 returns keypoints in **source-PIXEL space** (nose ≈ x 637 on 1280-wide), while the overlay multiplied by canvas.width again → strokes ~1280× off-canvas, invisible skeleton (latent since v1, masked by the hang/null bugs). Repaired: real capture source + explicit mirrored capture-canvas inference path, pixel-space-aware overlay, frame-content sampler (source clock/readyState, page luma vs input grid mean/center/Δ, 8×5 grid of the exact model input), pose telemetry (inferenceCalls/poseReturns/poseGatedOut/kp≥0.3/0.5/kpMax/kpMean/coordSpace), draw-time colored-pixel overlay verification, trial gate requiring structured input, INPUT_NEAR_BLACK / INPUT_FLAT / INPUT_STRUCTURED_NO_POSE / POSES_OK audit classification — all in the JSON export. Smoke upgraded with a **pose-bearing scenario** (real human fixture `testdata/human.jpg`, PD U.S. Navy photo) → **26/26 PASS**: poses sustained (34), kp≥0.5 15–17/17, POSES_OK, overlay hits 50. Record: `architecture/CP-03-TRACKING-REPAIR.md`. Gate still OPEN — Owner retest then real-device run. |
| HARNESS_REP_HEURISTIC_REPAIR | **DONE 2026-09-04** — the first real-device export (iPhone squat ×2, diagonal-200, `results/iphone-squat-diagonal200-2026-09-04.json`) showed pose tracking HEALTHY (inferenceCalls 3923, poseReturns 3620, infErrors 0, avgConf 0.73–0.75, skeleton drawn, lastOverlayHits 50) yet **detected 0/0**. Root cause (proven from code + data): v2 rep machine latched `phase='lost'` on ANY frame whose joint trio failed KEYPOINT_GATE and **no code path ever left 'lost'** — the first leg-keypoint flicker in a trial permanently disabled counting (56% of pose frames were gated session-wide, so a null inside a ~40–50 s trial was certain; 0/0 was the expected v2 output, not evidence about squat depth). Fixed in v3: dead latch removed (short dropouts keep phase continuity, >1.5 s dropouts re-arm to 'up'), both sides measured (near leg at diagonal placement; jointsR added), per-window + per-trial telemetry (trial rows: validFrames/gatedFrames/minAngle/downs/ups; frameTrace rep block with phase/side/angle/dropouts; trial start/end diag entries; runtime repStateVersion/keypointGate/dropResetMs). down/up/KEYPOINT_GATE/minRepSec thresholds UNCHANGED. Deterministic regression scenario E added to smoke → **32/32 PASS** (clean cycles count 10; 2.6 s dropout re-arms and resumes — v2 would stay 0; short dropouts keep continuity; shallow >95° / sub-0.4 s / hysteresis noise still count 0). Record: `architecture/CP-03-REP-HEURISTIC-REPAIR.md`. |
| MEASUREMENT | **EXECUTED 2026-09-05 — first counted real-device measurement (iPhone Chrome CriOS, squat @ diagonal-90): 10 real squats → 9/10 = 90%.** Export `results/iphone-squat-diagonal90-crios-2026-09-05.json` (harness v3, smoke 32/32 before run): trial `{move: squat, Lightning, 15 fps cfg, diagonal-90, expected 10, detected 9, matchPct 90, avgConf 0.66, p95InfMs 33, durSec 71.7, validFrames 770, gatedFrames 188, minAngle 57, downs 9, ups 9, phaseAtEnd up, endSide L}`; summary 8,436 inference calls / 7,211 pose returns / 0 infErrors / 7,211 skeleton draws / overlay hits 50; runtime backend webgl, input 720×1280 mirrored canvas, luma ≈ 132–159, POSES_OK audits throughout; battery `n/a` (iOS). **Verdict: PASS for this cell** (≥ 90% rep-count criterion; p95 33 ms well under the ~66 ms latency bound). **Remaining matrix honestly NOT_MEASURED:** Android Chrome (binding-constraint case), iPhone Safari (CriOS is a WebKit proxy, not Safari), push-up/hinge/lunge, placements diagonal-200/front-180/side-90, and session battery. Review conclusion + per-cell table: `architecture/CP-03-POSE-FEASIBILITY.md` §11; README §7. No further Owner squat testing is requested; remaining matrix = optional Owner-side continuation, zero backlog impact. CP-03 CLOSED; product implementation remains separately gated (CP-04/CP-06/CP-07). |

**Objective:** research spike — evaluate on-device pose inference options
(MediaPipe, TensorFlow Lite, native APIs) for the target platforms; measure
latency, accuracy, and battery cost; determine the supported movement scope
(which exercises can be tracked); assess on-device feasibility vs the privacy
requirement (raw video must not leave the device).

**Inputs:** TS-01 privacy architecture; the supported movement scope from
MG-02 taxonomy.

**Output:** a feasibility report with measured benchmarks; a recommended
approach; a scope statement (which movements are trackable); identified
limitations.

**Acceptance:** the report includes real measurements (not estimates); the
privacy requirement is validated (no video leaves the device in the
recommended approach); the scope is honest about limitations; no production
code written.

---

### CP-04 — Privacy-preserving camera architecture

| Field | Value |
|---|---|
| PRIORITY | P2 |
| DEPENDENCIES | CP-03 (feasibility), TS-01 (privacy architecture) |
| AUTONOMOUS_ELIGIBILITY | `HUMAN_GATE` (camera integration requires explicit Owner authorization) |
| PARALLEL_SAFETY | `SERIAL_ONLY` |
| PRODUCTION_SENSITIVITY | `PROD_SENSITIVE` |
| DB_SENSITIVITY | `DATA` (if landmarks/metrics are stored) |
| ARCHITECTURE_GATE | `REQUIRED` |
| OWNER_DECISION_GATE | Required — camera/pose consent + data retention decisions |
| STATUS | **DELIVERED / CLOSED (ARCHITECTURE-GATE, docs-only, CODE_NO_DEPLOY) — 2026-09-05 (capability trial).** Camera authorization architecture designed and documented: the privacy-preserving consent surface (two-layer: browser camera permission + product pose-tracking purpose consent; explicit/granular/revocable; session-level transparency; denial never degrades the core workout — no-camera fallback is binding), the on-device pipeline shape (Capture → in-browser short-lived buffer → MoveNet/TF.js on-device inference → CP-02 C2 observation signals; raw video C1 never leaves the device; only derived C2 is a persistence candidate, subject to an explicit purpose+retention decision), the consent-record content (accountability-only: purpose/scope/state/version/timestamps — no raw sensor content), and a written **default posture of non-persistence** unless + until a purpose + retention + deletion policy is explicitly chosen (recorded decision-range item). ADR-0021 (`DISCUSSED`; records the architecture as implementation-ready and the remaining OWNER_DECISION_GATE / TS-02 / mobile-scope / legal-wording items as pending). **Does NOT decide** whether to implement the camera surface, what to persist/transmit, mobile scope, or legal consent wording — those remain Owner-gated (OWNER_DECISION_GATE) + TS-02; **CODE_NO_DEPLOY**: no camera/sensor code, no data collection, no dependency, no schema/backend change, no Production change. |
| AUTONOMOUS_ELIGIBILITY_NOTE | This task's `AUTONOMOUS_ELIGIBILITY` stays `HUMAN_GATE` (the camera integration decision is not made here). What was advanced here is the **ARCHITECTURE_GATE** only — carried out as a bounded, intra-gate, doc/code-unchanged capability trial of Solar Pro 4; the camera surface is still not implemented and no Production change is made. |
| Evidence | `docs/architecture/CP-04-COMPANION-CAMERA-ARCHITECTURE.md`; ADR-0021; Architecture decision + ADR `DISCUSSED` state; `CODE_NO_DEPLOY`; gated downstream items recorded in §8 of the architecture doc + ADR `Considered` list |
| NEXT_TASK | **Owner-gated — do NOT advance here.** Camera integration + data retention decisions remain OWNER_DECISION_GATE; consent wording remains TS-02; camera surface not implemented, no code/Production change. Any future continuation would begin from a NOT_YET/READY candidate that becomes eligible after the Owner gates lift (e.g. CP-05 once its dependencies are satisfied / authorized, or TS-05 once TS-02 exists) — none is being started now; the chain stops after CP-04's architecture gate closes. |

| Field | Value |
|---|---|
| PRIORITY | P2 |
| DEPENDENCIES | CP-02, AL-04, [`product/WORKOUT-EXPERIENCE-V2.md`](product/WORKOUT-EXPERIENCE-V2.md) |
| AUTONOMOUS_ELIGIBILITY | `NOT_YET` |
| PARALLEL_SAFETY | `CLAIM_REQUIRED` |
| PRODUCTION_SENSITIVITY | `RELEASE_ONLY` |
| DB_SENSITIVITY | `NONE` |
| ARCHITECTURE_GATE | `REQUIRED` |

**Objective:** integrate the Companion's observation and adaptation signals
into the Workout Experience V2 runtime — real-time guidance during the
workout, adaptive adjustments mid-session, and post-session outcome capture.

**Inputs:** CP-02 signals; AL-04 decisions; the V2 vision doc.

**Output:** the integrated workout runtime with Companion guidance; the
V2 UI changes (guided by the UI Conformance Gate).

**Acceptance:** the Companion provides real-time guidance during workout
playback; adaptive adjustments respect the AL-04 decision output; the
UI Conformance Gate passes; Production acceptance covers the workout route.

---

### CP-06 — Camera opt-in / consent UX + no-camera fallback

| Field | Value |
|---|---|
| PRIORITY | P2 |
| DEPENDENCIES | CP-03 measurement gate (CLOSED before product implementation), CP-04 (camera architecture), TS-01 (privacy architecture), TS-02 (HUMAN_GATE — legal/consent wording) |
| AUTONOMOUS_ELIGIBILITY | `NOT_YET` (registered 2026-09-04 from the CP-03 outcome) |
| PARALLEL_SAFETY | `CLAIM_REQUIRED` |
| PRODUCTION_SENSITIVITY | `RELEASE_ONLY` |
| DB_SENSITIVITY | `NONE` |
| ARCHITECTURE_GATE | `REQUIRED` |

**Objective:** implement the strictly-opt-in camera surface (CP-03 outcome
§1): explicit/revocable consent flow, Apex Home Fit fully usable without
camera permission, camera denial never blocks the workout, raw video
on-device and not retained/uploaded by default.

**Inputs:** CP-03 outcome record; CP-04 camera architecture; TS-01 consent
model; TS-02 legal requirements.

**Output:** the opt-in consent flow (UI + storage of consent state); the
no-camera fallback path end-to-end.

**Acceptance:** a camera-denied user completes a full workout untouched;
consent is explicit and revocable; raw video never leaves the device;
Production acceptance covers the denial and revocation paths.

---

### CP-07 — Movement Observation runtime

| Field | Value |
|---|---|
| PRIORITY | P2 |
| DEPENDENCIES | CP-03 measurement gate (CLOSED before product implementation), CP-02 (observation signal model), CP-04 (camera architecture), AL-01 (outcome contract) |
| AUTONOMOUS_ELIGIBILITY | `NOT_YET` (registered 2026-09-04 from the CP-03 outcome) |
| PARALLEL_SAFETY | `CLAIM_REQUIRED` |
| PRODUCTION_SENSITIVITY | `RELEASE_ONLY` |
| DB_SENSITIVITY | `NONE` (v1 runtime contract; persistence deferred to MO-01) |
| ARCHITECTURE_GATE | `REQUIRED` |

**Objective:** implement the Movement Observation runtime per the CP-03
outcome §2 — per movement/set distinguishing prescribed reps/duration,
observed reps, validated reps, measurable ROM proxy, tempo/tempo drift,
measurement confidence, invalid/incomplete measurable reps (deterministic
only), unobservable/uncertain periods, timestamps/durations, and
observation source (`DEVICE_MEASURED`/`USER_REPORTED`/`UNKNOWN`).
**Measurement uncertainty is never classified as user performance failure.**

**Inputs:** CP-03 outcome record; CP-02 signals; CP-04 camera pipeline;
AL-01 outcome mapping.

**Output:** the typed observation runtime (pure + fail-closed, source-honest)
producing CP-02-aligned observation records.

**Acceptance:** every prescribed movement/set produces a complete observation
record with all §2 dimensions or an explicit unobservable/uncertain state;
uncertainty never mislabeled as failure; no persistence (deferred to MO-01).

---

## Mission Queue — P3: TRUST, SAFETY & KNOWLEDGE

### TS-01 — Privacy / safety architecture — **DELIVERED / CLOSED 2026-09-03**

| Field | Value |
|---|---|
| PRIORITY | P3 (prerequisite for CP-03/CP-04 — dependency-prioritized) |
| DEPENDENCIES | NONE |
| AUTONOMOUS_ELIGIBILITY | `READY` |
| PARALLEL_SAFETY | `SAFE` |
| PRODUCTION_SENSITIVITY | `NONE` |
| DB_SENSITIVITY | `NONE` |
| ARCHITECTURE_GATE | `REQUIRED` |
| STATUS | **DELIVERED / CLOSED** — docs-only (`DOCS_DIRECT_MAIN`, 2026-09-03; Main CI PASS on the exact pushed SHA); no task branch (docs-only fast path); ADR-0014 ACCEPTED. Architecture doc: `docs/architecture/TS-01-PRIVACY-SAFETY-ARCHITECTURE.md` — data classification C1–C7, explicit/granular/revocable consent, purpose-bound retention, user control, on-device inference preference (raw video never leaves the device), fitness-not-medical safety boundary. No code, collection, storage, or legal text. |

**Authorization (2026-09-03):** Owner explicit instruction — AUTONOMOUS
BACKLOG EXECUTION (TASK DELTA). TS-01 is the first P3 READY task
(dependencies NONE; prerequisite for CP-03/CP-04).

**Objective:** define the privacy/safety architecture for future camera/pose
functionality and sensitive data handling: the data classification model,
the consent framework, the data minimization principles, and the boundary
between fitness guidance and medical diagnosis/treatment.

**Inputs:** the strategy §8 (privacy principle); §9 (trust/safety surface).

**Output:** the privacy architecture doc (data classes, consent model,
retention principles, user control rights); the safety boundary statement.

**Acceptance:** the doc classifies all data types (movement landmarks,
derived metrics, health signals); the consent model covers collection,
purpose, and revocation; the medical boundary is explicit ("Apex provides
fitness guidance, not medical diagnosis"); the architecture satisfies the
on-device inference preference.

---

### TS-02 — Safety / liability framework + legal surface requirements

| Field | Value |
|---|---|
| PRIORITY | P3 |
| DEPENDENCIES | TS-01 |
| AUTONOMOUS_ELIGIBILITY | `HUMAN_GATE` (legal review required) |
| PARALLEL_SAFETY | `SAFE` |
| PRODUCTION_SENSITIVITY | `RELEASE_ONLY` |
| DB_SENSITIVITY | `NONE` |
| ARCHITECTURE_GATE | `NONE` |
| OWNER_DECISION_GATE | Legal counsel review |

**Objective:** define the fitness/health safety disclaimer, the
liability/safety framework, and the requirements for Terms of Service,
Privacy Policy, and camera/pose-tracking consent. NOT final legal wording —
the requirements that legal wording must satisfy.

**Inputs:** TS-01 privacy architecture; the strategy §9 legal surface list.

**Output:** a requirements doc listing every legal surface with its
mandatory content; the safety disclaimer text requirements; the
jurisdictional considerations.

**Acceptance:** every legal surface from the strategy is listed with its
requirements; the fitness/medical boundary is stated; the doc explicitly
notes that final legal wording requires counsel review; no legal text is
published.

---

### TS-03 — Account / data deletion

| Field | Value |
|---|---|
| PRIORITY | P3 |
| DEPENDENCIES | TS-01 |
| AUTONOMOUS_ELIGIBILITY | `READY` |
| PARALLEL_SAFETY | `SAFE` |
| PRODUCTION_SENSITIVITY | `PROD_SENSITIVE` |
| DB_SENSITIVITY | `DATA` (deletes user data) |
| ARCHITECTURE_GATE | `REQUIRED` |
| OWNER_DECISION_GATE | Production deletion acceptance — **OPEN (2026-09-05; CODE_NO_DEPLOY delivered; Production apply + acceptance requires a separate Owner decision + gateway environment)** |
| STATUS | **DELIVERED / CLOSED (CODE_NO_DEPLOY) — 2026-09-05**, batch-delivered with the CP-03 measurement review on `origin/main` (batch branch → CI PASS → exact-SHA Main CI PASS; vehicle branch retired 0/0; tree clean). Irreversible, confirmation-gated account deletion across both data planes: Prisma user-owned rows (`User`/`WeightEntry`/`WorkoutSession`(+exercises)/`QuizResponse`/`ProgramGenerationRequest`/`PhoneOtp` by phone) deleted in ONE transaction with shared Programs de-owned (never deleted) and the catalog/admin identities untouched; Supabase `workout_exercise_logs` by `user_id` + avatar object + the auth identity deleted LAST (service-role; also revokes sessions). Typed fail-closed errors (400 confirmation / 401 / 404 / 502 / 503); auth identity last keeps retries idempotent; success only after every step. Surface: `DELETE /api/account/delete` + ProfileView typed-`DELETE` confirmation section (FA/EN keys). 11 new offline tests (deletion cascade + ordering + failure paths + transaction table coverage). ADR-0020 ACCEPTED. Typecheck clean, full suite green, lint 0, GOVERNANCE_PASS. **Production deletion acceptance NOT covered — real deletion against the Production Supabase project is Owner-gated** (MG-09-style pending item); legal retention carve-outs deferred to TS-02. |
| AUTHORIZATION | Owner decision 2026-09-05: **execute TS-03 CODE_NO_DEPLOY up to the Production line** (MG-09 precedent — Production apply stays a separate gated step) |

**Objective:** implement account deletion and data deletion — the user can
delete their account and all associated data (workout history, profile,
preferences, analytics events). This is a trust surface and a legal
requirement in many jurisdictions.

**Inputs:** TS-01 privacy architecture; the existing auth/user model.

**Output:** the deletion flow (UI + API); the cascade deletion logic; the
deletion confirmation.

**Acceptance:** deleting an account removes all user data across all tables;
the deletion is irreversible and confirmed; the UI provides a clear
deletion path; Production acceptance covers the deletion flow; the deletion
respects any legal retention requirements.

---

### TS-04 — Knowledge / Journal architecture — **DELIVERED / CLOSED 2026-09-03**

| Field | Value |
|---|---|
| PRIORITY | P3 |
| DEPENDENCIES | MG-07 (movement knowledge feeds educational content) |
| AUTONOMOUS_ELIGIBILITY | `READY` (architecture only) |
| PARALLEL_SAFETY | `SAFE` |
| PRODUCTION_SENSITIVITY | `NONE` |
| DB_SENSITIVITY | `SCHEMA` (content tables; additive) |
| ARCHITECTURE_GATE | `REQUIRED` |
| STATUS | **DELIVERED / CLOSED** — docs-only (`DOCS_DIRECT_MAIN`, 2026-09-03; Main CI PASS on the exact pushed SHA); no task branch (docs-only fast path); ADR-0015 ACCEPTED. Architecture doc: `docs/architecture/TS-04-KNOWLEDGE-JOURNAL-ARCHITECTURE.md` — movement-anchored content model (never standalone articles), MG-07/MG-03 contract reuse, locale-aware SSR rendering design, movement-first gated authoring, discovery-supported-not-purpose. No CMS/pages/authoring/migration. |

**Authorization (2026-09-03):** Owner explicit instruction — AUTONOMOUS
BACKLOG EXECUTION (TASK DELTA). TS-04 is the second P3 READY task
(dependency MG-07 CLOSED).

**Objective:** design the Knowledge/Journal architecture as part of the
product knowledge system (not an isolated SEO blog): Movement Graph ↔
Exercise Pages ↔ Educational Content ↔ Workout Programs ↔ Companion.

**Inputs:** MG-07 movement knowledge; the strategy §10 (knowledge surface).

**Output:** the knowledge architecture doc (content model, relationship to
the Movement Graph, rendering pipeline); the content authoring workflow.

**Acceptance:** the architecture connects educational content to movement
knowledge objects (not standalone articles); the content model supports
exercise technique, movement education, common mistakes, progressions/
regressions, mobility, recovery, and home fitness topics; SEO/discovery is
supported but not the sole purpose; no CMS implementation in this task.

---

### TS-05 — Public trust pages (About / Contact / Support / FAQ)

| Field | Value |
|---|---|
| PRIORITY | P3 |
| DEPENDENCIES | TS-02 (legal framework), TS-04 (knowledge architecture) |
| AUTONOMOUS_ELIGIBILITY | `READY` |
| PARALLEL_SAFETY | `SAFE` |
| PRODUCTION_SENSITIVITY | `RELEASE_ONLY` |
| DB_SENSITIVITY | `NONE` |
| ARCHITECTURE_GATE | `NONE` |

**Objective:** implement the public trust pages — About, Contact, Support,
FAQ, How Apex Home Fit works, Accessibility statement, and Service/status
information — as static/locale-aware pages following the existing design
system.

**Inputs:** TS-02 legal requirements; the existing FAQ page pattern; the
design system.

**Output:** the public pages (SSR/locale-aware); navigation integration;
the accessibility statement.

**Acceptance:** all pages render in FA and EN; the pages follow the design
system (UI Conformance Gate applies); the FAQ integrates with the existing
FAQ page; navigation is discoverable; Production acceptance covers the new
routes.

---

## Mission Queue — P4: SUPPORTING / LOWER-MOAT

### SU-01 — Deferred lower-moat feature breadth

| Field | Value |
|---|---|
| PRIORITY | P4 |
| DEPENDENCIES | Contextual |
| AUTONOMOUS_ELIGIBILITY | `NOT_YET` |
| PARALLEL_SAFETY | `SAFE` |
| PRODUCTION_SENSITIVITY | contextual |
| DB_SENSITIVITY | contextual |
| ARCHITECTURE_GATE | `NONE` |

**Objective:** a holding priority for useful work that does not materially
strengthen the moat or its prerequisites. Examples: additional UI polish,
non-critical feature breadth, nice-to-have integrations. These are NOT
deleted — they are deferred until P0–P3 foundations are established.

**Disposition of legacy unfinished items:**

| Legacy item | Disposition |
|---|---|
| `EXERCISE-CATALOG-DISAMBIGUATION-01` | **ABSORBED into MG-08** — the alias collision is a symptom of the seed catalog's lack of canonical identity; the rebuilt Movement Graph resolves it structurally. Traceability preserved in the PROPOSED section. |
| `ADMIN-IMPERSONATION-01` | **RETAINED / DEFERRED** — remains DEFERRED / NOT AUTHORIZED; not strategy-aligned (admin tooling, not product moat); revisit when P0–P1 are established |
| `ADMIN-AUTH-PASSKEY-01` | **RETAINED / DEFERRED** — security enhancement, not strategy-aligned; P4 |
| Workout Experience V2 | **PROMOTED to CP-05** — the V2 vision is the Companion's workout integration surface; the advisory doc feeds CP-05 |
| Iranian competitor research gap | **RETAINED** — competitive monitoring is a strategic research requirement (strategy §11); folded into the ongoing research agenda, not a discrete task |
| Iranian competitor register | **PRESERVED as INITIAL RESEARCH SNAPSHOT** — not exhaustive or verified; ongoing monitoring required |
| Transformation roadmap capabilities | **RECONCILED** — individual capabilities are re-ranked into the Mission Queue by strategy alignment; the roadmap remains as advisory evidence |
| `rtl-layout.spec.ts` test debt | **RESOLVED** — FIXED + VERIFIED in STABILIZATION BATCH S06+S05 (2026-09-01) |
| Signed-in Production recheck (standing) | **RETAINED** — operator-held credential required; not a backlog task |

---

## Autonomous batch readiness

Delivery mechanics for authorized batches are governed by
[`BATCH_DELIVERY_V2.md`](BATCH_DELIVERY_V2.md) (BATCH_5 mode, authorized
2026-09-04; SINGLE_TASK remains the default for gated/Production/security
work). The readiness note below is historical — it preceded V2 and its
candidate tasks have since executed individually. The recomposed backlog
supports batches of up to five tasks; the orchestrator selects compatible
tasks based on: dependencies, file/resource overlap, architecture gates, DB
sensitivity, Production sensitivity, parallel safety, task size, and
independent reviewability.

### AUTONOMOUS_BATCH_CANDIDATES — proposed FIRST autonomous test

| # | Task | Rationale |
|---|---|---|
| 1 | **MG-01** (schema/domain contract) | Strategically meaningful (Movement Graph foundation); bounded scope (pure types + doc); no DB migration; clear acceptance criteria; exercises the full autonomous workflow (design → implement → test → document) |
| 2 | **MG-02** (taxonomy design) | Depends only on MG-01's output shape (can run in parallel with MG-01 if the contract interface is agreed first); bounded (enums + maps); no runtime change |
| 3 | **MG-03** (provenance contract) | Independent of MG-01/MG-02 (only needs the domain module interface); bounded (types + doc); exercises the self-hosting principle |
| 4 | **AL-01** (outcome/feedback model) | Different domain (adaptive loop) — exercises cross-phase parallel safety; bounded (types + doc); no DB migration |
| 5 | **TS-01** (privacy/safety architecture) | Docs-only; independent; a prerequisite for CP-03/CP-04; tests whether the autonomous system can produce architecture documents |

**Selection rationale:** these five tasks (a) are strategically meaningful —
they start the Movement Graph and the adaptive loop, not trivial docs;
(b) have bounded scope with clear acceptance criteria; (c) are independently
reviewable; (d) avoid Production risk (no DB mutations, no deployments);
(e) minimize file overlap (MG-01/02/03 share the `src/lib/movement/`
directory but touch different files; AL-01 and TS-01 are in different
domains); (f) provide meaningful evidence about whether the autonomous
development system works (design + code + tests + docs).

**Not selected:** MG-04+ (require source selection / Owner decisions);
MG-09 (requires DB mutation authorization); CP-03+ (require TS-01 first);
CP-04 (requires camera authorization); TS-02 (requires legal review).

**Batch constraint:** maximum five tasks per batch. If only three are safely
executable together, that is preferable to an artificial five-task batch.

---

## Disposition summary — legacy unfinished tasks

Every existing unfinished/deferred/proposed task was audited. Dispositions:

| Legacy item | Status | Disposition |
|---|---|---|
| `EXERCISE-CATALOG-DISAMBIGUATION-01` | PROPOSED / NOT AUTHORIZED | **ABSORBED into MG-08** — structural resolution via the rebuilt Movement Graph |
| `ADMIN-IMPERSONATION-01` | DEFERRED / NOT AUTHORIZED | **RETAINED / DEFERRED** — P4; revisit after P0–P1 |
| `ADMIN-AUTH-PASSKEY-01` | DEFERRED | **RETAINED / DEFERRED** — P4 |
| Workout Experience V2 | PRODUCT VISION / NOT AUTHORIZED | **PROMOTED to CP-05** (Companion integration surface) |
| Iranian competitor research gap | KNOWN ADVISORY GAP | **RETAINED** — ongoing monitoring requirement (strategy §11) |
| Transformation roadmap capabilities | PROPOSED / NOT AUTHORIZED | **RECONCILED** — re-ranked into the Mission Queue by strategy alignment |
| `rtl-layout.spec.ts` test debt | FIXED + VERIFIED | **RESOLVED** — no action needed |
| Signed-in Production recheck | PENDING (standing) | **RETAINED** — operator credential item, not a backlog task |
| `ADMIN-DS-01…06` | DELIVERED / CLOSED | Completed — historical record preserved |
| `ADMIN-THEME-SWITCH-01` | DELIVERED / CLOSED | Completed — historical record preserved |
| `S-04` Session Core Contract | DELIVERED / CLOSED | Completed — historical record preserved |
| `S02-E` Exercise Identity Backfill | DELIVERED / CLOSED | Completed — historical record preserved; the ambiguity feeds MG-08 |
| `GOVERNED-PROD-DB-CAPABILITY-01` | DELIVERED / CLOSED | Completed — the gateway `db-operation` capability is the migration path for MG-09 |

No legacy task was silently deleted. Completed lifecycle records are
preserved unchanged.

---

## Registered decisions — not executable

These are deliberately **not backlog tasks**. Their canonical decision owners
preserve them until the owner separately authorizes bounded execution:

| Decision/direction | Status | Canonical owner |
|---|---|---|
| Dedicated administrator authentication independent of the public OTP journey | ACCEPTED AND PROMOTED TO `ADMIN-AUTH-01`; Email + Password V1, manual provisioning, one `ADMIN` role, no Passkey in V1 | [`ADMIN_AUTH.md`](ADMIN_AUTH.md), [`adr/0004-dedicated-admin-authentication.md`](adr/0004-dedicated-admin-authentication.md) |
| Admin impersonation / View-as-User | DEFERRED / NOT AUTHORIZED; mandatory future requirements persisted in the dedicated capability spec | [`ADMIN_IMPERSONATION_01.md`](ADMIN_IMPERSONATION_01.md), [`ADMIN_AUTH.md`](ADMIN_AUTH.md) |
| Batch Delivery V2 — governed SINGLE_TASK / BATCH_5 delivery modes | ACCEPTED / ADOPTED 2026-09-04 — supersedes V1; BATCH_5 = up to 5 compatible low-risk tasks (READY, no gates, DOCS_ONLY/CODE_NO_DEPLOY, no DB/Production/security/UI surface, file-disjoint, dependency-safe order), ONE batch branch → ONE PR → ONE full CI → ONE exact-merge-SHA Main CI; per-member close-outs + Owner reports referencing shared evidence; SINGLE_TASK mandatory for gated/Production/security/incompatible work; no batch currently authorized | [`BATCH_DELIVERY_V2.md`](BATCH_DELIVERY_V2.md); V1 historical: [`BATCH_DELIVERY_V1.md`](BATCH_DELIVERY_V1.md), [`orchestration/FREEBUFF-ORCHESTRATION-INVESTIGATION-01.md`](orchestration/FREEBUFF-ORCHESTRATION-INVESTIGATION-01.md) |
| Camera-based movement tracking strictly OPT-IN (CP-03 outcome) | **ACCEPTED 2026-09-04** — Apex Home Fit fully usable without camera permission; camera denial never blocks the workout; raw video stays on-device and is not retained/uploaded by default. Product direction only — no feature implementation. | [`architecture/CP-03-MOVEMENT-OBSERVATION-OUTCOME.md`](architecture/CP-03-MOVEMENT-OBSERVATION-OUTCOME.md) |
| Pose tracking = **Movement Observation system**, not merely a rep counter (CP-03 outcome) | **ACCEPTED 2026-09-04** — future observation model distinguishes prescribed/observed/validated reps, ROM proxy, tempo/tempo drift, measurement confidence, invalid-incomplete measurable reps (deterministic only), unobservable/uncertain periods, timestamps/durations, observation source (DEVICE_MEASURED/USER_REPORTED/UNKNOWN); **measurement uncertainty is never classified as user performance failure**; consent-bound longitudinal data pipeline Prescription → Observation → Performance History → Personal Movement Profile → Adaptation | [`architecture/CP-03-MOVEMENT-OBSERVATION-OUTCOME.md`](architecture/CP-03-MOVEMENT-OBSERVATION-OUTCOME.md) |
| Movement-measurement monetization / value-layer opportunity | **RECORDED / NOT EVALUATED 2026-09-04** — enhanced measurement, longitudinal performance intelligence, richer progress insights, more precise adaptive programming MAY support premium capabilities; **no pricing model, paywall, tier structure, or monetization implementation chosen**; persisted for later product/business evaluation | [`architecture/CP-03-MOVEMENT-OBSERVATION-OUTCOME.md`](architecture/CP-03-MOVEMENT-OBSERVATION-OUTCOME.md) §4 |
| Owner-free Production deployment operations | ACCEPTED AND PROMOTED TO ACTIVE `AUTONOMOUS-PROD-OPS-01` | [`RELEASING.md`](RELEASING.md) |
| Iran/international-connectivity resilience and external/Supabase dependency evaluation | ACCEPTED EVALUATION NEED / DEFERRED; no provider migration selected | [`architecture/ARCHITECTURE-PRINCIPLES.md`](architecture/ARCHITECTURE-PRINCIPLES.md) |
| Iranian competitor research gap | KNOWN ADVISORY GAP | **RETAINED** — competitive monitoring is a strategic research requirement (strategy §11); folded into the ongoing research agenda, not a discrete task |
| Iranian competitor register (جیم‌شو، بدن‌فیت، جیم‌فا، مسترجیم، فیتامین، کرفس، ایران‌بدن، online coach/trainer alternatives) | **PRESERVED as INITIAL RESEARCH SNAPSHOT** — not exhaustive or verified; ongoing monitoring required | [`TRANSFORMATION_ROADMAP.md`](TRANSFORMATION_ROADMAP.md) |
| Public user auth and OTP launch readiness | CURRENT — the canonical readiness contract for the public auth surface; preserved across the backlog recomposition | [`OTP_LAUNCH_READINESS.md`](OTP_LAUNCH_READINESS.md) |
| Workout Experience V2 | PRODUCT VISION / NOT AUTHORIZED — re-scoped as CP-05 (Companion workout integration) in the Mission Queue | [`product/WORKOUT-EXPERIENCE-V2.md`](product/WORKOUT-EXPERIENCE-V2.md), [`product/WORKOUT-EXPERIENCE-V2-OPEN-QUESTIONS.md`](product/WORKOUT-EXPERIENCE-V2-OPEN-QUESTIONS.md) |
| Transformation roadmap capabilities | PROPOSED / NOT AUTHORIZED | [`TRANSFORMATION_ROADMAP.md`](TRANSFORMATION_ROADMAP.md) |
| Comprehensive product strategy + Movement Intelligence strategy | **PROPOSED / NON-EXECUTABLE 2026-09-01** — strategy persistence only; AHF unfrozen 2026-09-01 but execution not started | [`product/PRODUCT-STRATEGY.md`](product/PRODUCT-STRATEGY.md), [`product/MOVEMENT-INTELLIGENCE-STRATEGY.md`](product/MOVEMENT-INTELLIGENCE-STRATEGY.md) |
| Mobile-readiness architecture guardrails | **RATIFIED / BINDING 2026-09-01** — ADR-0005 | [`adr/0005-mobile-readiness-guardrails.md`](adr/0005-mobile-readiness-guardrails.md), [`architecture/ARCHITECTURE-PRINCIPLES.md`](architecture/ARCHITECTURE-PRINCIPLES.md) §13 |
| Shared typography contract | **RATIFIED / BINDING 2026-09-01** | [`DESIGN_SYSTEM.md`](DESIGN_SYSTEM.md) §4.1–4.2 |
| Session Core Contract Adoption — `S-04` | **DELIVERED/CLOSED 2026-09-01** | [`architecture/ARCHITECTURE-STABILIZATION-PLAN.md`](architecture/ARCHITECTURE-STABILIZATION-PLAN.md) |

## PROPOSED — not authorized (pending owner review)

> Items here are **proposals only**. They are NOT executable backlog entries.
> Nothing in this section authorizes work. Promotion happens only through the
> Promotion rule below after explicit owner authorization.

| Proposal | Status | Details |
|---|---|---|
| `EXERCISE-CATALOG-DISAMBIGUATION-01` — resolve the seed-catalog alias collision | **PROPOSED / NOT AUTHORIZED — ABSORBED into MG-08 (2026-09-01)** | The alias collision is a symptom of the seed catalog's lack of canonical identity. The rebuilt Movement Graph (MG-08: catalog validation + legacy seed reconciliation) resolves it structurally. The original proposal is preserved here for traceability. The `Side-Lying Leg Lift` ambiguity remains unresolved until MG-08 provides sufficient canonical context. |
| `MOBILE-READINESS-01` — mobile-lock-in / web-coupling architecture audit | **EXECUTED 2026-09-01** — guardrails RATIFIED / BINDING via ADR-0005 | Complete. Report: [`architecture/MOBILE-READINESS-01-REPORT.md`](architecture/MOBILE-READINESS-01-REPORT.md); guardrails: [`adr/0005-mobile-readiness-guardrails.md`](adr/0005-mobile-readiness-guardrails.md) |
| Batch 1 (ADMIN-DS-01…04) | **DELIVERED / CLOSED (2026-09-01)** — PR #15 merged `4de75ae` | Complete. Branch retired. |
| Batch 2 (ADMIN-DS-05 + ADMIN-DS-06) | **DELIVERED / CLOSED (2026-09-01)** — PR #16 merged `c6a4e59` | Complete. Typography contract RATIFIED. Branch retired. |
| `ADMIN-THEME-SWITCH-01` | **DELIVERED / CLOSED (2026-09-01)** — PR #18 merged `9ac8ec69c686` | Complete. Light+Dark × EN+FA production acceptance. Branch retired. |

These proposals do not alter, delete, or supersede any existing approved,
closed, or registered item above.

## Promotion rule

To promote an advisory/deferred item into executable work, update this file
*before implementation* with: task ID, explicit authorization source, bounded
scope, dependencies, task profile, branch, Production classification, and
acceptance. Decision Persistence in
[`governance/DOCUMENTATION-GOVERNANCE.md`](governance/DOCUMENTATION-GOVERNANCE.md)
applies before workflow continuation.

## Execution state

**AHF_EXECUTION_STATE: ACTIVE** — the Owner lifted the AHF execution freeze on
2026-09-01. **ACTIVE_TASK: NONE. NEXT_AUTHORIZED_TASK: NONE.**

Unfrozen is not the same as started: no task in the Mission Queue has been
begun, and backlog priority is NOT permission to start. The queue becomes
executable only when the Owner separately instructs that a specific task
(or batch) may begin. Strategy persistence and backlog design are allowed;
feature implementation awaits that explicit instruction.
