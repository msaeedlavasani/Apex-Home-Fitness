import assert from 'node:assert/strict';
import test from 'node:test';

import {deriveExerciseDetails, exerciseDetailFields} from '../src/lib/workout/experience/exerciseDetails';
import {createSessionMusicController} from '../src/lib/workout/experience/sessionMusic';
import {WORKOUT_MUSIC_SRC} from '../src/lib/workout/experience/musicAsset';
import type {ResolvedExercisePrescription} from '../src/lib/workout/sessionV2Contracts';

function fakeAudio({rejectPlay = false}: {rejectPlay?: boolean} = {}) {
  let paused = true;
  let currentTime = 0;
  let removedSrc = false;
  let loaded = false;
  const element = {
    src: '',
    loop: false,
    preload: '',
    get paused() {
      return paused;
    },
    get currentTime() {
      return currentTime;
    },
    play: async () => {
      if (rejectPlay) throw new Error('autoplay rejected');
      paused = false;
      currentTime = 1;
    },
    pause: () => {
      paused = true;
    },
    removeAttribute: (name: string) => {
      if (name === 'src') removedSrc = true;
    },
    load: () => {
      loaded = true;
    },
  } as unknown as HTMLAudioElement;
  return {
    element,
    flags: () => ({paused, currentTime, removedSrc, loaded}),
  };
}

function prescription(overrides: Partial<ResolvedExercisePrescription> = {}): ResolvedExercisePrescription {
  return {
    exercise: {id: 's1', name: 'Squat', sets: 3, reps: 10, restSeconds: 30},
    executionMode: 'REP_BASED',
    targetReps: 10,
    targetSeconds: null,
    setCount: 3,
    restSeconds: 30,
    ...overrides,
  };
}

test('session music uses one supplied asset and preserves real playback state', async () => {
  const fake = fakeAudio();
  const music = createSessionMusicController(fake.element);

  assert.equal(fake.element.src, WORKOUT_MUSIC_SRC);
  assert.equal(fake.element.loop, true);
  assert.equal(fake.element.preload, 'auto');
  assert.equal(music.getState(), 'STOPPED');

  assert.equal(await music.play(), 'PLAYING');
  assert.equal(music.getState(), 'PLAYING');
  assert.equal(await music.mute(), 'MUTED');
  assert.equal(await music.unmute(), 'PLAYING');

  music.dispose();
  assert.deepEqual(fake.flags(), {paused: true, currentTime: 1, removedSrc: true, loaded: true});
});

test('session music never reports playback when the platform rejects play()', async () => {
  const fake = fakeAudio({rejectPlay: true});
  const music = createSessionMusicController(fake.element);
  assert.equal(await music.play(), 'STOPPED');
  assert.equal(music.getState(), 'STOPPED');
});

test('exercise details are derived from resolved REP_BASED data', () => {
  const model = deriveExerciseDetails(prescription());
  assert.deepEqual(model, {
    exerciseName: 'Squat',
    prescription: '3 × 10',
    mode: 'repetitionBased',
    setCount: 3,
    targetReps: 10,
    targetSeconds: null,
  });
  assert.deepEqual(exerciseDetailFields(model).map(({key, value}) => ({key, value})), [
    {key: 'exercise', value: 'Squat'},
    {key: 'prescription', value: '3 × 10'},
    {key: 'mode', value: 'repetitionBased'},
  ]);
});

test('exercise details preserve TIME_BASED semantics without inventing equipment', () => {
  const model = deriveExerciseDetails(
    prescription({
      executionMode: 'TIME_BASED',
      targetReps: null,
      targetSeconds: 30,
    }),
  );
  assert.equal(model.prescription, '3 × 30s');
  assert.equal(model.mode, 'timeBased');
  assert.equal(exerciseDetailFields(model).some((field) => String(field.key) === 'equipment'), false);
});
