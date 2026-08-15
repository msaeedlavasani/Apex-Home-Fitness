import assert from 'node:assert/strict';
import test from 'node:test';
import { GOAL_IDS, GOAL_OPTIONS, normalizeGoals } from '../src/components/quiz/goals';

/**
 * Unit tests for the quiz's multi-goal normalization (shared by GoalStep,
 * OnboardingQuiz validation and the API schema).
 */

test('normalizeGoals wraps a legacy single-string answer into an array', () => {
  assert.deepEqual(normalizeGoals('strength'), ['strength']);
  assert.deepEqual(normalizeGoals('fat_loss'), ['fat_loss']);
});

test('normalizeGoals passes through canonical arrays unchanged', () => {
  assert.deepEqual(normalizeGoals(['strength']), ['strength']);
  assert.deepEqual(normalizeGoals(['strength', 'fat_loss', 'flexibility']), [
    'strength',
    'fat_loss',
    'flexibility',
  ]);
});

test('normalizeGoals drops duplicates and preserves the option order', () => {
  assert.deepEqual(normalizeGoals(['fat_loss', 'strength', 'fat_loss']), [
    'fat_loss',
    'strength',
  ]);
  // Unknown ids are dropped; order follows GOAL_IDS render order.
  assert.deepEqual(normalizeGoals(['flexibility', 'marathon', 'strength']), [
    'flexibility',
    'strength',
  ]);
});

test('normalizeGoals handles empty/absent values as an empty selection', () => {
  assert.deepEqual(normalizeGoals(undefined), []);
  assert.deepEqual(normalizeGoals(null), []);
  assert.deepEqual(normalizeGoals(''), []);
  assert.deepEqual(normalizeGoals([]), []);
  assert.deepEqual(normalizeGoals(42), []);
});

test('GOAL_IDS and GOAL_OPTIONS stay in sync', () => {
  assert.deepEqual(GOAL_OPTIONS.map((o) => o.id), GOAL_IDS);
  assert.equal(GOAL_IDS.length, 4);
  for (const option of GOAL_OPTIONS) {
    assert.ok(option.labelKey.startsWith('quiz.goal.'));
    assert.ok(option.hintKey.endsWith('.hint'));
  }
});
