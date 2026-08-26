import assert from 'node:assert/strict';
import test from 'node:test';

import {buildRuleBasedProgram, summarizeRuleWorkoutHistory} from '../src/lib/ai/ruleBasedProgram';
import type {GenerateProgramInput} from '../src/lib/ai/requestSecurity';

function input(overrides: Partial<GenerateProgramInput> = {}): GenerateProgramInput {
  return {
  level: 'beginner' as const,
  goal: ['strength'],
  exerciseStyles: ['calisthenics', 'mobility'],
  equipment: ['none'] as ['none'],
  limitations: ['none'] as ['none'],
  limitationsDetails: '',
    restDays: ['thursday', 'friday'],
    ...overrides,
  };
}

test('rule fallback separates training frequency from unavailable rest days', () => {
  const program = buildRuleBasedProgram(input({trainingDaysPerWeek: 3}));
  assert.equal(program.weekly_schedule.filter((session) => !session.is_rest_day).length, 3);
  assert.equal(program.weekly_schedule.filter((session) => session.is_rest_day).length, 4);
  assert.deepEqual(program.rest_days, ['thursday', 'friday']);
  for (const session of program.weekly_schedule) {
    if (['Thursday', 'Friday'].includes(session.day_name ?? '')) {
      assert.equal(session.is_rest_day, true);
      assert.deepEqual(session.exercises, []);
    }
  }
});

test('legacy inputs use conservative level defaults and never exceed available weekdays', () => {
  assert.equal(buildRuleBasedProgram(input()).weekly_schedule.filter((session) => !session.is_rest_day).length, 3);
  const constrained = buildRuleBasedProgram(input({level: 'advanced', trainingDaysPerWeek: 6, restDays: ['monday', 'wednesday', 'friday']}));
  assert.equal(constrained.weekly_schedule.filter((session) => !session.is_rest_day).length, 4);
});

test('reported limitations actively exclude contraindicated catalog exercises', () => {
  const program = buildRuleBasedProgram(input({exerciseStyles: ['calisthenics', 'isometric'], limitations: ['knee', 'wrist'], trainingDaysPerWeek: 3}));
  const exercises = program.weekly_schedule.flatMap((session) => session.exercises);
  assert.ok(exercises.length > 0);
  assert.ok(exercises.every((item) => !item.contraindicated_for.includes('knee') && !item.contraindicated_for.includes('wrist')));
  assert.ok(!exercises.some((item) => ['Bodyweight Squat', 'Wall Sit', 'Incline Push-Up'].includes(item.name)));
  assert.ok(program.warnings.some((warning) => warning.includes('knee')));
});

test('output is deterministic, preserves cable equipment, and method mix totals 100', () => {
  const profile = input({exerciseStyles: ['resistance_band'], equipment: ['cable_machine'], trainingDaysPerWeek: 2});
  const first = buildRuleBasedProgram(profile);
  assert.equal(first.program_id, buildRuleBasedProgram(profile).program_id);
  assert.ok(first.weekly_schedule.flatMap((session) => session.exercises).some((item) => item.equipment === 'cable_machine'));
  assert.equal(Object.values(first.method_mix).reduce((sum, value) => sum + value, 0), 100);
});

test('recent adherence changes fallback volume, RPE, and rest prescriptions', () => {
  const high = summarizeRuleWorkoutHistory(Array.from({length: 4}, () => ({completedAt: new Date(), durationSeconds: 1200, exercises: [{completed: true, actualSets: 3, actualReps: 12}]})));
  const low = summarizeRuleWorkoutHistory(Array.from({length: 4}, () => ({completedAt: null, durationSeconds: 300, exercises: [{completed: false, actualSets: 1, actualReps: 3}]})));
  const progressed = buildRuleBasedProgram(input({trainingDaysPerWeek: 2}), {history: high});
  const regressed = buildRuleBasedProgram(input({trainingDaysPerWeek: 2}), {history: low});
  const a = progressed.weekly_schedule.flatMap((session) => session.exercises)[0];
  const b = regressed.weekly_schedule.flatMap((session) => session.exercises)[0];
  assert.ok((a.sets ?? 0) > (b.sets ?? 0));
  assert.ok((a.rpe ?? 0) > (b.rpe ?? 0));
  assert.ok((a.rest_seconds ?? 0) < (b.rest_seconds ?? 0));
  assert.match(progressed.adjustments?.rationale ?? '', /4\/4 sessions/);
});
