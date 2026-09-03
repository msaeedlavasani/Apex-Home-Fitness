# ADR-0019: Observation Signal Model

> **STATUS: ACCEPTED — 2026-09-03**
>
> **Decision owner:** Product/architecture owner
>
> **Evidence task:** `CP-02` (Observation signal model, delivered
> 2026-09-03; contract/schema:
> `docs/architecture/CP-02-OBSERVATION-SIGNAL-MODEL.md`; module:
> `src/lib/observation/`; invariants: `tests/observation-signal.test.ts`;
> view in `docs/TASKS.md`)
>
> **Execution gating:** this ADR ratifies the observation signal contract
> (pure schema + mapping design). It does NOT authorize any measurement,
> collection, camera/sensor work (CP-03 feasibility, CP-04 consent — both
> separately gated), consent surfaces (TS-01/TS-02), or runtime wiring.

## Context

CP-01 defined the Companion as a guidance/observation surface whose
in-session interventions (G2 rep/phase awareness, G3 form feedback, G4
correction) need typed inputs, and the closed loop needs in-session
observations to feed the AL-01 outcome model. Without a signal contract,
future Companion work would improvise per-set observations ad hoc and
drift from the AL-01/AL-02 fail-closed discipline.

## Decision

1. **Adopt the observation signal contract** in `src/lib/observation/`
   (`OBSERVATION_CONTRACT_VERSION = 1`): a closed union of per-set signals —
   `REP_COUNT`, `SET_TIMING`, `REP_TIMING` (tempo), `REST_TIMING`, and
   `FORM_PROXY` (RANGE_OF_MOTION / TEMPO_DRIFT / RHYTHM_IRREGULARITY /
   ASYMMETRY / FORM_BREAKDOWN with LOW/MEDIUM/HIGH severity) — each anchored
   to the S-04 plan position + set number, with optional S-02 identity.
2. **Sources are closed and honest.** Count/timing signals are
   `USER_REPORTED` or `DEVICE_MEASURED`; form proxies may only be
   `USER_REPORTED` or `MEASURED_PROXY` — a `DEVICE_MEASURED` form proxy is
   refused by the validator until CP-03 validates proxy definitions (no
   fabricated form quality).
3. **Fail-closed validation and aggregation.** `validateObservationSignal`
   refuses malformed signals (never repairs/guesses); absence = "no
   observation", never a negative claim. `summarizeSetSignals` is pure and
   deterministic (latest-wins per kind, median rep timing, worst-severity
   escalation, sorted/deduped sources).
4. **Signals map INTO AL-01; they never replace it.** `REP_COUNT` →
   `PerExerciseOutcome.actualReps`; timing signals and form proxies remain
   observation evidence in v1 (documented mapping §5 of the architecture
   doc); HIGH-severity form proxies may surface as AL-04 recurring-difficulty
   subjects only via explicit user reporting.
5. **Privacy posture (TS-01):** observation signals are C2-class — collected
   only with explicit, granular, revocable consent, purpose-bound, deletable
   with the account. Raw video never leaves the device (C1). This contract
   authorizes no collection.
6. **Copy/identity discipline:** signals reference S-04 positions + S-02
   canonical identity; display names are never identity.

## Consequences

- Future Companion observation work (CP-05, camera/pose paths) builds
  against a fixed, validated signal vocabulary instead of ad hoc shapes.
- Nothing is measured, collected, or wired by this decision; device-measured
  signals (counts/timing) require their own validated source, and form
  proxies specifically await CP-03.
- The pure aggregation helper gives in-session consumers (CP-01 G2–G4) a
  deterministic per-set read-model.

## Related

- `docs/architecture/CP-02-OBSERVATION-SIGNAL-MODEL.md` — the architecture/mapping (this record's evidence)
- `docs/adr/0018-companion-architecture.md` (CP-01 — intervention model G2–G4)
- `docs/adr/0014-privacy-safety-architecture.md` (TS-01 — C2 consent/retention), `docs/adr/0012-workout-outcome-model.md` (AL-01)
- `src/lib/workout/sessionContracts.ts` (S-04 — anchor/phase model)
- `docs/product/PRODUCT-STRATEGY.md` §2D (Companion), §8 (privacy)