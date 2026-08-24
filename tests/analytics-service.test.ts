/**
 * Unit tests for the analytics-service helpers that back the History /
 * Analytics data cards:
 *   - `computeActiveDays` (distinct training days) and its inclusion in
 *     `computeWorkoutAnalytics.activeDays`;
 *   - bilingual date formatting (`formatShortDate`, `formatWeekday`,
 *     `formatRelativeDay`) used to localize history data.
 */
import assert from 'node:assert/strict';
import test from 'node:test';
import {
  computeActiveDays,
  computeWorkoutAnalytics,
  formatDate,
  formatRelativeDay,
  formatShortDate,
  formatWeekday,
  type AnalyticsSession,
  type WorkoutAnalytics,
} from '../src/services/analyticsService';

const UTC_OPTS = { timeZone: 'UTC' };

function completedSession(
  startedAt: string,
  overrides: Partial<AnalyticsSession> = {},
): AnalyticsSession {
  return {
    id: `s-${startedAt}`,
    startedAt,
    completedAt: startedAt,
    durationSeconds: 1800,
    caloriesBurned: 120,
    ...overrides,
  };
}

test('computeActiveDays counts distinct calendar days with a completed session', () => {
  const sessions: AnalyticsSession[] = [
    completedSession('2026-08-10T08:00:00Z'),
    completedSession('2026-08-10T18:30:00Z'), // same day — still one day
    completedSession('2026-08-11T08:00:00Z'),
    completedSession('2026-08-14T08:00:00Z'),
  ];
  assert.equal(computeActiveDays(sessions, UTC_OPTS), 3);
});

test('computeActiveDays ignores incomplete sessions and empty histories', () => {
  const sessions: AnalyticsSession[] = [
    completedSession('2026-08-10T08:00:00Z'),
    // started but never completed — must not count
    { startedAt: '2026-08-11T08:00:00Z', completedAt: null },
    { startedAt: '2026-08-12T08:00:00Z', completedAt: undefined },
  ];
  assert.equal(computeActiveDays(sessions, UTC_OPTS), 1);
  assert.equal(computeActiveDays([], UTC_OPTS), 0);
});

test('computeWorkoutAnalytics exposes activeDays alongside the other totals', () => {
  const sessions: AnalyticsSession[] = [
    completedSession('2026-08-10T08:00:00Z'),
    completedSession('2026-08-11T08:00:00Z', {
      exercises: [
        { completed: true, actualSets: 3, actualReps: 12 },
        { completed: true, actualSets: 2, actualReps: 10 },
      ],
    }),
  ];
  const analytics: WorkoutAnalytics = computeWorkoutAnalytics(sessions, UTC_OPTS);
  assert.equal(analytics.totalSessions, 2);
  assert.equal(analytics.activeDays, 2);
  assert.equal(analytics.totalSets, 5);
  assert.equal(analytics.totalReps, 22);
  assert.equal(analytics.totalCaloriesBurned, 240); // stored values preferred
  assert.equal(analytics.estimated, false);
});

test('empty history produces an all-zero snapshot with activeDays 0', () => {
  const analytics = computeWorkoutAnalytics([], UTC_OPTS);
  assert.equal(analytics.totalSessions, 0);
  assert.equal(analytics.activeDays, 0);
  assert.equal(analytics.currentStreak, 0);
  assert.equal(analytics.firstWorkoutAt, null);
  assert.equal(analytics.lastWorkoutAt, null);
});

test('formatShortDate renders en and fa (Persian calendar) compact dates', () => {
  // Midday UTC — the same calendar day in every timezone from UTC-11 to UTC+11.
  const date = new Date('2026-08-15T12:00:00Z');
  assert.equal(formatShortDate(date, 'en'), 'Aug 15, 2026');
  // fa-IR renders the Persian calendar (15 Aug 2026 ≈ 24 Mordad 1405) with
  // Persian digits — the month name is the Jalali month, not "August".
  const fa = formatShortDate(date, 'fa');
  assert.match(fa, /مرداد/);
  assert.match(fa, /[۰-۹]/);
});

test('formatWeekday returns a localized weekday name', () => {
  const monday = new Date('2026-08-10T12:00:00Z');
  assert.equal(formatWeekday(monday, 'en', 'short'), 'Mon');
  assert.equal(formatWeekday(monday, 'en', 'long'), 'Monday');
});

test('formatRelativeDay uses translated Today / Yesterday labels when provided', () => {
  const labels = { today: 'TODAY_LBL', yesterday: 'YESTERDAY_LBL' };
  // The function compares against the real clock (`new Date()`), so the dates
  // must be derived from it at runtime — a fixed date would only pass on the
  // day it was written (regression: the suite broke on every other day).
  // Exact ±24h arithmetic in the UTC timezone avoids DST day-length surprises.
  const now = new Date();
  const yesterday = new Date(now.getTime() - 86_400_000);
  const older = new Date(now.getTime() - 8 * 86_400_000);

  assert.equal(formatRelativeDay(now, 'en', labels, 'UTC'), 'TODAY_LBL');
  assert.equal(formatRelativeDay(yesterday, 'en', labels, 'UTC'), 'YESTERDAY_LBL');
  // Older dates fall back to a full localized date — formatted in the SAME
  // timezone the diff used (UTC), matching the function's fallback exactly.
  assert.notEqual(formatRelativeDay(older, 'en', labels, 'UTC'), 'TODAY_LBL');
  assert.notEqual(
    formatRelativeDay(older, 'en', labels, 'UTC'),
    'YESTERDAY_LBL',
  );
  assert.equal(
    formatRelativeDay(older, 'en', labels, 'UTC'),
    formatDate(older, 'en', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      timeZone: 'UTC',
    }),
  );
});
