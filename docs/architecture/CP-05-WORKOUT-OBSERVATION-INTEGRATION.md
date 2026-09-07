# CP-05 — Workout Observation Integration / Camera Runtime (bounded tranche)

> **Status:** IMPLEMENTED — pending governed delivery
> **Authorization:** Owner authorized browser-camera/device-measured tranche on 2026-09-08
> **Profile:** `CODE_NO_DEPLOY`; no persistence, Production, retention, or legal change
> **Scope status:** source-level implementation complete; physical-device acceptance pending

## 1. Smallest defensible scope

This tranche extends the existing CP-05/CP-07 path for exactly one validated
CP-03 device capability:

- camera access begins only after the existing explicit CP-06 product consent is
  granted and the workout is actively exercising;
- only the existing CP-03 validated `squat` scope is eligible;
- official same-origin MoveNet Lightning v4 artifacts are reused from the CP-03
  bundle, with TF.js/pose-detection loaded in the browser;
- raw frames remain in the browser and are never exported or persisted;
- confident hip/knee/ankle keypoints drive the validated squat angle thresholds
  from the CP-03 harness (`<=95°` down, `>=155°` up);
- completed camera reps emit CP-02 `REP_COUNT` with `DEVICE_MEASURED` source
  into the existing CP-07 in-memory runtime;
- if camera access, model loading, inference, or confidence is unavailable,
  the runtime reports uncertainty and the manual WorkoutPlayer control remains
  available;
- stopping/revoking consent stops tracks, disposes the detector, and clears
  the in-memory camera runtime path.

No other movement is device-measured. No ROM, form, asymmetry, tempo-drift, or
movement-quality claim is added.

## 2. Existing boundaries reused

- CP-06 `ConsentEntity`/banner/indicator remains the product consent surface.
- CP-04 session-gated on-device pipeline shape remains the privacy boundary.
- CP-07 remains the sole observation recorder; no parallel observation system is
  created.
- CP-05 manual `USER_REPORTED` path remains the fallback and continues to work
  without camera permission.
- MO-01/TS-02 persistence, retention, legal, and deletion gates remain closed.

## 3. Changed runtime surfaces

- `src/services/cameraRuntime.ts`: browser-only, consent-gated same-origin
  MoveNet Lightning adapter; in-memory only.
- `src/lib/observation/cameraGate.ts`: client-safe gate helper extracted from
  the server/boundary service to avoid importing server-only code into a
  Client Component.
- `src/lib/observation/index.ts`: public gate exports.
- `src/components/workout/WorkoutPlayer.tsx`: starts the camera runtime only
  for a consented active squat; shares CP-07 runtime; stops on revoke/unmount;
  preserves manual fallback.
- `src/components/workout/CameraConsentBanner.tsx`: consent is emitted only
  on explicit Enable action; toggling scopes alone never starts camera access.
- `public/models/movenet/singlepose-lightning/4/`: official CP-03 model
  artifacts reused same-origin, with provenance/license files.

## 4. Explicit non-goals

- no camera access before explicit consent;
- no camera for unsupported scopes;
- no persistence/history/retention or outcome mutation;
- no Production deployment or acceptance claim;
- no legal wording decision;
- no unsupported movement-quality claim;
- no browser-camera implementation in the server-only `cameraService`.

## 5. Remaining gate

This tranche is implementation-ready for governed CI delivery. Physical-device
acceptance is still required before claiming camera-runtime field validation;
no such claim is made by source-level tests or CI.
