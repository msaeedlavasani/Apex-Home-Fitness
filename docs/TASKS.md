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
| Active task | `NONE` |
| Profile | `N/A` |
| Branch | `N/A` |
| State | `CLOSED` — MG-02 DELIVERED/CLOSED 2026-09-01 (PR #26 → `36e68ce`); AHF_EXECUTION_STATE remains ACTIVE |
| Production-bound | `NO` |
| Next authorized task | `NONE` — MG-03 and all subsequent tasks are NOT authorized; begin only on the next explicit Owner instruction |
| Pending owner review | Mission Queue batch selection; `EXERCISE-CATALOG-DISAMBIGUATION-01` re-evaluation; `ADMIN-IMPERSONATION-01` deferred |

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

### MG-03 — Source/provenance contract

| Field | Value |
|---|---|
| PRIORITY | P0 |
| DEPENDENCIES | MG-01 |
| AUTONOMOUS_ELIGIBILITY | `READY` |
| PARALLEL_SAFETY | `SAFE` |
| PRODUCTION_SENSITIVITY | `NONE` |
| DB_SENSITIVITY | `NONE` |
| ARCHITECTURE_GATE | `REQUIRED` |

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

### MG-04 — Ingestion architecture (governed pipeline)

| Field | Value |
|---|---|
| PRIORITY | P0 |
| DEPENDENCIES | MG-02, MG-03 |
| AUTONOMOUS_ELIGIBILITY | `NOT_YET` (requires source selection + licensing assessment) |
| PARALLEL_SAFETY | `SERIAL_ONLY` |
| PRODUCTION_SENSITIVITY | `NONE` |
| DB_SENSITIVITY | `DATA` (writes new catalog records) |
| ARCHITECTURE_GATE | `REQUIRED` |
| OWNER_DECISION_GATE | Source selection + license approval |

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

### MG-05 — Normalization / deduplication / identity resolution

| Field | Value |
|---|---|
| PRIORITY | P0 |
| DEPENDENCIES | MG-04 |
| AUTONOMOUS_ELIGIBILITY | `NOT_YET` (depends on MG-04 source selection) |
| PARALLEL_SAFETY | `SERIAL_ONLY` |
| PRODUCTION_SENSITIVITY | `NONE` |
| DB_SENSITIVITY | `DATA` |
| ARCHITECTURE_GATE | `NONE` |
| OWNER_DECISION_GATE | Where ambiguous identities require Owner resolution |

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

### MG-06 — Relationship model (progression / regression / substitution)

| Field | Value |
|---|---|
| PRIORITY | P0 |
| DEPENDENCIES | MG-05 |
| AUTONOMOUS_ELIGIBILITY | `NOT_YET` |
| PARALLEL_SAFETY | `SAFE` |
| PRODUCTION_SENSITIVITY | `NONE` |
| DB_SENSITIVITY | `DATA` (relationship edges) |
| ARCHITECTURE_GATE | `NONE` |

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

### MG-07 — Localization + media architecture

| Field | Value |
|---|---|
| PRIORITY | P0 |
| DEPENDENCIES | MG-06 |
| AUTONOMOUS_ELIGIBILITY | `NOT_YET` |
| PARALLEL_SAFETY | `SAFE` |
| PRODUCTION_SENSITIVITY | `RELEASE_ONLY` (media delivery) |
| DB_SENSITIVITY | `NONE` |
| ARCHITECTURE_GATE | `REQUIRED` |

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

### MG-08 — Catalog validation + legacy seed reconciliation

| Field | Value |
|---|---|
| PRIORITY | P0 |
| DEPENDENCIES | MG-07 |
| AUTONOMOUS_ELIGIBILITY | `NOT_YET` |
| PARALLEL_SAFETY | `SERIAL_ONLY` |
| PRODUCTION_SENSITIVITY | `PROD_SENSITIVE` (reads Production seed data) |
| DB_SENSITIVITY | `DATA` (reads; writes only via governed migration) |
| ARCHITECTURE_GATE | `NONE` |
| OWNER_DECISION_GATE | Reconciliation mapping decisions |

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

### MG-09 — Production migration / adoption (governed)

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

### AL-01 — Workout outcome / feedback model

| Field | Value |
|---|---|
| PRIORITY | P1 |
| DEPENDENCIES | MG-06 (relationship model for contextual outcomes) |
| AUTONOMOUS_ELIGIBILITY | `READY` (contract-level; no DB migration) |
| PARALLEL_SAFETY | `SAFE` |
| PRODUCTION_SENSITIVITY | `NONE` |
| DB_SENSITIVITY | `SCHEMA` (new outcome tables; additive) |
| ARCHITECTURE_GATE | `REQUIRED` |

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

### AL-02 — Personal Movement Profile data contract

| Field | Value |
|---|---|
| PRIORITY | P1 |
| DEPENDENCIES | AL-01 |
| AUTONOMOUS_ELIGIBILITY | `READY` (contract-level) |
| PARALLEL_SAFETY | `SAFE` |
| PRODUCTION_SENSITIVITY | `NONE` |
| DB_SENSITIVITY | `SCHEMA` (new profile tables; additive) |
| ARCHITECTURE_GATE | `REQUIRED` |

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

### AL-03 — Adaptation input pipeline

| Field | Value |
|---|---|
| PRIORITY | P1 |
| DEPENDENCIES | AL-02 |
| AUTONOMOUS_ELIGIBILITY | `NOT_YET` |
| PARALLEL_SAFETY | `SAFE` |
| PRODUCTION_SENSITIVITY | `NONE` |
| DB_SENSITIVITY | `DATA` |
| ARCHITECTURE_GATE | `REQUIRED` |

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
| AUTONOMOUS_ELIGIBILITY | `NOT_YET` |
| PARALLEL_SAFETY | `SERIAL_ONLY` |
| PRODUCTION_SENSITIVITY | `RELEASE_ONLY` |
| DB_SENSITIVITY | `NONE` |
| ARCHITECTURE_GATE | `REQUIRED` |
| OWNER_DECISION_GATE | Decision algorithm sign-off |

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
| OWNER_DECISION_GATE | Spike findings review before any implementation |

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

**Objective:** design the privacy-preserving camera integration: on-device
pose/landmark inference → movement metrics → Companion feedback. If
landmarks/metrics are stored/transmitted, define purpose, consent, retention,
deletion, security, user control, and data minimization.

**Inputs:** CP-03 feasibility report; TS-01 privacy architecture.

**Output:** the camera architecture doc; the consent flow; the data
retention/deletion policy; the on-device inference pipeline design.

**Acceptance:** raw video never leaves the device; the consent flow is
explicit and revocable; the data retention policy defines purpose, retention
period, and deletion mechanism; the architecture supports the "no camera"
fallback (Companion works without pose tracking).

---

### CP-05 — Workout Experience V2 integration

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

## Mission Queue — P3: TRUST, SAFETY & KNOWLEDGE

### TS-01 — Privacy / safety architecture

| Field | Value |
|---|---|
| PRIORITY | P3 (prerequisite for CP-03/CP-04 — dependency-prioritized) |
| DEPENDENCIES | NONE |
| AUTONOMOUS_ELIGIBILITY | `READY` |
| PARALLEL_SAFETY | `SAFE` |
| PRODUCTION_SENSITIVITY | `NONE` |
| DB_SENSITIVITY | `NONE` |
| ARCHITECTURE_GATE | `REQUIRED` |

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

### TS-04 — Knowledge / Journal architecture

| Field | Value |
|---|---|
| PRIORITY | P3 |
| DEPENDENCIES | MG-07 (movement knowledge feeds educational content) |
| AUTONOMOUS_ELIGIBILITY | `READY` (architecture only) |
| PARALLEL_SAFETY | `SAFE` |
| PRODUCTION_SENSITIVITY | `NONE` |
| DB_SENSITIVITY | `SCHEMA` (content tables; additive) |
| ARCHITECTURE_GATE | `REQUIRED` |

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

The recomposed backlog supports future batches of up to five tasks. The
orchestrator selects compatible tasks based on: dependencies, file/resource
overlap, architecture gates, DB sensitivity, Production sensitivity,
parallel safety, task size, and independent reviewability.

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
| Batch Delivery V1 operating model | ACCEPTED / ADOPTED 2026-09-01 — model in force; each batch still requires separate execution authorization | [`BATCH_DELIVERY_V1.md`](BATCH_DELIVERY_V1.md), [`orchestration/FREEBUFF-ORCHESTRATION-INVESTIGATION-01.md`](orchestration/FREEBUFF-ORCHESTRATION-INVESTIGATION-01.md) |
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
