# AL-01 — Workout Outcome / Feedback Model

> **STATUS: DELIVERED / CLOSED — 2026-09-03**
>
> Contract: `src/lib/outcomes/types.ts` (+ public entry `src/lib/outcomes/index.ts`);
> decision: [`adr/0012-workout-outcome-model.md`](../adr/0012-workout-outcome-model.md);
> invariants: `tests/outcome-contract.test.ts`. No DB migration, no schema
> change, no runtime wiring (`CODE_NO_DEPLOY`).

## 1. What this task delivers

The type-level data model for **what the system records after each workout
session** — the "Observation / Outcome" segment of the closed loop
(`docs/product/PRODUCT-STRATEGY.md` §3):

```text
User ↔ Movement ↔ Workout ↔ Observation / Performance ↔ Outcome / Feedback ↔ Adaptation
```

The outcome record is the **durable, user-attributable learning signal** that
the future profile (AL-02) and adaptation (AL-03/AL-04) stages consume. This
task fixes the SHAPE of that record and documents the recording pipeline
design; it implements no recorder, no persistence, and no consumer.

## 2. Scope decisions (ADR-0012)

1. **The outcome contract is canonical** in `src/lib/outcomes/`, pure and
   framework-independent (no Prisma/React/services/side effects).
2. **Additive by law**: no existing session/persistence type is modified —
   `WorkoutStateRecord`, `ExerciseLogRecord`, `SessionSummary`,
   `SessionState`, `SessionExercise` are untouched. The contract only
   *references* the S-04 session contract and the S-02 canonical exercise
   identity (`ExerciseId` / `ExerciseSlug`).
3. **Vocabulary is owned elsewhere**: subjective vocabularies in this
   contract are closed enums (completion kind, difficulty feeling); the
   equipment-constraint vocabulary is imported as a TYPE from the MG-02
   movement taxonomy and never invented here.
4. **Fail-closed modeling**: no guessed values. Missing feedback stays
   absent; out-of-vocabulary ratings fail validation (the S02-E lesson).
5. **No migration implied** (the future additive outcome tables are a
   separate, gated lifecycle).

## 3. Contract field-by-field

Canonical record: `WorkoutOutcomeRecord` (one per finished/abandoned
session). `contractVersion` is pinned to `1`; every field is documented with
its provenance in the module.

| Field | Type | Meaning | Filled by |
|---|---|---|---|
| `contractVersion` | `1` | schema version (bump on breaking change) | recorder |
| `outcomeId` | string | opaque durable id of this record | recorder |
| `userId` | string (opt.) | Supabase auth user id; absent when unknown (privacy-minimal) | recorder |
| `dateKey` | `YYYY-MM-DD` | local calendar day (same contract as `WorkoutStateRecord.dateKey`) | recorder |
| `sessionId` | string (opt.) | local session id when the recording surface has one | recorder |
| `startedAt` / `completedAt` | epoch ms / null | session time bounds | recorder (from session state) |
| `durationSeconds` | number ≥ 0 | total active time (working + resting) | recorder (from `SessionSummary`) |
| `completion` | `{kind, totalSets, completedSets}` | how the session ended + set counts | recorder (from `SessionSummary`) |
| `exercises` | `PerExerciseOutcome[]` | per-exercise performance | recorder (+ user ratings) |
| `feedback` | `WorkoutFeedback` | whole-session subjective feedback | user |
| `context` | `OutcomeContext` | session environment facts | recorder |

`completion.kind` is a closed enum: `COMPLETED_FULLY | COMPLETED_PARTIALLY |
ABANDONED | DID_NOT_START`. `DID_NOT_START` keeps opened-but-never-started
sessions representable so the profile stage can tell "didn't train" from
"trained lightly".

`PerExerciseOutcome` carries **canonical exercise identity separately from
display** (S-02): `exerciseId` / `slug` when the plan provides them, `name`
display-only (never identity), `exerciseIndex` = plan position (never
identity). Performance fields (`plannedSets`, `completedSets`,
`plannedReps`/`actualReps`, `durationSeconds`, `completed`) come from the
session snapshot / set-level logs; `difficultyFeeling` and `note` are
user-provided.

`WorkoutFeedback` is user-reported: whole-session `difficultyFeeling`
(closed enum with EN display map), `satisfactionRating` (integer 1..5), free
`comments`. Absent when the user does not answer.

`OutcomeContext` holds only facts the recording surface already knows:
`programId`/`programSource`, session `locale`, `equipmentConstraintsEncountered`
(MG-02 constraint tokens, type-only import), `equipmentAvailable`
(display-only), `timezoneOffsetMinutes`. Nothing is inferred.

### Deterministic validation

`validateOutcomeRecord(record)` fails closed with typed `OutcomeProblem`s:
bad version/dateKey/completion kind; negative counts; `completedSets >
totalSets` at session or exercise level; the `completed` flag disagreeing
with per-exercise set counts; duplicate/negative `exerciseIndex`; timestamp
order; out-of-vocabulary ratings. The validator never repairs or guesses.

`summarizeOutcome(record)` is the derived read-model (`completionRatio`
0..1, divide-by-zero → 0) — computed, never stored.

## 4. Recording pipeline design (when/where outcomes are captured)

This section is the DESIGN for the future recorder — it is deliberately not
implemented in AL-01.

**Capture point — session end.** The existing engine already emits the
`WORKOUT_COMPLETED` effect carrying the S-04 `SessionSummary`
(`src/lib/workout/sessionContracts.ts`). The recorder builds the outcome
base from that summary (`outcomeBaseFromSummary` — pure adapter, delivered
here) and appends:

- **per-exercise rows** from the session snapshot's `OfflineExercise`
  entries (`workoutStates`) and/or the completed-set stream
  (`exerciseLogs`) — both already exist and are untouched;
- **context** from the active program + interface locale;
- **feedback** from a lightweight post-session prompt (implementation is a
  later UI concern, not this contract).

**Offline-first.** Outcomes are recorded per-device at session end and (like
today's `exerciseLogs`) synced when connectivity returns. The contract is
serialization-safe (plain JSON shapes) by construction.

**Refusal on invalid.** The recorder must call
`validateOutcomeRecord` and refuse to persist a malformed record rather than
"repair" it.

**What is NOT in scope here:** persistence (future additive tables), the
post-session UI, uploading to Supabase, and every consumer of the record
(AL-02 profile, AL-03/AL-04 adaptation) — each is separately gated.

## 5. Additive mapping from existing session types

| Existing type (S-04 / offline) | Outcome field(s) derived |
|---|---|
| `SessionSummary.totalSets` | `completion.totalSets` |
| `SessionSummary.completedSets` | `completion.completedSets` |
| `SessionSummary.durationSeconds` | `durationSeconds` |
| `SessionState.startedAt` / `completedAt` | `startedAt` / `completedAt` |
| `SessionExercise.exerciseId` / `slug` / `name` / `sets` / `reps` | `PerExerciseOutcome` identity + plan fields |
| `OfflineExercise.completed` / `actualSets` / `actualReps` | per-exercise `completed` / set counts |
| `WorkoutStateRecord.dateKey` | `dateKey` |

No existing type changes; the mapping is one-way and type-only.

## 6. Acceptance

- [x] outcome model covers completion, per-exercise performance, subjective
      feedback, and context;
- [x] contract is additive — no changes to existing session records (CI
      typecheck + unchanged session modules);
- [x] typecheck + lint pass; unit invariants `tests/outcome-contract.test.ts`
      (14 tests) pass;
- [x] deterministic validator + derived summary delivered as pure helpers;
- [x] architecture decision recorded (ADR-0012); no runtime behavior change.

## 7. Related

- `docs/product/PRODUCT-STRATEGY.md` §3 (closed loop) — strategic framing
- `src/lib/workout/sessionContracts.ts` — S-04 session contract (input)
- `src/lib/offline/db.ts` — `WorkoutStateRecord` / `ExerciseLogRecord` (input shapes)
- `src/lib/movement` (MG-02 constraint-token type; MG-06 contextual outcomes dependency)
- `docs/TASKS.md` — AL-01 queue entry (DELIVERED / CLOSED)
