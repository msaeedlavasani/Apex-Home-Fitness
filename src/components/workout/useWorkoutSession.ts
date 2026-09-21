'use client';

import {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {WallClockAccumulator} from '@/lib/workout/wallClock';
import {sharedPrescriptionFromPersistedPlan} from '@/lib/workout/prescriptionContract';
import {
  type SessionAction,
  type SessionOrchestrationEffect,
  type SessionViewModel,
} from '@/lib/workout/sessionV2Contracts';
import {
  createSessionOrchestrator,
  type SessionOrchestrator,
} from '@/lib/workout/orchestration';
import type {SessionExercise} from '@/lib/workout/sessionContracts';
import type {NormalizedMovementEvidence, RuntimeCapabilitySnapshot} from '@/lib/workout/executionStrategy';

function markWorkoutPerformance(name: string): void {
  if (typeof performance === 'undefined') return;
  if (performance.getEntriesByName(name).length === 0) performance.mark(name);
}

/**
 * React adapter around the pure V2 orchestration authority (`orchestration.ts`).
 *
 * This is the ONLY bridge between React and sequencing state: presentation
 * components receive the frozen view-model plus explicit action callbacks and
 * never touch orchestration internals — the same thin-adapter boundary as the
 * V1 `useWorkoutEngine` (ADR-0002 / S03C), applied to the V2 orchestrator.
 *
 * Time ownership: the adapter owns the clock. `WallClockAccumulator` yields
 * whole seconds (survives iOS background throttling; pause discards the
 * remainder) and the orchestrator stays clock-free/pure. The 1s interval is
 * cosmetic refresh; visibility handlers catch up exactly on return.
 *
 * Persistence: none. The V1 snapshot contract (`WorkoutStateRecord`) remains
 * unchanged. Run 1 keeps SET/SET_RESULT/REST in-memory and returns all
 * progress through the same orchestration view-model boundary.
 */

export interface UseWorkoutSessionOptions {
  /**
   * Consumed effects (optional). Transport (audio/haptics/analytics) stays in
   * the caller — the adapter itself performs none, mirroring the V1 effect
   * boundary.
   */
  onEffect?: (effect: SessionOrchestrationEffect) => void;
  /** Injectable clock (epoch ms) for deterministic tests. */
  now?: () => number;
  executionCapability?: RuntimeCapabilitySnapshot;
}

export interface UseWorkoutSessionResult {
  /** Frozen orchestration view-model (presentation's single source of state). */
  viewModel: SessionViewModel;
  /** START control — from READY_TO_START into PREPARING (single authority). */
  startSession: () => void;
  /** PAUSE control — freezes the current execution context. */
  pause: () => void;
  /** RESUME control — continues the same execution context. */
  resume: () => void;
  /**
   * INTRO primary progression control (delta §C): AWAITING_WORK_SET →
   * SET at the first-set entry boundary. No-op outside INTRO.
   */
  beginWorkSet: () => void;
  /** Records one honest REP_BASED observation for the active SET. */
  submitMovementEvidence: (evidence: NormalizedMovementEvidence) => void;
  markTrackingLost: () => void;
  markTrackingReacquired: () => void;
  markTrackingUnrecoverable: (fallbackRemainingSeconds: number) => void;
  /** Ends only the active REST early; orchestration chooses the destination. */
  skipRest: () => void;
  /** Requests the later WP-12 exit boundary; does not navigate by itself. */
  exitWorkout: () => void;
  /** Confirms the orchestration-owned exit request. */
  confirmExit: () => void;
  /** Cancels the exit request and restores the prior session context. */
  cancelExit: () => void;
  /** Restarts only the currently active Set through orchestration. */
  restartCurrentSet: () => void;
  /** Defers the current exercise or skips it for this session. */
  deferExercise: (disposition: 'MOVE_TO_END' | 'SKIP_FOR_SESSION') => void;
  /** Resolves a surfaced deferred exercise without mutating its prescription. */
  resolveDeferredExercise: (disposition: 'PERFORM_NOW' | 'SKIP_FOR_SESSION') => void;
  /** Skips the current exercise for this session through orchestration. */
  skipExercise: () => void;
}

export function useWorkoutSession(
  exercises: readonly SessionExercise[],
  options: UseWorkoutSessionOptions = {},
): UseWorkoutSessionResult {
  const {onEffect, now = () => Date.now(), executionCapability} = options;

  // Resolve the prescription once per plan change (fail-closed resolver).
  const prescription = useMemo(() => sharedPrescriptionFromPersistedPlan(exercises), [exercises]);
  const capabilityKey = JSON.stringify(executionCapability ?? null);

  // The orchestrator is recreated when the resolved prescription changes
  // (e.g. the program finishes loading) — the same plan-identity semantics as
  // the V1 engine, so a late plan can never drive a stale orchestrator. The
  // exposed view-model resets with it (React's official derived-state
  // adjustment during render).
  const orchestratorRef = useRef<SessionOrchestrator | null>(null);
  const prescriptionRef = useRef(prescription);
  const capabilityKeyRef = useRef(capabilityKey);
  const [viewModel, setViewModel] = useState<SessionViewModel | null>(null);
  if (orchestratorRef.current == null || prescriptionRef.current !== prescription || capabilityKeyRef.current !== capabilityKey) {
    prescriptionRef.current = prescription;
    capabilityKeyRef.current = capabilityKey;
    orchestratorRef.current = createSessionOrchestrator(prescription, {capability: executionCapability});
    setViewModel(orchestratorRef.current.state);
  }
  const orchestrator = orchestratorRef.current;
  // The view-model to expose on THIS render (state adjustment above may have
  // scheduled a re-render; fall back to the live orchestrator state).
  const currentViewModel = viewModel ?? orchestrator.state;

  const nowRef = useRef(now);
  useEffect(() => {
    nowRef.current = now;
  }, [now]);

  const onEffectRef = useRef(onEffect);
  useEffect(() => {
    onEffectRef.current = onEffect;
  }, [onEffect]);

  const emit = useCallback((effects: readonly SessionOrchestrationEffect[]) => {
    if (!onEffectRef.current) return;
    for (const effect of effects) onEffectRef.current(effect);
  }, []);

  // Single-clock boundary: whole-second accumulation; the 1s interval keeps
  // PREPARING text ticking, lifecycle handlers make background time exact.
  const accumulatorRef = useRef<WallClockAccumulator | null>(null);
  if (accumulatorRef.current == null) accumulatorRef.current = new WallClockAccumulator({now: () => nowRef.current()});

  const accountElapsed = useCallback(() => {
    const delta = accumulatorRef.current?.account() ?? 0;
    if (delta > 0) {
      const wasPreparing =
        orchestrator.state.lifecycle === 'PREPARING' && orchestrator.state.activeModule === 'PREPARING';
      const {state, effects} = orchestrator.advance(delta);
      if (wasPreparing && state.activeModule === 'EXERCISE_INTRO') {
        // A is the actual orchestration handoff, not the last visible countdown
        // tick. This keeps the latency measurement tied to the product event.
        markWorkoutPerformance('A_PREPARING_COMPLETION');
      }
      setViewModel(state);
      emit(effects);
    }
  }, [orchestrator, emit]);

  const isTicking =
    currentViewModel.lifecycle === 'PREPARING' ||
    currentViewModel.lifecycle === 'RUNNING' ||
    currentViewModel.lifecycle === 'SET_RESULT' ||
    currentViewModel.lifecycle === 'RESTING';

  useEffect(() => {
    if (!isTicking) return;
    const id = globalThis.setInterval(accountElapsed, 1000);
    return () => globalThis.clearInterval(id);
  }, [isTicking, accountElapsed]);

  useEffect(() => {
    if (typeof document === 'undefined' || typeof window === 'undefined') return;
    const sync = () => accountElapsed();
    document.addEventListener('visibilitychange', sync);
    window.addEventListener('pagehide', sync);
    window.addEventListener('pageshow', sync);
    window.addEventListener('focus', sync);
    return () => {
      document.removeEventListener('visibilitychange', sync);
      window.removeEventListener('pagehide', sync);
      window.removeEventListener('pageshow', sync);
      window.removeEventListener('focus', sync);
    };
  }, [accountElapsed]);

  useEffect(() => {
    const accumulator = accumulatorRef.current;
    if (!accumulator) return;
    if (isTicking) accumulator.start();
    else accumulator.pause();
  }, [isTicking]);

  const startSession = useCallback(() => {
    const {state, effects} = orchestrator.dispatch({type: 'START_SESSION'}, nowRef.current());
    setViewModel(state);
    emit(effects);
  }, [orchestrator, emit]);

  const pause = useCallback(() => {
    const {state, effects} = orchestrator.dispatch({type: 'PAUSE'});
    setViewModel(state);
    emit(effects);
  }, [orchestrator, emit]);

  const resume = useCallback(() => {
    const {state, effects} = orchestrator.dispatch({type: 'RESUME'});
    setViewModel(state);
    emit(effects);
  }, [orchestrator, emit]);

  const beginWorkSet = useCallback(() => {
    const {state, effects} = orchestrator.dispatch({type: 'BEGIN_WORK_SET'});
    setViewModel(state);
    emit(effects);
  }, [orchestrator, emit]);

  const submitMovementEvidence = useCallback((evidence: NormalizedMovementEvidence) => {
    const {state, effects} = orchestrator.dispatch({type: 'MOVEMENT_EVIDENCE', evidence});
    setViewModel(state);
    emit(effects);
  }, [orchestrator, emit]);

  const markTrackingLost = useCallback(() => {
    const {state, effects} = orchestrator.dispatch({type: 'TRACKING_LOST'});
    setViewModel(state);
    emit(effects);
  }, [orchestrator, emit]);

  const markTrackingReacquired = useCallback(() => {
    const {state, effects} = orchestrator.dispatch({type: 'TRACKING_REACQUIRED'});
    setViewModel(state);
    emit(effects);
  }, [orchestrator, emit]);

  const markTrackingUnrecoverable = useCallback((fallbackRemainingSeconds: number) => {
    const {state, effects} = orchestrator.dispatch({type: 'TRACKING_UNRECOVERABLE', fallbackRemainingSeconds});
    setViewModel(state);
    emit(effects);
  }, [orchestrator, emit]);

  const skipRest = useCallback(() => {
    const {state, effects} = orchestrator.dispatch({type: 'SKIP_REST'});
    setViewModel(state);
    emit(effects);
  }, [orchestrator, emit]);

  const exitWorkout = useCallback(() => {
    const {state, effects} = orchestrator.dispatch({type: 'EXIT_WORKOUT'});
    setViewModel(state);
    emit(effects);
  }, [orchestrator, emit]);

  const confirmExit = useCallback(() => {
    const {state, effects} = orchestrator.dispatch({type: 'CONFIRM_EXIT'});
    setViewModel(state);
    emit(effects);
  }, [orchestrator, emit]);

  const cancelExit = useCallback(() => {
    const {state, effects} = orchestrator.dispatch({type: 'CANCEL_EXIT'});
    setViewModel(state);
    emit(effects);
  }, [orchestrator, emit]);

  const restartCurrentSet = useCallback(() => {
    const {state, effects} = orchestrator.dispatch({type: 'RESTART_CURRENT_SET'});
    setViewModel(state);
    emit(effects);
  }, [orchestrator, emit]);

  const deferExercise = useCallback((disposition: 'MOVE_TO_END' | 'SKIP_FOR_SESSION') => {
    const {state, effects} = orchestrator.dispatch({type: 'DEFER_EXERCISE', disposition});
    setViewModel(state);
    emit(effects);
  }, [orchestrator, emit]);

  const resolveDeferredExercise = useCallback((disposition: 'PERFORM_NOW' | 'SKIP_FOR_SESSION') => {
    const {state, effects} = orchestrator.dispatch({type: 'RESOLVE_DEFERRED_EXERCISE', disposition});
    setViewModel(state);
    emit(effects);
  }, [orchestrator, emit]);

  const skipExercise = useCallback(() => {
    const {state, effects} = orchestrator.dispatch({type: 'SKIP_EXERCISE'});
    setViewModel(state);
    emit(effects);
  }, [orchestrator, emit]);

  return {
    viewModel: currentViewModel,
    startSession,
    pause,
    resume,
    beginWorkSet,
    submitMovementEvidence,
    markTrackingLost,
    markTrackingReacquired,
    markTrackingUnrecoverable,
    skipRest,
    exitWorkout,
    confirmExit,
    cancelExit,
    restartCurrentSet,
    deferExercise,
    resolveDeferredExercise,
    skipExercise,
  };
}

export default useWorkoutSession;
