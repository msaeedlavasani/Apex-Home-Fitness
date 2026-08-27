import assert from 'node:assert/strict';
import test from 'node:test';
import {createSessionCore, type SessionExercise} from '../src/lib/workout/sessionCore';

const plan: SessionExercise[] = [
  {id: 'a', name: 'A', sets: 2, durationSeconds: 10, restSeconds: 5},
  {id: 'b', name: 'B', sets: 1, durationSeconds: 10, restSeconds: null},
];

test('pure core initializes without mutating the plan', () => {
  const input = plan.map((exercise) => ({...exercise}));
  const core = createSessionCore(input);
  assert.deepEqual(core.state, {phase: 'READY', currentExerciseIndex: 0, currentSet: 1, completedSets: 0, totalSets: 3, phaseElapsedSeconds: 0, totalElapsedSeconds: 0, isRunning: false, startedAt: null, completedAt: null});
  assert.deepEqual(input, plan);
  assert.equal(core.derive().currentExercise?.id, 'a');
});

test('core matches start, rest, and next-set transitions', () => {
  const core = createSessionCore(plan);
  assert.deepEqual(core.transition({kind: 'START'}, 100).effects.map((effect) => effect.kind), ['STATE_CHANGED', 'PHASE_CHANGED']);
  const result = core.transition({kind: 'ACCOUNT', elapsedSeconds: 10}, 110);
  assert.equal(result.state.phase, 'RESTING');
  assert.equal(result.state.currentSet, 2);
  assert.equal(result.state.completedSets, 1);
  assert.deepEqual(result.effects.map((effect) => effect.kind), ['SET_COMPLETED', 'STATE_CHANGED', 'PHASE_CHANGED']);
  assert.equal(core.transition({kind: 'SKIP_REST'}, 115).state.phase, 'EXERCISING');
});

test('core preserves distinct repeated canonical steps', () => {
  const repeated = [
    {...plan[0], id: 'step-a', exerciseId: 'canonical'},
    {...plan[1], id: 'step-b', exerciseId: 'canonical'},
  ];
  const core = createSessionCore(repeated);
  assert.equal(core.derive().totalSets, 3);
  core.transition({kind: 'START'}, 1);
  const result = core.transition({kind: 'NEXT_EXERCISE'}, 2);
  assert.equal(result.state.currentExerciseIndex, 1);
  assert.equal(core.plan[0]?.id, 'step-a');
  assert.equal(core.plan[1]?.id, 'step-b');
});

test('core hydration is paused, clamped, and does not mutate input', () => {
  const core = createSessionCore(plan);
  const input = {phase: 'EXERCISING' as const, currentExerciseIndex: 99, currentSet: 99, phaseElapsedSeconds: 99, totalElapsedSeconds: 7};
  const result = core.transition({kind: 'HYDRATE', input}, 500);
  assert.equal(result.state.currentExerciseIndex, 1);
  assert.equal(result.state.currentSet, 1);
  assert.equal(result.state.phaseElapsedSeconds, 9);
  assert.equal(result.state.totalElapsedSeconds, 7);
  assert.equal(result.state.isRunning, false);
  assert.deepEqual(input, {phase: 'EXERCISING', currentExerciseIndex: 99, currentSet: 99, phaseElapsedSeconds: 99, totalElapsedSeconds: 7});
});

test('core is deterministic for identical commands and explicit time', () => {
  const commands = [{kind: 'START' as const}, {kind: 'ACCOUNT' as const, elapsedSeconds: 3}, {kind: 'PAUSE' as const}];
  const run = () => { const core = createSessionCore(plan); return commands.map((command, index) => core.transition(command, index + 1).state); };
  assert.deepEqual(run(), run());
});
