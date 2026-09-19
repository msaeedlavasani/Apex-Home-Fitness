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
  assert.equal(orchestrator.advance(SET_RESULT_DURATION_SECONDS).state.activeModule, 'SET_RESULT');
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
