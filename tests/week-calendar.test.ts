/**
 * Unit tests for the dashboard weekly-calendar helpers
 * (`src/lib/weekCalendar.ts`).
 *
 * Covers the locale-aware column order:
 *  - `en` keeps the existing convention: Monday → Sunday;
 *  - `fa` starts the week on Saturday (شنبه) and runs شنبه → جمعه;
 *  - day selection (`dayIndexInWeek`) and the completion state
 *    (`mondayPlanIndex` → Monday-anchored plan) stay consistent across
 *    locales.
 */
import assert from 'node:assert/strict';
import test from 'node:test';
import {
  dayIndexInWeek,
  getWeekStartDay,
  mondayPlanIndex,
  startOfWeek,
  weekDaysFor,
} from '../src/lib/weekCalendar';

// A fixed week: Saturday 2026-08-15 … Friday 2026-08-21 (local time).
const SAT = new Date(2026, 7, 15);
const SUN = new Date(2026, 7, 16);
const MON = new Date(2026, 7, 17);
const TUE = new Date(2026, 7, 18);
const WED = new Date(2026, 7, 19);
const THU = new Date(2026, 7, 20);
const FRI = new Date(2026, 7, 21);
const WEEK = [SAT, SUN, MON, TUE, WED, THU, FRI];

function ymd(d: Date): string {
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}

// Mirror of the dashboard's WEEK_PLAN workout/rest layout (Monday → Sunday):
// [workout, workout, rest, workout, workout, rest, workout].
const PLAN_WORKOUTS = [true, true, false, true, true, false, true];

function completedSessionsOn(date: Date): number {
  return PLAN_WORKOUTS.slice(0, mondayPlanIndex(date)).filter(Boolean).length;
}

test('week starts on Monday for en and Saturday for fa', () => {
  assert.equal(getWeekStartDay('en'), 1);
  assert.equal(getWeekStartDay('fa'), 6);
  // Unknown locales fall back to the en (Monday) convention.
  assert.equal(getWeekStartDay('de'), 1);
});

test('startOfWeek anchors en weeks on Monday', () => {
  // Sunday Aug 16 → Monday Aug 10; Monday itself → the same day.
  assert.equal(ymd(startOfWeek(SUN, 'en')), '2026-8-10');
  assert.equal(ymd(startOfWeek(SAT, 'en')), '2026-8-10');
  assert.equal(ymd(startOfWeek(MON, 'en')), '2026-8-17');
  assert.equal(ymd(startOfWeek(FRI, 'en')), '2026-8-17');
});

test('startOfWeek anchors fa weeks on Saturday', () => {
  // Sunday Aug 16 → Saturday Aug 15; Saturday itself → the same day.
  assert.equal(ymd(startOfWeek(SUN, 'fa')), '2026-8-15');
  assert.equal(ymd(startOfWeek(SAT, 'fa')), '2026-8-15');
  assert.equal(ymd(startOfWeek(MON, 'fa')), '2026-8-15');
  assert.equal(ymd(startOfWeek(FRI, 'fa')), '2026-8-15');
});

test('weekDaysFor orders en columns Monday → Sunday', () => {
  const days = weekDaysFor(SUN, 'en');
  assert.equal(days.length, 7);
  assert.deepEqual(days.map(ymd), [
    '2026-8-10',
    '2026-8-11',
    '2026-8-12',
    '2026-8-13',
    '2026-8-14',
    '2026-8-15',
    '2026-8-16',
  ]);
  // The first column is always the locale's week-start day.
  assert.equal(days[0].getDay(), 1);
  assert.equal(days[6].getDay(), 0);
});

test('weekDaysFor orders fa columns Saturday (شنبه) → Friday (جمعه)', () => {
  const days = weekDaysFor(SUN, 'fa');
  assert.equal(days.length, 7);
  assert.deepEqual(days.map(ymd), [
    '2026-8-15',
    '2026-8-16',
    '2026-8-17',
    '2026-8-18',
    '2026-8-19',
    '2026-8-20',
    '2026-8-21',
  ]);
  assert.equal(days[0].getDay(), 6); // Saturday
  assert.equal(days[6].getDay(), 5); // Friday
});

test('both locales show 7 consecutive days that contain the anchor day', () => {
  // The two locales intentionally show different date ranges for a
  // mid-week anchor (Mon-start week vs Sat-start week), but both must
  // contain the anchor day itself and span 7 consecutive days.
  for (const day of WEEK) {
    const en = weekDaysFor(day, 'en');
    const fa = weekDaysFor(day, 'fa');
    assert.equal(en.length, 7);
    assert.equal(fa.length, 7);
    for (const days of [en, fa]) {
      for (let i = 1; i < 7; i++) {
        assert.equal(
          (days[i].getTime() - days[i - 1].getTime()) / 86_400_000,
          1,
          'columns must be consecutive days',
        );
      }
      assert.ok(days.some((d) => d.getTime() === day.getTime()));
    }
    assert.equal(en[0].getDay(), 1); // Monday
    assert.equal(fa[0].getDay(), 6); // Saturday
  }
});

test('dayIndexInWeek selects the same physical day in both locales', () => {
  // Sunday Aug 16: column 6 in en (Mon-start), column 1 in fa (Sat-start).
  assert.equal(dayIndexInWeek(SUN, 'en'), 6);
  assert.equal(dayIndexInWeek(SUN, 'fa'), 1);
  // Saturday Aug 15: column 5 in en, column 0 (first column) in fa.
  assert.equal(dayIndexInWeek(SAT, 'en'), 5);
  assert.equal(dayIndexInWeek(SAT, 'fa'), 0);
  // Every column maps back to the same physical day via weekDaysFor.
  for (const day of WEEK) {
    const enIndex = dayIndexInWeek(day, 'en');
    const faIndex = dayIndexInWeek(day, 'fa');
    assert.ok(weekDaysFor(day, 'en')[enIndex].getTime() === day.getTime());
    assert.ok(weekDaysFor(day, 'fa')[faIndex].getTime() === day.getTime());
  }
});

test('mondayPlanIndex maps calendar days to the Monday-anchored plan', () => {
  assert.deepEqual(WEEK.map(mondayPlanIndex), [5, 6, 0, 1, 2, 3, 4]);
  assert.deepEqual(WEEK.map((d) => PLAN_WORKOUTS[mondayPlanIndex(d)]), [
    false, // Saturday → rest
    true, // Sunday → mobility
    true, // Monday → Full Body HIIT
    true, // Tuesday → Yoga
    false, // Wednesday → rest
    true, // Thursday → Upper Body
    true, // Friday → Core Pilates
  ]);
});

test('completion count is anchored to the Monday plan in both locales', () => {
  // "Sessions done this week" counts plan workouts strictly before today,
  // anchored to the Monday-based plan via `mondayPlanIndex` — independent
  // of the locale's column order.
  for (const day of WEEK) {
    const expected = PLAN_WORKOUTS.slice(0, mondayPlanIndex(day)).filter(
      Boolean,
    ).length;
    // en keeps the old convention: display index === Monday plan index.
    assert.equal(dayIndexInWeek(day, 'en'), mondayPlanIndex(day));
    assert.equal(
      PLAN_WORKOUTS.slice(0, dayIndexInWeek(day, 'en')).filter(Boolean)
        .length,
      expected,
    );
    // The dashboard computes `sessionsDone` with `mondayPlanIndex(today)`
    // in BOTH locales, so the count never changes with the column order.
    assert.equal(completedSessionsOn(day), expected);
  }
  // Spot checks: Sunday (plan index 6) → 4 sessions done; Monday → 0.
  assert.equal(completedSessionsOn(SUN), 4);
  assert.equal(completedSessionsOn(MON), 0);
});
