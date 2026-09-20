import assert from 'node:assert/strict';
import test from 'node:test';
import {resolvePrescription} from '../src/lib/workout/resolvedPrescription';
import {createRestCapability} from '../src/lib/workout/restCapability';
import {createSetCapability} from '../src/lib/workout/setCapability';
import {
  createSessionOrchestrator,
  PREPARING_DURATION_SECONDS,
  SET_RESULT_DURATION_SECONDS,
} from '../src/lib/workout/orchestration';
import type {SessionExercise} from '../src/lib/workout/sessionContracts';

const PLAN: SessionExercise[] = [
  {id: 'time-1', name: 'Timed movement', sets: 2, durationSeconds: 3, restSeconds: 2},
  {id: 'rep-1', name: 'Rep movement', sets: 1, reps: 2, restSeconds: 2},
];

test('SET capability keeps one mode-aware contract for REP_BASED progress', () => {
  const prescription = resolvePrescription([{id: 'r', name: 'Rep', sets: 1, reps: 3}]).exercises[0]!;
  const set = createSetCapability(prescription, 1);

  assert.equal(set.state.executionMode, 'REP_BASED');
  assert.equal(set.recordRep().completed, false);
  assert.equal(set.state.completedReps, 1);
  assert.equal(set.recordRep(2).completed, true);
  assert.equal(set.state.status, 'COMPLETE');
  assert.equal(set.state.targetReps, 3);
});

test('SET capability auto-completes TIME_BASED progress without a second architecture', () => {
  const prescription = resolvePrescription([{id: 't', name: 'Timed', sets: 1, durationSeconds: 4}]).exercises[0]!;
  const set = createSetCapability(prescription, 1);

  assert.equal(set.advance(3).completed, false);
  assert.deepEqual(set.state.remainingSeconds, 1);
  assert.equal(set.advance(2).completed, true);
  assert.equal(set.state.elapsedSeconds, 4);
  assert.equal(set.state.remainingSeconds, 0);
});

test('REST capability is typed, countdown-only, and SKIP REST completes locally', () => {
  const rest = createRestCapability('BETWEEN_EXERCISES', 5);
  assert.equal(rest.state.kind, 'BETWEEN_EXERCISES');
  assert.equal(rest.advance(2).completed, false);
  assert.equal(rest.state.remainingSeconds, 3);
  assert.equal(rest.skip().completed, true);
  assert.equal(rest.state.remainingSeconds, 0);
});

test('orchestration owns SET_RESULT and typed REST destinations for asymmetric programs', () => {
  const orchestrator = createSessionOrchestrator(resolvePrescription(PLAN));
  orchestrator.dispatch({type: 'START_SESSION'}, 1_000);
  orchestrator.advance(PREPARING_DURATION_SECONDS);
  assert.equal(orchestrator.state.activeModule, 'EXERCISE_INTRO');

  orchestrator.dispatch({type: 'BEGIN_WORK_SET'});
  assert.equal(orchestrator.state.currentSetNumber, 1);
  assert.equal(orchestrator.state.setProgress?.executionMode, 'TIME_BASED');

  const completed = orchestrator.advance(3);
  assert.equal(completed.state.activeModule, 'SET_RESULT');
  assert.equal(completed.state.setResult?.setNumber, 1);
  assert.ok(completed.effects.some((effect) => effect.kind === 'SET_COMPLETED'));

  const rest = orchestrator.advance(SET_RESULT_DURATION_SECONDS);
  assert.equal(rest.state.activeModule, 'REST');
  assert.equal(rest.state.restState?.kind, 'BETWEEN_SETS');
  assert.ok(rest.effects.some((effect) => effect.kind === 'REST_STARTED' && effect.restKind === 'BETWEEN_SETS'));

  orchestrator.dispatch({type: 'SKIP_REST'});
  assert.equal(orchestrator.state.activeModule, 'WORK_SET');
  assert.equal(orchestrator.state.currentSetNumber, 2);

  orchestrator.advance(3);
  orchestrator.advance(SET_RESULT_DURATION_SECONDS);
  assert.equal(orchestrator.state.activeModule, 'REST');
  assert.equal(orchestrator.state.restState?.kind, 'BETWEEN_EXERCISES');

  orchestrator.advance(2);
  assert.equal(orchestrator.state.activeModule, 'EXERCISE_INTRO');
  assert.equal(orchestrator.state.activeExerciseIndex, 1);
  orchestrator.dispatch({type: 'BEGIN_WORK_SET'});
  orchestrator.dispatch({type: 'RECORD_REP'});
  const final = orchestrator.dispatch({type: 'RECORD_REP'});
  assert.equal(final.state.activeModule, 'SET_RESULT');
  assert.equal(final.state.setResult?.isFinalSet, true);
  assert.equal(final.state.setResult?.isFinalExercise, true);
  const result = orchestrator.advance(SET_RESULT_DURATION_SECONDS);
  assert.equal(result.state.activeModule, 'WORKOUT_RESULT');
  assert.equal(result.state.workoutResult?.completionKind, 'COMPLETED_FULLY');
  assert.ok(result.effects.some((effect) => effect.kind === 'WORKOUT_RESULT_READY'));
  assert.equal(orchestrator.state.restState, null, 'final Set never creates a terminal REST');
});

test('pause freezes SET_RESULT and REST exactly like PREPARING/SET', () => {
  const orchestrator = createSessionOrchestrator(resolvePrescription([{id: 't', name: 'Timed', sets: 1, durationSeconds: 1, restSeconds: 10}]));
  orchestrator.dispatch({type: 'START_SESSION'}, 1_000);
  orchestrator.advance(PREPARING_DURATION_SECONDS);
  orchestrator.dispatch({type: 'BEGIN_WORK_SET'});
  orchestrator.advance(1);
  assert.equal(orchestrator.state.activeModule, 'SET_RESULT');
  orchestrator.dispatch({type: 'PAUSE'});
  const paused = orchestrator.state;
  orchestrator.advance(100);
  assert.deepEqual(orchestrator.state, paused);
  orchestrator.dispatch({type: 'RESUME'});
  assert.equal(orchestrator.state.lifecycle, 'SET_RESULT');
});

test('WP-14 owns deferred/skipped outcomes and blocks completion until obligations resolve', () => {
  const orchestrator = createSessionOrchestrator(resolvePrescription([
    {id: 'first', name: 'First', sets: 1, reps: 1},
    {id: 'second', name: 'Second', sets: 1, reps: 1},
  ]));
  orchestrator.dispatch({type: 'START_SESSION'}, 1_000);
  orchestrator.advance(PREPARING_DURATION_SECONDS);
  assert.equal(orchestrator.state.activeExerciseIndex, 0);

  const deferred = orchestrator.dispatch({type: 'DEFER_EXERCISE', disposition: 'MOVE_TO_END'});
  assert.equal(deferred.state.activeExerciseIndex, 1);
  assert.equal(deferred.state.exerciseOutcomes[0]?.status, 'OUTSTANDING_DEFERRED');
  assert.equal(deferred.state.completionEligible, false);

  const skipped = orchestrator.dispatch({type: 'SKIP_EXERCISE'});
  assert.equal(skipped.state.activeExerciseIndex, 0, 'deferred work resurfaces before completion');
  assert.equal(skipped.state.exerciseOutcomes[1]?.status, 'SKIPPED_FOR_SESSION');
  assert.equal(skipped.state.activeModule, 'EXERCISE_INTRO');

  const resolved = orchestrator.dispatch({type: 'RESOLVE_DEFERRED_EXERCISE', disposition: 'SKIP_FOR_SESSION'});
  assert.equal(resolved.state.activeModule, 'WORKOUT_RESULT');
  assert.equal(resolved.state.completionEligible, true);
  assert.deepEqual(resolved.state.exerciseOutcomes.map((outcome) => outcome.status), ['SKIPPED_FOR_SESSION', 'SKIPPED_FOR_SESSION']);
});

test('WP-14 supports perform-now resolution, set restart, and exit intent without prescription mutation', () => {
  const prescription = resolvePrescription([{id: 'one', name: 'One', sets: 1, reps: 1}]);
  const orchestrator = createSessionOrchestrator(prescription);
  orchestrator.dispatch({type: 'START_SESSION'}, 1_000);
  orchestrator.advance(PREPARING_DURATION_SECONDS);
  orchestrator.dispatch({type: 'DEFER_EXERCISE', disposition: 'MOVE_TO_END'});
  assert.equal(orchestrator.dispatch({type: 'BEGIN_WORK_SET'}).state.lifecycle, 'AWAITING_WORK_SET');
  const resolved = orchestrator.dispatch({type: 'RESOLVE_DEFERRED_EXERCISE', disposition: 'PERFORM_NOW'});
  assert.equal(resolved.state.activeModule, 'WORK_SET');
  assert.equal(resolved.state.lifecycle, 'RUNNING');
  assert.equal(resolved.state.setProgress?.status, 'ACTIVE');
  orchestrator.dispatch({type: 'BEGIN_WORK_SET'});
  const completed = orchestrator.dispatch({type: 'RECORD_REP'});
  assert.equal(completed.state.activeModule, 'SET_RESULT');
  assert.equal(completed.state.exerciseOutcomes[0]?.status, 'COMPLETED');
  assert.equal(completed.state.completionEligible, true);

  const restarted = orchestrator.dispatch({type: 'RESTART_CURRENT_SET'});
  assert.equal(restarted.state.activeModule, 'WORK_SET');
  assert.equal(restarted.state.completedSetCount, 0);
  assert.equal(restarted.state.exerciseOutcomes[0]?.status, 'ACTIVE');
  assert.equal(prescription.exercises[0]?.setCount, 1, 'resolved prescription remains immutable');

  const exited = orchestrator.dispatch({type: 'EXIT_WORKOUT'});
  assert.equal(exited.state.lifecycle, 'EXIT_REQUESTED');
  assert.equal(exited.state.exitRequested, true);
  assert.equal(exited.state.activeModule, null);
  const cancelled = orchestrator.dispatch({type: 'CANCEL_EXIT'});
  assert.equal(cancelled.state.activeModule, 'WORK_SET');
  assert.equal(cancelled.state.exitRequested, false);
  const requestedAgain = orchestrator.dispatch({type: 'EXIT_WORKOUT'});
  assert.equal(requestedAgain.state.exitRequested, true);
  assert.ok(orchestrator.dispatch({type: 'CONFIRM_EXIT'}).effects.some((effect) => effect.kind === 'EXIT_CONFIRMED'));
});
