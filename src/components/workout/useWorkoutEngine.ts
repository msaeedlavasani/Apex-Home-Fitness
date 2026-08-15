'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { WallClockAccumulator } from '../../lib/workout/wallClock';

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
 *   The timer is **wall-clock based**: it tracks real elapsed time and is
 *   re-synced on `visibilitychange` / `pagehide` / `pageshow` / `focus`, so
 *   backgrounding the tab (or the device sleeping) never loses time — the
 *   countdown catches up exactly when the user returns.
 * - **Set counting**: `currentSet` tracks the set within the current exercise;
 *   `completedSets`/`progress` describe overall workout progress.
 * - **Navigation**: `nextExercise`, `previousExercise` and `jumpTo(index)` move
 *   between exercises while the workout is active.
 * - **Resumability**: the engine exposes a live `state` snapshot and an
 *   `onStateChange` callback fired on every meaningful transition (start,
 *   pause, resume, completeSet, skipRest, navigation, hydrate, reset,
 *   restart, completion — *not* on timer ticks). A persisted snapshot can be
 *   fed back via `hydrate()` (always restores paused, so the user resumes
 *   explicitly). See `src/lib/offline/workoutPersistence.ts` for the
 *   IndexedDB record mapping and `WorkoutPlayer` for a wired example.
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

/**
 * A fully resumable snapshot of the engine. This is the shape handed to
 * `onStateChange` (persist it) and accepted by `hydrate()` (restore it).
 */
export interface WorkoutEngineState {
  phase: WorkoutPhase;
  currentExerciseIndex: number;
  /** 1-based set number within the current exercise. */
  currentSet: number;
  completedSets: number;
  totalSets: number;
  /** Seconds spent in the current phase (counts up in both modes). */
  phaseElapsedSeconds: number;
  /** Total active workout time in seconds since start(). */
  totalElapsedSeconds: number;
  /** Whether the phase timer is currently counting. */
  isRunning: boolean;
  /** Epoch ms when the workout was started (null until start()). */
  startedAt: number | null;
  /** Epoch ms when the workout was completed (null until finished). */
  completedAt: number | null;
}

/**
 * Input accepted by `hydrate()`. Every field is optional; missing values fall
 * back to sensible defaults (index 0, set 1, zeroed timers, EXERCISING).
 */
export interface WorkoutEngineHydrateInput {
  phase?: WorkoutPhase;
  currentExerciseIndex?: number;
  currentSet?: number;
  phaseElapsedSeconds?: number;
  totalElapsedSeconds?: number;
  startedAt?: number | null;
  completedAt?: number | null;
  /** Convenience: when true and no `completedAt` is given, `completedAt` is set to now. */
  isComplete?: boolean;
}

export interface WorkoutEngineOptions {
  /**
   * When true (default), a countdown that reaches zero auto-advances:
   * the set is completed (EXERCISING) or the rest ends (RESTING).
   * When false the timer stays at 0 and the user advances manually.
   */
  autoAdvance?: boolean;
  /**
   * Injectable wall-clock time source (defaults to `Date.now`). Mainly a
   * test seam; consumers normally never set this.
   */
  now?: () => number;
  /** Fired on every phase change (not on mount, not on hydrate). */
  onPhaseChange?: (phase: WorkoutPhase) => void;
  /** Fired whenever a working set is completed. */
  onSetComplete?: (info: WorkoutSetInfo) => void;
  /** Fired after the last set of an exercise is completed. */
  onExerciseComplete?: (exerciseIndex: number) => void;
  /** Fired once, when the whole workout is finished. */
  onWorkoutComplete?: (summary: WorkoutSummary) => void;
  /**
   * Fired after every state-mutating transition (start, pause, resume,
   * completeSet, skipRest, navigation, hydrate, reset, restart, completion)
   * with a full resumable snapshot. NOT fired on timer ticks — safe to
   * persist on every call (e.g. to IndexedDB).
   */
  onStateChange?: (state: WorkoutEngineState) => void;
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

  // ---- Resumability ----
  /** Live snapshot of every resumable field (memoized, updates with state). */
  state: WorkoutEngineState;
  /**
   * Restore position/timer from a previously persisted snapshot. Only works
   * while the engine is READY (before the user starts); the restored session
   * is always paused — the user resumes explicitly, so a workout never runs
   * while the app is closed. The phase callback is suppressed.
   */
  hydrate: (input: WorkoutEngineHydrateInput) => void;

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

export function clampSets(sets: number | null | undefined): number {
  return Math.max(1, Math.floor(sets ?? 1));
}

function normalizeDuration(seconds: number | null | undefined): number | null {
  return seconds != null && seconds > 0 ? Math.floor(seconds) : null;
}

export function useWorkoutEngine(
  exercises: WorkoutExercise[],
  options: WorkoutEngineOptions = {}
): UseWorkoutEngineResult {
  const {
    autoAdvance = true,
    onPhaseChange,
    onSetComplete,
    onExerciseComplete,
    onWorkoutComplete,
    onStateChange,
  } = options;

  const [phase, setPhase] = useState<WorkoutPhase>('READY');
  const [currentExerciseIndex, setCurrentExerciseIndex] = useState(0);
  const [currentSet, setCurrentSet] = useState(1);
  const [phaseElapsed, setPhaseElapsed] = useState(0);
  const [totalElapsed, setTotalElapsed] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [completedAt, setCompletedAt] = useState<number | null>(null);

  // Keep callbacks fresh without forcing every transition to depend on them.
  const callbacksRef = useRef({ onPhaseChange, onSetComplete, onExerciseComplete, onWorkoutComplete, onStateChange });
  useEffect(() => {
    callbacksRef.current = { onPhaseChange, onSetComplete, onExerciseComplete, onWorkoutComplete, onStateChange };
  });

  // Single wall-clock source: injectable for tests, `Date.now` by default.
  const nowRef = useRef<() => number>(options.now ?? (() => Date.now()));
  useEffect(() => {
    if (options.now) nowRef.current = options.now;
  });

  // Wall-clock accumulator that drives both `phaseElapsed` and `totalElapsed`.
  const accumulatorRef = useRef<WallClockAccumulator | null>(null);
  if (accumulatorRef.current == null) {
    accumulatorRef.current = new WallClockAccumulator({ now: () => nowRef.current() });
  }

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

  // ---- Snapshot emission --------------------------------------------------

  const snapshotDirtyRef = useRef(false);
  const markSnapshotDirty = useCallback(() => {
    snapshotDirtyRef.current = true;
  }, []);

  const state: WorkoutEngineState = useMemo(
    () => ({
      phase,
      currentExerciseIndex,
      currentSet,
      completedSets,
      totalSets,
      phaseElapsedSeconds: phaseElapsed,
      totalElapsedSeconds: totalElapsed,
      isRunning,
      startedAt,
      completedAt,
    }),
    [
      phase,
      currentExerciseIndex,
      currentSet,
      completedSets,
      totalSets,
      phaseElapsed,
      totalElapsed,
      isRunning,
      startedAt,
      completedAt,
    ]
  );

  // Emit a snapshot only after a transition marked the state dirty (timer
  // ticks change `phaseElapsed` and therefore `state`, but must NOT emit).
  useEffect(() => {
    if (!snapshotDirtyRef.current) return;
    snapshotDirtyRef.current = false;
    callbacksRef.current.onStateChange?.(state);
  }, [state]);

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

  // ---- Wall-clock accounting ----------------------------------------------

  /** Add whatever whole seconds elapsed since the last accounting. */
  const accountElapsed = useCallback(() => {
    const delta = accumulatorRef.current?.account() ?? 0;
    if (delta <= 0) return;
    setPhaseElapsed((s) => s + delta);
    setTotalElapsed((s) => s + delta);
  }, []);

  // 1s heartbeat while running. Browsers throttle/pause this in background
  // tabs — that's fine: the lifecycle handlers below catch up on return.
  useEffect(() => {
    if (!isRunning || (phase !== 'EXERCISING' && phase !== 'RESTING')) return;
    const id = globalThis.setInterval(() => {
      accountElapsed();
    }, 1000);
    return () => globalThis.clearInterval(id);
  }, [isRunning, phase, accountElapsed]);

  // Re-sync with real time whenever the page's visibility or focus changes:
  // returning from a background tab, from the bfcache (pageshow), from the
  // lock screen (focus) or from a device sleep — the countdown catches up
  // exactly. `account()` is idempotent, so hidden/visible both call it safely.
  useEffect(() => {
    if (typeof document === 'undefined' || typeof window === 'undefined') return;
    const sync = () => accountElapsed();
    const onPageShow = () => accountElapsed();
    const onFocus = () => accountElapsed();
    document.addEventListener('visibilitychange', sync);
    window.addEventListener('pagehide', sync);
    window.addEventListener('pageshow', onPageShow);
    window.addEventListener('focus', onFocus);
    return () => {
      document.removeEventListener('visibilitychange', sync);
      window.removeEventListener('pagehide', sync);
      window.removeEventListener('pageshow', onPageShow);
      window.removeEventListener('focus', onFocus);
    };
  }, [accountElapsed]);

  // Start/pause the accumulator whenever running-ness or the phase anchor
  // changes: a new phase (or a new set/exercise) counts from now, and paused
  // time never counts.
  useEffect(() => {
    const acc = accumulatorRef.current;
    if (!acc) return;
    if (isRunning && (phase === 'EXERCISING' || phase === 'RESTING')) {
      acc.start();
    } else {
      acc.pause();
    }
  }, [phase, currentSet, currentExerciseIndex, isRunning]);

  // ---- Phase-change callback (skip the initial render and hydrates) ------

  const isFirstPhase = useRef(true);
  const skipNextPhaseCallbackRef = useRef(false);
  useEffect(() => {
    if (isFirstPhase.current) {
      isFirstPhase.current = false;
      return;
    }
    if (skipNextPhaseCallbackRef.current) {
      skipNextPhaseCallbackRef.current = false;
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
      markSnapshotDirty();
    },
    [exercises.length, markSnapshotDirty]
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
    markSnapshotDirty();
  }, [phase, currentExercise, currentExerciseIndex, goToExercise, markSnapshotDirty]);

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
        setCompletedAt(nowRef.current());
        setPhase('COMPLETED');
        setIsRunning(false);
        setPhaseElapsed(0);
        markSnapshotDirty();
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
      markSnapshotDirty();
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
    markSnapshotDirty();
  }, [
    phase,
    currentExercise,
    currentSet,
    currentExerciseIndex,
    exercises.length,
    totalSets,
    totalElapsed,
    goToExercise,
    markSnapshotDirty,
  ]);

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
    setStartedAt(nowRef.current());
    setCompletedAt(null);
    setPhase('EXERCISING');
    setPhaseElapsed(0);
    setIsRunning(true);
    markSnapshotDirty();
  }, [phase, exercises.length, markSnapshotDirty]);

  const pause = useCallback(() => {
    if (phase !== 'EXERCISING' && phase !== 'RESTING') return;
    setIsRunning(false);
    markSnapshotDirty();
  }, [phase, markSnapshotDirty]);

  const resume = useCallback(() => {
    if (phase !== 'EXERCISING' && phase !== 'RESTING') return;
    setIsRunning(true);
    markSnapshotDirty();
  }, [phase, markSnapshotDirty]);

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
    restTargetRef.current = 'set';
    setPhase('READY');
    setCurrentExerciseIndex(0);
    setCurrentSet(1);
    setPhaseElapsed(0);
    setTotalElapsed(0);
    setIsRunning(false);
    setStartedAt(null);
    setCompletedAt(null);
    markSnapshotDirty();
  }, [markSnapshotDirty]);

  const restart = useCallback(() => {
    if (exercises.length === 0) return;
    restTargetRef.current = 'set';
    setStartedAt(nowRef.current());
    setCompletedAt(null);
    setPhase('EXERCISING');
    setCurrentExerciseIndex(0);
    setCurrentSet(1);
    setPhaseElapsed(0);
    setTotalElapsed(0);
    setIsRunning(true);
    markSnapshotDirty();
  }, [exercises.length, markSnapshotDirty]);

  /**
   * Restore a previously persisted snapshot. Only meaningful while READY;
   * the timer is always restored paused so a workout never advances while
   * the app was closed. Position fields are clamped to the current plan, and
   * a restored countdown keeps at least one tick when a duration is set.
   */
  const hydrate = useCallback(
    (input: WorkoutEngineHydrateInput) => {
      if (phase !== 'READY') return;
      if (isRunning) return;
      if (exercises.length === 0) return;

      const index = Math.min(
        Math.max(Math.floor(input.currentExerciseIndex ?? 0), 0),
        exercises.length - 1
      );
      const sets = clampSets(exercises[index]?.sets);
      const set = Math.min(Math.max(Math.floor(input.currentSet ?? 1), 1), sets);

      const requestedPhase: WorkoutPhase =
        input.phase === 'RESTING' || input.phase === 'COMPLETED' || input.phase === 'READY'
          ? input.phase
          : 'EXERCISING';

      // Restore a mid-countdown phase exactly, but never *past* its end:
      // keep at least one tick of countdown when a duration is configured so
      // resuming doesn't instantly skip the phase.
      const duration = normalizeDuration(
        requestedPhase === 'RESTING'
          ? exercises[index]?.restSeconds
          : exercises[index]?.durationSeconds
      );
      let restoredPhaseElapsed = Math.max(0, Math.floor(input.phaseElapsedSeconds ?? 0));
      if (duration != null && restoredPhaseElapsed >= duration) {
        restoredPhaseElapsed = Math.max(0, duration - 1);
      }

      // When restoring RESTING after the last set of an exercise, the engine
      // must know the rest leads to the next exercise, not another set.
      if (requestedPhase === 'RESTING') {
        restTargetRef.current = set >= sets ? 'exercise' : 'set';
      }

      if (requestedPhase !== phase) {
        skipNextPhaseCallbackRef.current = true;
      }
      setCurrentExerciseIndex(index);
      setCurrentSet(set);
      setPhaseElapsed(restoredPhaseElapsed);
      setTotalElapsed(Math.max(0, Math.floor(input.totalElapsedSeconds ?? 0)));
      setStartedAt(input.startedAt ?? null);
      setCompletedAt(
        input.completedAt ?? (requestedPhase === 'COMPLETED' ? nowRef.current() : null)
      );
      setPhase(requestedPhase);
      setIsRunning(false);
      markSnapshotDirty();
    },
    [phase, isRunning, exercises, markSnapshotDirty]
  );

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
    state,
    hydrate,
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
