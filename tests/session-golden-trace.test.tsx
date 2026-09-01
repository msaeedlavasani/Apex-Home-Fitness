/**
 * S03-A golden-trace baseline (GT-01..GT-12).
 *
 * Freezes the CURRENT `useWorkoutEngine` behavior via deterministic traces
 * (injectable `now` + mock timers + lifecycle stubs) BEFORE the S-03 pure-core
 * extraction. Every assertion below is the behavioral reference that S03-B..F
 * must keep green. Captures exact callback ORDER (`log`) — the order is part
 * of the observable contract.
 */
import assert from 'node:assert/strict';
import test from 'node:test';

import {runGoldenTrace, lastState, type GoldenTraceStep} from './helpers/goldenTrace';
import type {SessionExercise} from '../src/lib/workout/sessionContracts';
import type {ExerciseId, ExerciseSlug} from '../src/lib/exercise';

const PLAN: SessionExercise[] = [
  {id: 'ex-1', name: 'Squats', sets: 3, reps: 12, durationSeconds: 30, restSeconds: 45},
  {id: 'ex-2', name: 'Plank', sets: 2, reps: null, durationSeconds: 60, restSeconds: 30},
  {id: 'ex-3', name: 'Burpees', sets: 1, reps: 10, durationSeconds: 20, restSeconds: null},
];

// Two 1-set exercises so a completed set enters RESTING instead of finishing.
const REST_PLAN: SessionExercise[] = [
  {id: 'a', name: 'A', sets: 1, reps: null, durationSeconds: 30, restSeconds: 5},
  {id: 'b', name: 'B', sets: 1, reps: null, durationSeconds: 30, restSeconds: null},
];

// Open-ended set (no duration): counts up, no auto-advance.
const OPEN_PLAN: SessionExercise[] = [
  {id: 'o', name: 'Open', sets: 1, reps: null, durationSeconds: null, restSeconds: null},
];

// Two DISTINCT workout steps sharing the same canonical exerciseId (S02-D2).
const IDENTITY_PLAN: SessionExercise[] = [
  {id: 'step-A', name: 'Dead Bug', sets: 1, reps: null, durationSeconds: 30, restSeconds: null, exerciseId: 'clx_deadbug_1' as ExerciseId, slug: 'dead-bug' as ExerciseSlug},
  {id: 'step-B', name: 'Dead Bug', sets: 1, reps: null, durationSeconds: 30, restSeconds: null, exerciseId: 'clx_deadbug_1' as ExerciseId, slug: 'dead-bug' as ExerciseSlug},
];

const START: GoldenTraceStep = {command: {kind: 'START'}};

// ---------------------------------------------------------------------------
// GT-01 — Initial / Start
// ---------------------------------------------------------------------------

test('GT-01 initial state is READY and START moves to EXERCISING with exact effects', () => {
  const {observations, allLog} = runGoldenTrace(PLAN, [START]);
  const initial = observations[0]!;
  assert.equal(initial.state.phase, 'EXERCISING');
  assert.equal(initial.state.currentExerciseIndex, 0);
  assert.equal(initial.state.currentSet, 1);
  assert.equal(initial.state.phaseElapsedSeconds, 0);
  assert.equal(initial.state.totalElapsedSeconds, 0);
  assert.equal(initial.state.isRunning, true);
  assert.equal(initial.state.startedAt, 1_000_000);
  assert.equal(initial.state.completedAt, null);
  assert.equal(initial.currentExerciseId, 'ex-1');
  // Exact callback order on START: state snapshot first, then phase change.
  assert.deepEqual(initial.log, ['state', 'phase:EXERCISING']);
  assert.equal(allLog.filter((e) => e === 'state').length, 1, 'exactly one snapshot emit on START');
});

// ---------------------------------------------------------------------------
// GT-02 — Timed exercise auto-advance
// ---------------------------------------------------------------------------

test('GT-02 countdown reaching duration auto-completes the set into RESTING', () => {
  const {observations} = runGoldenTrace(PLAN, [
    START,
    {advanceMs: 30_000, command: {kind: 'ACCOUNT', elapsedSeconds: 30}},
  ]);
  const after = observations[1]!;
  assert.equal(after.state.phase, 'RESTING');
  assert.equal(after.state.currentExerciseIndex, 0);
  assert.equal(after.state.currentSet, 2, 'currentSet advanced to 2');
  assert.equal(after.state.completedSets, 1);
  assert.equal(after.state.phaseElapsedSeconds, 0, 'rest starts from 0');
  assert.equal(after.state.totalElapsedSeconds, 30);
  assert.equal(after.state.isRunning, true);
  // Exact order: set complete (synchronous) → snapshot → phase.
  assert.deepEqual(after.log, ['set:0:1', 'state', 'phase:RESTING']);
});

// ---------------------------------------------------------------------------
// GT-03 — Multi-set exercise: work → rest → work
// ---------------------------------------------------------------------------

test('GT-03 work→rest→work advances set within the same exercise', () => {
  const {observations} = runGoldenTrace(PLAN, [
    START,
    {advanceMs: 30_000, command: {kind: 'ACCOUNT', elapsedSeconds: 30}},  // set 1 → RESTING
    {advanceMs: 45_000, command: {kind: 'ACCOUNT', elapsedSeconds: 45}},  // rest over → EXERCISING set 2
  ]);
  const after = observations[2]!;
  assert.equal(after.state.phase, 'EXERCISING');
  assert.equal(after.state.currentExerciseIndex, 0);
  assert.equal(after.state.currentSet, 2);
  assert.equal(after.state.completedSets, 1);
  assert.equal(after.state.phaseElapsedSeconds, 0);
  assert.equal(after.state.totalElapsedSeconds, 75);
});

// ---------------------------------------------------------------------------
// GT-04 — Pause / resume
// ---------------------------------------------------------------------------

test('GT-04 paused time never accumulates and resume continues', () => {
  const {observations} = runGoldenTrace(PLAN, [
    START,
    {advanceMs: 10_000, command: {kind: 'ACCOUNT', elapsedSeconds: 10}},
    {command: {kind: 'PAUSE'}},
    {advanceMs: 50_000, command: {kind: 'ACCOUNT', elapsedSeconds: 0}},  // paused — ignored
    {command: {kind: 'RESUME'}},
    {advanceMs: 5_000, command: {kind: 'ACCOUNT', elapsedSeconds: 5}},
  ]);
  const paused = observations[2]!;
  assert.equal(paused.state.phaseElapsedSeconds, 10);
  assert.equal(paused.state.totalElapsedSeconds, 10);
  assert.equal(paused.state.isRunning, false);
  const after = observations[5]!;
  assert.equal(after.state.phaseElapsedSeconds, 15, 'only running time counts (10 + 5)');
  assert.equal(after.state.totalElapsedSeconds, 15);
  assert.equal(after.state.isRunning, true);
});

// ---------------------------------------------------------------------------
// GT-05 — Skip rest
// ---------------------------------------------------------------------------

test('GT-05 skipRest ends rest and moves to the next exercise', () => {
  const {observations} = runGoldenTrace(REST_PLAN, [
    START,
    {advanceMs: 30_000, command: {kind: 'ACCOUNT', elapsedSeconds: 30}},  // set A → RESTING (restTarget exercise)
    {command: {kind: 'SKIP_REST'}},
  ]);
  const after = observations[2]!;
  assert.equal(after.state.phase, 'EXERCISING');
  assert.equal(after.state.currentExerciseIndex, 1);
  assert.equal(after.state.currentSet, 1);
  assert.equal(after.state.completedSets, 1);
  assert.equal(after.currentExerciseId, 'b');
});

// ---------------------------------------------------------------------------
// GT-06 — Manual set completion (rep-based flow)
// ---------------------------------------------------------------------------

test('GT-06 manual completeSet + skipRest cycle through sets without auto-advance', () => {
  const {observations} = runGoldenTrace(PLAN, [
    START,
    {command: {kind: 'COMPLETE_SET'}},   // set 1 → RESTING set 2
    {command: {kind: 'SKIP_REST'}},      // → EXERCISING set 2
    {command: {kind: 'COMPLETE_SET'}},   // set 2 → RESTING set 3
    {command: {kind: 'SKIP_REST'}},      // → EXERCISING set 3
    {command: {kind: 'COMPLETE_SET'}},   // last set → RESTING (restTarget exercise)
  ]);
  assert.equal(observations[1]!.state.phase, 'RESTING');
  assert.equal(observations[1]!.state.currentSet, 2);
  assert.equal(observations[2]!.state.phase, 'EXERCISING');
  assert.equal(observations[2]!.state.currentSet, 2);
  assert.equal(observations[3]!.state.phase, 'RESTING');
  assert.equal(observations[3]!.state.currentSet, 3);
  assert.equal(observations[4]!.state.phase, 'EXERCISING');
  assert.equal(observations[4]!.state.currentSet, 3);
  const last = observations[5]!;
  assert.equal(last.state.phase, 'RESTING');
  assert.equal(last.state.currentSet, 3);
  assert.equal(last.state.completedSets, 3, 'RESTING after last set counts all sets');
});

// ---------------------------------------------------------------------------
// GT-07 — Exercise navigation (next / previous / jumpTo + guards)
// ---------------------------------------------------------------------------

test('GT-07 navigation moves by index with clamps', () => {
  const {observations} = runGoldenTrace(PLAN, [
    START,
    {command: {kind: 'PREVIOUS_EXERCISE'}},      // index 0 → clamped 0
    {command: {kind: 'NEXT_EXERCISE'}},          // → 1
    {command: {kind: 'JUMP_TO', index: 2}},      // → 2
    {command: {kind: 'PREVIOUS_EXERCISE'}},      // → 1
  ]);
  assert.equal(observations[1]!.state.currentExerciseIndex, 0);
  assert.equal(observations[2]!.state.currentExerciseIndex, 1);
  assert.equal(observations[3]!.state.currentExerciseIndex, 2);
  assert.equal(observations[4]!.state.currentExerciseIndex, 1);
  for (const obs of observations) {
    assert.equal(obs.state.phase, 'EXERCISING');
    assert.equal(obs.state.currentSet, 1, 'navigation resets the set');
  }
});

// ---------------------------------------------------------------------------
// GT-08 — Background catch-up
// ---------------------------------------------------------------------------

test('GT-08 background lifecycle accounting catches up exactly, no double counting', () => {
  const {observations} = runGoldenTrace(OPEN_PLAN, [
    START,
    {advanceMs: 2_000, command: {kind: 'ACCOUNT', elapsedSeconds: 2}},
    {advanceMs: 90_000, command: {kind: 'ACCOUNT', elapsedSeconds: 90}, trigger: 'lifecycle'},
    {advanceMs: 10_000, command: {kind: 'ACCOUNT', elapsedSeconds: 10}, trigger: 'lifecycle'},
  ]);
  assert.equal(observations[1]!.state.phaseElapsedSeconds, 2);
  assert.equal(observations[1]!.state.totalElapsedSeconds, 2);
  assert.equal(observations[2]!.state.phaseElapsedSeconds, 92);
  assert.equal(observations[3]!.state.phaseElapsedSeconds, 102);
  assert.equal(observations[3]!.state.totalElapsedSeconds, 102);
});

// ---------------------------------------------------------------------------
// GT-09 — Hydration
// ---------------------------------------------------------------------------

test('GT-09a hydrate restores position paused with phase callback suppressed', () => {
  const {observations} = runGoldenTrace(PLAN, [
    {command: {kind: 'HYDRATE', input: {phase: 'RESTING', currentExerciseIndex: 0, currentSet: 2, phaseElapsedSeconds: 10, totalElapsedSeconds: 40, startedAt: 900_000}}},
  ]);
  const restored = observations[0]!;
  assert.equal(restored.state.phase, 'RESTING');
  assert.equal(restored.state.currentExerciseIndex, 0);
  assert.equal(restored.state.currentSet, 2);
  assert.equal(restored.state.phaseElapsedSeconds, 10);
  assert.equal(restored.state.totalElapsedSeconds, 40);
  assert.equal(restored.state.startedAt, 900_000);
  assert.equal(restored.state.isRunning, false, 'hydrated sessions are paused');
  // Phase callback suppressed on hydrate — only the snapshot emits.
  assert.deepEqual(restored.log, ['state']);
});

test('GT-09b hydrate clamps elapsed to duration−1 and falls back startedAt to null', () => {
  const {observations} = runGoldenTrace(PLAN, [
    {command: {kind: 'HYDRATE', input: {phase: 'EXERCISING', currentExerciseIndex: 0, currentSet: 1, phaseElapsedSeconds: 50, totalElapsedSeconds: 40}}}, // 50 → capped at 29 (duration 30)
  ]);
  const clamped = observations[0]!;
  assert.equal(clamped.state.phase, 'EXERCISING');
  assert.equal(clamped.state.phaseElapsedSeconds, 29, 'phaseElapsed capped at duration−1');
  assert.equal(clamped.state.totalElapsedSeconds, 40);
  assert.equal(clamped.state.startedAt, null, 'startedAt falls back to null when absent');
  assert.equal(clamped.state.isRunning, false);
});

test('GT-09c hydrate of COMPLETED sets completedAt to now and derives full progress', () => {
  const {observations} = runGoldenTrace(PLAN, [
    {command: {kind: 'HYDRATE', input: {phase: 'COMPLETED'}}},
  ]);
  const completed = observations[0]!;
  assert.equal(completed.state.phase, 'COMPLETED');
  assert.equal(completed.state.completedAt, 1_000_000, 'completedAt set to now');
  assert.equal(completed.state.completedSets, 6, 'COMPLETED derives full totalSets');
  assert.equal(completed.state.isRunning, false);
});

test('GT-09d hydrate is a no-op once the workout is not READY', () => {
  const {observations} = runGoldenTrace(PLAN, [
    START,
    {command: {kind: 'HYDRATE', input: {phase: 'READY', currentExerciseIndex: 1}}},
  ]);
  const after = observations[1]!;
  assert.equal(after.state.phase, 'EXERCISING', 'hydrate ignored after start');
  assert.equal(after.state.currentExerciseIndex, 0);
});

test('GT-09b hydrate of RESTING after last set reconstructs restTarget → next exercise', () => {
  const {observations} = runGoldenTrace(REST_PLAN, [
    {command: {kind: 'HYDRATE', input: {phase: 'RESTING', currentExerciseIndex: 0, currentSet: 1, phaseElapsedSeconds: 2, totalElapsedSeconds: 30}}},
    {command: {kind: 'SKIP_REST'}},
  ]);
  const after = observations[1]!;
  assert.equal(after.state.phase, 'EXERCISING');
  assert.equal(after.state.currentExerciseIndex, 1);
  assert.equal(after.currentExerciseId, 'b');
});

// ---------------------------------------------------------------------------
// GT-10 — Completion
// ---------------------------------------------------------------------------

test('GT-10 final set completes the workout with exact summary and callback order', () => {
  const {observations} = runGoldenTrace(REST_PLAN, [
    START,
    {advanceMs: 30_000, command: {kind: 'ACCOUNT', elapsedSeconds: 30}},  // set A → RESTING
    {advanceMs: 5_000, command: {kind: 'ACCOUNT', elapsedSeconds: 5}},   // rest → EXERCISING ex-1
    {advanceMs: 30_000, command: {kind: 'ACCOUNT', elapsedSeconds: 30}}, // set B → COMPLETED
  ]);
  const done = observations[3]!;
  assert.equal(done.state.phase, 'COMPLETED');
  assert.equal(done.state.completedAt, 1_065_000, 'completedAt = now at completion');
  assert.equal(done.state.isRunning, false);
  assert.equal(done.state.completedSets, 2);
  assert.equal(done.state.totalSets, 2);
  assert.equal(done.state.phaseElapsedSeconds, 0);
  // Exact callback order at completion: set → exercise → workout (sync), then state → phase.
  assert.deepEqual(done.log, ['set:1:1', 'exercise:1', 'workout:2/2:65', 'state', 'phase:COMPLETED']);
  const workout = done.effects.find((e) => e.kind === 'WORKOUT_COMPLETED');
  assert.ok(workout?.kind === 'WORKOUT_COMPLETED');
  assert.deepEqual(workout.summary, {totalExercises: 2, totalSets: 2, completedSets: 2, durationSeconds: 65});
});

// ---------------------------------------------------------------------------
// GT-11 — Reset / restart
// ---------------------------------------------------------------------------

test('GT-11 reset returns to READY zeroed; restart begins immediately', () => {
  const {observations} = runGoldenTrace(PLAN, [
    START,
    {advanceMs: 10_000, command: {kind: 'ACCOUNT', elapsedSeconds: 10}},
    {command: {kind: 'RESET'}},
    {command: {kind: 'RESTART'}},
  ]);
  const reset = observations[2]!;
  assert.equal(reset.state.phase, 'READY');
  assert.equal(reset.state.currentExerciseIndex, 0);
  assert.equal(reset.state.currentSet, 1);
  assert.equal(reset.state.phaseElapsedSeconds, 0);
  assert.equal(reset.state.totalElapsedSeconds, 0);
  assert.equal(reset.state.isRunning, false);
  assert.equal(reset.state.startedAt, null);
  assert.equal(reset.state.completedAt, null);

  const restarted = observations[3]!;
  assert.equal(restarted.state.phase, 'EXERCISING');
  assert.equal(restarted.state.isRunning, true);
  assert.equal(restarted.state.startedAt, 1_010_000, 'restart stamps a fresh startedAt');
  assert.equal(restarted.state.phaseElapsedSeconds, 0);
});

// ---------------------------------------------------------------------------
// GT-12 — Repeated canonical exercise (step identity invariant)
// ---------------------------------------------------------------------------

test('GT-12 multiple steps sharing an exerciseId stay distinct, position-indexed steps', () => {
  const {observations} = runGoldenTrace(IDENTITY_PLAN, [
    START,
    {advanceMs: 30_000, command: {kind: 'ACCOUNT', elapsedSeconds: 30}},  // step-A → step-B
    {advanceMs: 30_000, command: {kind: 'ACCOUNT', elapsedSeconds: 30}},  // step-B → COMPLETED
  ]);
  // Two distinct steps: totalSets must be 2 (no collapse to 1).
  assert.equal(observations[0]!.state.totalSets, 2);
  assert.equal(observations[0]!.currentExerciseId, 'step-A');
  const mid = observations[1]!;
  assert.equal(mid.state.phase, 'EXERCISING');
  assert.equal(mid.state.currentExerciseIndex, 1);
  assert.equal(mid.currentExerciseId, 'step-B', 'step identity is position/step based, not exerciseId');
  assert.equal(mid.state.completedSets, 1);
  const done = observations[2]!;
  assert.equal(done.state.phase, 'COMPLETED');
  assert.equal(done.state.completedSets, 2);
});

// ---------------------------------------------------------------------------
// Baseline freeze sanity — derived helpers
// ---------------------------------------------------------------------------

test('baseline: lastState convenience returns the final session state', () => {
  const state = lastState(PLAN, [START]);
  assert.equal(state.phase, 'EXERCISING');
  assert.equal(state.totalSets, 6);
});