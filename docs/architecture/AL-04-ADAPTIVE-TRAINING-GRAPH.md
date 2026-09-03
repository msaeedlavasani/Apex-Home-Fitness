# AL-04 — Adaptive Training Graph v1 Decision Layer

> **STATUS: DELIVERED / CLOSED — 2026-09-03**
>
> Module: `src/lib/adaptive/decisions.ts` (pure engine + `DECISION_POLICY`),
> additive input extension in `src/lib/adaptive/types.ts` +
> `pipeline.ts` (D4a), public entry `src/lib/adaptive/index.ts`; decision:
> [`adr/0017-adaptive-training-graph-decision-layer.md`](../adr/0017-adaptive-training-graph-decision-layer.md);
> gate: [`AL-04-DECISION-GATE.md`](AL-04-DECISION-GATE.md) (Owner decision
> D1a–D4a, 2026-09-03); invariants: `tests/adaptive-decisions.test.ts`
> (30 tests). No DB migration, no schema change, no runtime wiring
> (`CODE_NO_DEPLOY`).

## 1. What this task delivers

The decision side of the Adaptation stage (`PRODUCT-STRATEGY.md` §2C/§3) —
the pure, deterministic answer to *"what is the appropriate training
decision for this person now?"*, built strictly on the AL-03
`AdaptationInput` boundary (ADR-0016):

```text
AdaptationInput (AL-03, + D4a sessionIntent)
        │
        ▼
buildAdaptiveDecision (pure, deterministic)
        │
        ▼
AdaptiveDecisionOutput  → (future) Companion / plan rendering (CP-01+)
```

The module makes **no changes by itself** — it renders a typed decision
document. Applying it to a plan is the caller's job, and the D2a apply
posture is carried on every decision (`AUTO` = safety-lowering,
`ADVISORY` = load-raising).

## 2. Decision hierarchy (gate doc §2)

| Layer | Concern | v1 content |
|---|---|---|
| **L0 — Safety gates** | hard constraints, evaluated first, can only hold/lower/substitute/exclude | G-FEAS (no graph knowledge ⇒ no adjustment), G-CONSTRAINT (recurring difficulty ⇒ REGRESS → SUBSTITUTE → EXCLUDE), G-RECOV (inactivity/abandonment/low completion ⇒ recovery frame), G-VOLCAP (capability volume cap clamp) |
| **L1 — Session frame** | whole-session volume posture | `session.setsDelta` from adherence/window completion/recovery + `recoveryFlag` |
| **L2 — Per-movement decision** | what each intended movement becomes | `KEEP/PROGRESS/REGRESS/SUBSTITUTE/EXCLUDE` from the difficulty table + attributed trend overrides + constraints |
| **L3 — Within-movement adjustment** | sets | bounded `setsDelta ∈ {−1, 0, +1}` (rep targets never changed in v1) |
| L4 — Sequencing | ordering | **Deferred** — output order == session-intent order |
| Exercise selection | catalog-wide choice | **Deferred** — needs movement metadata projection (gate §0 gap) |

## 3. Rule table highlights (gate doc §4, D3a defaults)

Difficulty feeling (fresh row ≤ 21 days, completion ≥ 0.7 baseline):

| Feeling | Action |
|---|---|
| `VERY_EASY` | `PROGRESS` one edge; no edge → `KEEP` +1 set (advisory) |
| `EASY` | `PROGRESS` only when completion ≥ 0.9 and (no trend or IMPROVING ≥ 0.5) |
| `JUST_RIGHT` | `KEEP` (maintenance anchor) |
| `HARD` | `KEEP`, no progression; REGRESSING trend ≥ 0.5 ⇒ `REGRESS` |
| `VERY_HARD` | `REGRESS`; no edge → `SUBSTITUTE`; no edge → `KEEP` −1 (deload hold) |
| none recorded | `KEEP` (absence ≠ EASY) |

Edge resolution is deterministic (note'd substitution first when
constraint-driven, then target slug sort) and walks exactly one edge per
movement per session. `DECISION_POLICY` holds every constant — the single
auditable knob module.

## 4. D2a apply posture

`AUTO` — regression / substitution / exclusion and every negative
`setsDelta` (they lower load). `ADVISORY` — progression and positive
`setsDelta` (they raise load). The output flags them; application is the
caller's concern ("watching over, not policing").

## 5. D4a additive input extension

`AdaptationInput.sessionIntent?: SessionIntent` — the user's intended
session (movements in order + planned sets), validated fail-closed by
`validateSessionIntent` (empty, non-exercise subject, non-positive sets,
duplicate slots ⇒ invalid ⇒ treated as absent by the pipeline, never
interpreted). `MovementPerformanceAggregate.lastOutcomeId` enables
per-decision `evidenceRefs`. Backward-compatible: existing consumers and
tests unchanged (`ADAPTATION_INPUT_VERSION` stays 1 — additive).

## 6. Insufficient-data baseline (gate doc §5)

Basis `INSUFFICIENT_DATA` when the intent is absent, when neither
capability nor adherence exists, or when no intended movement has recorded
performance. Output: all `KEEP`, `session.setsDelta = 0`,
`conservativeBaseline = true`, each rationale names exactly what is
missing. Absence never blocks a workout — it only prevents change.

## 7. Acceptance

- [x] decision output produced from any valid `AdaptationInput` (with or
      without session intent — conservative baseline when absent);
- [x] module pure + deterministic (no side effects; identical input ⇒
      identical output, test-pinned);
- [x] zero inference inside AL-04 — attributed profile inference relayed
      verbatim with confidence; no statistics/models/LLM;
- [x] D2a apply posture on every decision; rationale human-readable
      (fixed EN templates, ruleId + evidenceRefs);
- [x] decisions respect constraints (recurring difficulty, recovery frame,
      volume caps) and are fail-closed on absence;
- [x] unit tests cover the main decision paths + edge cases — 30 tests,
      `tests/adaptive-decisions.test.ts`; typecheck + lint pass; additive
      (no existing type changed); no runtime wiring.

## 8. Related

- `docs/architecture/AL-04-DECISION-GATE.md` — gate (Owner decision D1a–D4a, alternatives R1–R5)
- `docs/adr/0017-adaptive-training-graph-decision-layer.md` — decision record
- `docs/adr/0016-adaptation-input-pipeline.md` — input boundary (D4a addendum)
- `src/lib/adaptive` (AL-03), `src/lib/profile` (AL-02), `src/lib/outcomes` (AL-01), `src/lib/movement` (MG-01…MG-06)
- `docs/TASKS.md` — AL-04 queue entry (DELIVERED / CLOSED)