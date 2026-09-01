/**
 * S03-A golden-trace harness (TEST-ONLY — never imported by runtime code).
 *
 * Drives the CURRENT `useWorkoutEngine` (the behavioral reference) with an
 * injectable fake clock + node:test mock timers + lifecycle stubs, and emits
 * deterministic observations: canonical `SessionState`, `SessionEffect`s, and
 * an exact ordered callback log (`log`) that freezes observable callback
 * order — the baseline S03-B..F must keep green.
 *
 * Time model: each step may advance the fake clock by `advanceMs` and force
 * one accounting pass ('tick' = 1s interval; 'lifecycle' = visibilitychange /
 * pageshow / focus, idempotent). Commands map 1:1 to the hook's public
 * methods; `ACCOUNT` is the time input (paired with `advanceMs`).
 *
 * No real waiting, no sleeps, no DOM required beyond stubs.
 */
import assert from 'node:assert/strict';
import {mock} from 'node:test';
import React from 'react';
import TestRenderer, {act} from 'react-test-renderer';

import {
  useWorkoutEngine,
  type UseWorkoutEngineResult,
  type WorkoutEngineOptions,
} from '../../src/components/workout/useWorkoutEngine';
import type {
  SessionCommand,
  SessionEffect,
  SessionExercise,
  SessionState,
  SessionSummary,
} from '../../src/lib/workout/sessionContracts';

export type GoldenTraceTrigger = 'tick' | 'lifecycle';

export interface GoldenTraceStep {
  /** Advance the fake clock by this many ms BEFORE the command, then force one accounting pass. */
  advanceMs?: number;
  /** How the accounting pass is triggered. Default 'tick'. */
  trigger?: GoldenTraceTrigger;
  /** The command to apply after any advance. */
  command: SessionCommand;
}

export interface TraceObservation {
  state: SessionState;
  /** The current workout STEP id (position/step identity — never the canonical exerciseId). */
  currentExerciseId: string | undefined;
  effects: SessionEffect[];
  /** Exact ordered callback log for this step ('' if none). */
  log: string[];
}

export interface GoldenTraceResult {
  observations: TraceObservation[];
  /** The full ordered callback log across all steps. */
  allLog: string[];
}

interface HarnessProps {
  exercises: SessionExercise[];
  options: WorkoutEngineOptions;
  probe: (engine: UseWorkoutEngineResult) => void;
}

function Harness({exercises, options, probe}: HarnessProps) {
  const engine = useWorkoutEngine(exercises, options);
  probe(engine);
  return null;
}

interface LifecycleStubs {
  docHandlers: Record<string, () => void>;
  winHandlers: Record<string, (e?: unknown) => void>;
}

/** Stub document/window so the engine's lifecycle listeners can be driven manually. */
function installLifecycleStubs(): LifecycleStubs {
  const stubs: LifecycleStubs = {docHandlers: {}, winHandlers: {}};
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

function toSessionSummary(summary: {
  totalExercises: number;
  totalSets: number;
  completedSets: number;
  durationSeconds: number;
}): SessionSummary {
  return {...summary};
}

function dispatchCommand(engine: UseWorkoutEngineResult, command: SessionCommand): void {
  switch (command.kind) {
    case 'START':
      engine.start();
      break;
    case 'PAUSE':
      engine.pause();
      break;
    case 'RESUME':
      engine.resume();
      break;
    case 'COMPLETE_SET':
      engine.completeSet();
      break;
    case 'SKIP_REST':
      engine.skipRest();
      break;
    case 'NEXT_EXERCISE':
      engine.nextExercise();
      break;
    case 'PREVIOUS_EXERCISE':
      engine.previousExercise();
      break;
    case 'JUMP_TO':
      engine.jumpTo(command.index);
      break;
    case 'RESET':
      engine.reset();
      break;
    case 'RESTART':
      engine.restart();
      break;
    case 'HYDRATE':
      engine.hydrate(command.input);
      break;
    case 'ACCOUNT':
      // Time input — handled via advanceMs + accounting pass (no direct method).
      break;
  }
}

/**
 * Runs a deterministic trace against the CURRENT hook. Enables mock timers,
 * installs lifecycle stubs, mounts, applies each step inside `act`, captures
 * per-step observations, then unmounts and restores globals.
 */
export function runGoldenTrace(
  plan: SessionExercise[],
  steps: GoldenTraceStep[],
): GoldenTraceResult {
  mock.timers.enable({apis: ['setInterval']});
  const stubs = installLifecycleStubs();
  let fakeNow = 1_000_000;
  const log: string[] = [];
  const effects: SessionEffect[] = [];
  const observations: TraceObservation[] = [];
  const holder: {engine: UseWorkoutEngineResult | undefined} = {engine: undefined};
  let renderer: TestRenderer.ReactTestRenderer | undefined;

  const options: WorkoutEngineOptions = {
    now: () => fakeNow,
    onPhaseChange: (phase) => {
      effects.push({kind: 'PHASE_CHANGED', phase});
      log.push(`phase:${phase}`);
    },
    onSetComplete: (info) => {
      effects.push({kind: 'SET_COMPLETED', exerciseIndex: info.exerciseIndex, set: info.set});
      log.push(`set:${info.exerciseIndex}:${info.set}`);
    },
    onExerciseComplete: (exerciseIndex) => {
      effects.push({kind: 'EXERCISE_COMPLETED', exerciseIndex});
      log.push(`exercise:${exerciseIndex}`);
    },
    onWorkoutComplete: (summary) => {
      effects.push({kind: 'WORKOUT_COMPLETED', summary: toSessionSummary(summary)});
      log.push(`workout:${summary.completedSets}/${summary.totalSets}:${summary.durationSeconds}`);
    },
    onStateChange: (state) => {
      effects.push({kind: 'STATE_CHANGED', state: state as SessionState});
      log.push('state');
    },
  };

  try {
    act(() => {
      renderer = TestRenderer.create(
        <Harness
          exercises={plan}
          options={options}
          probe={(engine) => {
            holder.engine = engine;
          }}
        />,
      );
    });
    assert.ok(holder.engine, 'harness must capture the engine');
    assert.ok(renderer, 'renderer must be created');

    for (const step of steps) {
      const logStart = log.length;
      const effectStart = effects.length;

      if (step.advanceMs != null && step.advanceMs > 0) {
        fakeNow += step.advanceMs;
        if (step.trigger === 'lifecycle') {
          act(() => {
            stubs.docHandlers.visibilitychange?.();
            stubs.winHandlers.pageshow?.({});
            stubs.winHandlers.focus?.();
          });
        } else {
          act(() => mock.timers.tick(1000));
        }
      }

      act(() => dispatchCommand(holder.engine!, step.command));
      // Flush any effects queued after the commit (snapshot/phase effects).
      act(() => {});

      observations.push({
        state: {...holder.engine!.state} as SessionState,
        currentExerciseId: holder.engine!.currentExercise?.id,
        effects: effects.slice(effectStart),
        log: log.slice(logStart),
      });
    }

    return {observations, allLog: log.slice()};
  } finally {
    act(() => renderer?.unmount());
    mock.timers.reset();
    removeLifecycleStubs();
  }
}

/** Convenience: run a trace and return just the final observation's state. */
export function lastState(plan: SessionExercise[], steps: GoldenTraceStep[]): SessionState {
  const result = runGoldenTrace(plan, steps);
  const last = result.observations[result.observations.length - 1];
  assert.ok(last, 'trace must have at least one observation');
  return last.state;
}
