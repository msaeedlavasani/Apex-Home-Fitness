'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

/**
 * useWorkoutEngine
 * ----------------
 * A headless state machine that drives a single workout session:
 *
 *   READY ──start()──▶ EXERCISING ──completeSet()──▶ RESTING ──rest over / skipRest()──▶ EXERCISING
 *     ▲                      │                                                              │
 *     └──── reset() ─────────┴────────────── last set of last exercise ────────────────────▶ COMPLETED
 *
 * - **Timer**: a per-phase countdown driven by `durationSeconds` (working
 *   sets) and `restSeconds` (rest). When a phase has no configured duration
 *   the timer counts up (open-ended set) until the user advances manually.
 * - **Set counting**: `currentSet` tracks the set within the current exercise;
 *   `completedSets`/`progress` describe overall workout progress.
 * - **Navigation**: `nextExercise`, `previousExercise` and `jumpTo(index)` move
 *   between exercises while the workout is active.
 *
 * The hook is intentionally i18n-agnostic — the consumer is responsible for
 * translating exercise names and any labels. See WorkoutPlayer.tsx for a
 * ready-made, localized player built on top of it.
 */

export type WorkoutPhase = 'READY' | 'EXERCISING' | 'RESTING' | 'COMPLETED';

/** A single exercise inside a workout plan. Mirrors the Prisma `Exercise` shape. */
export interface WorkoutExercise {
  id: string;
  /** Display name (already localized by the caller, or a translation key). */
  name: string;
  /** Number of working sets for this exercise. */
  sets: number;
  /** Target repetitions per set (informational). */
  reps?: number | null;
  /** Working time per set in seconds. Omit/null for open-ended sets (timer counts up). */
  durationSeconds?: number | null;
  /** Rest time after each set in seconds. Omit/null to skip rest. */
  restSeconds?: number | null;
}

/** Emitted after each completed working set. */
export interface WorkoutSetInfo {
  exerciseIndex: number;
  /** 1-based set number within the exercise. */
  set: number;
}

/** Summary handed to `onWorkoutComplete`. */
export interface WorkoutSummary {
  totalExercises: number;
  totalSets: number;
  completedSets: number;
  /** Total active workout time (working + resting) in seconds. */
  durationSeconds: number;
}

export interface WorkoutEngineOptions {
  /**
   * When true (default), a countdown that reaches zero auto-advances:
   * the set is completed (EXERCISING) or the rest ends (RESTING).
   * When false the timer stays at 0 and the user advances manually.
   */
  autoAdvance?: boolean;
  /** Fired on every phase change (not on mount). */
  onPhaseChange?: (phase: WorkoutPhase) => void;
  /** Fired whenever a working set is completed. */
  onSetComplete?: (info: WorkoutSetInfo) => void;
  /** Fired after the last set of an exercise is completed. */
  onExerciseComplete?: (exerciseIndex: number) => void;
  /** Fired once, when the whole workout is finished. */
  onWorkoutComplete?: (summary: WorkoutSummary) => void;
}

export interface UseWorkoutEngineResult {
  /** Current phase of the workout. */
  phase: WorkoutPhase;
  /** The list of exercises the engine was created with. */
  exercises: WorkoutExercise[];

  // ---- Position ----
  currentExerciseIndex: number;
  /** Current exercise, or undefined when the workout has no exercises. */
  currentExercise: WorkoutExercise | undefined;
  totalExercises: number;
  /** 1-based set number within the current exercise. */
  currentSet: number;
  /** Total working sets across the whole workout. */
  totalSets: number;
  /** Number of working sets completed so far. */
  completedSets: number;
  /** Overall completion ratio, 0..1. */
  progress: number;

  // ---- Timer ----
  isRunning: boolean;
  /** Duration of the current phase in seconds (null = open-ended). */
  phaseDurationSeconds: number | null;
  /** Seconds spent in the current phase (counts up in both modes). */
  phaseElapsedSeconds: number;
  /** Remaining seconds of the current phase (null = open-ended). */
  secondsLeft: number | null;
  /** Total active workout time in seconds since start(). */
  totalElapsedSeconds: number;

  // ---- Controls ----
  /** READY → EXERCISING and starts the timer. No-op otherwise. */
  start: () => void;
  /** Pause the current phase timer (EXERCISING/RESTING only). */
  pause: () => void;
  /** Resume the current phase timer (EXERCISING/RESTING only). */
  resume: () => void;
  /** Complete the current working set (EXERCISING only). */
  completeSet: () => void;
  /** End the rest early and move to the next set/exercise (RESTING only). */
  skipRest: () => void;
  /** Jump to the next exercise (active phases only). */
  nextExercise: () => void;
  /** Jump to the previous exercise (active phases only). */
  previousExercise: () => void;
  /** Jump to a specific exercise index (active phases only). */
  jumpTo: (index: number) => void;
  /** Back to READY with everything zeroed. */
  reset: () => void;
  /** reset() + start(): immediately begin the workout again. */
  restart: () => void;
}

function clampSets(sets: number | null | undefined): number {
  return Math.max(1, Math.floor(sets ?? 1));
}

function normalizeDuration(seconds: number | null | undefined): number | null {
  return seconds != null && seconds > 0 ? Math.floor(seconds) : null;
}

export function useWorkoutEngine(
  exercises: WorkoutExercise[],
  options: WorkoutEngineOptions = {}
): UseWorkoutEngineResult {
  const { autoAdvance = true, onPhaseChange, onSetComplete, onExerciseComplete, onWorkoutComplete } = options;

  const [phase, setPhase] = useState<WorkoutPhase>('READY');
  const [currentExerciseIndex, setCurrentExerciseIndex] = useState(0);
  const [currentSet, setCurrentSet] = useState(1);
  const [phaseElapsed, setPhaseElapsed] = useState(0);
  const [totalElapsed, setTotalElapsed] = useState(0);
  const [isRunning, setIsRunning] = useState(false);

  // Keep callbacks fresh without forcing every transition to depend on them.
  const callbacksRef = useRef({ onPhaseChange, onSetComplete, onExerciseComplete, onWorkoutComplete });
  useEffect(() => {
    callbacksRef.current = { onPhaseChange, onSetComplete, onExerciseComplete, onWorkoutComplete };
  });

  /**
   * What should happen when the current RESTING phase ends:
   * - 'set'      → resume with the next set of the same exercise
   *   (currentSet was already incremented when the previous set completed)
   * - 'exercise' → move on to the following exercise
   */
  const restTargetRef = useRef<'set' | 'exercise'>('set');

  const currentExercise = exercises[currentExerciseIndex];

  // ---- Derived progress -------------------------------------------------

  const totalSets = useMemo(
    () => exercises.reduce((sum, ex) => sum + clampSets(ex.sets), 0),
    [exercises]
  );

  const completedSets = useMemo(() => {
    if (phase === 'COMPLETED') return totalSets;
    let done = 0;
    for (let i = 0; i < Math.min(currentExerciseIndex, exercises.length); i++) {
      done += clampSets(exercises[i].sets);
    }
    // While resting after the LAST set of an exercise, every set of the
    // current exercise is already done, so count them all.
    if (phase === 'RESTING' && restTargetRef.current === 'exercise') {
      return done + clampSets(currentExercise?.sets);
    }
    return done + Math.max(0, currentSet - 1);
  }, [phase, totalSets, exercises, currentExerciseIndex, currentSet, currentExercise]);

  const progress = totalSets > 0 ? Math.min(1, completedSets / totalSets) : 0;

  // ---- Current phase duration -------------------------------------------

  const phaseDurationSeconds = useMemo<number | null>(() => {
    if (phase === 'RESTING') {
      return normalizeDuration(currentExercise?.restSeconds);
    }
    if (phase === 'EXERCISING' || phase === 'READY') {
      return normalizeDuration(currentExercise?.durationSeconds);
    }
    return null;
  }, [phase, currentExercise]);

  const secondsLeft =
    phaseDurationSeconds == null ? null : Math.max(0, phaseDurationSeconds - phaseElapsed);

  // ---- Timer tick -------------------------------------------------------

  useEffect(() => {
    if (!isRunning || (phase !== 'EXERCISING' && phase !== 'RESTING')) return;
    const id = globalThis.setInterval(() => {
      setPhaseElapsed((s) => s + 1);
      setTotalElapsed((s) => s + 1);
    }, 1000);
    return () => globalThis.clearInterval(id);
  }, [isRunning, phase]);

  // ---- Phase-change callback (skip the initial render) ------------------

  const isFirstPhase = useRef(true);
  useEffect(() => {
    if (isFirstPhase.current) {
      isFirstPhase.current = false;
      return;
    }
    callbacksRef.current.onPhaseChange?.(phase);
  }, [phase]);

  // ---- Transitions ------------------------------------------------------

  /** Move to an exercise, resetting the set counter and the phase timer. */
  const goToExercise = useCallback(
    (index: number) => {
      if (exercises.length === 0) return;
      const clamped = Math.min(Math.max(index, 0), exercises.length - 1);
      setCurrentExerciseIndex(clamped);
      setCurrentSet(1);
      setPhaseElapsed(0);
      setPhase('EXERCISING');
    },
    [exercises.length]
  );

  /** End the rest: next set of the same exercise, or the following exercise. */
  const advanceFromRest = useCallback(() => {
    if (phase !== 'RESTING' || !currentExercise) return;
    if (restTargetRef.current === 'set') {
      // Resume the next set of the same exercise (currentSet already advanced).
      setPhase('EXERCISING');
      setPhaseElapsed(0);
      setIsRunning(true);
    } else {
      goToExercise(currentExerciseIndex + 1);
    }
  }, [phase, currentExercise, currentExerciseIndex, goToExercise]);

  /** Complete the current working set and advance. */
  const completeSet = useCallback(() => {
    if (phase !== 'EXERCISING' || !currentExercise) return;

    const sets = clampSets(currentExercise.sets);
    const rest = normalizeDuration(currentExercise.restSeconds);
    const isLastSet = currentSet >= sets;
    const isLastExercise = currentExerciseIndex >= exercises.length - 1;

    callbacksRef.current.onSetComplete?.({ exerciseIndex: currentExerciseIndex, set: currentSet });

    if (isLastSet) {
      callbacksRef.current.onExerciseComplete?.(currentExerciseIndex);

      if (isLastExercise) {
        setPhase('COMPLETED');
        setIsRunning(false);
        setPhaseElapsed(0);
        callbacksRef.current.onWorkoutComplete?.({
          totalExercises: exercises.length,
          totalSets,
          completedSets: totalSets,
          durationSeconds: totalElapsed,
        });
        return;
      }

      if (rest != null) {
        restTargetRef.current = 'exercise';
        setPhase('RESTING');
        setPhaseElapsed(0);
        setIsRunning(true);
      } else {
        goToExercise(currentExerciseIndex + 1);
      }
      return;
    }

    // More sets remain in this exercise.
    setCurrentSet(currentSet + 1);
    if (rest != null) {
      restTargetRef.current = 'set';
      setPhase('RESTING');
      setPhaseElapsed(0);
      setIsRunning(true);
    } else {
      setPhase('EXERCISING');
      setPhaseElapsed(0);
      setIsRunning(true);
    }
  }, [phase, currentExercise, currentSet, currentExerciseIndex, exercises.length, totalSets, totalElapsed, goToExercise]);

  // ---- Auto-advance when a countdown hits zero --------------------------

  useEffect(() => {
    if (!autoAdvance) return;
    if (!isRunning) return;
    if (phase !== 'EXERCISING' && phase !== 'RESTING') return;
    if (phaseDurationSeconds == null) return;
    if (phaseElapsed < phaseDurationSeconds) return;

    if (phase === 'EXERCISING') {
      completeSet();
    } else {
      advanceFromRest();
    }
  }, [autoAdvance, isRunning, phase, phaseDurationSeconds, phaseElapsed, completeSet, advanceFromRest]);

  // ---- Public controls --------------------------------------------------

  const start = useCallback(() => {
    if (phase !== 'READY' || exercises.length === 0) return;
    setPhase('EXERCISING');
    setPhaseElapsed(0);
    setIsRunning(true);
  }, [phase, exercises.length]);

  const pause = useCallback(() => {
    if (phase !== 'EXERCISING' && phase !== 'RESTING') return;
    setIsRunning(false);
  }, [phase]);

  const resume = useCallback(() => {
    if (phase !== 'EXERCISING' && phase !== 'RESTING') return;
    setIsRunning(true);
  }, [phase]);

  const skipRest = useCallback(() => {
    advanceFromRest();
  }, [advanceFromRest]);

  const nextExercise = useCallback(() => {
    if (phase !== 'EXERCISING' && phase !== 'RESTING') return;
    goToExercise(currentExerciseIndex + 1);
  }, [phase, currentExerciseIndex, goToExercise]);

  const previousExercise = useCallback(() => {
    if (phase !== 'EXERCISING' && phase !== 'RESTING') return;
    goToExercise(currentExerciseIndex - 1);
  }, [phase, currentExerciseIndex, goToExercise]);

  const jumpTo = useCallback(
    (index: number) => {
      if (phase !== 'EXERCISING' && phase !== 'RESTING') return;
      goToExercise(index);
    },
    [phase, goToExercise]
  );

  const reset = useCallback(() => {
    setPhase('READY');
    setCurrentExerciseIndex(0);
    setCurrentSet(1);
    setPhaseElapsed(0);
    setTotalElapsed(0);
    setIsRunning(false);
  }, []);

  const restart = useCallback(() => {
    if (exercises.length === 0) return;
    setPhase('EXERCISING');
    setCurrentExerciseIndex(0);
    setCurrentSet(1);
    setPhaseElapsed(0);
    setTotalElapsed(0);
    setIsRunning(true);
  }, [exercises.length]);

  return {
    phase,
    exercises,
    currentExerciseIndex,
    currentExercise,
    totalExercises: exercises.length,
    currentSet,
    totalSets,
    completedSets,
    progress,
    isRunning,
    phaseDurationSeconds,
    phaseElapsedSeconds: phaseElapsed,
    secondsLeft,
    totalElapsedSeconds: totalElapsed,
    start,
    pause,
    resume,
    completeSet,
    skipRest,
    nextExercise,
    previousExercise,
    jumpTo,
    reset,
    restart,
  };
}

export default useWorkoutEngine;
