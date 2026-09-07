# CP-07 — Movement Observation Runtime (v1)

> **Status:** IMPLEMENTED — `CODE_NO_DEPLOY`, in-session only
> **Owner authorization:** promoted by Owner decision 2026-09-07
> **Scope:** pure typed runtime recorder; no camera invocation, persistence, retention, Production, legal wording, or UI redesign

## 1. Exact scope

CP-07 v1 connects the existing CP-02 signal contract to an in-memory runtime
record for a workout session. It supports:

- S-04 `exerciseIndex` + 1-based `set` anchoring;
- optional canonical movement identity (`exerciseId`/`slug`) and `movementKey`;
- validated CP-02 `REP_COUNT`, `SET_TIMING`, `REP_TIMING`, and
  `REST_TIMING` signals;
- deterministic per-set summary through `summarizeSetSignals`;
- `OBSERVED`, `UNCERTAIN`, and `UNOBSERVABLE` record status;
- explicit `UNKNOWN` source when no trusted measurement exists;
- timestamps/duration when available;
- a hard `persisted: false` contract.

The runtime refuses `FORM_PROXY` signals in v1. CP-03 has validated one
MoveNet measurement cell and Android model delivery, but it has **not** validated
broad movement-quality/form claims or the full performance matrix. Therefore
CP-07 does not invent RANGE_OF_MOTION, TEMPO_DRIFT, ASYMMETRY, or
FORM_BREAKDOWN signals.

## 2. Existing contracts and gates honored

- **CP-02:** uses the existing closed union, fail-closed validation, and pure
  aggregation; no CP-02 type is weakened or replaced.
- **CP-03:** limits runtime output to count/timing observations that the
  validated on-device path can support; absence is not zero/failure.
- **CP-04:** runtime is only an in-memory observation boundary. It does not
  access `getUserMedia`, MoveNet, browser permission, or raw frames. A future
  camera adapter must call this boundary only after the CP-04 consent/session
  gates pass.
- **CP-06:** existing consent UX/no-camera fallback remains unchanged. This
  runtime does not make consent decisions and does not block workout execution.
- **AL-01:** records are observation evidence; they do not replace or mutate
  `WorkoutOutcomeRecord`. Mapping to `actualReps` remains a future recorder
  integration decision.
- **MO-01:** persistence/history is explicitly deferred. No IndexedDB, Prisma,
  Supabase, schema, retention, or deletion code is added.
- **TS-02 / Production:** no legal wording, camera wiring, deployment, or
  product exposure is added.

## 3. Implementation

- `src/lib/observation/runtime.ts` — pure runtime factory and record types
- `src/lib/observation/index.ts` — public exports
- `tests/observation-runtime.test.ts` — 5 tests for observed, malformed,
  uncertain/unobservable, cancellation, and anchoring behavior

Runtime instances own their records in memory and expose read-only snapshots.
They require one active set at a time, reject cross-set signals, refuse invalid
signals, and never synthesize missing counts.

## 4. Explicit non-goals

- no browser camera or MoveNet/TF.js call site;
- no WorkoutPlayer wiring yet, because the existing CP-04 runtime-camera
  implementation gate remains separate from this pure runtime contract;
- no new consent/persistence/storage policy;
- no product quality feedback or unsupported claims;
- no outcome mutation or adaptive-training decision.

## 5. Acceptance

- CP-02 tests remain green.
- CP-07 runtime tests cover valid count/timing, fail-closed invalid input,
  explicit uncertainty, and set anchoring.
- Typecheck and lint pass.
- Privacy boundary is preserved: no raw video, camera, persistence, network,
  or Production path exists in the change.
