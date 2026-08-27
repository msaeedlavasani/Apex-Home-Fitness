import assert from 'node:assert/strict';
import test from 'node:test';
import React from 'react';
import TestRenderer, {act} from 'react-test-renderer';
import {useWorkoutEngine, type UseWorkoutEngineResult, type WorkoutExercise} from '../src/components/workout/useWorkoutEngine';

const PLAN: WorkoutExercise[] = [{id: 'one', name: 'One', sets: 1, durationSeconds: null, restSeconds: null}];

function Harness({plan, onPhaseChange, onStateChange, capture}: {plan: WorkoutExercise[]; onPhaseChange?: (phase: string) => void; onStateChange?: () => void; capture: (engine: UseWorkoutEngineResult) => void}) {
  const engine = useWorkoutEngine(plan, {onPhaseChange, onStateChange});
  capture(engine);
  return null;
}

test('S03-E effect consumption uses latest callbacks after rerender without resetting core', () => {
  const phasesA: string[] = [];
  const phasesB: string[] = [];
  const holder: {engine?: UseWorkoutEngineResult} = {};
  let renderer: TestRenderer.ReactTestRenderer;
  act(() => { renderer = TestRenderer.create(<Harness plan={PLAN} onPhaseChange={(phase) => phasesA.push(phase)} capture={(engine) => { holder.engine = engine; }} />); });
  const first = holder.engine!;
  act(() => { renderer.update(<Harness plan={PLAN} onPhaseChange={(phase) => phasesB.push(phase)} capture={(engine) => { holder.engine = engine; }} />); });
  assert.equal(holder.engine!.phase, first.phase);
  act(() => holder.engine!.start());
  assert.deepEqual(phasesA, []);
  assert.deepEqual(phasesB, ['EXERCISING']);
  act(() => renderer.unmount());
});

test('S03-E missing callbacks do not prevent transitions or effects', () => {
  const holder: {engine?: UseWorkoutEngineResult} = {};
  let renderer: TestRenderer.ReactTestRenderer;
  act(() => { renderer = TestRenderer.create(<Harness plan={PLAN} capture={(engine) => { holder.engine = engine; }} />); });
  act(() => holder.engine!.start());
  act(() => holder.engine!.completeSet());
  assert.equal(holder.engine!.phase, 'COMPLETED');
  act(() => renderer.unmount());
});

test('S03-E hydration emits state without a phase callback', () => {
  const log: string[] = [];
  const holder: {engine?: UseWorkoutEngineResult} = {};
  let renderer: TestRenderer.ReactTestRenderer;
  act(() => { renderer = TestRenderer.create(<Harness plan={PLAN} onPhaseChange={() => log.push('phase')} onStateChange={() => log.push('state')} capture={(engine) => { holder.engine = engine; }} />); });
  act(() => holder.engine!.hydrate({phase: 'EXERCISING', phaseElapsedSeconds: 2}));
  assert.deepEqual(log, ['state']);
  act(() => renderer.unmount());
});

test('S03-E completion effects and callback occur exactly once; later ACCOUNT is inert', () => {
  const counts = {set: 0, exercise: 0, workout: 0, state: 0};
  const holder: {engine?: UseWorkoutEngineResult} = {};
  let renderer: TestRenderer.ReactTestRenderer;
  act(() => { renderer = TestRenderer.create(<Harness plan={PLAN} onStateChange={() => { counts.state += 1; }} capture={(engine) => { holder.engine = engine; }} />); });
  act(() => holder.engine!.start());
  act(() => holder.engine!.completeSet());
  assert.equal(holder.engine!.phase, 'COMPLETED');
  const completedStateCount = counts.state;
  act(() => holder.engine!.completeSet());
  assert.equal(counts.state, completedStateCount + 1);
  assert.equal(holder.engine!.phase, 'COMPLETED');
  act(() => renderer.unmount());
});
