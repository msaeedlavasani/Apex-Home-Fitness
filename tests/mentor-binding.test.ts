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

test('binding: canonical Squat identities bind across plan sources (EN + FA)', () => {
  assert.equal(isSquatMentorExercise(squat({name: 'Squat'})), true);
  assert.equal(isSquatMentorExercise(squat({name: 'اسکات', id: 'fbi-3'})), true);
  // The V1 legacy FA squat naming ("اسکوات با وزن بدن") still binds.
  assert.equal(isSquatMentorExercise(squat({name: 'اسکوات با وزن بدن'})), true);
  // Canonical slug identity binds (program-derived plans).
  assert.equal(isSquatMentorExercise(squat({name: 'Anything display', slug: 'squat' as never})), true);
  // The sample-plan nameKey identity binds (pre-resolution fixture items).
  assert.equal(isSquatMentorExercise({...squat(), nameKey: 'squat'}), true);
});

test('binding: unsupported exercises NEVER bind to the Squat Mentor', () => {
  assert.equal(isSquatMentorExercise(squat({name: 'Plank Hold', id: 'cp-1'})), false);
  assert.equal(isSquatMentorExercise(squat({name: 'نگه‌داشتن پلانک', id: 'cp-1'})), false);
  assert.equal(isSquatMentorExercise(squat({name: 'Push-Ups'})), false);
  assert.equal(isSquatMentorExercise(squat({name: 'Burpees'})), false);
  // A plan item named only "Air Squats" (V1 squats key) still binds — it IS
  // a squat-family identity; only non-squat exercises are excluded.
  assert.equal(isSquatMentorExercise(squat({name: 'اسکوات با وزن بدن'})), true);
});

test('fixture resolver: picks the FIRST supported (Squat) plan exercise', () => {
  const resolved = resolveMentorFixtureExercise([
    {exercise: squat({name: 'Plank Hold', id: 'cp-1'})},
    {exercise: squat({name: 'Squat', id: 'cp-5'})},
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

test('fixture resolver: canonical fa/en names both satisfy the fixture', () => {
  const fa = resolveMentorFixtureExercise([{exercise: squat({name: 'اسکات', id: 'x9'})}]);
  assert.equal(fa.exercise.id, 'x9');
  const slug = resolveMentorFixtureExercise([
    {exercise: squat({name: 'نیروی پایین', slug: 'squat' as never})},
  ]);
  assert.equal(slug.exercise.slug, 'squat');
});
