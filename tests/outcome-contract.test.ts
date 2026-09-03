import assert from 'node:assert/strict';
import test from 'node:test';

import type { SessionSummary } from '../src/lib/workout/sessionContracts';
import type { ExerciseId, ExerciseSlug } from '../src/lib/exercise';
import type { MovementConstraintToken } from '../src/lib/movement';
import {
  OUTCOME_CONTRACT_VERSION,
  SUBJECTIVE_DIFFICULTY_DISPLAY,
  SUBJECTIVE_DIFFICULTY_FEELINGS,
  WORKOUT_COMPLETION_KINDS,
  isSubjectiveDifficultyFeeling,
  isWorkoutCompletionKind,
  outcomeBaseFromSummary,
  summarizeOutcome,
  validateOutcomeRecord,
  type OutcomeProblemKind,
  type WorkoutOutcomeRecord,
} from '../src/lib/outcomes';

/**
 * AL-01 outcome-contract invariants:
 *  - the contract version is declared exactly once and equals 1;
 *  - completion kinds and subjective difficulty feelings are closed
 *    vocabularies with working runtime guards and full EN display coverage;
 *  - the S-04 SessionSummary maps deterministically into the outcome base
 *    (recording adapter) with no changes to the session contract;
 *  - a fully populated outcome record satisfies the schema and validates;
 *  - the fail-closed validator flags inconsistent counts, duplicate exercise
 *    indices, malformed keys/versions, and invalid ratings — it never
 *    guesses or repairs;
 *  - canonical exercise identity (exerciseId/slug) is carried separately
 *    from display name and plan position.
 */

const exerciseId = (v: string) => v as ExerciseId;
const slug = (v: string) => v as ExerciseSlug;
const constraint = (v: string) => v as MovementConstraintToken;

function exampleSummary(): SessionSummary {
  return { totalExercises: 2, totalSets: 6, completedSets: 5, durationSeconds: 1740 };
}

function validRecord(): WorkoutOutcomeRecord {
  return {
    contractVersion: OUTCOME_CONTRACT_VERSION,
    outcomeId: 'outcome-1',
    userId: 'user-1',
    dateKey: '2026-09-03',
    sessionId: 'session-1',
    startedAt: 1000,
    completedAt: 2740,
    durationSeconds: 1740,
    completion: { kind: 'COMPLETED_PARTIALLY', totalSets: 6, completedSets: 5 },
    exercises: [
      {
        exerciseIndex: 0,
        exerciseId: exerciseId('cm-ex-1'),
        slug: slug('bodyweight-squat'),
        name: 'Bodyweight Squat',
        plannedSets: 3,
        completedSets: 3,
        completed: true,
        difficultyFeeling: 'JUST_RIGHT',
      },
      {
        exerciseIndex: 1,
        exerciseId: exerciseId('cm-ex-2'),
        slug: slug('push-up'),
        name: 'Push-Up',
        plannedSets: 3,
        completedSets: 2,
        completed: false,
        difficultyFeeling: 'HARD',
        note: 'stopped early',
      },
    ],
    feedback: { difficultyFeeling: 'HARD', satisfactionRating: 4, comments: 'good session' },
    context: {
      programId: 'prog-1',
      programSource: 'GENERATED',
      locale: 'en',
      equipmentConstraintsEncountered: [constraint('knee-loading')],
      equipmentAvailable: ['mat'],
      timezoneOffsetMinutes: 210,
    },
  };
}

test('contract version: OUTCOME_CONTRACT_VERSION is 1', () => {
  assert.equal(OUTCOME_CONTRACT_VERSION, 1);
});

test('closed completion vocabulary: guards accept every member and reject strangers', () => {
  for (const kind of WORKOUT_COMPLETION_KINDS) {
    assert.equal(isWorkoutCompletionKind(kind), true, kind);
  }
  assert.equal(isWorkoutCompletionKind('COMPLETED'), false);
  assert.equal(isWorkoutCompletionKind(undefined), false);
});

test('closed difficulty vocabulary: guards + EN display cover every member', () => {
  for (const feeling of SUBJECTIVE_DIFFICULTY_FEELINGS) {
    assert.equal(isSubjectiveDifficultyFeeling(feeling), true, feeling);
    assert.ok(SUBJECTIVE_DIFFICULTY_DISPLAY[feeling].length > 0, `${feeling} needs display text`);
  }
  assert.equal(isSubjectiveDifficultyFeeling('medium'), false);
});

test('recording adapter: SessionSummary maps deterministically into the outcome base', () => {
  const summary = exampleSummary();
  const base = outcomeBaseFromSummary(summary, {
    kind: 'COMPLETED_PARTIALLY',
    dateKey: '2026-09-03',
    startedAt: 1000,
    completedAt: 2740,
  });
  assert.equal(base.durationSeconds, 1740);
  assert.deepEqual(base.completion, { kind: 'COMPLETED_PARTIALLY', totalSets: 6, completedSets: 5 });
  // Deterministic: same input → same output.
  const again = outcomeBaseFromSummary(summary, {
    kind: 'COMPLETED_PARTIALLY',
    dateKey: '2026-09-03',
    startedAt: 1000,
    completedAt: 2740,
  });
  assert.deepEqual(base, again);
});

test('a fully populated record validates clean', () => {
  const validation = validateOutcomeRecord(validRecord());
  assert.equal(validation.valid, true, JSON.stringify(validation.problems));
});

test('identity is carried separately from display name and plan position', () => {
  const record = validRecord();
  const first = record.exercises[0];
  assert.ok(first.exerciseId, 'canonical exercise id is recorded when the plan provides it');
  assert.ok(first.slug, 'canonical exercise slug is recorded when the plan provides it');
  assert.notEqual(first.exerciseId, first.name);
  // Plan position (exerciseIndex) is distinct from both identity and name.
  assert.equal(typeof first.exerciseIndex, 'number');
});

test('validator: completedSets may never exceed totalSets', () => {
  const record = validRecord();
  record.completion.completedSets = 7;
  assertProblems(record, ['COMPLETED_SETS_EXCEED_TOTAL']);
});

test('validator: per-exercise completedSets may never exceed plannedSets', () => {
  const record = validRecord();
  record.exercises = [{ ...record.exercises[0], plannedSets: 2, completedSets: 3, completed: true }];
  assertProblems(record, ['EXERCISE_SETS_INCONSISTENT']);
});

test('validator: the completed flag must agree with per-exercise set counts', () => {
  const record = validRecord();
  record.exercises = [{ ...record.exercises[0], plannedSets: 3, completedSets: 2, completed: true }];
  assertProblems(record, ['EXERCISE_COMPLETED_FLAG_INCONSISTENT']);
});

test('validator: duplicate exercise indices are rejected', () => {
  const record = validRecord();
  record.exercises = [
    { ...record.exercises[0], exerciseIndex: 0 },
    { ...record.exercises[1], exerciseIndex: 0 },
  ];
  assertProblems(record, ['DUPLICATE_EXERCISE_INDEX']);
});

test('validator: malformed dateKey and contract version are rejected', () => {
  const badDate = validRecord();
  badDate.dateKey = '03-09-2026';
  assertProblems(badDate, ['BAD_DATE_KEY']);

  const badVersion = validRecord();
  // @ts-expect-error — contract version is a literal; forcing a wrong value must fail validation.
  badVersion.contractVersion = 2;
  assertProblems(badVersion, ['BAD_VERSION']);
});

test('validator: completedAt before startedAt is rejected', () => {
  const record = validRecord();
  record.startedAt = 3000;
  record.completedAt = 1000;
  assertProblems(record, ['BAD_TIMESTAMP_ORDER']);
});

test('validator: out-of-vocabulary ratings are rejected', () => {
  const record = validRecord();
  // @ts-expect-error — forcing an unknown feeling must fail validation at runtime too.
  record.feedback.difficultyFeeling = 'MEDIUM';
  assertProblems(record, ['BAD_DIFFICULTY_FEELING']);

  const record2 = validRecord();
  // @ts-expect-error — forcing an out-of-range rating must fail validation.
  record2.feedback.satisfactionRating = 9;
  assertProblems(record2, ['BAD_SATISFACTION_RATING']);
});

test('summary: completion ratio math incl. divide-by-zero guard', () => {
  const summary = summarizeOutcome(validRecord());
  assert.equal(summary.totalExercises, 2);
  assert.equal(summary.completedExercises, 1);
  assert.equal(summary.totalSets, 6);
  assert.equal(summary.completedSets, 5);
  assert.equal(summary.completionRatio, 5 / 6);

  const nothing: WorkoutOutcomeRecord = {
    ...validRecord(),
    completion: { kind: 'DID_NOT_START', totalSets: 0, completedSets: 0 },
    exercises: [],
    durationSeconds: 0,
  };
  const emptySummary = summarizeOutcome(nothing);
  assert.equal(emptySummary.completionRatio, 0);
  assert.equal(emptySummary.totalExercises, 0);
});

function assertProblems(record: WorkoutOutcomeRecord, kinds: OutcomeProblemKind[]): void {
  const validation = validateOutcomeRecord(record);
  assert.equal(validation.valid, false, 'record must be flagged invalid');
  const found = validation.problems.map((p) => p.kind);
  for (const kind of kinds) {
    assert.ok(found.includes(kind), `expected problem ${kind}, got ${JSON.stringify(found)}`);
  }
}
