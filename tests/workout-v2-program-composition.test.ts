import assert from 'node:assert/strict';
import test from 'node:test';
import {
  sharedPrescriptionFromPersistedPlan,
} from '../src/lib/workout/prescriptionContract';
import {
  createSessionOrchestrator,
  PREPARING_DURATION_SECONDS,
  SET_RESULT_DURATION_SECONDS,
} from '../src/lib/workout/orchestration';
import type {SessionExercise} from '../src/lib/workout/sessionContracts';

function executedSetCounts(plan: readonly SessionExercise[]): number[] {
  const prescription = sharedPrescriptionFromPersistedPlan(plan);
  const orchestrator = createSessionOrchestrator(prescription);
  const completedSetsByExercise: number[] = [];

  orchestrator.dispatch({type: 'START_SESSION'}, 1_000);
  orchestrator.advance(PREPARING_DURATION_SECONDS);
  while (orchestrator.state.activeModule !== 'WORKOUT_RESULT') {
    const state = orchestrator.state;
    if (state.activeModule === 'EXERCISE_INTRO') {
      orchestrator.dispatch({type: 'BEGIN_WORK_SET'});
      continue;
    }
    if (state.activeModule === 'WORK_SET') {
      const transition = state.setProgress?.executionMode === 'REP_BASED'
        ? orchestrator.dispatch({type: 'RECORD_REP'})
        : orchestrator.advance(state.setProgress?.targetSeconds ?? 1);
      if (transition.effects.some((effect) => effect.kind === 'SET_COMPLETED')) {
        const exerciseIndex = transition.state.setResult?.exerciseIndex;
        if (exerciseIndex != null) completedSetsByExercise[exerciseIndex] = (completedSetsByExercise[exerciseIndex] ?? 0) + 1;
      }
      continue;
    }
    if (state.activeModule === 'SET_RESULT') {
      orchestrator.advance(SET_RESULT_DURATION_SECONDS);
      continue;
    }
    if (state.activeModule === 'REST') {
      orchestrator.dispatch({type: 'SKIP_REST'});
      continue;
    }
    throw new Error(`unexpected composition state: ${state.activeModule ?? 'none'}`);
  }
  return completedSetsByExercise;
}

test('Run 4 composes asymmetric program prescriptions through one reusable topology', () => {
  const twoThree = executedSetCounts([
    {id: 'a', name: 'A', sets: 2, reps: 1},
    {id: 'b', name: 'B', sets: 3, reps: 1},
  ]);
  const threeOne = executedSetCounts([
    {id: 'a', name: 'A', sets: 3, reps: 1},
    {id: 'b', name: 'B', sets: 1, reps: 1},
  ]);

  assert.deepEqual(twoThree, [2, 3]);
  assert.deepEqual(threeOne, [3, 1]);
  assert.notDeepEqual(twoThree, threeOne);
});

test('Run 4 preserves Program-owned exercise order without fixture-specific routing', () => {
  const prescription = sharedPrescriptionFromPersistedPlan([
    {id: 'program-first', name: 'Program First', sets: 2, reps: 1},
    {id: 'program-second', name: 'Program Second', sets: 3, reps: 1},
  ]);
  const orchestrator = createSessionOrchestrator(prescription);
  orchestrator.dispatch({type: 'START_SESSION'}, 1_000);
  orchestrator.advance(PREPARING_DURATION_SECONDS);

  assert.equal(orchestrator.state.introExercise?.exercise.id, 'program-first');
  orchestrator.dispatch({type: 'DEFER_EXERCISE', disposition: 'MOVE_TO_END'});
  assert.equal(orchestrator.state.introExercise?.exercise.id, 'program-second');
});
