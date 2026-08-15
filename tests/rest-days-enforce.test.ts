import assert from 'node:assert/strict';
import test from 'node:test';

import {
  REST_DAYS_SCHEMA,
  enforceRestDays,
  isRestDaySession,
  normalizeDayName,
} from '../src/lib/ai/restDays';
import { GENERATE_PROGRAM_INPUT_SCHEMA } from '../src/lib/ai/requestSecurity';
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
