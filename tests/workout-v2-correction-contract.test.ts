import assert from 'node:assert/strict';
import test from 'node:test';
import {
  EXERCISE_PASSPORT_VERSION,
  SUPPORTED_SQUAT_MENTOR_ASSET,
  exercisePassportFromAuthority,
} from '@/lib/exercise/passport';
import {
  WORKOUT_COMPOSITION_CONTRACT_VERSION,
  WORKOUT_COMPOSITION_DEGRADATION_ORDER,
  WORKOUT_COMPOSITION_ZONES,
} from '@/lib/workout/experience/compositionContract';

test('Exercise Passport projects stable Exercise knowledge without prescription data', () => {
  const passport = exercisePassportFromAuthority({
    exerciseId: 'exercise-squat' as never,
    slug: 'bodyweight-squat' as never,
    name: 'Bodyweight Squat',
    instructions: ['Keep the chest lifted'],
    coachingCues: ['Track the knees over the toes'],
    mentorSupported: true,
  });

  assert.equal(passport.version, EXERCISE_PASSPORT_VERSION);
  assert.deepEqual(passport.introCues, ['Track the knees over the toes']);
  assert.deepEqual(passport.setupInstructions, ['Keep the chest lifted']);
  assert.deepEqual(passport.mentor, {supported: true, asset: SUPPORTED_SQUAT_MENTOR_ASSET});
  assert.equal('setCount' in passport, false);
  assert.equal('executionMode' in passport, false);
});

test('unsupported Exercise knowledge fails closed instead of borrowing Squat presentation', () => {
  const passport = exercisePassportFromAuthority({
    name: 'Push-Up',
    coachingCues: ['Hands under shoulders'],
    mentorSupported: false,
  });

  assert.equal(passport.mentor.supported, false);
  assert.equal(passport.mentor.asset, undefined);
  assert.deepEqual(passport.introCues, ['Hands under shoulders']);
});

test('protected Mentor composition has explicit adaptive degradation semantics', () => {
  assert.equal(WORKOUT_COMPOSITION_CONTRACT_VERSION, 1);
  assert.equal(WORKOUT_COMPOSITION_ZONES.mentor, 'PROTECTED_MENTOR_STAGE');
  assert.deepEqual(WORKOUT_COMPOSITION_DEGRADATION_ORDER, [
    'REFLOW_SECONDARY',
    'COMPACT_SECONDARY',
    'USE_AVAILABLE_COMPOSITION_ZONE',
    'COLLAPSE_NONESSENTIAL',
    'CONTROLLED_SCROLL_OR_OVERLAY',
  ]);
});
