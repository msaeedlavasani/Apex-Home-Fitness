import assert from 'node:assert/strict';
import test from 'node:test';

import {
  REST_DAYS_SCHEMA,
  WEEKDAY_VALUES,
  enforceRestDays,
  isRestDay,
  isRestDaySession,
  normalizeDayName,
  weekdayOf,
} from '../src/lib/ai/restDays';
import { GENERATE_PROGRAM_INPUT_SCHEMA } from '../src/lib/ai/requestSecurity';
import { WEEKDAY_IDS } from '../src/components/quiz/restDays';
import type {
  AiExercise,
  AiGeneratedProgram,
  SaveGeneratedProgramInput,
} from '../src/services/programService';

/**
 * Rest-day contract tests across the server layers:
 *   1. `REST_DAYS_SCHEMA` — bounds (1–3), uniqueness, backward compatibility.
 *   2. `GENERATE_PROGRAM_INPUT_SCHEMA` — the API accepts/carries `restDays`.
 *   3. `normalizeDayName` / `isRestDaySession` — weekday-name mapping.
 *   4. `enforceRestDays` — the defense-in-depth pass that guarantees selected
 *      days never carry workouts in the generated output.
 *   5. `buildProgramDraft` — persistence skips rest-day sessions entirely.
 *
 * `programService` is imported dynamically with a scratch DATABASE_URL (its
 * Prisma singleton is constructed on import) — only pure functions are used,
 * no database is touched.
 */
process.env.DATABASE_URL = 'file:./rest-days-test.db';

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const baseExercise: AiExercise = {
  id: 'EX-001',
  name: 'Goblet Squat',
  method: 'strength',
  equipment: 'dumbbell',
  sets: 3,
  reps: '8-10',
  rest_seconds: 90,
  tempo: '3-1-1',
  rpe: 7,
  instruction_cue: 'Brace core, drive through mid-foot.',
  alternatives: [],
  contraindicated_for: [],
};

function exercise(name: string): AiExercise {
  return {...baseExercise, id: `EX-${name.replace(/\s/g, '_')}`, name};
}

const baseProgram: AiGeneratedProgram = {
  mode: 'general',
  program_id: 'prog_rest_days_test',
  method_mix: {
    strength_pct: 40,
    hypertrophy_pct: 20,
    cardio_pct: 15,
    mobility_pct: 10,
    pilates_pct: 5,
    bodyweight_pct: 5,
    isometric_pct: 5,
  },
  weekly_schedule: [
    {day: 1, day_name: 'Monday', focus: 'Full body', warmup: [], exercises: [exercise('Goblet Squat')], cooldown: [], notes: 'Day 1'},
    {day: 2, day_name: 'Friday', focus: 'Upper body', warmup: [], exercises: [exercise('Bench Press')], cooldown: [], notes: 'Day 2'},
  ],
  progression_plan: {
    weeks_1_2: 'Adaptation',
    weeks_3_5: 'Overload',
    week_6: 'Deload',
    overload_variables: ['load'],
  },
  warnings: [],
  notes: 'Test program',
  disclaimer: 'Not medical advice',
};

// ---------------------------------------------------------------------------
// 1. REST_DAYS_SCHEMA
// ---------------------------------------------------------------------------

test('server canonical weekday set stays ISO and in sync with the quiz (display order is UI-only)', () => {
  // Regression: the Persian quiz now REORDERS its options (Saturday first),
  // but that display change must never leak into the server contract —
  // canonical ids stay ISO (Monday first), identical to the quiz's
  // WEEKDAY_IDS, so stored values and enforcement are locale-independent.
  assert.deepEqual([...WEEKDAY_VALUES], WEEKDAY_IDS);
  assert.deepEqual([...WEEKDAY_VALUES], [
    'monday',
    'tuesday',
    'wednesday',
    'thursday',
    'friday',
    'saturday',
    'sunday',
  ]);
  // The schema still accepts only canonical ISO ids (all valid, incl. the
  // Persian-first display order id set — ids themselves are unchanged).
  for (const id of WEEKDAY_VALUES) {
    assert.equal(REST_DAYS_SCHEMA.safeParse([id]).success, true, `schema must accept ${id}`);
  }
});

test('REST_DAYS_SCHEMA is strict: absent input is rejected (backward compat lives in the input schema)', () => {
  // The strict schema itself never accepts "no answer" — the
  // GENERATE_PROGRAM_INPUT_SCHEMA wraps it with `.optional()` for
  // backward compatibility (see the input-schema tests below).
  assert.equal(REST_DAYS_SCHEMA.safeParse(undefined).success, false);
});

test('REST_DAYS_SCHEMA accepts 1–3 unique weekdays', () => {
  assert.deepEqual(REST_DAYS_SCHEMA.parse(['wednesday']), ['wednesday']);
  assert.deepEqual(REST_DAYS_SCHEMA.parse(['monday', 'sunday']), ['monday', 'sunday']);
  assert.deepEqual(
    REST_DAYS_SCHEMA.parse(['monday', 'wednesday', 'sunday']),
    ['monday', 'wednesday', 'sunday'],
  );
});

test('REST_DAYS_SCHEMA rejects empty, too many, duplicate or unknown days', () => {
  assert.equal(REST_DAYS_SCHEMA.safeParse([]).success, false); // explicit [] → min 1
  assert.equal(
    REST_DAYS_SCHEMA.safeParse(['monday', 'tuesday', 'wednesday', 'thursday']).success,
    false, // 4 > max 3
  );
  assert.equal(REST_DAYS_SCHEMA.safeParse(['monday', 'monday']).success, false); // duplicate
  assert.equal(REST_DAYS_SCHEMA.safeParse(['funday']).success, false); // unknown weekday
  assert.equal(REST_DAYS_SCHEMA.safeParse('monday').success, false); // not an array
});

// ---------------------------------------------------------------------------
// 2. API input schema (GENERATE_PROGRAM_INPUT_SCHEMA)
// ---------------------------------------------------------------------------

const validBase = {level: 'beginner', goal: 'strength', equipment: ['none'], limitations: []};

test('input schema accepts and normalizes restDays', () => {
  const result = GENERATE_PROGRAM_INPUT_SCHEMA.safeParse({
    ...validBase,
    restDays: ['wednesday', 'sunday'],
  });
  assert.equal(result.success, true);
  if (result.success) assert.deepEqual(result.data.restDays, ['wednesday', 'sunday']);
});

test('input schema stays backward compatible when restDays is omitted', () => {
  const result = GENERATE_PROGRAM_INPUT_SCHEMA.safeParse(validBase);
  assert.equal(result.success, true);
  if (result.success) assert.equal(result.data.restDays, undefined); // no constraint
});

test('input schema rejects invalid restDays payloads', () => {
  assert.equal(
    GENERATE_PROGRAM_INPUT_SCHEMA.safeParse({...validBase, restDays: []}).success,
    false,
  );
  assert.equal(
    GENERATE_PROGRAM_INPUT_SCHEMA.safeParse({
      ...validBase,
      restDays: ['monday', 'tuesday', 'wednesday', 'thursday'],
    }).success,
    false,
  );
  assert.equal(
    GENERATE_PROGRAM_INPUT_SCHEMA.safeParse({...validBase, restDays: ['funday']}).success,
    false,
  );
});

// ---------------------------------------------------------------------------
// 3. Weekday normalization
// ---------------------------------------------------------------------------

test('normalizeDayName maps model weekday names to canonical ids', () => {
  assert.equal(normalizeDayName('Monday'), 'monday');
  assert.equal(normalizeDayName('MONDAY'), 'monday');
  assert.equal(normalizeDayName(' sunday '), 'sunday');
  assert.equal(normalizeDayName('foo'), null);
  assert.equal(normalizeDayName(undefined), null);
  assert.equal(normalizeDayName(42), null);
});

test('isRestDaySession only flags explicit rest entries', () => {
  assert.equal(isRestDaySession({is_rest_day: true}), true);
  assert.equal(isRestDaySession({is_rest_day: false}), false);
  assert.equal(isRestDaySession({}), false);
});

// ---------------------------------------------------------------------------
// 4. enforceRestDays — output-level enforcement
// ---------------------------------------------------------------------------

test('enforceRestDays echoes the canonical rest_days into the output', () => {
  const enforced = enforceRestDays(baseProgram, ['wednesday', 'sunday']);
  assert.deepEqual(enforced.rest_days, ['wednesday', 'sunday']);
  // Compliant program: no session lands on a rest day → nothing is stripped.
  assert.equal(enforced.weekly_schedule.length, 2);
  assert.ok(enforced.weekly_schedule.every((s) => s.exercises.length > 0));
  assert.ok(enforced.weekly_schedule.every((s) => !isRestDaySession(s)));
});

test('enforceRestDays strips any session placed on a selected rest day', () => {
  const violating: AiGeneratedProgram = {
    ...baseProgram,
    weekly_schedule: [
      {day: 1, day_name: 'Monday', focus: 'Full body', warmup: [], exercises: [exercise('Goblet Squat')], cooldown: [], notes: 'Day 1'},
      // Model violated the constraint: a full session on Wednesday (a rest day).
      {day: 2, day_name: 'Wednesday', focus: 'Upper body', warmup: [{name: 'Arm circles', duration_seconds: 60, purpose: 'prep'}], exercises: [exercise('Bench Press')], cooldown: [{name: 'Stretch', duration_seconds: 60, purpose: 'recover'}], notes: 'Day 2'},
    ],
  };

  const enforced = enforceRestDays(violating, ['wednesday']);
  assert.deepEqual(enforced.rest_days, ['wednesday']);

  const wednesday = enforced.weekly_schedule.find((s) => s.day === 2);
  assert.ok(wednesday, 'expected a Wednesday session to remain in the schedule');
  assert.equal(isRestDaySession(wednesday), true);
  assert.deepEqual(wednesday.exercises, []);
  assert.deepEqual(wednesday.warmup, []);
  assert.deepEqual(wednesday.cooldown, []);
  // The untouched day keeps its workout.
  const monday = enforced.weekly_schedule.find((s) => s.day === 1);
  assert.ok(monday, 'expected a Monday session to remain in the schedule');
  assert.equal(isRestDaySession(monday), false);
  assert.equal(monday.exercises.length, 1);
});

test('enforceRestDays is a no-op for an empty rest-day selection', () => {
  const enforced = enforceRestDays(baseProgram, []);
  assert.deepEqual(enforced.rest_days, []);
  assert.ok(enforced.weekly_schedule.every((s) => !isRestDaySession(s)));
  assert.ok(enforced.weekly_schedule.every((s) => s.exercises.length > 0));
});

// ---------------------------------------------------------------------------
// 5. buildProgramDraft — persistence-level enforcement
// ---------------------------------------------------------------------------

test('buildProgramDraft skips rest-day sessions and persists restDays', async () => {
  const service = await import('../src/services/programService');
  const input: SaveGeneratedProgramInput = {
    level: 'beginner',
    goal: 'strength, fat_loss',
    restDays: ['wednesday', 'sunday'],
    program: {
      ...baseProgram,
      weekly_schedule: [
        {day: 1, day_name: 'Monday', focus: 'Full body', warmup: [], exercises: [exercise('Goblet Squat')], cooldown: [], notes: 'Day 1'},
        // Rest day (enforcement already stripped it, but persistence must
        // also skip it — defense in depth against un-enforced inputs).
        {day: 2, day_name: 'Wednesday', focus: 'Upper body', is_rest_day: true, warmup: [], exercises: [exercise('Bench Press')], cooldown: [], notes: 'Rest day — no workout scheduled.'},
        {day: 3, day_name: 'Friday', focus: 'Lower body', warmup: [], exercises: [exercise('Deadlift')], cooldown: [], notes: 'Day 3'},
      ],
    },
  };

  const draft = service.buildProgramDraft(input);
  assert.equal(draft.sessionsPerWeek, 2); // training days only
  assert.deepEqual(draft.restDays, ['wednesday', 'sunday']);

  const names = draft.programExercises.map((row) => row.exerciseName);
  assert.ok(names.includes('Goblet Squat'));
  assert.ok(names.includes('Deadlift'));
  assert.ok(!names.includes('Bench Press'), 'rest-day exercise must never be linked');
});

test('buildProgramDraft keeps legacy programs (no rest days) unchanged', async () => {
  const service = await import('../src/services/programService');
  const draft = service.buildProgramDraft({
    level: 'intermediate',
    program: baseProgram,
  });
  assert.equal(draft.sessionsPerWeek, 2);
  assert.deepEqual(draft.restDays, []);
  assert.equal(draft.programExercises.length, 2);
});

// ---------------------------------------------------------------------------
// 6. Edge-case regression — Thursday/Friday (the Persian weekend), Persian
//    day names, the numeric `day` fallback, and the retry (idempotency
//    replay) path. The fa quiz renders شنبه → جمعه but stores canonical ISO
//    ids, so enforcement keys off the same ids in every locale.
// ---------------------------------------------------------------------------

test('enforceRestDays strips a session placed on Friday (en edge case)', () => {
  const enforced = enforceRestDays(
    {
      ...baseProgram,
      weekly_schedule: [
        {day: 5, day_name: 'Friday', focus: 'Full body', warmup: [], exercises: [exercise('Goblet Squat')], cooldown: [], notes: 'Day 5'},
      ],
    },
    ['friday'],
  );
  const friday = enforced.weekly_schedule[0];
  assert.equal(isRestDaySession(friday), true);
  assert.deepEqual(friday.exercises, []);
  assert.deepEqual(friday.warmup, []);
  assert.deepEqual(friday.cooldown, []);
});

test('enforceRestDays strips a session placed on Thursday (en edge case)', () => {
  const enforced = enforceRestDays(
    {
      ...baseProgram,
      weekly_schedule: [
        {day: 4, day_name: 'Thursday', focus: 'Upper body', warmup: [], exercises: [exercise('Bench Press')], cooldown: [], notes: 'Day 4'},
      ],
    },
    ['thursday'],
  );
  const thursday = enforced.weekly_schedule[0];
  assert.equal(isRestDaySession(thursday), true);
  assert.deepEqual(thursday.exercises, []);
});

test('fa canonical ids thursday/friday are enforced identically (display order is UI-only)', () => {
  // The fa quiz shows شنبه → جمعه but stores canonical ISO ids; enforcement
  // keys off those ids, so Thursday/Friday are stripped in every locale.
  const enforced = enforceRestDays(
    {
      ...baseProgram,
      weekly_schedule: [
        {day: 1, day_name: 'Monday', focus: 'Full body', warmup: [], exercises: [exercise('Goblet Squat')], cooldown: [], notes: 'Day 1'},
        {day: 4, day_name: 'Thursday', focus: 'Upper body', warmup: [], exercises: [exercise('Bench Press')], cooldown: [], notes: 'Day 4'},
        {day: 5, day_name: 'Friday', focus: 'Lower body', warmup: [], exercises: [exercise('Deadlift')], cooldown: [], notes: 'Day 5'},
        {day: 6, day_name: 'Saturday', focus: 'Mobility', warmup: [], exercises: [exercise('Foam Roll')], cooldown: [], notes: 'Day 6'},
      ],
    },
    ['thursday', 'friday'],
  );
  assert.deepEqual(enforced.rest_days, ['thursday', 'friday']);
  assert.equal(isRestDaySession(enforced.weekly_schedule[1]), true); // Thursday
  assert.equal(isRestDaySession(enforced.weekly_schedule[2]), true); // Friday
  assert.equal(isRestDaySession(enforced.weekly_schedule[0]), false); // Monday
  assert.equal(isRestDaySession(enforced.weekly_schedule[3]), false); // Saturday
});

test('normalizeDayName maps Persian weekday names to canonical ids', () => {
  assert.equal(normalizeDayName('جمعه'), 'friday');
  assert.equal(normalizeDayName('پنجشنبه'), 'thursday');
  assert.equal(normalizeDayName('شنبه'), 'saturday');
  assert.equal(normalizeDayName('یکشنبه'), 'sunday');
  assert.equal(normalizeDayName('دوشنبه'), 'monday');
  // Tuesday has two common spellings: with a ZWNJ and with a space.
  assert.equal(normalizeDayName('سه‌شنبه'), 'tuesday');
  assert.equal(normalizeDayName('سه شنبه'), 'tuesday');
  assert.equal(normalizeDayName('چهارشنبه'), 'wednesday');
  // Arabic yeh/kaf variants normalize to the Persian glyphs.
  assert.equal(normalizeDayName('پنجشنبه'.replace(/ی/g, 'ي')), 'thursday');
  assert.equal(normalizeDayName('چهارشنبه'.replace(/ک/g, 'ك')), 'wednesday');
  // Still strict: junk is not a weekday.
  assert.equal(normalizeDayName('فندق'), null);
});

test('enforceRestDays strips sessions whose day_name is Persian', () => {
  const enforced = enforceRestDays(
    {
      ...baseProgram,
      weekly_schedule: [
        {day: 5, day_name: 'جمعه', focus: 'Full body', warmup: [], exercises: [exercise('Goblet Squat')], cooldown: [], notes: 'Day 5'},
        {day: 4, day_name: 'پنجشنبه', focus: 'Upper body', warmup: [], exercises: [exercise('Bench Press')], cooldown: [], notes: 'Day 4'},
      ],
    },
    ['friday', 'thursday'],
  );
  assert.equal(isRestDaySession(enforced.weekly_schedule[0]), true);
  assert.equal(isRestDaySession(enforced.weekly_schedule[1]), true);
  assert.deepEqual(enforced.weekly_schedule[0].exercises, []);
  assert.deepEqual(enforced.weekly_schedule[1].exercises, []);
});

test('weekdayOf resolves day_name first, then the numeric day (ISO 1=Monday)', () => {
  assert.equal(weekdayOf({day_name: 'Monday', day: 1}), 'monday');
  assert.equal(weekdayOf({day_name: 'جمعه', day: 6}), 'friday'); // name wins
  assert.equal(weekdayOf({day_name: 'Wednesday'}), 'wednesday');
  assert.equal(weekdayOf({day: 1}), 'monday');
  assert.equal(weekdayOf({day: 4}), 'thursday');
  assert.equal(weekdayOf({day: 5}), 'friday');
  assert.equal(weekdayOf({day: 7}), 'sunday');
  // Out-of-range / non-integer / string `day` values are never trusted.
  assert.equal(weekdayOf({day: 0}), null);
  assert.equal(weekdayOf({day: 8}), null);
  assert.equal(weekdayOf({day: 1.5}), null);
  assert.equal(weekdayOf({day: '5'}), null);
  assert.equal(weekdayOf({}), null);
  assert.equal(weekdayOf({day_name: 'funday'}), null); // no usable info
  assert.equal(weekdayOf({day_name: 'funday', day: 0}), null); // day out of range
  // Unparseable day_name falls back to the numeric day.
  assert.equal(weekdayOf({day_name: 'funday', day: 3}), 'wednesday');
});

test('enforceRestDays uses the numeric day as a fallback when day_name is missing', () => {
  const enforced = enforceRestDays(
    {
      ...baseProgram,
      weekly_schedule: [
        {day: 1, focus: 'Full body', warmup: [], exercises: [exercise('Goblet Squat')], cooldown: [], notes: 'Day 1'},
        {day: 5, focus: 'Upper body', warmup: [], exercises: [exercise('Bench Press')], cooldown: [], notes: 'Day 5'},
        {day: 4, focus: 'Lower body', warmup: [], exercises: [exercise('Deadlift')], cooldown: [], notes: 'Day 4'},
      ],
    },
    ['friday', 'thursday'],
  );
  assert.equal(isRestDaySession(enforced.weekly_schedule[0]), false); // day 1 = Monday
  assert.equal(isRestDaySession(enforced.weekly_schedule[1]), true); // day 5 = Friday
  assert.equal(isRestDaySession(enforced.weekly_schedule[2]), true); // day 4 = Thursday
  assert.deepEqual(enforced.weekly_schedule[1].exercises, []);
  assert.deepEqual(enforced.weekly_schedule[2].exercises, []);
  assert.equal(enforced.weekly_schedule[0].exercises.length, 1);
});

test('day_name wins over a conflicting numeric day', () => {
  const enforced = enforceRestDays(
    {
      ...baseProgram,
      weekly_schedule: [
        // day 1 would map to Monday, but the explicit day_name says Wednesday.
        {day: 1, day_name: 'Wednesday', focus: 'Full body', warmup: [], exercises: [exercise('Goblet Squat')], cooldown: [], notes: 'Day 1'},
      ],
    },
    ['monday'],
  );
  assert.equal(isRestDaySession(enforced.weekly_schedule[0]), false);
  assert.equal(enforced.weekly_schedule[0].exercises.length, 1);
});

test('isRestDay flags explicit rest entries and weekday matches (used by persistence)', () => {
  assert.equal(isRestDay({is_rest_day: true}, []), true);
  assert.equal(isRestDay({day_name: 'Friday', day: 5}, ['friday']), true);
  assert.equal(isRestDay({day: 5}, ['friday']), true);
  assert.equal(isRestDay({day_name: 'جمعه'}, ['friday']), true);
  assert.equal(isRestDay({day_name: 'Monday'}, ['friday']), false);
  assert.equal(isRestDay({}, ['monday']), false);
  assert.equal(isRestDay({}, []), false);
});

test('enforceRestDays is idempotent — a replayed (already-enforced) payload stays enforced', () => {
  // The idempotency retry path replays the payload stored at first
  // generation, which was already enforced; running the pass again (as a
  // fresh generation would) must leave it enforced, byte for byte.
  const restDays = ['friday', 'thursday'];
  const once = enforceRestDays(
    {
      ...baseProgram,
      weekly_schedule: [
        {day: 1, day_name: 'Monday', focus: 'Full body', warmup: [], exercises: [exercise('Goblet Squat')], cooldown: [], notes: 'Day 1'},
        {day: 4, day_name: 'Thursday', focus: 'Upper body', warmup: [], exercises: [exercise('Bench Press')], cooldown: [], notes: 'Day 4'},
        {day: 5, day_name: 'Friday', focus: 'Lower body', warmup: [], exercises: [exercise('Deadlift')], cooldown: [], notes: 'Day 5'},
      ],
    },
    restDays,
  );
  const twice = enforceRestDays(once, restDays);
  assert.deepEqual(twice.rest_days, once.rest_days);
  assert.deepEqual(twice.weekly_schedule, once.weekly_schedule);
  // Every entry mapped to a rest day is an explicit, empty rest entry.
  for (const session of twice.weekly_schedule) {
    if (restDays.includes(weekdayOf(session) as string)) {
      assert.equal(isRestDaySession(session), true);
      assert.deepEqual(session.exercises, []);
    }
  }
});

test('buildProgramDraft skips rest-day sessions even without the is_rest_day flag', async () => {
  const service = await import('../src/services/programService');
  const draft = service.buildProgramDraft({
    level: 'beginner',
    restDays: ['friday', 'thursday'],
    program: {
      ...baseProgram,
      weekly_schedule: [
        {day: 1, day_name: 'Monday', focus: 'Full body', warmup: [], exercises: [exercise('Goblet Squat')], cooldown: [], notes: 'Day 1'},
        // NO is_rest_day flag — persistence must still skip Friday/Thursday
        // via the weekday mapping (defense in depth against un-enforced input).
        {day: 5, day_name: 'Friday', focus: 'Upper body', warmup: [], exercises: [exercise('Bench Press')], cooldown: [], notes: 'Day 5'},
        {day: 4, day_name: 'Thursday', focus: 'Lower body', warmup: [], exercises: [exercise('Deadlift')], cooldown: [], notes: 'Day 4'},
      ],
    },
  });
  assert.equal(draft.sessionsPerWeek, 1);
  assert.deepEqual(draft.programExercises.map((row) => row.exerciseName), ['Goblet Squat']);
  assert.deepEqual(draft.restDays, ['friday', 'thursday']);
});

test('buildProgramDraft skips Persian-named and day-number rest-day sessions', async () => {
  const service = await import('../src/services/programService');
  const draft = service.buildProgramDraft({
    level: 'beginner',
    restDays: ['friday'],
    program: {
      ...baseProgram,
      weekly_schedule: [
        // Persian day_name → friday → skipped at persistence.
        {day: 5, day_name: 'جمعه', focus: 'Full body', warmup: [], exercises: [exercise('Goblet Squat')], cooldown: [], notes: 'Day 5'},
        // No day_name, day 6 = Saturday (not a rest day) → kept.
        {day: 6, focus: 'Upper body', warmup: [], exercises: [exercise('Bench Press')], cooldown: [], notes: 'Day 6'},
      ],
    },
  });
  assert.equal(draft.sessionsPerWeek, 1);
  assert.deepEqual(draft.programExercises.map((row) => row.exerciseName), ['Bench Press']);
});
