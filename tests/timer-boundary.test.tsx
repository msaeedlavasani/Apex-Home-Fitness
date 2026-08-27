import assert from 'node:assert/strict';
import test, {mock} from 'node:test';
import React from 'react';
import TestRenderer, {act} from 'react-test-renderer';
import {useWorkoutEngine, type WorkoutExercise, type UseWorkoutEngineResult} from '../src/components/workout/useWorkoutEngine';

const OPEN: WorkoutExercise[] = [{id: 'open', name: 'Open', sets: 1, durationSeconds: null, restSeconds: null}];
const TIMED: WorkoutExercise[] = [
  {id: 'a', name: 'A', sets: 1, durationSeconds: 10, restSeconds: 5},
  {id: 'b', name: 'B', sets: 1, durationSeconds: 10, restSeconds: null},
];

function mount(plan: WorkoutExercise[], now: () => number) {
  const holder: {engine?: UseWorkoutEngineResult} = {};
  let renderer: TestRenderer.ReactTestRenderer | undefined;
  act(() => { renderer = TestRenderer.create(<Harness plan={plan} now={now} capture={(engine) => { holder.engine = engine; }} />); });
  assert.ok(renderer && holder.engine);
  return {holder: holder as {engine: UseWorkoutEngineResult}, renderer};
}

function Harness({plan, now, capture}: {plan: WorkoutExercise[]; now: () => number; capture: (engine: UseWorkoutEngineResult) => void}) {
  const engine = useWorkoutEngine(plan, {now});
  capture(engine);
  return null;
}

test('S03-D exactly-once accounting: heartbeat followed by lifecycle adds only new delta', (t) => {
  mock.timers.enable({apis: ['setInterval']});
  let now = 1_000_000;
  const docHandlers: Record<string, () => void> = {};
  const winHandlers: Record<string, () => void> = {};
  (globalThis as Record<string, unknown>).document = {addEventListener: (name: string, cb: () => void) => { docHandlers[name] = cb; }, removeEventListener: () => undefined};
  (globalThis as Record<string, unknown>).window = {addEventListener: (name: string, cb: () => void) => { winHandlers[name] = cb; }, removeEventListener: () => undefined};
  const {holder, renderer} = mount(OPEN, () => now);
  t.after(() => { act(() => renderer.unmount()); mock.timers.reset(); delete (globalThis as Record<string, unknown>).document; delete (globalThis as Record<string, unknown>).window; });
  act(() => holder.engine.start());
  now += 2_000;
  act(() => mock.timers.tick(1000));
  assert.equal(holder.engine.phaseElapsedSeconds, 2);
  now += 5_000;
  act(() => { docHandlers.visibilitychange(); winHandlers.focus(); });
  assert.equal(holder.engine.phaseElapsedSeconds, 7);
  now += 500;
  act(() => { docHandlers.visibilitychange(); winHandlers.focus(); });
  assert.equal(holder.engine.phaseElapsedSeconds, 7);
});

test('S03-D hydrated paused sessions do not account until resume', (t) => {
  mock.timers.enable({apis: ['setInterval']});
  let now = 2_000_000;
  const {holder, renderer} = mount(TIMED, () => now);
  t.after(() => { act(() => renderer.unmount()); mock.timers.reset(); });
  act(() => holder.engine.hydrate({phase: 'EXERCISING', phaseElapsedSeconds: 3, totalElapsedSeconds: 8, startedAt: 1_000_000}));
  now += 20_000;
  act(() => mock.timers.tick(1000));
  assert.equal(holder.engine.phaseElapsedSeconds, 3);
  assert.equal(holder.engine.totalElapsedSeconds, 8);
  act(() => holder.engine.resume());
  now += 2_000;
  act(() => mock.timers.tick(1000));
  assert.equal(holder.engine.phaseElapsedSeconds, 5);
});

test('S03-D reset and restart establish fresh accumulator baselines', (t) => {
  mock.timers.enable({apis: ['setInterval']});
  let now = 3_000_000;
  const {holder, renderer} = mount(OPEN, () => now);
  t.after(() => { act(() => renderer.unmount()); mock.timers.reset(); });
  act(() => holder.engine.start());
  now += 4_000;
  act(() => mock.timers.tick(1000));
  assert.equal(holder.engine.phaseElapsedSeconds, 4);
  act(() => holder.engine.reset());
  now += 20_000;
  act(() => mock.timers.tick(1000));
  assert.equal(holder.engine.phaseElapsedSeconds, 0);
  act(() => holder.engine.restart());
  now += 2_000;
  act(() => mock.timers.tick(1000));
  assert.equal(holder.engine.phaseElapsedSeconds, 2);
});

test('S03-D completed sessions stop accounting on later lifecycle events', (t) => {
  mock.timers.enable({apis: ['setInterval']});
  let now = 4_000_000;
  const docHandlers: Record<string, () => void> = {};
  (globalThis as Record<string, unknown>).document = {addEventListener: (name: string, cb: () => void) => { docHandlers[name] = cb; }, removeEventListener: () => undefined};
  (globalThis as Record<string, unknown>).window = {addEventListener: () => undefined, removeEventListener: () => undefined};
  const {holder, renderer} = mount([{id: 'one', name: 'One', sets: 1, durationSeconds: null, restSeconds: null}], () => now);
  t.after(() => { act(() => renderer.unmount()); mock.timers.reset(); delete (globalThis as Record<string, unknown>).document; delete (globalThis as Record<string, unknown>).window; });
  act(() => holder.engine.start());
  act(() => holder.engine.completeSet());
  assert.equal(holder.engine.phase, 'COMPLETED');
  now += 60_000;
  act(() => { docHandlers.visibilitychange?.(); mock.timers.tick(1000); });
  assert.equal(holder.engine.totalElapsedSeconds, 0);
  assert.equal(holder.engine.phaseElapsedSeconds, 0);
});
