# AL-02 — Personal Movement Profile Data Contract

> **STATUS: DELIVERED / CLOSED — 2026-09-03**
>
> Contract: `src/lib/profile/types.ts` (+ public entry `src/lib/profile/index.ts`);
> decision: [`adr/0013-personal-movement-profile.md`](../adr/0013-personal-movement-profile.md);
> invariants: `tests/profile-contract.test.ts`. No DB migration, no schema
> change, no runtime wiring (`CODE_NO_DEPLOY`).

## 1. What this task delivers

The type-level model of the **accumulated per-user training signals**
(`docs/product/PRODUCT-STRATEGY.md` §2B) — the profile stage between Outcome
(AL-01) and Adaptation (AL-03/AL-04) in the closed loop:

```text
User ↔ Movement ↔ Workout ↔ Observation / Performance ↔ Outcome / Feedback ↔ Profile ↔ Adaptation
```

This task fixes the SHAPE of the profile and documents the profile update
pipeline design; it implements no profile persistence, no update pipeline
execution, no inference model, and no UI.

## 2. §2B signals → contract mapping

| §2B signal | Observed surface (facts) | Inferred surface (model outputs, absent until derived) |
|---|---|---|
| capability | — (never assumed from silence) | `inferred.capability` (`beginner/intermediate/advanced`) |
| training history | `observed.trainingHistory` (projected sessions, `outcomeId` refs) | — |
| movement performance | `observed.movementPerformance` (per-movement projections) | — |
| progression | history + performance (deterministic basis) | `inferred.movementTrends` (`IMPROVING/STABLE/REGRESSING`) |
| recurring difficulties | `observed.difficultyReports` (explicit user reports ONLY) | `inferred.recurringDifficulty` (severity + occurrences) |
| asymmetries (reliable only) | `observed.asymmetryObservations` (`USER_REPORTED`/`MEASURED`) | `inferred.asymmetry` |
| form degradation | `observed.formObservations` (proxies only) | `inferred.formRisk` |
| exercise tolerance | per-movement difficulty ratings (observed history) | `inferred.tolerance` |
| adherence | deterministic `profileActivitySummary` (windowed aggregate) | `inferred.adherence` (`HIGH/MEDIUM/LOW`) |
| available equipment | `observed.equipment.declaredAvailable`/`declaredMissing` | — |
| session constraints | `declaredMissing` + `equipment.constraintsEncountered` (MG-02 tokens) | — |
| preferences | `observed.preferences` (user-declared) | — |
| user feedback | `observed.feedbackEntries` (projected + `outcomeId` refs; comments NOT stored) | — |

## 3. Structural invariants (ADR-0013)

1. **Observed vs inferred is structural.** Inferred entries are wrapped in
   `ProfileInference<T>` with `confidence` (0..1), `derivedBy`
   (algorithm/model id + version), `derivedAtDateKey`, and non-empty
   `evidenceRefs`. Inferred values are never stored as facts; absence =
   insufficient data, never a negative claim.
2. **Privacy by design is structural.** `privacy.projectionsOnly = true` is
   a binding invariant enforced by `validateProfileSnapshot` — the profile
   stores only minimal deterministic projections + references (never raw
   session bodies, never duplicated outcome payloads). User view/export/
   deletion are design requirements (see §6).
3. **Vocabulary is owned elsewhere.** S-02 canonical exercise identity
   (`ExerciseId`/`ExerciseSlug`), MG-02 equipment-constraint tokens, and the
   AL-01 subjective-difficulty feelings are type-imported; nothing is
   invented in this module. Display names remain display-only.
4. **Not a medical diagnosis system.** No diagnosis/prognosis vocabulary
   exists in the contract; `LOW/MEDIUM/HIGH` severities are training-planning
   concerns only. The boundary is stated in the module, this doc, and the ADR.
5. **Fail-closed validation.** `validateProfileSnapshot` deterministically
   rejects malformed snapshots (dateKeys, counts, completion consistency,
   enum vocabulary, confidence range, missing evidence refs, timestamp
   order, the projections-only invariant) and never repairs or guesses.
6. **Deterministic aggregates stay observed.** `profileActivitySummary` is a
   pure windowed projection (session counts, sets, duration, longest streak)
   — the observed basis for adherence; the tier itself is an inference.

## 4. Contract surface (highlights)

- `ProfileSnapshot { contractVersion, userId?, observed, inferred, privacy,
  updateCount, createdAtEpochMs, updatedAtEpochMs }` — one canonical profile.
- `ObservedSignals`: `trainingHistory` (`ProfileTrainingSession` — minimal
  projection + `outcomeId` ref), `movementPerformance`,
  `difficultyReports` (explicit reports only), `asymmetryObservations`,
  `formObservations`, `equipment` (`ProfileEquipmentPosture`),
  `preferences`, `feedbackEntries` (comments referenced, never stored).
- `InferredSignals`: optional `capability`, `movementTrends`,
  `recurringDifficulty`, `asymmetry`, `formRisk`, `tolerance`, `adherence` —
  each a `ProfileInference<…>`; closed vocabularies with runtime guards
  (`CAPABILITY_TIERS`, `MOVEMENT_TRENDS`, `PROFILE_SEVERITIES`,
  `ADHERENCE_TIERS`).

## 5. Profile update pipeline design (how outcomes feed the profile)

This section is the DESIGN for the future updater — deliberately not
implemented in AL-02.

1. **Source:** the AL-01 `WorkoutOutcomeRecord` (validated) is the only
   session-level input; the updater projects each outcome into the observed
   sections (`ProfileTrainingSession`, per-movement performance rows,
   equipment constraints, feedback entries) with `outcomeId` references.
2. **Deterministic projection first:** observed sections are updated by pure
   projection (append/merge by `outcomeId` — idempotent, no duplicates);
   `updateCount` is the monotonic write counter.
3. **Inference separately:** inferred sections are produced by named
   derivation passes (models/algorithms with version + confidence + evidence
   refs). No inference runs inside the projection step. `adherence` tier is
   an inference over the observed `profileActivitySummary` — never a stored
   aggregate claim.
4. **Refusal on invalid:** the updater must call `validateProfileSnapshot`
   before persisting and refuse malformed snapshots (same discipline as
   AL-01).
5. **Privacy gates:** profile writes must not duplicate raw session content;
   deletion/export of a profile must be able to enumerate its referenced
   outcomes; user consent/control requirements come from TS-01 (privacy
   architecture), not this contract.
6. **Not implemented here:** persistence (server or additive tables),
   updater execution, inference models, UI. Each is separately gated.

## 6. Privacy-by-design principles (documented for future implementation)

- **Data minimization:** minimal projections + refs only; feedback comments
  are referenced (`outcomeId`), not copied; no raw session bodies.
- **User control (design requirements):** the profile must be viewable
  (`userViewSupported`), deletable (`userDeletionSupported`), and its
  referenced source data recoverable for a full account deletion (TS-03).
- **Accuracy:** observed facts always cite their source outcome/observation;
  inferred signals cite evidence and confidence — nothing is asserted
  without attribution.

## 7. Acceptance

- [x] every §2B strategy signal is modeled (see mapping table; compile-time +
      runtime checks in `tests/profile-contract.test.ts`);
- [x] the contract distinguishes observed data from inferred state
      (structural split + `ProfileInference` wrapper);
- [x] privacy-by-design documented (data minimization structural invariant,
      user view/export/delete design requirements);
- [x] additive — no change to any existing type; typecheck + lint pass;
      unit invariants (13 tests) pass; no runtime behavior change.

## 8. Related

- `docs/product/PRODUCT-STRATEGY.md` §2B — profile signal list
- `docs/adr/0012-workout-outcome-model.md` + `src/lib/outcomes` — AL-01 input contract
- `docs/adr/0013-personal-movement-profile.md` — this contract's decision record
- `docs/TASKS.md` — AL-02 queue entry (DELIVERED / CLOSED)
