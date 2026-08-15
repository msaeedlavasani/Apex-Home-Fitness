import assert from 'node:assert/strict';
import test, { mock } from 'node:test';
import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';
import {
  useWorkoutEngine,
  type UseWorkoutEngineResult,
  type WorkoutEngineOptions,
  type WorkoutEngineState,
  type WorkoutExercise,
} from '../src/components/workout/useWorkoutEngine';

// React 18 test-renderer `act` environment (no DOM available in Node).
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const PLAN: WorkoutExercise[] = [
  { id: 'ex-1', name: 'Squats', sets: 3, reps: 12, durationSeconds: 30, restSeconds: 45 },
  { id: 'ex-2', name: 'Plank', sets: 2, reps: null, durationSeconds: 60, restSeconds: 30 },
  { id: 'ex-3', name: 'Burpees', sets: 1, reps: 10, durationSeconds: 20, restSeconds: null },
];

// Two exercises so a completed set enters RESTING instead of finishing.
const REST_PLAN: WorkoutExercise[] = [
  { id: 'ex-1', name: 'A', sets: 1, reps: null, durationSeconds: 30, restSeconds: 5 },
  { id: 'ex-2', name: 'B', sets: 1, reps: null, durationSeconds: 30, restSeconds: null },
];

// Open-ended set (no duration): the countdown counts up, so elapsed time can
// be observed directly without auto-advance interfering.
const OPEN_PLAN: WorkoutExercise[] = [
  { id: 'ex-1', name: 'Open Set', sets: 1, reps: null, durationSeconds: null, restSeconds: null },
];

interface HarnessProps {
  exercises: WorkoutExercise[];
  options?: WorkoutEngineOptions;
  probe: (engine: UseWorkoutEngineResult) => void;
}

function Harness({ exercises, options, probe }: HarnessProps) {
  const engine = useWorkoutEngine(exercises, options ?? {});
  probe(engine);
  return null;
}

interface LifecycleStubs {
  docHandlers: Record<string, () => void>;
  winHandlers: Record<string, (e?: unknown) => void>;
}

/** Stub document/window so the engine's lifecycle listeners can be driven manually. */
function installLifecycleStubs(): LifecycleStubs {
  const stubs: LifecycleStubs = { docHandlers: {}, winHandlers: {} };
  (globalThis as Record<string, unknown>).document = {
    addEventListener: (type: string, cb: () => void) => {
      stubs.docHandlers[type] = cb;
    },
    removeEventListener: () => undefined,
  };
  (globalThis as Record<string, unknown>).window = {
    addEventListener: (type: string, cb: (e?: unknown) => void) => {
      stubs.winHandlers[type] = cb;
    },
    removeEventListener: () => undefined,
  };
  return stubs;
}

function removeLifecycleStubs(): void {
  delete (globalThis as Record<string, unknown>).document;
  delete (globalThis as Record<string, unknown>).window;
}

interface MountedHarness {
  /** Always points at the latest engine result (probe re-runs every render). */
  holder: { engine: UseWorkoutEngineResult | undefined };
  renderer: TestRenderer.ReactTestRenderer;
  snapshots: WorkoutEngineState[];
}

function mount(exercises: WorkoutExercise[], options: WorkoutEngineOptions = {}): MountedHarness {
  const holder: { engine: UseWorkoutEngineResult | undefined } = { engine: undefined };
  const snapshots: WorkoutEngineState[] = [];
  let renderer: TestRenderer.ReactTestRenderer | undefined;
  act(() => {
    renderer = TestRenderer.create(
      <Harness
        exercises={exercises}
        options={{ ...options, onStateChange: (s) => snapshots.push(s) }}
        probe={(e) => {
          holder.engine = e;
        }}
      />
    );
  });
  assert.ok(holder.engine, 'harness must capture the engine');
  assert.ok(renderer, 'renderer must be created');
  return { holder, renderer, snapshots };
}

// ---------------------------------------------------------------------------
// Wall-clock timer sync
// ---------------------------------------------------------------------------

test('timer advances with real elapsed time, not interval ticks', (t) => {
  mock.timers.enable({ apis: ['setInterval'] });
  let fakeNow = 1_000_000;
  const { holder, renderer, snapshots } = mount(PLAN, { now: () => fakeNow });
  t.after(() => {
    act(() => renderer.unmount());
    mock.timers.reset();
  });

  assert.equal(holder.engine!.phase, 'READY');
  act(() => holder.engine!.start());
  assert.equal(holder.engine!.phase, 'EXERCISING');
  assert.equal(holder.engine!.phaseElapsedSeconds, 0);
  assert.equal(holder.engine!.state.isRunning, true);

  // 3.5 real seconds across one (throttled) interval tick → 3 counted.
  fakeNow += 3_500;
  act(() => mock.timers.tick(1000));
  assert.equal(holder.engine!.phaseElapsedSeconds, 3);
  assert.equal(holder.engine!.totalElapsedSeconds, 3);

  // Regular tick → +1 (4.5 real seconds total → 4 counted).
  fakeNow += 1_000;
  act(() => mock.timers.tick(1000));
  assert.equal(holder.engine!.phaseElapsedSeconds, 4);

  // Ticks must NOT emit snapshots: start() emitted one, ticks add none.
  assert.equal(snapshots.length, 1);
  assert.equal(snapshots[0].phase, 'EXERCISING');
});

test('timer catches up exactly on return from background (visibilitychange/pagehide/pageshow)', (t) => {
  mock.timers.enable({ apis: ['setInterval'] });
  let fakeNow = 2_000_000;
  const stubs = installLifecycleStubs();
  const { holder, renderer } = mount(OPEN_PLAN, { now: () => fakeNow });
  t.after(() => {
    act(() => renderer.unmount());
    mock.timers.reset();
    removeLifecycleStubs();
  });

  act(() => holder.engine!.start());
  fakeNow += 2_000;
  act(() => mock.timers.tick(1000));
  assert.equal(holder.engine!.phaseElapsedSeconds, 2);

  // Tab goes to background (interval throttled/stopped), 90 real seconds pass.
  fakeNow += 90_000;
  act(() => stubs.docHandlers.visibilitychange());
  assert.equal(holder.engine!.phaseElapsedSeconds, 92);
  assert.equal(holder.engine!.totalElapsedSeconds, 92);

  // bfcache restore (pageshow) adds only the new delta — no double counting.
  fakeNow += 10_000;
  act(() => stubs.winHandlers.pageshow({}));
  assert.equal(holder.engine!.phaseElapsedSeconds, 102);

  // pagehide while running accounts the partial second; focus catches the rest.
  fakeNow += 500;
  act(() => stubs.winHandlers.pagehide());
  fakeNow += 30_000;
  act(() => stubs.winHandlers.focus());
  assert.equal(holder.engine!.phaseElapsedSeconds, 132);
});

test('auto-advance fires for phases whose countdown ended while backgrounded', (t) => {
  mock.timers.enable({ apis: ['setInterval'] });
  let fakeNow = 3_000_000;
  const stubs = installLifecycleStubs();
  const { holder, renderer } = mount(REST_PLAN, { now: () => fakeNow });
  t.after(() => {
    act(() => renderer.unmount());
    mock.timers.reset();
    removeLifecycleStubs();
  });

  act(() => holder.engine!.start());
  // 31s of a 30s set pass while hidden → set completes on return.
  fakeNow += 31_000;
  act(() => stubs.docHandlers.visibilitychange());
  assert.equal(holder.engine!.phase, 'RESTING');
  assert.equal(holder.engine!.currentExerciseIndex, 0);
  assert.equal(holder.engine!.completedSets, 1);
  assert.equal(holder.engine!.phaseElapsedSeconds, 0);

  // 6s of a 5s rest pass while hidden → rest ends, next exercise begins.
  fakeNow += 6_000;
  act(() => stubs.winHandlers.pageshow({}));
  assert.equal(holder.engine!.phase, 'EXERCISING');
  assert.equal(holder.engine!.currentExerciseIndex, 1);
  assert.equal(holder.engine!.phaseElapsedSeconds, 0);
});

// ---------------------------------------------------------------------------
// Pause / resume
// ---------------------------------------------------------------------------

test('paused time never counts and snapshots track isRunning', (t) => {
  mock.timers.enable({ apis: ['setInterval'] });
  let fakeNow = 4_000_000;
  const { holder, renderer, snapshots } = mount(PLAN, { now: () => fakeNow });
  t.after(() => {
    act(() => renderer.unmount());
    mock.timers.reset();
  });

  act(() => holder.engine!.start());
  fakeNow += 2_000;
  act(() => mock.timers.tick(1000));
  assert.equal(holder.engine!.phaseElapsedSeconds, 2);

  act(() => holder.engine!.pause());
  assert.equal(holder.engine!.isRunning, false);
  assert.equal(snapshots.at(-1)?.isRunning, false);

  // 50s paused — interval is gone, no time can accrue.
  fakeNow += 50_000;
  act(() => mock.timers.tick(1000));
  assert.equal(holder.engine!.phaseElapsedSeconds, 2);

  act(() => holder.engine!.resume());
  assert.equal(holder.engine!.isRunning, true);
  fakeNow += 3_000;
  act(() => mock.timers.tick(1000));
  assert.equal(holder.engine!.phaseElapsedSeconds, 5); // 2 + 3, paused 50s ignored
});

// ---------------------------------------------------------------------------
// Skip rest / completion
// ---------------------------------------------------------------------------

test('skipRest and completing the final set reach COMPLETED with correct summary', (t) => {
  mock.timers.enable({ apis: ['setInterval'] });
  let fakeNow = 5_000_000;
  const summaries: Array<{ durationSeconds: number; completedSets: number }> = [];
  const { holder, renderer, snapshots } = mount(
    [{ id: 'ex-1', name: 'A', sets: 2, reps: null, durationSeconds: 30, restSeconds: 5 }],
    { now: () => fakeNow, onWorkoutComplete: (s) => summaries.push(s) }
  );
  t.after(() => {
    act(() => renderer.unmount());
    mock.timers.reset();
  });

  act(() => holder.engine!.start());
  fakeNow += 2_000;
  act(() => mock.timers.tick(1000));
  act(() => holder.engine!.completeSet());
  assert.equal(holder.engine!.phase, 'RESTING');
  assert.equal(holder.engine!.currentSet, 2);
  assert.equal(snapshots.at(-1)?.phase, 'RESTING');

  act(() => holder.engine!.skipRest());
  assert.equal(holder.engine!.phase, 'EXERCISING');
  assert.equal(holder.engine!.currentSet, 2);

  fakeNow += 1_000;
  act(() => mock.timers.tick(1000));
  act(() => holder.engine!.completeSet());
  assert.equal(holder.engine!.phase, 'COMPLETED');
  assert.equal(holder.engine!.state.completedSets, holder.engine!.state.totalSets);
  assert.equal(holder.engine!.state.completedAt, 5_003_000);
  assert.equal(summaries.length, 1);
  assert.equal(summaries[0].completedSets, 2);
  assert.equal(summaries[0].durationSeconds, 3);
});

// ---------------------------------------------------------------------------
// Hydrate (restore from IndexedDB)
// ---------------------------------------------------------------------------

test('hydrate restores position paused, exactly where the snapshot left off', () => {
  const { holder } = mount(PLAN);
  assert.equal(holder.engine!.phase, 'READY');

  act(() =>
    holder.engine!.hydrate({
      phase: 'RESTING',
      currentExerciseIndex: 0,
      currentSet: 2,
      phaseElapsedSeconds: 7,
      totalElapsedSeconds: 120,
      startedAt: 1_000,
    })
  );

  assert.equal(holder.engine!.phase, 'RESTING');
  assert.equal(holder.engine!.currentExerciseIndex, 0);
  assert.equal(holder.engine!.currentSet, 2);
  assert.equal(holder.engine!.phaseElapsedSeconds, 7);
  assert.equal(holder.engine!.totalElapsedSeconds, 120);
  assert.equal(holder.engine!.isRunning, false); // always restored paused
  assert.equal(holder.engine!.state.startedAt, 1_000);
  assert.equal(holder.engine!.completedSets, 1); // 1 of 3 sets done
});

test('hydrate is a no-op once the workout has started', (t) => {
  mock.timers.enable({ apis: ['setInterval'] });
  let fakeNow = 6_000_000;
  const { holder, renderer } = mount(PLAN, { now: () => fakeNow });
  t.after(() => {
    act(() => renderer.unmount());
    mock.timers.reset();
  });

  act(() => holder.engine!.start());
  act(() =>
    holder.engine!.hydrate({ phase: 'EXERCISING', currentExerciseIndex: 2, currentSet: 1 })
  );
  // Position untouched by the late hydrate.
  assert.equal(holder.engine!.currentExerciseIndex, 0);
  assert.equal(holder.engine!.phase, 'EXERCISING');
});

test('hydrate clamps out-of-range position and keeps at least one tick of countdown', () => {
  const { holder } = mount(PLAN);

  act(() =>
    holder.engine!.hydrate({
      phase: 'EXERCISING',
      currentExerciseIndex: 99,
      currentSet: 99,
      phaseElapsedSeconds: 500, // exceeds the 20s duration of the last exercise
      totalElapsedSeconds: -5,
    })
  );

  assert.equal(holder.engine!.currentExerciseIndex, 2); // clamped to last exercise
  assert.equal(holder.engine!.currentSet, 1); // clamped to the exercise's set count
  assert.equal(holder.engine!.phaseElapsedSeconds, 19); // 20s duration → 19 max
  assert.equal(holder.engine!.totalElapsedSeconds, 0);
  assert.equal(holder.engine!.secondsLeft, 1); // at least one tick remains
});

test('hydrate of a COMPLETED snapshot restores the finished state', () => {
  const { holder } = mount(PLAN, { now: () => 9_000_000 });

  act(() =>
    holder.engine!.hydrate({
      phase: 'COMPLETED',
      currentExerciseIndex: 2,
      currentSet: 1,
      totalElapsedSeconds: 600,
      startedAt: 8_000_000,
      isComplete: true,
    })
  );

  assert.equal(holder.engine!.phase, 'COMPLETED');
  assert.equal(holder.engine!.completedSets, holder.engine!.totalSets);
  assert.equal(holder.engine!.isRunning, false);
  assert.equal(holder.engine!.state.completedAt, 9_000_000); // fallback to now
  assert.equal(holder.engine!.state.totalElapsedSeconds, 600);
});

test('hydrate of RESTING after the last set advances to the next exercise when rest ends', () => {
  const { holder } = mount(PLAN);

  // ex-1 has 3 sets; RESTING with currentSet=3 means the last set just finished.
  act(() =>
    holder.engine!.hydrate({
      phase: 'RESTING',
      currentExerciseIndex: 0,
      currentSet: 3,
      phaseElapsedSeconds: 4,
    })
  );
  assert.equal(holder.engine!.completedSets, 3); // whole exercise counted as done

  // Skipping the rest must move on to the next exercise, not start set 3 again.
  act(() => holder.engine!.skipRest());
  assert.equal(holder.engine!.phase, 'EXERCISING');
  assert.equal(holder.engine!.currentExerciseIndex, 1);
  assert.equal(holder.engine!.currentSet, 1);
});

// ---------------------------------------------------------------------------
// State emission
// ---------------------------------------------------------------------------

test('onStateChange fires once per transition with a coherent snapshot', (t) => {
  mock.timers.enable({ apis: ['setInterval'] });
  let fakeNow = 7_000_000;
  const { holder, renderer, snapshots } = mount(REST_PLAN, { now: () => fakeNow });
  t.after(() => {
    act(() => renderer.unmount());
    mock.timers.reset();
  });

  act(() => holder.engine!.start()); // snapshot 1
  act(() => holder.engine!.pause()); // snapshot 2
  act(() => holder.engine!.resume()); // snapshot 3
  fakeNow += 32_000;
  act(() => holder.engine!.completeSet()); // snapshot 4 → RESTING
  act(() => holder.engine!.skipRest()); // snapshot 5 → EXERCISING ex-2
  fakeNow += 31_000;
  act(() => holder.engine!.completeSet()); // snapshot 6 → COMPLETED

  assert.deepEqual(
    snapshots.map((s) => s.phase),
    ['EXERCISING', 'EXERCISING', 'EXERCISING', 'RESTING', 'EXERCISING', 'COMPLETED']
  );
  assert.equal(snapshots[1].isRunning, false);
  assert.equal(snapshots[2].isRunning, true);
  assert.equal(snapshots[4].currentExerciseIndex, 1);
  assert.equal(snapshots[5].phase, 'COMPLETED');
});

test('restart resets position, timers and completion markers', (t) => {
  mock.timers.enable({ apis: ['setInterval'] });
  let fakeNow = 8_000_000;
  const { holder, renderer } = mount(
    [{ id: 'ex-1', name: 'A', sets: 1, reps: null, durationSeconds: 10, restSeconds: null }],
    { now: () => fakeNow }
  );
  t.after(() => {
    act(() => renderer.unmount());
    mock.timers.reset();
  });

  act(() => holder.engine!.start());
  fakeNow += 5_000;
  act(() => mock.timers.tick(1000));
  act(() => holder.engine!.completeSet());
  assert.equal(holder.engine!.phase, 'COMPLETED');

  fakeNow += 2_000;
  act(() => holder.engine!.restart());
  assert.equal(holder.engine!.phase, 'EXERCISING');
  assert.equal(holder.engine!.totalElapsedSeconds, 0);
  assert.equal(holder.engine!.state.startedAt, 8_007_000);
  assert.equal(holder.engine!.state.completedAt, null);
});
