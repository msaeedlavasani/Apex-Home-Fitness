import assert from 'node:assert/strict';
import test from 'node:test';

import {buildRuleBasedProgram} from '../src/lib/ai/ruleBasedProgram';

test('rule-based fallback honors quiz rest days and selected exercise styles', () => {
  const program = buildRuleBasedProgram({
    level: 'beginner',
    goal: ['strength'],
    exerciseStyles: ['calisthenics', 'mobility'],
    equipment: ['none'],
    limitations: ['none'],
    limitationsDetails: '',
    restDays: ['thursday', 'friday'],
  });

  assert.deepEqual(program.rest_days, ['thursday', 'friday']);
  const restSessions = program.weekly_schedule.filter((session) =>
    ['Thursday', 'Friday'].includes(session.day_name ?? ''),
  );
  assert.equal(restSessions.length, 2);
  assert.ok(restSessions.every((session) => session.is_rest_day && session.exercises.length === 0));

  const methods = program.weekly_schedule.flatMap((session) => session.exercises.map((exercise) => exercise.method));
  assert.ok(methods.every((method) => method === 'bodyweight' || method === 'mobility'));
});

test('rule-based fallback creates NO extra rest days beyond the user selection', () => {
  for (const level of ['beginner', 'intermediate', 'advanced'] as const) {
    const program = buildRuleBasedProgram({
      level,
      goal: ['strength'],
      exerciseStyles: ['calisthenics'],
      equipment: ['none'],
      limitations: ['none'],
      limitationsDetails: '',
      restDays: ['thursday', 'friday'],
    });

    // Exactly the selected weekdays are rest days — every other weekday
    // carries a real session (regression: the level-based session cap used to
    // turn leftover available days into surprise rest days, e.g. Sunday).
    const restSessions = program.weekly_schedule.filter((session) => session.is_rest_day);
    assert.equal(
      restSessions.length,
      2,
      `level ${level}: expected exactly 2 rest days, got ${restSessions.length}`,
    );
    assert.deepEqual(
      restSessions.map((session) => session.day_name),
      ['Thursday', 'Friday'],
      `level ${level}: only Thursday/Friday may be rest days`,
    );
    assert.ok(
      program.weekly_schedule.every((session) =>
        session.is_rest_day ? session.exercises.length === 0 : session.exercises.length > 0,
      ),
      `level ${level}: every non-rest weekday must contain exercises`,
    );
  }
});
