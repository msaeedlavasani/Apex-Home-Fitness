import assert from 'node:assert/strict';
import test from 'node:test';
import {exerciseIdentityIndex, workoutSessionExercisesFromProgram} from '@/lib/programSchedule';
import {sharedPrescriptionFromPersistedPlan} from '@/lib/workout/prescriptionContract';

test('QA Program input exercises the real persisted-program contract boundary', () => {
  const qaSchedule = [{
    day_name: 'Monday',
    exercises: [
      {id: 'qa-squat', name: 'Jump Squats', sets: 2, reps: '8', duration_seconds: null, fallback_duration_seconds: 45, rest_seconds: 20},
      {id: 'qa-bodyweight-squat', name: 'Bodyweight Squat', sets: 1, reps: null, duration_seconds: 30, fallback_duration_seconds: null, rest_seconds: 25},
    ],
  }];
  const identityIndex = exerciseIdentityIndex([
    {order: 1, exercise: {id: 'ex-squat', name: 'Jump Squats', slug: 'jump-squats'}},
    {order: 2, exercise: {id: 'ex-bodyweight-squat', name: 'Bodyweight Squat', slug: 'bodyweight-squat'}},
  ]);
  const prescription = sharedPrescriptionFromPersistedPlan(
    workoutSessionExercisesFromProgram(qaSchedule, 'monday', [], identityIndex),
  );

  assert.deepEqual(prescription.exercises.map((item) => item.exercise.name), ['Jump Squats', 'Bodyweight Squat']);
  assert.deepEqual(prescription.exercises.map((item) => item.executionMode), ['REP_BASED', 'TIME_BASED']);
  assert.deepEqual(prescription.exercises.map((item) => item.setCount), [2, 1]);
  assert.deepEqual(prescription.exercises.map((item) => item.restSeconds), [20, 25]);
  assert.deepEqual(prescription.exercises.map((item) => item.fallbackDurationSeconds), [45, null]);
});
