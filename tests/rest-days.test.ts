import assert from 'node:assert/strict';
import test from 'node:test';
import {
  REST_DAY_MAX,
  REST_DAY_MIN,
  WEEKDAY_IDS,
  WEEKDAY_OPTIONS,
  normalizeRestDays,
} from '../src/components/quiz/restDays';

/**
 * Unit tests for the quiz's rest-day normalization (shared by RestDaysStep,
 * OnboardingQuiz validation and the API schema).
 */

test('normalizeRestDays passes through canonical arrays unchanged', () => {
  assert.deepEqual(normalizeRestDays(['wednesday']), ['wednesday']);
  assert.deepEqual(normalizeRestDays(['wednesday', 'sunday']), ['wednesday', 'sunday']);
});

test('normalizeRestDays wraps a single string into an array', () => {
  assert.deepEqual(normalizeRestDays('sunday'), ['sunday']);
});

test('normalizeRestDays drops duplicates and preserves the option order', () => {
  assert.deepEqual(normalizeRestDays(['sunday', 'wednesday', 'sunday']), [
    'wednesday',
    'sunday',
  ]);
  // Unknown ids are dropped; order follows WEEKDAY_IDS render order.
  assert.deepEqual(normalizeRestDays(['monday', 'funday', 'tuesday']), ['monday', 'tuesday']);
});

test('normalizeRestDays handles empty/absent values as an empty selection', () => {
  assert.deepEqual(normalizeRestDays(undefined), []);
  assert.deepEqual(normalizeRestDays(null), []);
  assert.deepEqual(normalizeRestDays(''), []);
  assert.deepEqual(normalizeRestDays([]), []);
  assert.deepEqual(normalizeRestDays(42), []);
});

test('WEEKDAY_IDS and WEEKDAY_OPTIONS stay in sync with the week', () => {
  assert.deepEqual(WEEKDAY_OPTIONS.map((o) => o.id), WEEKDAY_IDS);
  assert.equal(WEEKDAY_IDS.length, 7);
  assert.deepEqual(WEEKDAY_IDS, [
    'monday',
    'tuesday',
    'wednesday',
    'thursday',
    'friday',
    'saturday',
    'sunday',
  ]);
  for (const option of WEEKDAY_OPTIONS) {
    assert.ok(option.labelKey.startsWith('quiz.restDays.'));
  }
});

test('bounds are reasonable: at least 1 and at most 3 rest days', () => {
  assert.equal(REST_DAY_MIN, 1);
  assert.equal(REST_DAY_MAX, 3);
  // With max 3 rest days the user keeps at least 4 training days/week.
  assert.ok(REST_DAY_MAX < 7 - 3, 'max rest days must still allow 3+ training days');
  assert.ok(REST_DAY_MIN >= 1, 'at least one rest day per week');
});
