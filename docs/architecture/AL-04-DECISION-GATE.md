# AL-04 — Decision Gate: Adaptive Training Graph v1 Decision Algorithm

> **STATUS: DECIDED — 2026-09-03** (was AWAITING OWNER DECISION / PREPARED)
>
> **OWNER DECISION (2026-09-03):** **D1a** v1 scope = adjust-over-intent;
> **D2a** apply posture = auto-apply safety-lowering only (advisory
> progressions); **D3a** rule-table defaults adopted as the sign-off
> baseline; **D4a** session-intent input = additive AL-03 `AdaptationInput`
> extension. See §9. The decision layer implementing this gate was delivered
> and closed as AL-04 (2026-09-03; ADR-0017 ACCEPTED).
>
> This document prepared the mandatory `OWNER_DECISION_GATE` of `AL-04`
> (`docs/TASKS.md`): **decision-algorithm sign-off**. It proposed the
> smallest safe v1 decision model over the existing governed contracts —
> AL-03 `AdaptationInput` (`src/lib/adaptive`), the AL-02 Personal Movement
> Profile, the AL-01 outcome model, and the MG-06 relationship graph.
>
> The gate is now closed. Nothing in this document, before or after
> closure, authorized any runtime/persistence/UI change on its own — AL-04
> implementation was authorized by the separate explicit Owner instruction
> (2026-09-03) that closed this gate.
>
> Persisted: 2026-09-03 (docs-only gate; AL-04 delivery itself was
> `CODE_NO_DEPLOY` — no DB, infrastructure, or Production change).

## 0. Contract boundary (what AL-04 may consume)

`ADR-0016` fixes the input boundary: **`AdaptationInput` is the ONLY shape
the AL-04 decision layer may consume** (`src/lib/adaptive/types.ts`). Every
proposal below is expressed strictly over fields that exist in
`AdaptationInput` v1:

| Input section | Fields the v1 algorithm may read |
|---|---|
| `user.capability` / `user.adherence` | `tier` / `tier`, `confidence`, `derivedBy` — attributed profile inference, consumed as **opaque input**, never recomputed |
| `user.movementTrends` | `subject`, `trend` (IMPROVING/STABLE/REGRESSING), `confidence` |
| `user.preferences` | `preferredDifficultyFeeling` |
| `user.equipment` / `constraints` | `declaredAvailable`, `declaredMissing`, `constraintsEncountered` (MG-02 tokens), `recurringDifficultySubjects` |
| `movementKnowledge` | per-movement `relationships` edges — kinds `progression` / `regression` / `substitution` with slug/id targets (MG-06) |
| `history.activity` | windowed session/set/duration aggregates, `longestStreakDays`, `lastDateKey` |
| `history.performance` | per-movement `completionRatio`, `totalPlannedSets`, `totalCompletedSets`, `lastDateKey`, `lastDifficultyFeeling` |
| `history.recurringDifficulties` | distinct difficulty subjects (movement, constraint token, or session) |
| `evidence` | sorted unique outcome/observation refs consulted |

**Known input-coverage gaps (deliberate, surfaced for the Owner):**
`AdaptationInput` v1 does NOT project movement *metadata* (difficulty tier,
equipment required, pattern tokens, constraints) nor the profile's inferred
asymmetry/form-risk/tolerance severities. Consequences, fail-closed:
(1) v1 **cannot** structurally verify equipment feasibility of a movement —
equipment enforcement is limited to MG-02 `constraintsEncountered` tokens
(the recorder observed the constraint mid-session) and recurring-difficulty
subjects; (2) v1 **cannot** select exercises by pattern or difficulty
metadata — this is why exercise *selection* is out of v1 scope (§2/D1);
(3) asymmetry/form-risk severities are not yet decision inputs (their
influence today is indirect, via user-reported difficulty + recurring
difficulty). Closing these gaps is an additive, separately-gated input
extension — not something v1 invents.

## 1. Design stance

v1 answers one question, on the day a session is about to run:

> **"Given everything we legitimately know about this person, what should
> today's intended session become?"**

Five binding properties, inherited from the AL-01/02/03 contract family:

1. **Pure + deterministic.** The decision module is a pure function of its
   inputs. Same `AdaptationInput` + same session intent → same output,
   always. All traversal order is sorted. No randomness, no wall-clock
   reads, no I/O.
2. **Zero inference inside AL-04.** AL-04 computes no statistics, fits no
   models, invokes no LLM, and recomputes no trend. Attributed profile
   inference (`capability`, `adherence`, `movementTrends`) is consumed as
   given, with its `confidence`/`derivedBy` relayed into the rationale.
   AL-04's only "logic" is a published, closed rule table (§4).
3. **Fail-closed.** Absence is never a signal: no performance row ⇒ no
   change; no difficulty feeling ⇒ not EASY; no difficulty report ⇒ not a
   difficulty; missing capability ⇒ no progression. When the input cannot
   justify a change, the decision is `KEEP` at conservative volume — never
   an invented value.
4. **Attributable + explainable.** Every decision cites its rule id, the
   exact input rows that fired it, and renders a fixed EN template string.
   Nothing is decided without a readable reason.
5. **Not medical. Not policing.** Recurring difficulty / regression / deload
   decisions are conservative load management, never diagnosis. Decisions
   that *lower* load may auto-apply; decisions that *raise* load are
   advisory (D2).

## 2. Decision scope — smallest safe v1 (decision hierarchy)

The strategy (§2C) lists exercise selection, progression/regression,
substitutions, volume, intensity, sequencing, session duration, equipment
constraints, recovery/context signals. v1 does NOT attempt all of it. The
v1 decision hierarchy, applied in order:

| Layer | Concern | v1 content |
|---|---|---|
| **L0 — Safety gates** | hard constraints that override everything below | equipment/constraint respect, recurring-difficulty respect, recovery/context flag, volume caps (§3) |
| **L1 — Session frame** | whole-session volume posture | deterministic `setsDelta` + conservative-baseline flag from adherence + activity + recovery (§4.1) |
| **L2 — Per-movement decision** | what each intended movement becomes | `KEEP` / `PROGRESS` / `REGRESS` / `SUBSTITUTE` (+ `EXCLUDE` when no safe resolution) from the difficulty table + trend + constraints (§4.2) |
| **L3 — Within-movement adjustment** | sets | bounded `setsDelta` (v1 changes *set volume*, never rep targets — no rep data is projected) (§4.3) |
| **L4 — Sequencing** | ordering | **DEFERRED in v1.** Output order == session-intent order. Reordering is a later, separately-gated extension |
| **— Exercise selection** | choosing movements from the catalog | **DEFERRED in v1** (D1). Requires movement-metadata projection (gap §0). v1 decides over the session's *intended* movements only |

The full hierarchy is thus **L0 → L1 → L2/L3**; L4 and catalog-wide
selection are explicitly out of v1. "A valid workout plan from any valid
input" (AL-04 acceptance) = a decision-adjusted rendering of the intended
session, valid even when every intent movement must be excluded (each slot
is then explicitly `EXCLUDE`d with rationale — never silently refilled with
a guessed movement).

## 3. Safety constraints (L0) — non-negotiable, evaluated first

| Gate | Trigger (all fields exist in `AdaptationInput`) | Forced outcome |
|---|---|---|
| **G-EQUIP** | intent movement's subject has a constraint token in `constraints.constraintsEncountered`, or the movement appears under a recurring-difficulty constraint subject | `SUBSTITUTE` along a note'd substitution edge when one exists → else `EXCLUDE` with rationale (no structural equipment metadata in v1 — see §0 gap) |
| **G-RECUR** | subject ∈ `recurringDifficultySubjects` (explicit user reports only — silence is never a difficulty) | no `PROGRESS`, ever; regression edge exists → `REGRESS`; else substitution edge → `SUBSTITUTE`; else `KEEP` with `setsDelta −1` ("conservative hold") |
| **G-RECOV** | window shows ABANDONED / DID_NOT_START sessions or a long break (`activity.lastDateKey` older than 14 days before `asOfDateKey`) or low completion (`completedSets/totalSets < 0.6` over the window) | `session.setsDelta ≤ 0`; all `PROGRESS` suppressed ("return-to-training / recovery frame") |
| **G-VOLCAP** | any proposed session total would exceed the capability volume cap (§4.1 table) | delta clamped to the cap; the clamp is recorded in the rationale |
| **G-FEAS** | intent movement has **no** `movementKnowledge` entry (not in the governed graph) | `KEEP` untouched — "no graph knowledge ⇒ no adjustment" (fail-closed) |

Gates never *add* load; they can only hold, lower, substitute, or exclude.
A safety gate that fires always wins over performance-driven rules.

## 4. The rule table (v1 defaults — D3)

Constants live in ONE auditable policy module (no magic numbers scattered);
the numbers below are the proposed defaults the Owner may adopt or override
(D3).

### 4.1 Session frame (L1)

Reference session volume = mean of `totalPlannedSets` over the activity
window's started sessions.

| Condition | `setsDelta` | Progression allowed? |
|---|---|---|
| adherence `HIGH`, window completion ≥ 0.8 | 0 | yes |
| adherence `MEDIUM` or completion 0.6–0.8 | 0 | yes, only on fresh EASY/VERY_EASY (§4.2) |
| adherence `LOW` or completion < 0.6 | −1 | **no** |
| recovery frame (G-RECOV) | −1 | **no** |
| no adherence + no capability (insufficient data) | 0 | **no** (conservative baseline) |

Volume caps by capability tier (per session, applied to the intent's planned
total): `beginner ≤ 16`, `intermediate ≤ 20`, `advanced ≤ 24` sets; with no
capability → `≤ 16`. Delta never exceeds `+1` per session in v1 (growth is
gradual by design).

### 4.2 Per-movement decision (L2)

Evaluated per intended movement, newest performance row first
(`history.performance` subject match; fresh = `lastDateKey` within 21 days
of `asOfDateKey`). Difficulty-feeling → action:

| Row | Fresh + completion ≥ 0.7 | Action | Notes |
|---|---|---|---|
| `VERY_EASY` | yes | `PROGRESS` | +1 progression edge; none → `KEEP` + `setsDelta +1` if under cap |
| `EASY` | yes | `PROGRESS` only when completion ≥ 0.9 **and** (no trend, or trend IMPROVING with confidence ≥ 0.5) | else `KEEP` |
| `JUST_RIGHT` | any | `KEEP` | the maintenance anchor |
| `HARD` | any | `KEEP`, no progression | unless trend REGRESSING on subject → `REGRESS` |
| `VERY_HARD` | any | `REGRESS` | +1 regression edge; none → substitution edge → `SUBSTITUTE`; none → `KEEP` + `setsDelta −1` (deload hold) |
| no feeling recorded | — | `KEEP` | absence ≠ EASY |
| no performance row | — | `KEEP` | cold per-movement subject: no change |

Trend overrides (attributed inference, consumed as given): trend
`REGRESSING` with confidence ≥ 0.5 on the subject + any HARD/VERY_HARD
history → `REGRESS`; trend `IMPROVING` with confidence ≥ 0.5 alone never
triggers progression without the difficulty row above.

**Edge resolution (deterministic):** among candidate edges of the required
kind, order by (1) substitution edges with a `note` first when the trigger
is constraint/equipment-driven, (2) `targetSlug` localeCompare — always
take the first. **Exactly one edge step per movement per session** — no
recursive progression/regression chains, ever.

### 4.3 Within-movement adjustment (L3)

`setsDelta` ∈ {−1, 0, +1} per movement per session only via the rules
above, and always clamped by the G-VOLCAP session cap. v1 never changes rep
targets, rest, tempo, or intensity prescriptions: none of that data is
projected, and inventing it would violate fail-closed.

## 5. Confidence and insufficient-data behavior

- **AL-04 never computes confidence.** It relays the profile's attributed
  `confidence` verbatim and classifies each decision's *applicability*
  deterministically:
  - `HIGH` — deciding difficulty feeling recorded fresh (≤ 21 days);
  - `MEDIUM` — deciding observation older than 21 days, or decision rests on
    completion-derived data only;
  - `LOW` — decision rests on attributed inference with confidence < 0.5, or
    on a fallback path (e.g. no edge → deload hold).
  Confidence is rule-applicability strength, never a probability.
- **Insufficient-data posture (basis = `INSUFFICIENT_DATA`)** when: no
  profile, OR no performance row for ANY intended movement, OR neither
  capability nor adherence present. Behavior: every movement `KEEP`;
  `session.setsDelta = 0`; `conservativeBaseline = true`; progressions
  suppressed; substitutions only when G-EQUIP/G-RECUR force them; each
  rationale names exactly what is missing ("no recorded performance for
  subject X; capability not yet inferred"). The output remains a valid,
  conservative plan — absence never blocks a workout, it only prevents
  change.

## 6. Deterministic vs inferred — v1 position

| Concern | v1 (proposed) |
|---|---|
| Movement decisions | **deterministic** rule application over the published table |
| Session frame | **deterministic** from activity/adherence tables |
| Trend/capability/adherence | **inferred upstream** (AL-02), consumed opaquely, relayed with `confidence` + `derivedBy`, never recomputed |
| Statistics inside AL-04 | none (no moving averages, no scoring, no thresholds beyond the published table) |
| Learned/LLM decisions | **excluded in v1** (alternative R3, §8) |
| Randomness / order dependence | none — sorted traversal everywhere |

## 7. Explainability / decision evidence

Every decision carries:
- `decisionId` (stable: `M-<index>` / `S-1` etc.), `ruleId` (stable id of
  the fired table row, e.g. `L2-DIFF-VERY_HARD`), optional `edgeTarget`
  (slug/id of the resolved progression/regression/substitution),
  `setsDelta`, `confidence` (HIGH/MEDIUM/LOW), `evidenceRefs` (subset of
  `AdaptationInput.evidence`: the performance rows / difficulty reports /
  constraint tokens actually consulted), and `humanText` — a **fixed EN
  template** rendered from slot values ("Movement X: keep — last recorded
  difficulty 'Just right' on <date> (completion 0.90)."). No free-text
  generation, no invented Persian (contract rule), deterministic templates
  only. The whole output is one typed, serializable document the Companion
  (CP-01+) can render without further interpretation.

## 8. Alternatives considered

| # | Alternative | Verdict | Why |
|---|---|---|---|
| **R1** | **Deterministic edge-rule module over `AdaptationInput` (recommended)** | ✅ v1 | smallest safe; pure + deterministic like AL-01/02/03; whole rule table unit-testable; no new inference surface |
| R2 | Statistical recompute inside AL-04 (own trend scores / moving averages) | ❌ v1 | duplicates AL-02's attributed-inference layer; breaks the "inference has one attributable origin" invariant; larger safety/test surface; no need at v1 volumes |
| R3 | LLM / agentic decision at runtime (reuse `src/lib/ai` prompts) | ❌ v1 | non-deterministic, not fail-closed, evidence hard to pin, cost/latency; the governed AI generation path is separate and already Production-gated — it must not become the core decision loop |
| R4 | Human confirmation of every decision | ❌ as default | churns the closed loop; adopted only as the targeted auto-apply policy in D2 |
| R5 | Defer AL-04 until the Companion exists | viable, not recommended | keeps the input contracts (AL-01…03) idle and blocks CP-01/CP-02; nothing is lost by deciding the algorithm now |

## 9. Owner decisions required (the gate)

Four decisions, recommended option first. No other decisions are required —
everything else in this document is either fixed by prior contracts or a
recommendable implementation detail.

- **D1 — v1 decision scope.** **(a) Recommended:** adjust-over-intent — AL-04
  decides over the session's intended movements + session frame (hierarchy
  L0–L3; selection and sequencing deferred). (b) Include catalog exercise
  selection in v1 — requires an additive movement-metadata projection into
  `AdaptationInput` (gap §0), a larger surface. (c) Defer AL-04 entirely
  (alternative R5).
- **D2 — Apply posture.** **(a) Recommended:** auto-apply only
  safety-lowering decisions (gate-forced `REGRESS`/`SUBSTITUTE`/`EXCLUDE`
  and every negative `setsDelta`), advisory for everything that raises load
  (`PROGRESS`, positive deltas); rationale attached to every decision —
  matches "watching over, not policing". (b) All decisions advisory
  (confirm before plan changes). (c) All decisions auto-apply.
- **D3 — Rule-table defaults.** **(a) Recommended:** adopt §3–§5 rule table +
  constants as the sign-off baseline (single auditable policy module). (b)
  Override specific thresholds (difficulty-feeling triggers, freshness
  window, caps, delta bounds) before sign-off.
- **D4 — Session-intent input boundary.** v1 needs "today's intended
  session" (movements + planned sets), which `AdaptationInput` v1 does not
  carry. **(a) Recommended:** additive AL-03 extension — a `sessionIntent`
  section added to `AdaptationInput` (versioned, backward-compatible),
  preserving the ADR-0016 "only shape" invariant. (b) ADR-0016 amendment
  permitting a separate AL-04 request argument outside `AdaptationInput`.
  (c) No intent input in v1 — weakest output (history-only adjustments),
  not recommended.

## 10. Related

- `docs/TASKS.md` — AL-04 queue entry (`OWNER_DECISION_GATE` — algorithm sign-off; `NOT_YET`)
- `src/lib/adaptive` (AL-03) — `AdaptationInput` = the decision input boundary
- `src/lib/profile` (AL-02), `src/lib/outcomes` (AL-01), `src/lib/movement` (MG-01…MG-06, MG-02 vocabulary)
- `docs/architecture/TS-01-PRIVACY-SAFETY-ARCHITECTURE.md` — fitness-not-medical boundary applies unchanged
