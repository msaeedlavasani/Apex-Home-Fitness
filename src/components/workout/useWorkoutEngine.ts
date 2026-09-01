'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { WallClockAccumulator } from '../../lib/workout/wallClock';
import { createSessionCore, type SessionExercise as CoreSessionExercise } from '../../lib/workout/sessionCore';
import { clampSets } from '../../lib/workout/plan';
import type {
  SessionCommand,
  SessionEffect,
  SessionExercise,
  SessionHydrateInput,
  SessionPhase,
  SessionState,
  SessionSummary,
} from '../../lib/workout/sessionContracts';

/**
 * S-04: the hook's public domain types ARE the canonical Session State
 * contract (`src/lib/workout/sessionContracts.ts`) — re-exported under the
 * legacy `Workout*` names so existing consumers keep compiling unchanged.
 * New consumers should import the canonical types from the contract module
 * directly; the hook stays a React adapter around the pure session core.
 */
export type {
  SessionExercise as WorkoutExercise,
  SessionHydrateInput as WorkoutEngineHydrateInput,
  SessionPhase as WorkoutPhase,
  SessionState as WorkoutEngineState,
  SessionSummary as WorkoutSummary,
} from '../../lib/workout/sessionContracts';

/** @deprecated import from `@/lib/workout/plan` — kept for compatibility. */
export {clampSets} from '../../lib/workout/plan';

export interface WorkoutSetInfo { exerciseIndex: number; set: number; }
export interface WorkoutEngineOptions {
  autoAdvance?: boolean;
  now?: () => number;
  onPhaseChange?: (phase: SessionPhase) => void;
  onSetComplete?: (info: WorkoutSetInfo) => void;
  onExerciseComplete?: (exerciseIndex: number) => void;
  onWorkoutComplete?: (summary: SessionSummary) => void;
  onStateChange?: (state: SessionState) => void;
}
export interface UseWorkoutEngineResult {
  phase: SessionPhase; exercises: SessionExercise[]; currentExerciseIndex: number;
  currentExercise: SessionExercise | undefined; totalExercises: number; currentSet: number;
  totalSets: number; completedSets: number; progress: number; isRunning: boolean;
  phaseDurationSeconds: number | null; phaseElapsedSeconds: number; secondsLeft: number | null;
  totalElapsedSeconds: number; state: SessionState;
  hydrate: (input: SessionHydrateInput) => void; start: () => void; pause: () => void;
  resume: () => void; completeSet: () => void; skipRest: () => void; nextExercise: () => void;
  previousExercise: () => void; jumpTo: (index: number) => void; reset: () => void; restart: () => void;
}

// Canonical-contract types throughout: the legacy `Workout*` names above are
// re-exported for external consumers, but this adapter's implementation uses
// the canonical `Session*` types directly (they are the same types).
function toCorePlan(exercises: SessionExercise[]): CoreSessionExercise[] { return exercises.map((exercise) => ({...exercise})); }
function toEngineState(state: SessionState): SessionState { return {...state}; }
function toCoreInput(input: SessionHydrateInput) { return {...input}; }

export function useWorkoutEngine(exercises: SessionExercise[], options: WorkoutEngineOptions = {}): UseWorkoutEngineResult {
  const {autoAdvance = true, onPhaseChange, onSetComplete, onExerciseComplete, onWorkoutComplete, onStateChange} = options;
  const callbacksRef = useRef({onPhaseChange, onSetComplete, onExerciseComplete, onWorkoutComplete, onStateChange});
  const transitionStateRef = useRef<SessionState | null>(null);
  useEffect(() => { callbacksRef.current = {onPhaseChange, onSetComplete, onExerciseComplete, onWorkoutComplete, onStateChange}; });
  const nowRef = useRef<() => number>(options.now ?? (() => Date.now()));
  useEffect(() => { if (options.now) nowRef.current = options.now; });

  const coreRef = useRef<ReturnType<typeof createSessionCore> | null>(null);
  const planRef = useRef<SessionExercise[] | null>(null);
  const coreStateRef = useRef<SessionState | null>(null);
  if (coreRef.current == null || planRef.current !== exercises) {
    coreRef.current = createSessionCore(toCorePlan(exercises));
    planRef.current = exercises;
    coreStateRef.current = toEngineState(coreRef.current.state);
  }
  const core = coreRef.current;
  const [state, setState] = useState<SessionState>(() => coreStateRef.current ?? toEngineState(core.state));
  const stateRef = useRef(state);
  stateRef.current = state;

  const accumulatorRef = useRef<WallClockAccumulator | null>(null);
  if (accumulatorRef.current == null) accumulatorRef.current = new WallClockAccumulator({now: () => nowRef.current()});

  const dispatchCore = useCallback((command: SessionCommand, now = nowRef.current()) => {
    const result = core.transition(command, now);
    const next = toEngineState(result.state);
    const previous = stateRef.current;
    stateRef.current = next;
    coreStateRef.current = next;
    transitionStateRef.current = next;
    setState(next);
    for (const effect of result.effects) {
      if (effect.kind === 'STATE_CHANGED' && command.kind === 'ACCOUNT' && effect.state.phase === previous.phase && effect.state.completedSets === previous.completedSets) continue;
      consumeEffect(effect);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [core]);

  function consumeEffect(effect: SessionEffect): void {
    switch (effect.kind) {
      case 'STATE_CHANGED': {
        if (effect.state.phaseElapsedSeconds === stateRef.current.phaseElapsedSeconds && effect.state.totalElapsedSeconds === stateRef.current.totalElapsedSeconds) {
          callbacksRef.current.onStateChange?.(toEngineState(effect.state));
        }
        break;
      }
      case 'PHASE_CHANGED': callbacksRef.current.onPhaseChange?.(effect.phase); break;
      case 'SET_COMPLETED': callbacksRef.current.onSetComplete?.({exerciseIndex: effect.exerciseIndex, set: effect.set}); break;
      case 'EXERCISE_COMPLETED': callbacksRef.current.onExerciseComplete?.(effect.exerciseIndex); break;
      case 'WORKOUT_COMPLETED': callbacksRef.current.onWorkoutComplete?.({...effect.summary}); break;
    }
  }

  const currentExercise = exercises[state.currentExerciseIndex];
  const derived = core.derive(state);
  const markTransition = useCallback((command: SessionCommand) => dispatchCore(command, nowRef.current()), [dispatchCore]);
  const accountElapsed = useCallback(() => {
    const delta = accumulatorRef.current?.account() ?? 0;
    if (delta > 0) markTransition({kind: 'ACCOUNT', elapsedSeconds: delta});
  }, [markTransition]);

  useEffect(() => {
    if (!state.isRunning || (state.phase !== 'EXERCISING' && state.phase !== 'RESTING')) return;
    const id = globalThis.setInterval(accountElapsed, 1000);
    return () => globalThis.clearInterval(id);
  }, [state.isRunning, state.phase, accountElapsed]);
  useEffect(() => {
    if (typeof document === 'undefined' || typeof window === 'undefined') return;
    const sync = () => accountElapsed();
    document.addEventListener('visibilitychange', sync);
    window.addEventListener('pagehide', sync);
    window.addEventListener('pageshow', sync);
    window.addEventListener('focus', sync);
    return () => { document.removeEventListener('visibilitychange', sync); window.removeEventListener('pagehide', sync); window.removeEventListener('pageshow', sync); window.removeEventListener('focus', sync); };
  }, [accountElapsed]);
  useEffect(() => {
    const accumulator = accumulatorRef.current;
    if (!accumulator) return;
    if (state.isRunning && (state.phase === 'EXERCISING' || state.phase === 'RESTING')) accumulator.start();
    else accumulator.pause();
  }, [state.phase, state.currentSet, state.currentExerciseIndex, state.isRunning]);

  const firstPhaseRef = useRef(true);
  const skipHydratePhaseRef = useRef(false);
  useEffect(() => {
    if (firstPhaseRef.current) { firstPhaseRef.current = false; return; }
    if (skipHydratePhaseRef.current) { skipHydratePhaseRef.current = false; return; }
    if (transitionStateRef.current?.phase === state.phase) {
      transitionStateRef.current = null;
      return;
    }
    callbacksRef.current.onPhaseChange?.(state.phase);
  }, [state.phase]);

  return {
    phase: state.phase, exercises, currentExerciseIndex: state.currentExerciseIndex, currentExercise,
    totalExercises: exercises.length, currentSet: state.currentSet, totalSets: derived.totalSets,
    completedSets: derived.completedSets, progress: derived.progress, isRunning: state.isRunning,
    phaseDurationSeconds: derived.phaseDurationSeconds, phaseElapsedSeconds: state.phaseElapsedSeconds,
    secondsLeft: derived.secondsLeft, totalElapsedSeconds: state.totalElapsedSeconds, state,
    hydrate: (input) => { skipHydratePhaseRef.current = true; markTransition({kind: 'HYDRATE', input: toCoreInput(input)}); },
    start: () => markTransition({kind: 'START'}), pause: () => markTransition({kind: 'PAUSE'}),
    resume: () => markTransition({kind: 'RESUME'}), completeSet: () => markTransition({kind: 'COMPLETE_SET'}),
    skipRest: () => markTransition({kind: 'SKIP_REST'}), nextExercise: () => markTransition({kind: 'NEXT_EXERCISE'}),
    previousExercise: () => markTransition({kind: 'PREVIOUS_EXERCISE'}), jumpTo: (index) => markTransition({kind: 'JUMP_TO', index}),
    reset: () => markTransition({kind: 'RESET'}), restart: () => markTransition({kind: 'RESTART'}),
  };
}

export default useWorkoutEngine;
