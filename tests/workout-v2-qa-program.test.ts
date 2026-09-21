import assert from 'node:assert/strict';
import test from 'node:test';
import {exerciseIdentityIndex, workoutSessionExercisesFromProgram} from '@/lib/programSchedule';
import {exerciseSupportsSquatMentor} from '@/lib/exercise/passport';
import {QA_PROGRAM_EXERCISES, QA_PROGRAM_WEEKLY_SCHEDULE} from '@/lib/program/qaProgram';
import {sharedPrescriptionFromPersistedPlan} from '@/lib/workout/prescriptionContract';
import {resolvePrescription} from '@/lib/workout/resolvedPrescription';
import {createSessionOrchestrator, PREPARING_DURATION_SECONDS} from '@/lib/workout/orchestration';
import {capabilityUnavailable} from '@/lib/workout/executionStrategy';

test('canonical QA fixture is two distinct Bodyweight Squat Entries with mixed per-set dosage', () => {
  assert.equal(QA_PROGRAM_EXERCISES.length, 2);
  assert.deepEqual(QA_PROGRAM_EXERCISES.map((item) => item.name), ['Bodyweight Squat', 'Bodyweight Squat']);
  assert.equal(exerciseSupportsSquatMentor({name: 'Bodyweight Squat', slug: 'bodyweight-squat'}), true);
  assert.deepEqual(QA_PROGRAM_EXERCISES.map((item) => item.sets), [2, 2]);
  assert.deepEqual(QA_PROGRAM_EXERCISES.map((item) => item.reps), [8, 8]);
  assert.deepEqual(QA_PROGRAM_WEEKLY_SCHEDULE[0].exercises.map((item) => item.name), ['Bodyweight Squat', 'Bodyweight Squat']);
  assert.equal(QA_PROGRAM_WEEKLY_SCHEDULE[0].exercises[0].fallback_duration_seconds, 45);
  assert.equal(QA_PROGRAM_WEEKLY_SCHEDULE[0].exercises[0].set_prescriptions?.[1]?.duration_seconds, 30);
});

test('QA Program input exercises the real persisted-program contract boundary', () => {
  const qaSchedule = [{
    day_name: 'Monday',
    exercises: [
      {id: 'qa-bodyweight-squat-entry-1', name: 'Bodyweight Squat', sets: 2, reps: '8', duration_seconds: null, fallback_duration_seconds: 45, rest_seconds: 20, set_prescriptions: [{execution_mode: 'REP_BASED', reps: '8', fallback_duration_seconds: 45, rest_seconds: 20}, {execution_mode: 'TIME_BASED', duration_seconds: 30, rest_seconds: 20}]},
      {id: 'qa-bodyweight-squat-entry-2', name: 'Bodyweight Squat', sets: 2, reps: '8', duration_seconds: null, fallback_duration_seconds: 45, rest_seconds: 25, set_prescriptions: [{execution_mode: 'REP_BASED', reps: '8', fallback_duration_seconds: 45, rest_seconds: 25}, {execution_mode: 'TIME_BASED', duration_seconds: 30, rest_seconds: 25}]},
    ],
  }];
  const identityIndex = exerciseIdentityIndex([
    {order: 1, exercise: {id: 'ex-bodyweight-squat', name: 'Bodyweight Squat', slug: 'bodyweight-squat'}},
  ]);
  const plan = workoutSessionExercisesFromProgram(qaSchedule, 'monday', [], identityIndex);
  const prescription = sharedPrescriptionFromPersistedPlan(plan);

  assert.deepEqual(prescription.exercises.map((item) => item.exercise.name), ['Bodyweight Squat', 'Bodyweight Squat']);
  assert.deepEqual(prescription.exercises.map((item) => item.executionMode), ['REP_BASED', 'REP_BASED']);
  assert.deepEqual(prescription.exercises.map((item) => item.setCount), [2, 2]);
  assert.deepEqual(prescription.exercises.map((item) => item.restSeconds), [20, 25]);
  assert.deepEqual(prescription.exercises.map((item) => item.fallbackDurationSeconds), [45, 45]);
  assert.deepEqual(prescription.exercises.map((item) => item.sets?.map((set) => set.executionMode)), [['REP_BASED', 'TIME_BASED'], ['REP_BASED', 'TIME_BASED']]);
  assert.deepEqual(prescription.exercises.map((item) => item.sets?.map((set) => set.fallbackDurationSeconds)), [[45, null], [45, null]]);
  assert.deepEqual(plan.map((item) => item.exerciseId), ['ex-bodyweight-squat', 'ex-bodyweight-squat']);
  assert.deepEqual(plan.map((item) => item.id), ['qa-bodyweight-squat-entry-1', 'qa-bodyweight-squat-entry-2']);
});

test('derived QA oracle proves entry-boundary INTRO and mandatory SET_RESULT routing', () => {
  const identityIndex = exerciseIdentityIndex([
    {order: 1, exercise: {id: 'ex-bodyweight-squat', name: 'Bodyweight Squat', slug: 'bodyweight-squat'}},
  ]);
  const plan = workoutSessionExercisesFromProgram(QA_PROGRAM_WEEKLY_SCHEDULE, 'monday', [], identityIndex);
  const orchestrator = createSessionOrchestrator(resolvePrescription(plan), {capability: capabilityUnavailable()});
  const modules: string[] = [];
  const record = (transition: {state: {activeModule: string | null}}) => {
    if (transition.state.activeModule) modules.push(transition.state.activeModule);
    return transition;
  };
  record(orchestrator.dispatch({type: 'START_SESSION'}, 1));
  record(orchestrator.advance(PREPARING_DURATION_SECONDS));
  record(orchestrator.dispatch({type: 'BEGIN_WORK_SET'}));
  record(orchestrator.advance(45));
  record(orchestrator.advance(2));
  record(orchestrator.advance(20));
  record(orchestrator.advance(30));
  record(orchestrator.advance(2));
  record(orchestrator.advance(20));
  record(orchestrator.dispatch({type: 'BEGIN_WORK_SET'}));
  record(orchestrator.advance(45));
  record(orchestrator.advance(2));
  record(orchestrator.advance(25));
  record(orchestrator.advance(30));
  record(orchestrator.advance(2));
  assert.equal(orchestrator.state.activeModule, 'WORKOUT_RESULT');
  assert.equal(modules.filter((module) => module === 'EXERCISE_INTRO').length, 2);
  assert.equal(modules.filter((module) => module === 'WORK_SET').length, 4);
  assert.equal(modules.filter((module) => module === 'SET_RESULT').length, 4);
  assert.equal(modules.filter((module) => module === 'REST').length, 3);
  assert.equal(modules.filter((module) => module === 'WORKOUT_RESULT').length, 1);
  assert.equal(orchestrator.state.restState, null, 'no terminal REST remains after final SET_RESULT');
});
