import assert from 'node:assert/strict';
import test from 'node:test';

import {scheduleHasRestDayViolation, dashboardPlanFromSchedule, workoutExercisesFromSchedule, generatedExerciseDefaults} from '../src/lib/programSchedule';

const SCHEDULE = [
  {day: 1, day_name: 'Monday', focus: 'Strength', exercises: [{name: 'Squat', sets: 3, reps: '8-10'}]},
  {day: 4, day_name: 'Thursday', focus: 'Yoga', exercises: [{name: 'Flow', sets: 2, duration_seconds: 30}]},
  {day: 5, day_name: 'Friday', focus: 'Should be rest', exercises: [{name: 'Should not run', sets: 3}]},
];

test('dashboard mapping uses generated sessions and turns missing days into rest', () => {
  const plan = dashboardPlanFromSchedule(SCHEDULE, ['friday']);
  assert.equal(plan[0].type, 'workout');
  assert.equal(plan[0].type === 'workout' ? plan[0].focus : '', 'Strength');
  assert.equal(plan[4].type, 'rest');
  assert.equal(plan[2].type, 'rest');
});

test('selected rest days cannot be returned as player exercises', () => {
  assert.equal(scheduleHasRestDayViolation(SCHEDULE, ['friday']), true);
  assert.deepEqual(workoutExercisesFromSchedule(SCHEDULE, 'friday', ['friday']), []);
  assert.equal(workoutExercisesFromSchedule(SCHEDULE, 'monday', ['friday']).length, 1);
  assert.deepEqual(generatedExerciseDefaults(SCHEDULE[0].exercises[0], 0), {
    id: 'generated-0',
    name: 'Squat',
    sets: 3,
    reps: 8,
    durationSeconds: null,
    restSeconds: 30,
  });
});
