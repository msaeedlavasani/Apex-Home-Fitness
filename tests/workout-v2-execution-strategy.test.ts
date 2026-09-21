import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import {
  capabilityUnavailable,
  capabilityUsableForSquat,
  resolveRuntimeExecution,
} from '../src/lib/workout/executionStrategy';
import {sharedPrescriptionFromPersistedPlan} from '../src/lib/workout/prescriptionContract';
import {createSetCapability} from '../src/lib/workout/setCapability';

const REP_PLAN = sharedPrescriptionFromPersistedPlan([
  {id: 'jump', name: 'Jump Squats', sets: 1, reps: 2, fallbackDurationSeconds: 45},
]);
const TIME_PLAN = sharedPrescriptionFromPersistedPlan([
  {id: 'hold', name: 'Bodyweight Squat', sets: 1, durationSeconds: 3},
]);

const evidence = (attemptId: string, quality: 'VALID' | 'INVALID' = 'VALID') => ({
  kind: 'REP_ATTEMPT' as const,
  attemptId,
  movementKey: 'squat',
  quality,
  confidence: quality === 'VALID' ? 0.9 : 0.2,
  observedAtMs: 1,
});

test('REP_BASED + usable tracking resolves TRACKED_REP and counts performed/valid separately', () => {
  const exercise = REP_PLAN.exercises[0]!;
  const runtime = resolveRuntimeExecution(exercise, capabilityUsableForSquat());
  assert.equal(runtime.strategy, 'TRACKED_REP');
  const set = createSetCapability(exercise, runtime, 1);
  set.recordMovementEvidence(evidence('valid'));
  assert.equal(set.state.performedRepCount, 1);
  assert.equal(set.state.validRepCount, 1);
  const completed = set.recordMovementEvidence(evidence('uncertain', 'INVALID'));
  assert.equal(completed.completed, true, 'completion follows performed attempts, not quality count');
  assert.equal(set.state.performedRepCount, 2);
  assert.equal(set.state.validRepCount, 1);
});

test('REP_BASED without usable tracking resolves TIMED_FALLBACK and consumes the resolved duration', () => {
  const exercise = REP_PLAN.exercises[0]!;
  const runtime = resolveRuntimeExecution(exercise, capabilityUnavailable());
  assert.equal(runtime.prescriptionMode, 'REP_BASED');
  assert.equal(runtime.strategy, 'TIMED_FALLBACK');
  assert.equal(runtime.fallbackDurationSeconds, 45);
  const set = createSetCapability(exercise, runtime, 1);
  assert.equal(set.state.targetSeconds, 45);
  assert.equal(set.advance(44).completed, false);
  assert.equal(set.advance(1).completed, true);
});

test('TIME_BASED remains native TIMED and never acquires a REP fallback', () => {
  const exercise = TIME_PLAN.exercises[0]!;
  const runtime = resolveRuntimeExecution(exercise, capabilityUnavailable());
  assert.deepEqual(runtime, {
    prescriptionMode: 'TIME_BASED',
    strategy: 'TIMED',
    fallbackDurationSeconds: null,
    movementKey: 'squat',
  });
});

test('tracking loss and reacquisition preserve performed reps; fallback requires explicit remaining time', () => {
  const exercise = REP_PLAN.exercises[0]!;
  const runtime = resolveRuntimeExecution(exercise, capabilityUsableForSquat());
  const set = createSetCapability(exercise, runtime, 1);
  set.recordMovementEvidence(evidence('one'));
  set.markTrackingLost();
  assert.equal(set.state.trackingState, 'TRACKING_LOST');
  assert.equal(set.state.performedRepCount, 1);
  set.markTrackingReacquired();
  assert.equal(set.state.trackingState, 'TRACKED');
  set.switchToTimedFallback(12);
  assert.equal(set.state.runtimeStrategy, 'TIMED_FALLBACK');
  assert.equal(set.state.performedRepCount, 1);
  assert.equal(set.state.targetSeconds, 12);
});

test('normal product wiring is capability-gated and has no legacy player dependency', () => {
  const root = process.cwd();
  const shell = fs.readFileSync(path.join(root, 'src/components/workout/experience/ExperienceShell.tsx'), 'utf8');
  const route = fs.readFileSync(path.join(root, 'src/app/[locale]/workout/page.tsx'), 'utf8');
  const stage = fs.readFileSync(path.join(root, 'src/components/workout/experience/WorkSetStage.tsx'), 'utf8');
  const outcome = fs.readFileSync(path.join(root, 'src/components/workout/experience/SessionOutcomeSummary.tsx'), 'utf8');
  assert.match(shell, /useWorkoutCapabilityGate/);
  assert.match(shell, /ConsentGatedCameraRuntime/);
  assert.match(shell, /data-workout-v2-session-mentor/);
  assert.doesNotMatch(route, /WorkoutPlayer|useWorkoutEngine|RepSetCounter/);
  assert.doesNotMatch(stage, /data-workout-v2-record-rep/);
  assert.match(stage, /runtimeStrategy/);
  assert.match(outcome, /viewModel\.lifecycle === 'RUNNING'/);
});
