import assert from 'node:assert/strict';
import test from 'node:test';
import {
  InvalidSharedPrescriptionError,
  SHARED_PRESCRIPTION_CONTRACT_VERSION,
  mapPrescriptionToOutcomeInputs,
  sharedPrescriptionFromAiExercises,
  sharedPrescriptionFromPersistedPlan,
  sharedPrescriptionFromRuleExercises,
  validateSharedWorkoutPrescription,
} from '../src/lib/workout/prescriptionContract';
import type {SessionExercise} from '../src/lib/workout/sessionContracts';

const SOURCE_EXERCISES = [
  {id: 'squat-step', name: 'Squat', sets: 3, reps: '10', rest_seconds: 30, fallback_duration_seconds: 45},
  {id: 'plank-step', name: 'Plank', sets: 2, reps: '30 seconds', rest_seconds: 20},
] as const;

function semanticShape(prescription: ReturnType<typeof sharedPrescriptionFromAiExercises>) {
  return prescription.exercises.map((item) => ({
    id: item.exercise.id,
    name: item.exercise.name,
    executionMode: item.executionMode,
    targetReps: item.targetReps,
    targetSeconds: item.targetSeconds,
    setCount: item.setCount,
    restSeconds: item.restSeconds,
    fallbackDurationSeconds: item.fallbackDurationSeconds,
    cameraLessExecution: item.cameraLessExecution,
  }));
}

test('WP-13 AI, rules, and persisted inputs converge on one versioned prescription shape', () => {
  const ai = sharedPrescriptionFromAiExercises(SOURCE_EXERCISES);
  const rules = sharedPrescriptionFromRuleExercises(SOURCE_EXERCISES);
  const persisted = sharedPrescriptionFromPersistedPlan([
    {id: 'squat-step', name: 'Squat', sets: 3, reps: 10, restSeconds: 30, fallbackDurationSeconds: 45} as SessionExercise & {fallbackDurationSeconds: number},
    {id: 'plank-step', name: 'Plank', sets: 2, durationSeconds: 30, restSeconds: 20},
  ]);

  assert.equal(ai.contractVersion, SHARED_PRESCRIPTION_CONTRACT_VERSION);
  assert.equal(ai.source, 'AI');
  assert.equal(rules.source, 'RULES');
  assert.equal(persisted.source, 'PERSISTED_PROGRAM');
  assert.deepEqual(semanticShape(ai), semanticShape(rules));
  assert.deepEqual(semanticShape(ai), semanticShape(persisted));
  assert.equal(ai.exercises[1]?.executionMode, 'TIME_BASED');
  assert.equal(ai.exercises[1]?.targetSeconds, 30);
  assert.equal(ai.exercises[1]?.targetReps, null);
  assert.equal(ai.exercises[0]?.fallbackDurationSeconds, 45);
  assert.equal(ai.exercises[0]?.cameraLessExecution, 'SUPPORTED');
});

test('WP-13 validation is fail-closed for missing or mismatched prescription targets', () => {
  const valid = sharedPrescriptionFromPersistedPlan([
    {id: 'one', name: 'One', sets: 1, reps: 5},
  ]);
  const invalid = {
    ...valid,
    exercises: [{
      ...valid.exercises[0]!,
      executionMode: 'TIME_BASED' as const,
      targetReps: 5,
      targetSeconds: null,
    }],
  };
  const validation = validateSharedWorkoutPrescription(invalid);
  assert.equal(validation.valid, false);
  assert.ok(validation.issues.some((item) => item.kind === 'TARGET_MODE_MISMATCH'));
  assert.throws(
    () => sharedPrescriptionFromAiExercises([{id: 'bad', name: 'Bad', sets: 1, reps: null, rest_seconds: 10}]),
    InvalidSharedPrescriptionError,
  );
});

test('WP-13 exposes prescription facts for AL-01 without inventing outcome policy', () => {
  const prescription = sharedPrescriptionFromPersistedPlan([
    {id: 'one', name: 'One', sets: 2, reps: 8, restSeconds: 15, exerciseId: 'canonical-one' as never, slug: 'one' as never, fallbackDurationSeconds: 30} as SessionExercise & {fallbackDurationSeconds: number},
  ]);
  assert.deepEqual(mapPrescriptionToOutcomeInputs(prescription), [{
    exerciseIndex: 0,
    exerciseId: 'canonical-one',
    slug: 'one',
    name: 'One',
    plannedSets: 2,
    plannedReps: 8,
    targetSeconds: null,
  }]);
});
