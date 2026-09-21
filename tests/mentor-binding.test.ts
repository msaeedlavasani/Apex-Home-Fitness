/**
 * Mentor fixture binding tests (owner device correction §3) — the
 * fail-closed exercise↔Mentor↔cues consistency boundary.
 *
 * The current V2 validation fixture demonstrates EXACTLY ONE exercise (the
 * canonical AHF_Mentor_Squat.glb with squat-authored coaching cues). These
 * tests pin the boundary that keeps the fixture internally consistent: an
 * unsupported exercise must NEVER bind silently to the Squat Mentor.
 */
import assert from 'node:assert/strict';
import test from 'node:test';

import {
  MENTOR_DEMONSTRATION_ASSET,
  UnsupportedMentorExerciseError,
  isSquatMentorExercise,
  resolveMentorFixtureExercise,
} from '../src/lib/workout/experience/mentorBinding';
import type {SessionExercise} from '../src/lib/workout/sessionContracts';

const squat = (overrides: Partial<SessionExercise> = {}): SessionExercise => ({
  id: 's1',
  name: 'Squat',
  sets: 3,
  reps: 10,
  restSeconds: 30,
  ...overrides,
});

test('binding requires the explicit canonical Bodyweight Squat identity', () => {
  assert.equal(isSquatMentorExercise(squat({name: 'Anything display', slug: 'bodyweight-squat' as never})), true);
  assert.equal(isSquatMentorExercise(squat({name: 'Bodyweight Squat'})), false);
  assert.equal(isSquatMentorExercise(squat({name: 'اسکات', id: 'fbi-3'})), false);
  assert.equal(isSquatMentorExercise({...squat(), nameKey: 'squat'}), false);
});

test('binding: unsupported exercises NEVER bind to the Squat Mentor', () => {
  assert.equal(isSquatMentorExercise(squat({name: 'Plank Hold', id: 'cp-1'})), false);
  assert.equal(isSquatMentorExercise(squat({name: 'نگه‌داشتن پلانک', id: 'cp-1'})), false);
  assert.equal(isSquatMentorExercise(squat({name: 'Push-Ups'})), false);
  assert.equal(isSquatMentorExercise(squat({name: 'Burpees'})), false);
  assert.equal(isSquatMentorExercise(squat({name: 'Jump Squats', slug: 'jump-squats' as never})), false);
});

test('fixture resolver: picks the FIRST supported (Squat) plan exercise', () => {
  const resolved = resolveMentorFixtureExercise([
    {exercise: squat({name: 'Plank Hold', id: 'cp-1'})},
    {exercise: squat({name: 'Squat', slug: 'bodyweight-squat' as never, id: 'cp-5'})},
    {exercise: squat({name: 'Glute Bridge', id: 'cp-2'})},
  ]);
  assert.equal(resolved.exercise.id, 'cp-5');
});

test('fixture resolver: FAILS CLOSED when no plan exercise is supported', () => {
  assert.throws(
    () => resolveMentorFixtureExercise([{exercise: squat({name: 'Plank Hold'})}]),
    (error: unknown) => error instanceof UnsupportedMentorExerciseError,
  );
  assert.throws(
    () => resolveMentorFixtureExercise([]),
    (error: unknown) => error instanceof UnsupportedMentorExerciseError,
  );
  try {
    resolveMentorFixtureExercise([{exercise: squat({name: 'Plank Hold'})}]);
  } catch (error) {
    assert.match(
      (error as Error).message,
      new RegExp(MENTOR_DEMONSTRATION_ASSET.replaceAll('.', '\\.')),
      'the error names the single supported demonstration asset',
    );
  }
});

test('fixture resolver: resolved canonical identity satisfies the fixture', () => {
  const fa = resolveMentorFixtureExercise([{exercise: squat({name: 'Anything', slug: 'bodyweight-squat' as never, id: 'x9'})}]);
  assert.equal(fa.exercise.id, 'x9');
  const slug = resolveMentorFixtureExercise([
    {exercise: squat({name: 'نیروی پایین', slug: 'bodyweight-squat' as never})},
  ]);
  assert.equal(slug.exercise.slug, 'bodyweight-squat');
});
