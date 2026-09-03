# CP-02 — Observation Signal Model (rep/phase tracking inputs)

> **STATUS: DELIVERED / CLOSED — 2026-09-03**
>
> Module: `src/lib/observation/` (`types.ts` contract + `index.ts` entry);
> decision: [`adr/0019-observation-signal-model.md`](../adr/0019-observation-signal-model.md);
> invariants: `tests/observation-signal.test.ts` (15 tests). No DB migration,
> no schema change, no runtime wiring, no sensor/camera work
> (`CODE_NO_DEPLOY`).

## 1. What this task delivers

The observation segment of the closed loop
(`User ↔ Movement ↔ Workout ↔ Observation ↔ Outcome ↔ Profile ↔
Adaptation`): the typed model of what the Companion observes **during** a
workout (CP-01 interventions G2–G4: rep/phase awareness, form proxies) —
anchored to the S-04 session (exercise position + set number) so signals
can feed both in-session guidance and the post-session outcome model
(AL-01). Nothing is measured or collected here; this is the shape a signal
must have once an authorized source produces one.

## 2. Signal vocabulary (closed)

Every signal anchors to one set of one exercise (`exerciseIndex` = S-04 plan
position; `set` = 1-based) and carries optional canonical S-02 identity.

| Signal | Fields (beyond the anchor) | Meaning |
|---|---|---|
| `REP_COUNT` | `observedReps`, `plannedReps?`, `source`, `confidence` | Total reps observed for a set |
| `SET_TIMING` | `activeSeconds`, `plannedSeconds?`, `source`, `confidence` | Active working seconds for a set (time-targeted sets) |
| `REP_TIMING` | `repIndex`, `repSeconds`, `source`, `confidence` | One repetition's duration — the tempo proxy |
| `REST_TIMING` | `restSeconds`, `plannedRestSeconds?`, `source`, `confidence` | Rest actually taken after a set |
| `FORM_PROXY` | `proxy` (RANGE_OF_MOTION / TEMPO_DRIFT / RHYTHM_IRREGULARITY / ASYMMETRY / FORM_BREAKDOWN), `severity` (LOW/MEDIUM/HIGH), `source`, `note?` | A severity-capped quality proxy — never a diagnosis |

Sources are closed and honest: `USER_REPORTED` or `DEVICE_MEASURED` for
count/timing signals; form proxies may only be `USER_REPORTED` or
`MEASURED_PROXY` — a `DEVICE_MEASURED` form proxy is **refused by the
validator** until CP-03 validates the proxy definitions (no fabricated form
quality; mirrors the AL-02 form/asymmetry discipline).

## 3. Fail-closed rules

1. Closed enums with runtime guards (`isObservationSource`, `isFormProxyKind`,
   `isFormProxySource`) — unknown values are rejected, never interpreted.
2. `validateObservationSignal` refuses malformed signals (bad date/anchor,
   negative or non-integer values, confidence outside 0..1, bad severity,
   device-measured form proxies) — the recorder never repairs or guesses.
3. Absence = "no observation", never a negative claim (a missing rep count
   does not mean zero reps).
4. Signals never replace the recorded outcome (AL-01) — they map into it
   (§5).

## 4. Deterministic set aggregation (pure)

`summarizeSetSignals(signals)` groups validated signals per
(exerciseIndex, set): latest rep count / active seconds / rest seconds win;
`repSecondsMedian` over per-rep timings; `worstFormProxySeverity`
escalates LOW → MEDIUM → HIGH; sources are sorted + deduped; output is
sorted deterministically. Invalid signals are ignored (never guessed).
Pure — identical signals always produce identical summaries.

## 5. Signal → outcome mapping (documented, additive)

| Signal | Maps into | Notes |
|---|---|---|
| `REP_COUNT` | AL-01 `PerExerciseOutcome.actualReps` (when the exercise is reps-targeted and counting is per-set) | aggregated across the exercise's sets; completion consistency still owned by the AL-01 recorder |
| `SET_TIMING` | evidence only in AL-01 v1 (no per-set duration field) | retained as observation evidence; feeds future adaptation (CP-05) — never invented into a field |
| `REP_TIMING` (tempo) | no AL-01 field in v1 | evidence only; the tempo proxy is what a future validated form proxy (CP-03) may build on |
| `REST_TIMING` | no AL-01 field in v1 | evidence only (context/session behavior) |
| `FORM_PROXY` | future `profile.observed.formObservations` (source `USER_REPORTED` today; `MEASURED_PROXY` only after CP-03) | HIGH severity may surface as an AL-04 recurring-difficulty constraint subject via explicit user reporting — the observation itself is never a diagnosis |

Discrepancy signals (e.g. observed reps far below `plannedReps`, or a
COMPLETED_PARTIALLY/ABANDONED session with strong negative form proxies) are
documented inputs for the recorder's completion-kind decision — the mapping
is owned by the future recorder wiring, not by this contract.

## 6. Acceptance

- [x] every observable signal typed (rep counts, set/rep timing, rest,
      form proxies) with closed vocabularies + guards;
- [x] mapping from signals to outcome fields documented (§5); additive —
      no existing session/outcome/profile type changed;
- [x] fail-closed validation (15 tests, `tests/observation-signal.test.ts`);
      pure aggregation; typecheck + lint pass;
- [x] nothing measured, collected, or wired (no camera/sensor; device
      sources await their own validated gates CP-03/CP-04).

## 7. Related

- `docs/adr/0019-observation-signal-model.md` — decision record
- `docs/architecture/CP-01-COMPANION-ARCHITECTURE.md` — intervention model G2–G4 consume these signals
- `src/lib/workout/sessionContracts.ts` (S-04 — anchor/phase model), `src/lib/outcomes` (AL-01)
- `docs/architecture/TS-01-PRIVACY-SAFETY-ARCHITECTURE.md` — observation signals are C2-class (consent before collection)
- `docs/TASKS.md` — CP-02 queue entry (DELIVERED / CLOSED; CP-03 deps CP-01 + OWNER_DECISION_GATE)