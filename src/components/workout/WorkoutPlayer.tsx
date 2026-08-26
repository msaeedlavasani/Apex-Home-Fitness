'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Check, Pause, Play, RotateCcw, SkipForward, Timer, Trophy } from 'lucide-react';
import {
  useWorkoutEngine,
  type WorkoutEngineState,
  type WorkoutExercise,
  type WorkoutPhase,
  type WorkoutSummary,
} from './useWorkoutEngine';
import { playCountdownSound, playEndSound, playStartSound, unlockAudio } from '@/services/audioService';
import { useHaptic } from '@/hooks/useHaptic';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { cn } from '@/lib/cn';
import { ANALYTICS_EVENTS, trackEvent } from '@/services/analyticsEvents';
import { getTodayWorkoutState, saveTodayWorkoutState } from '@/lib/offline/db';
import { buildWorkoutStateRecord, hydrateFromRecord } from '@/lib/offline/workoutPersistence';
import { CircularProgressRing, CountdownTimer, RepSetCounter, WORKOUT_TONES } from './index';

/**
 * WorkoutPlayer
 * -------------
 * A ready-made, localized player built on `useWorkoutEngine`.
 *
 * Renders the workout state machine (READY / EXERCISING / RESTING / COMPLETED)
 * with:
 *   - a phase badge and position indicator,
 *   - a large CircularProgressRing + CountdownTimer hero (color-coded:
 *     coral/`work` while exercising, amber/`rest` while recovering — see
 *     DESIGN_SYSTEM.md §5 state colors),
 *   - a big-thumb RepSetCounter to tally reps per set (resets every set),
 *   - controls: Start, Pause/Resume, Complete set, Skip rest,
 *     Previous/Next exercise and Restart.
 *
 * All user-facing strings go through the `WorkoutPlayer` next-intl namespace
 * (`messages/en.json` / `messages/fa.json`), so the component is fully
 * localized and RTL-aware out of the box. Colors/surfaces consume the Apex
 * design tokens and therefore support Light/Dark and all three platforms.
 *
 * **Resilience** (when a `userId` is provided):
 *   - every meaningful engine transition (start, pause, resume, set/rest
 *     advance, skip, completion) persists a resumable snapshot to IndexedDB
 *     (`workoutStates`, see `src/lib/offline/db.ts`), and
 *   - on mount, today's snapshot is restored via `hydrate()` when it still
 *     matches the loaded plan — a half-done workout, including its
 *     pause/resume position, survives a page reload. Restored sessions are
 *     always paused; the user resumes explicitly. The engine timer itself is
 *     wall-clock based and re-synced on background return, so countdowns
 *     never drift while the tab is hidden.
 */

function formatTime(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  const mm = Math.floor(s / 60);
  const ss = s % 60;
  return `${mm}:${ss.toString().padStart(2, '0')}`;
}

const BUTTON_BASE =
  'inline-flex w-full touch-manipulation items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--apex-focus-ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[color:var(--app-background)] disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto sm:py-2.5';

const BUTTON_PRIMARY =
  'bg-[color:var(--apex-primary)] text-[color:var(--apex-on-primary)] hover:bg-[color:var(--apex-primary-hover)] active:bg-[color:var(--apex-primary-active)]';

const BUTTON_SECONDARY =
  'bg-[color:var(--apex-fill)] text-[color:var(--apex-text)] hover:opacity-80';

const BUTTON_GHOST =
  'text-[color:var(--apex-text-secondary)] hover:bg-[color:var(--apex-fill)] hover:text-[color:var(--apex-text)]';

/** Phase → Apex workout-state tone (DESIGN_SYSTEM.md §5). */
const PHASE_TONE: Record<WorkoutPhase, keyof typeof WORKOUT_TONES> = {
  READY: 'neutral',
  EXERCISING: 'work',
  RESTING: 'rest',
  COMPLETED: 'success',
};

export interface WorkoutPlayerProps {
  /** The workout plan to play. */
  exercises: WorkoutExercise[];
  /**
   * When provided, the player persists and restores "today's workout"
   * snapshots to IndexedDB for this user (pause/resume/skip/complete and
   * half-finished sessions survive a reload, and the timer is wall-clock
   * synced on background return). Omit to keep the session ephemeral.
   */
  userId?: string;
  /**
   * When true (default), a countdown that reaches zero advances the workout
   * automatically (set completed / rest finished).
   */
  autoAdvance?: boolean;
  /** Enables synthesized sound cues (start/end chimes, countdown ticks). Default true. */
  soundEnabled?: boolean;
  /** Enables haptic feedback (Vibration API) for workout events. Default true. */
  hapticsEnabled?: boolean;
  /** Fired once when the user starts the workout. */
  onWorkoutStart?: () => void;
  /** Fired once with a summary when the whole workout is finished. */
  onWorkoutComplete?: (summary: WorkoutSummary) => void;
  /** Extra classes applied to the root element. */
  className?: string;
}

export function WorkoutPlayer({
  exercises,
  userId,
  autoAdvance = true,
  soundEnabled = true,
  hapticsEnabled = true,
  onWorkoutComplete,
  onWorkoutStart,
  className = '',
}: WorkoutPlayerProps) {
  const t = useTranslations('WorkoutPlayer');

  const { trigger: haptic } = useHaptic({ enabled: hapticsEnabled });

  // Reduced motion: phase transitions render instantly (no enter animation).
  const reducedMotion = useReducedMotion();

  // ---- Reps counted in the current set (resets on set/exercise change) ----

  const [repsDone, setRepsDone] = useState(0);

  // ---- Audio + haptics callbacks -----------------------------------------

  const handlePhaseChange = useCallback(
    (next: WorkoutPhase) => {
      if (next === 'EXERCISING') {
        // READY→EXERCISING (start), RESTING→EXERCISING (next set/rest end),
        // COMPLETED→EXERCISING (restart) — work begins.
        if (soundEnabled) playStartSound();
        if (hapticsEnabled) haptic('start');
      } else if (next === 'RESTING') {
        if (soundEnabled) playEndSound();
        if (hapticsEnabled) haptic('restStart');
      } else if (next === 'COMPLETED') {
        if (soundEnabled) playEndSound();
        if (hapticsEnabled) haptic('workoutComplete');
      }
    },
    [soundEnabled, hapticsEnabled, haptic]
  );

  const handleSetComplete = useCallback(() => {
    if (hapticsEnabled) haptic('setComplete');
  }, [hapticsEnabled, haptic]);

  // ---- IndexedDB persistence (only when a `userId` is provided) ---------

  const exercisesRef = useRef(exercises);
  useEffect(() => {
    exercisesRef.current = exercises;
  });

  const userIdRef = useRef(userId);
  useEffect(() => {
    userIdRef.current = userId;
  });

  /** Persist every engine transition as today's workout snapshot. */
  const handleStateChange = useCallback((engineState: WorkoutEngineState) => {
    const uid = userIdRef.current;
    if (!uid) return;
    const record = buildWorkoutStateRecord(exercisesRef.current, engineState);
    void saveTodayWorkoutState(uid, record).catch((err) => {
      console.error('[WorkoutPlayer] failed to persist workout state', err);
    });
  }, []);

  const {
    phase,
    currentExercise,
    currentExerciseIndex,
    totalExercises,
    currentSet,
    totalSets,
    completedSets,
    progress,
    isRunning,
    secondsLeft,
    phaseDurationSeconds,
    phaseElapsedSeconds,
    totalElapsedSeconds,
    start,
    pause,
    resume,
    completeSet,
    skipRest,
    nextExercise,
    previousExercise,
    restart,
    hydrate,
  } = useWorkoutEngine(exercises, {
    autoAdvance,
    onWorkoutComplete,
    onPhaseChange: handlePhaseChange,
    onSetComplete: handleSetComplete,
    onStateChange: handleStateChange,
  });

  // On mount, restore today's snapshot (if any) when it still matches the
  // loaded plan. `hydrate()` no-ops once the user has started, so a slow
  // IndexedDB read can never clobber an in-progress session.
  useEffect(() => {
    const uid = userId;
    if (!uid) return;
    let cancelled = false;
    (async () => {
      try {
        const record = await getTodayWorkoutState(uid);
        if (cancelled || !record) return;
        const input = hydrateFromRecord(record, exercisesRef.current);
        if (input) hydrate(input);
      } catch (err) {
        console.error('[WorkoutPlayer] failed to restore workout state', err);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [userId, hydrate]);

  // A new set (or a jump to another exercise) starts a fresh rep tally.
  useEffect(() => {
    setRepsDone(0);
  }, [currentExerciseIndex, currentSet]);

  // Unlock the shared AudioContext on the first user interaction so the
  // synthesized cues are allowed to play from the very first Start click.
  useEffect(() => {
    const unlock = () => unlockAudio();
    window.addEventListener('pointerdown', unlock, { once: true });
    window.addEventListener('keydown', unlock, { once: true });
    return () => {
      window.removeEventListener('pointerdown', unlock);
      window.removeEventListener('keydown', unlock);
    };
  }, []);

  // Countdown ticks: beep + buzz during the last three seconds of a phase.
  const lastCountdownTickRef = useRef<number | null>(null);
  useEffect(() => {
    if (!isRunning || secondsLeft == null || secondsLeft > 3 || secondsLeft < 1) {
      lastCountdownTickRef.current = null;
      return;
    }
    if (lastCountdownTickRef.current === secondsLeft) return;
    lastCountdownTickRef.current = secondsLeft;

    const isFinal = secondsLeft === 1;
    if (soundEnabled) playCountdownSound(isFinal);
    if (hapticsEnabled) haptic(isFinal ? 'countdownFinal' : 'countdown');
  }, [isRunning, secondsLeft, soundEnabled, hapticsEnabled, haptic]);

  if (!currentExercise) {
    return (
      <div className={cn('card-surface w-full p-4 text-center text-sm text-[color:var(--apex-text-secondary)] sm:p-6', className)}>
        {t('empty')}
      </div>
    );
  }

  const isResting = phase === 'RESTING';
  const displaySeconds = secondsLeft ?? phaseElapsedSeconds;

  // Ring: timed phases fill as the countdown elapses; open-ended phases
  // show overall workout progress.
  const ringProgress =
    phaseDurationSeconds != null && phaseDurationSeconds > 0
      ? Math.min(1, Math.max(0, 1 - (secondsLeft ?? 0) / phaseDurationSeconds))
      : progress;

  const ringTone = isResting ? 'rest' : 'work';
  const phaseTone = WORKOUT_TONES[PHASE_TONE[phase]];
  const phaseLabel = isResting ? t('restTime') : t('workTime');

  // Phase transitions (READY ⇄ EXERCISING ⇄ RESTING ⇄ COMPLETED) remount a
  // keyed container whose enter animation is transform/opacity only — pure
  // compositor work, so it holds 60fps even while the ring refills.
  // Reduced-motion users get an instant, animation-free swap.
  const phaseKey = `${phase}-${currentExerciseIndex}-${currentSet}`;
  const motionClass = reducedMotion ? undefined : 'animate-phase-enter';

  return (
    <div
      className={cn(
        'card-surface w-full p-4 pt-[max(1rem,env(safe-area-inset-top))] pb-[max(1rem,env(safe-area-inset-bottom))] text-[color:var(--apex-text)] sm:p-6 sm:pt-[max(1.5rem,env(safe-area-inset-top))] sm:pb-[max(1.5rem,env(safe-area-inset-bottom))]',
        className
      )}
    >
      {/* ---- Header: phase badge + position ---- */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span
          className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold"
          style={{ backgroundColor: phaseTone.soft, color: phaseTone.text }}
        >
          {isResting && <Timer className="h-3.5 w-3.5" aria-hidden="true" />}
          {phase === 'COMPLETED' && <Trophy className="h-3.5 w-3.5" aria-hidden="true" />}
          {t(`phase.${phase.toLowerCase()}`)}
        </span>
        <span className="text-sm text-[color:var(--apex-text-secondary)]">
          {t('exerciseOf', { current: currentExerciseIndex + 1, total: totalExercises })}
        </span>
      </div>

      {phase === 'COMPLETED' ? (
        /* ---- Completion summary ---- */
        <div key={phaseKey} className={cn('mt-8 text-center', motionClass)}>
          <Trophy className="mx-auto h-12 w-12 text-[color:var(--apex-state-success)]" aria-hidden="true" />
          <h2 className="mt-4 text-2xl font-bold">{t('complete.title')}</h2>
          <p className="mt-2 text-sm text-[color:var(--apex-text-secondary)]">
            {t('complete.subtitle', { total: totalSets })}
          </p>
          <p className="mt-1 text-sm text-[color:var(--apex-text-secondary)]">
            {t('complete.time', { time: formatTime(totalElapsedSeconds) })}
          </p>
          <button type="button" onClick={restart} className={cn(BUTTON_BASE, BUTTON_PRIMARY, 'mt-6')}>
            <RotateCcw className="h-4 w-4" aria-hidden="true" />
            {t('actions.restart')}
          </button>
        </div>
      ) : (
        <div key={phaseKey} className={motionClass}>
          {/* ---- Current exercise ---- */}
          <div className="mt-6 text-center">
            <h2 className="break-words text-xl font-bold sm:text-2xl">{currentExercise.name}</h2>
            <p className="mt-1 text-sm text-[color:var(--apex-text-secondary)]">
              {t('setOf', { current: currentSet, total: currentExercise.sets })}
              {currentExercise.reps ? ` · ${t('reps', { count: currentExercise.reps })}` : ''}
            </p>

            {/* Per-exercise set dots */}
            <div className="mt-3 flex items-center justify-center gap-1.5" aria-hidden="true">
              {Array.from({ length: currentExercise.sets }, (_, i) => {
                const isDone = i < currentSet - 1;
                const isCurrent = i === currentSet - 1;
                return (
                  <span
                    key={i}
                    className={cn(
                      'h-2.5 w-2.5 rounded-full',
                      isDone
                        ? 'bg-[color:var(--apex-state-success)]'
                        : isCurrent
                          ? 'bg-[color:var(--apex-state-start)] ring-2 ring-[color:var(--apex-primary-border)]'
                          : 'bg-[color:var(--apex-fill)]'
                    )}
                  />
                );
              })}
            </div>
          </div>

          {/* ---- Hero: progress ring + countdown ---- */}
          <div className="mt-8 flex flex-col items-center">
            <CircularProgressRing
              progress={ringProgress}
              tone={ringTone}
              pulse={isResting && isRunning}
              ariaLabel={phaseLabel}
            >
              <div className="flex flex-col items-center px-8 text-center">
                <span className="text-xs font-semibold uppercase tracking-widest text-[color:var(--apex-text-secondary)]">
                  {phaseLabel}
                </span>
                <CountdownTimer
                  seconds={displaySeconds}
                  mode={secondsLeft != null ? 'countdown' : 'countup'}
                  tone={ringTone}
                  size="xl"
                  className="mt-2"
                  ariaLabel={`${phaseLabel} ${formatTime(displaySeconds)}`}
                />
              </div>
            </CircularProgressRing>

            <p className="mt-4 text-sm text-[color:var(--apex-text-secondary)]">
              {t('progress', { completed: completedSets, total: totalSets })}
            </p>
          </div>

          {/* ---- Reps tallied in this set (large touch targets) ---- */}
          <div className="mt-8">
            <RepSetCounter
              label={t('repsDone')}
              value={repsDone}
              onChange={setRepsDone}
              min={0}
              max={currentExercise.reps ?? 999}
              size="lg"
              haptics={hapticsEnabled}
              decreaseAriaLabel={t('actions.decrease', { label: t('repsDone') })}
              increaseAriaLabel={t('actions.increase', { label: t('repsDone') })}
            />
          </div>

          {/* ---- Controls ---- */}
          <div className="mt-8 flex w-full flex-wrap items-center justify-center gap-2.5 sm:gap-2">
            {phase === 'READY' && (
              <button
                type="button"
                onClick={() => {
                  // Critical action: the workout is actually starting.
                  trackEvent(ANALYTICS_EVENTS.WORKOUT_STARTED, {
                    exercises: totalExercises,
                    sets: totalSets,
                  });
                  onWorkoutStart?.();
                  start();
                }}
                className={cn(BUTTON_BASE, BUTTON_PRIMARY)}
              >
                <Play className="h-4 w-4" aria-hidden="true" />
                {t('actions.start')}
              </button>
            )}

            {(phase === 'EXERCISING' || phase === 'RESTING') && (
              <>
                <button
                  type="button"
                  onClick={isRunning ? pause : resume}
                  className={cn(BUTTON_BASE, BUTTON_SECONDARY)}
                >
                  {isRunning ? (
                    <Pause className="h-4 w-4" aria-hidden="true" />
                  ) : (
                    <Play className="h-4 w-4" aria-hidden="true" />
                  )}
                  {t(isRunning ? 'actions.pause' : 'actions.resume')}
                </button>

                {phase === 'EXERCISING' && (
                  <button
                    type="button"
                    onClick={completeSet}
                    className={cn(BUTTON_BASE, BUTTON_PRIMARY)}
                  >
                    <Check className="h-4 w-4" aria-hidden="true" />
                    {t('actions.completeSet')}
                  </button>
                )}

                {phase === 'RESTING' && (
                  <button
                    type="button"
                    onClick={skipRest}
                    className={cn(BUTTON_BASE, BUTTON_PRIMARY)}
                  >
                    <SkipForward className="h-4 w-4" aria-hidden="true" />
                    {t('actions.skipRest')}
                  </button>
                )}

                <button
                  type="button"
                  onClick={previousExercise}
                  disabled={currentExerciseIndex === 0}
                  className={cn(BUTTON_BASE, BUTTON_GHOST)}
                >
                  {t('actions.previous')}
                </button>
                <button
                  type="button"
                  onClick={nextExercise}
                  disabled={currentExerciseIndex >= totalExercises - 1}
                  className={cn(BUTTON_BASE, BUTTON_GHOST)}
                >
                  {t('actions.next')}
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default WorkoutPlayer;
