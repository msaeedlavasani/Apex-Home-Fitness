import assert from 'node:assert/strict';
import test from 'node:test';
import {normalizeRequestedExerciseNames, preserveRequestedEntryOrder} from '../src/services/movementGraphStore';
import {capabilityUnavailable, capabilityUsableForSquat} from '../src/lib/workout/executionStrategy';
import {createSessionOrchestrator, PREPARING_DURATION_SECONDS, SET_RESULT_DURATION_SECONDS} from '../src/lib/workout/orchestration';
import {sharedPrescriptionFromPersistedPlan} from '../src/lib/workout/prescriptionContract';
import type {SessionExercise} from '../src/lib/workout/sessionContracts';

const TRACKED = capabilityUsableForSquat();

function start(plan: readonly SessionExercise[], capability = capabilityUnavailable()) {
  const orchestrator = createSessionOrchestrator(sharedPrescriptionFromPersistedPlan(plan), {capability});
  orchestrator.dispatch({type: 'START_SESSION'}, 1_000);
  orchestrator.advance(PREPARING_DURATION_SECONDS);
  return orchestrator;
}

function completeSet(orchestrator: ReturnType<typeof createSessionOrchestrator>, attemptPrefix: string) {
  if (orchestrator.state.activeModule === 'EXERCISE_INTRO') {
    orchestrator.dispatch({type: 'BEGIN_WORK_SET'});
  }
  assert.equal(orchestrator.state.activeModule, 'WORK_SET');
  const progress = orchestrator.state.setProgress;
  assert.ok(progress);
  if (progress.runtimeStrategy === 'TRACKED_REP') {
    for (let index = 0; index < (progress.targetReps ?? 0); index += 1) {
      orchestrator.dispatch({type: 'MOVEMENT_EVIDENCE', evidence: {
        kind: 'REP_ATTEMPT',
        attemptId: `${attemptPrefix}-${index}`,
        movementKey: 'squat',
        quality: 'VALID',
        confidence: 1,
        observedAtMs: index,
      }});
    }
  } else {
    orchestrator.advance(progress.targetSeconds ?? 1);
  }
  assert.equal(orchestrator.state.activeModule, 'SET_RESULT');
}

function finishSetResult(orchestrator: ReturnType<typeof createSessionOrchestrator>) {
  orchestrator.advance(SET_RESULT_DURATION_SECONDS);
}

test('one exercise with one set reaches final result legitimately', () => {
  const orchestrator = start([{id: 'entry-1', name: 'Bodyweight Squat', sets: 1, durationSeconds: 1}]);
  completeSet(orchestrator, 'one-one');
  finishSetResult(orchestrator);
  assert.equal(orchestrator.state.activeModule, 'WORKOUT_RESULT');
  assert.deepEqual(orchestrator.state.workoutResult, {
    totalExercises: 1,
    completedExercises: 1,
    skippedExercises: 0,
    completedSets: 1,
    totalSets: 1,
    completionKind: 'COMPLETED_FULLY',
  });
});

test('one exercise with multiple sets cannot complete after set one', () => {
  const orchestrator = start([{id: 'entry-1', name: 'Bodyweight Squat', sets: 2, durationSeconds: 1, restSeconds: 1}]);
  completeSet(orchestrator, 'one-many-1');
  finishSetResult(orchestrator);
  assert.equal(orchestrator.state.activeModule, 'REST');
  orchestrator.dispatch({type: 'SKIP_REST'});
  assert.equal(orchestrator.state.currentSetNumber, 2);
  completeSet(orchestrator, 'one-many-2');
  finishSetResult(orchestrator);
  assert.equal(orchestrator.state.activeModule, 'WORKOUT_RESULT');
});

test('multiple exercises with one set each hand off before final result', () => {
  const orchestrator = start([
    {id: 'entry-1', name: 'Bodyweight Squat', sets: 1, durationSeconds: 1, restSeconds: 1},
    {id: 'entry-2', name: 'Bodyweight Squat', sets: 1, durationSeconds: 1, restSeconds: 1},
  ]);
  completeSet(orchestrator, 'many-one-1');
  finishSetResult(orchestrator);
  assert.equal(orchestrator.state.activeModule, 'REST');
  assert.equal(orchestrator.state.setResult, null);
  orchestrator.dispatch({type: 'SKIP_REST'});
  assert.equal(orchestrator.state.activeModule, 'EXERCISE_INTRO');
  assert.equal(orchestrator.state.activeExerciseIndex, 1);
  completeSet(orchestrator, 'many-one-2');
  finishSetResult(orchestrator);
  assert.equal(orchestrator.state.activeModule, 'WORKOUT_RESULT');
  assert.equal(orchestrator.state.workoutResult?.totalExercises, 2);
});

test('multiple exercises with multiple sets preserve set and exercise boundaries', () => {
  const orchestrator = start([
    {id: 'entry-1', name: 'Bodyweight Squat', sets: 2, durationSeconds: 1, restSeconds: 1},
    {id: 'entry-2', name: 'Bodyweight Squat', sets: 2, durationSeconds: 1, restSeconds: 1},
  ]);
  const observed: string[] = [];
  let attempt = 0;
  while (orchestrator.state.activeModule !== 'WORKOUT_RESULT') {
    if (orchestrator.state.activeModule === 'EXERCISE_INTRO') {
      observed.push(`INTRO:${orchestrator.state.activeExerciseIndex}`);
      completeSet(orchestrator, `many-many-${attempt++}`);
      continue;
    }
    if (orchestrator.state.activeModule === 'WORK_SET') {
      completeSet(orchestrator, `many-many-${attempt++}`);
      continue;
    }
    if (orchestrator.state.activeModule === 'SET_RESULT') {
      observed.push(`SET_RESULT:${orchestrator.state.setResult?.exerciseIndex}:${orchestrator.state.setResult?.setNumber}`);
      finishSetResult(orchestrator);
      continue;
    }
    if (orchestrator.state.activeModule === 'REST') {
      observed.push(`REST:${orchestrator.state.restState?.kind}`);
      orchestrator.dispatch({type: 'SKIP_REST'});
      continue;
    }
    throw new Error(`unexpected module ${orchestrator.state.activeModule}`);
  }
  assert.deepEqual(observed, [
    'INTRO:0', 'SET_RESULT:0:1', 'REST:BETWEEN_SETS',
    'SET_RESULT:0:2', 'REST:BETWEEN_EXERCISES',
    'INTRO:1', 'SET_RESULT:1:1', 'REST:BETWEEN_SETS',
    'SET_RESULT:1:2',
  ]);
  assert.equal(orchestrator.state.workoutResult?.completedSets, 4);
});

test('TIME_BASED completes from elapsed time and REP_BASED completes from tracked attempts', () => {
  const timed = start([{id: 'timed', name: 'Plank', sets: 1, durationSeconds: 3}]);
  completeSet(timed, 'timed');
  assert.equal(timed.state.setProgress?.runtimeStrategy, 'TIMED');

  const tracked = start([{id: 'tracked', name: 'Bodyweight Squat', sets: 1, reps: 2, fallbackDurationSeconds: 45}], TRACKED);
  completeSet(tracked, 'tracked');
  assert.equal(tracked.state.setProgress?.runtimeStrategy, 'TRACKED_REP');
  assert.equal(tracked.state.setProgress?.performedRepCount, 2);
});

test('Pause/Resume preserves execution indices and Restart Current Set does not advance them', () => {
  const orchestrator = start([
    {id: 'entry-1', name: 'Bodyweight Squat', sets: 1, durationSeconds: 3},
    {id: 'entry-2', name: 'Bodyweight Squat', sets: 1, durationSeconds: 3},
  ]);
  orchestrator.dispatch({type: 'BEGIN_WORK_SET'});
  orchestrator.advance(1);
  orchestrator.dispatch({type: 'PAUSE'});
  assert.equal(orchestrator.state.activeExerciseIndex, 0);
  assert.equal(orchestrator.state.currentSetNumber, 1);
  orchestrator.dispatch({type: 'RESUME'});
  orchestrator.dispatch({type: 'RESTART_CURRENT_SET'});
  assert.equal(orchestrator.state.activeExerciseIndex, 0);
  assert.equal(orchestrator.state.currentSetNumber, 1);
  assert.equal(orchestrator.state.setProgress?.elapsedSeconds, 0);
});

test('Skip Rest advances exactly once to the next prescribed boundary', () => {
  const orchestrator = start([
    {id: 'entry-1', name: 'Bodyweight Squat', sets: 1, durationSeconds: 1, restSeconds: 5},
    {id: 'entry-2', name: 'Bodyweight Squat', sets: 1, durationSeconds: 1, restSeconds: 5},
  ]);
  completeSet(orchestrator, 'skip-rest');
  finishSetResult(orchestrator);
  assert.equal(orchestrator.state.activeModule, 'REST');
  orchestrator.dispatch({type: 'SKIP_REST'});
  assert.equal(orchestrator.state.activeModule, 'EXERCISE_INTRO');
  assert.equal(orchestrator.state.activeExerciseIndex, 1);
  orchestrator.dispatch({type: 'SKIP_REST'});
  assert.equal(orchestrator.state.activeExerciseIndex, 1);
  assert.equal(orchestrator.state.activeModule, 'EXERCISE_INTRO');
});

test('repeated canonical exercise references retain distinct ordered session entries', () => {
  const resolved = [{id: 'exercise-1', name: 'Bodyweight Squat'}];
  assert.deepEqual(
    normalizeRequestedExerciseNames([' Bodyweight Squat ', 'Bodyweight Squat']),
    ['Bodyweight Squat', 'Bodyweight Squat'],
  );
  assert.deepEqual(
    preserveRequestedEntryOrder(['Bodyweight Squat', 'Bodyweight Squat'], resolved),
    [resolved[0], resolved[0]],
  );
});
