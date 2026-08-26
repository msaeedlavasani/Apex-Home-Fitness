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
