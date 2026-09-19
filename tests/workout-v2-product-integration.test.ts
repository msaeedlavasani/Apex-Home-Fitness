import assert from 'node:assert/strict';
import test from 'node:test';
import {exerciseIdentityIndex, workoutSessionExercisesFromProgram} from '@/lib/programSchedule';
import {sharedPrescriptionFromPersistedPlan} from '@/lib/workout/prescriptionContract';

const schedule = [
  {
    day_name: 'Monday',
    exercises: [
      {id: 'qa-1', name: 'Bodyweight Squat', sets: 2, reps: 8, duration_seconds: null, rest_seconds: 20, fallback_duration_seconds: 45},
      {id: 'qa-2', name: 'Push-Up', sets: 3, reps: 10, duration_seconds: null, rest_seconds: 25, fallback_duration_seconds: 50},
      {id: 'qa-3', name: 'Plank Hold', sets: 1, reps: null, duration_seconds: 30, rest_seconds: 30, fallback_duration_seconds: null},
    ],
  },
];

test('real Program schedule adapter preserves order and prescription-owned QA semantics', () => {
  const identityIndex = exerciseIdentityIndex([
    {order: 1, exercise: {id: 'ex-squat', name: 'Bodyweight Squat', slug: 'bodyweight-squat'}},
    {order: 2, exercise: {id: 'ex-push-up', name: 'Push-Up', slug: 'push-up'}},
    {order: 3, exercise: {id: 'ex-plank', name: 'Plank Hold', slug: 'plank-hold'}},
  ]);
  const plan = workoutSessionExercisesFromProgram(schedule, 'monday', [], identityIndex);
  const prescription = sharedPrescriptionFromPersistedPlan(plan);

  assert.deepEqual(plan.map((exercise) => exercise.name), ['Bodyweight Squat', 'Push-Up', 'Plank Hold']);
  assert.deepEqual(prescription.exercises.map((exercise) => exercise.executionMode), ['REP_BASED', 'REP_BASED', 'TIME_BASED']);
  assert.deepEqual(prescription.exercises.map((exercise) => exercise.setCount), [2, 3, 1]);
  assert.deepEqual(prescription.exercises.map((exercise) => exercise.restSeconds), [20, 25, 30]);
  assert.equal(prescription.exercises[0]?.fallbackDurationSeconds, 45);
  assert.equal(prescription.exercises[2]?.fallbackDurationSeconds, null);
  assert.deepEqual(prescription.exercises.map((exercise) => exercise.exercise.exerciseId), ['ex-squat', 'ex-push-up', 'ex-plank']);
});

test('normal product integration has no test-identity product branch', async () => {
  const {readFile} = await import('node:fs/promises');
  const source = await readFile('src/app/[locale]/workout/page.tsx', 'utf8');
  assert.doesNotMatch(source, /phone|test.?user|test.?account|SMOKE_TEST_PHONE/i);
  assert.doesNotMatch(source, /V2_FALLBACK_EXERCISE_SUBSTITUTION/);
});
