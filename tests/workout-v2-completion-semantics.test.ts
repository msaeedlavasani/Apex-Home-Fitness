import assert from 'node:assert/strict';
import test from 'node:test';
import {completionKindForPersistence, receivesCompletionCredit} from '../src/lib/workout/completionSemantics';
import type {WorkoutResultSummary} from '../src/lib/workout/sessionV2Contracts';

const allSkipped: WorkoutResultSummary = {
  totalExercises: 2,
  completedExercises: 0,
  skippedExercises: 2,
  completedSets: 0,
  totalSets: 3,
  completionKind: 'COMPLETED_PARTIALLY',
};

test('all-skipped zero-set result resolves to terminal non-credit outcome', () => {
  assert.equal(completionKindForPersistence(allSkipped), 'ENDED_WITHOUT_COMPLETION');
  assert.equal(receivesCompletionCredit('ENDED_WITHOUT_COMPLETION'), false);
});

test('existing full and partial completion policy remains unchanged', () => {
  assert.equal(completionKindForPersistence({...allSkipped, completedExercises: 1, skippedExercises: 1, completedSets: 1, completionKind: 'COMPLETED_PARTIALLY'}), 'COMPLETED_PARTIALLY');
  assert.equal(receivesCompletionCredit('COMPLETED_FULLY'), true);
});
