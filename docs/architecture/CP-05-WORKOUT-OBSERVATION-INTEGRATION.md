# CP-05 — Workout Observation Integration (bounded tranche)

> **Status:** CLOSED — delivered via PR #56 merge `d265174`
> **Exact merge Main CI:** run `34160248294`; build `101860307782` PASS; e2e `101861466037` PASS
> **Branch retirement:** `feat/cp-05-observation-session-integration` retired locally/remotely
> **Authorization:** Owner promoted CP-05 on 2026-09-07
> **Profile:** `CODE_NO_DEPLOY`; no persistence, Production, or legal change

## 1. Scope

This tranche advances Workout Experience V2 by connecting the existing
`WorkoutPlayer` manual rep control to the CP-07 in-memory observation runtime.
When a user completes a set, the player emits a read-model snapshot containing
the validated CP-02 observation record produced from the existing manual
counter:

- source: `USER_REPORTED`;
- anchor: current S-04 exercise index and set;
- optional canonical exercise identity;
- observed/manual rep count and planned reps;
- explicit `persisted: false` runtime record.

A parent/Companion consumer may receive the snapshot through the new
`onObservationChange` callback. No consumer is added in this tranche; the
callback is the clean integration boundary for future in-session guidance.

## 2. Gates preserved

- **CP-02:** runtime uses existing validation and summary contracts.
- **CP-06:** existing consent UX is unchanged; no-camera start remains fully
  usable. Manual observations do not require camera consent.
- **CP-04:** no browser camera, MoveNet, `DEVICE_MEASURED`, or raw-frame path is
  introduced. The CP-04 camera-runtime gate remains untouched.
- **CP-07:** the pure runtime remains the sole recorder and owns in-memory
  records.
- **MO-01/TS-02:** no persistence, retention, legal wording, or data-plane
  decision is made.
- **AL-01:** no workout outcome is mutated or persisted.

## 3. Explicit non-goals

- no browser-camera/permission integration;
- no automatic rep measurement;
- no device-measured signal;
- no adaptation decision or mid-session plan mutation;
- no form/ROM/tempo-quality claim;
- no UI surface beyond the existing WorkoutPlayer behavior;
- no persistence/history/analytics payload.

## 4. Changed files

- `src/components/workout/WorkoutPlayer.tsx` — CP-07 runtime lifecycle and
  `onObservationChange` read-model callback at manual set completion.
- `src/lib/observation/runtime.ts` — immutable runtime snapshot read-model.
- `docs/TASKS.md` and `docs/CURRENT_STATE.md` — authorization and active
  tranche state.

## 5. Acceptance

- Manual rep completion produces a USER_REPORTED observation, not a device
  measurement.
- No-camera workflow remains unchanged.
- Runtime snapshot is in-memory and explicitly non-persisted.
- Typecheck and lint pass.
- Existing CP-02/CP-07 tests remain green.

## 6. Closure boundary

This tranche is closed. It is not a claim that the complete CP-05 Workout
Experience V2, camera runtime, device-measured observation, persistence, or
Production acceptance has been delivered. Those remain separately gated.
