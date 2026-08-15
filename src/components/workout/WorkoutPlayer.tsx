'use client';

import { useTranslations } from 'next-intl';
import { Check, Pause, Play, RotateCcw, SkipForward, Timer, Trophy } from 'lucide-react';
import { useWorkoutEngine, type WorkoutExercise, type WorkoutPhase, type WorkoutSummary } from './useWorkoutEngine';

/**
 * WorkoutPlayer
 * -------------
 * A ready-made, localized player built on `useWorkoutEngine`.
 *
 * Renders the workout state machine (READY / EXERCISING / RESTING / COMPLETED)
 * with:
 *   - a phase badge and overall progress bar (sets completed),
 *   - the current exercise name, set counter and reps,
 *   - a big countdown/elapsed timer,
 *   - controls: Start, Pause/Resume, Complete set, Skip rest,
 *     Previous/Next exercise and Restart.
 *
 * All user-facing strings go through the `WorkoutPlayer` next-intl namespace
 * (`messages/en.json` / `messages/fa.json`), so the component is fully
 * localized and RTL-aware out of the box.
 */

function formatTime(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  const mm = Math.floor(s / 60);
  const ss = s % 60;
  return `${mm}:${ss.toString().padStart(2, '0')}`;
}

const PHASE_BADGE_STYLES: Record<WorkoutPhase, string> = {
  READY: 'bg-neutral-100 text-neutral-700',
  EXERCISING: 'bg-emerald-100 text-emerald-700',
  RESTING: 'bg-amber-100 text-amber-700',
  COMPLETED: 'bg-indigo-100 text-indigo-700',
};

const BUTTON_BASE =
  'inline-flex w-full touch-manipulation items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto sm:py-2.5';

const BUTTON_PRIMARY = 'bg-emerald-600 text-white hover:bg-emerald-700';
const BUTTON_SECONDARY = 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200';
const BUTTON_GHOST = 'text-neutral-500 hover:bg-neutral-100 hover:text-neutral-800';

export interface WorkoutPlayerProps {
  /** The workout plan to play. */
  exercises: WorkoutExercise[];
  /**
   * When true (default), a countdown that reaches zero advances the workout
   * automatically (set completed / rest finished).
   */
  autoAdvance?: boolean;
  /** Fired once with a summary when the whole workout is finished. */
  onWorkoutComplete?: (summary: WorkoutSummary) => void;
  /** Extra classes applied to the root element. */
  className?: string;
}

export function WorkoutPlayer({
  exercises,
  autoAdvance = true,
  onWorkoutComplete,
  className = '',
}: WorkoutPlayerProps) {
  const t = useTranslations('WorkoutPlayer');

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
  } = useWorkoutEngine(exercises, { autoAdvance, onWorkoutComplete });

  if (!currentExercise) {
    return (
      <div className={`w-full rounded-2xl bg-white p-4 text-center text-sm text-neutral-500 shadow-lg ring-1 ring-neutral-200 sm:p-6 ${className}`}>
        {t('empty')}
      </div>
    );
  }

  const isResting = phase === 'RESTING';
  const displaySeconds = secondsLeft ?? phaseElapsedSeconds;
  const progressPercent = Math.round(progress * 100);

  return (
    <div
      className={`w-full rounded-2xl bg-white p-4 pt-[max(1rem,env(safe-area-inset-top))] pb-[max(1rem,env(safe-area-inset-bottom))] shadow-lg ring-1 ring-neutral-200 sm:p-6 sm:pt-[max(1.5rem,env(safe-area-inset-top))] sm:pb-[max(1.5rem,env(safe-area-inset-bottom))] ${className}`}
    >
      {/* ---- Header: phase badge + position ---- */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span
          className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${PHASE_BADGE_STYLES[phase]}`}
        >
          {isResting && <Timer className="h-3.5 w-3.5" aria-hidden="true" />}
          {phase === 'COMPLETED' && <Trophy className="h-3.5 w-3.5" aria-hidden="true" />}
          {t(`phase.${phase.toLowerCase()}`)}
        </span>
        <span className="text-sm text-neutral-500">
          {t('exerciseOf', { current: currentExerciseIndex + 1, total: totalExercises })}
        </span>
      </div>

      {/* ---- Overall progress ---- */}
      <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-neutral-100" role="progressbar" aria-valuenow={progressPercent} aria-valuemin={0} aria-valuemax={100}>
        <div
          className="h-full rounded-full bg-emerald-500 transition-all duration-300"
          style={{ width: `${progressPercent}%` }}
        />
      </div>
      <p className="mt-2 text-xs text-neutral-500">
        {t('progress', { completed: completedSets, total: totalSets })}
      </p>

      {phase === 'COMPLETED' ? (
        /* ---- Completion summary ---- */
        <div className="mt-8 text-center">
          <Trophy className="mx-auto h-12 w-12 text-indigo-500" aria-hidden="true" />
          <h2 className="mt-4 text-2xl font-bold text-neutral-900">{t('complete.title')}</h2>
          <p className="mt-2 text-sm text-neutral-500">
            {t('complete.subtitle', { total: totalSets })}
          </p>
          <p className="mt-1 text-sm text-neutral-500">
            {t('complete.time', { time: formatTime(totalElapsedSeconds) })}
          </p>
          <button type="button" onClick={restart} className={`${BUTTON_BASE} ${BUTTON_PRIMARY} mt-6`}>
            <RotateCcw className="h-4 w-4" aria-hidden="true" />
            {t('actions.restart')}
          </button>
        </div>
      ) : (
        <>
          {/* ---- Current exercise ---- */}
          <div className="mt-6 text-center">
            <h2 className="break-words text-xl font-bold text-neutral-900 sm:text-2xl">{currentExercise.name}</h2>
            <p className="mt-1 text-sm text-neutral-500">
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
                    className={`h-2.5 w-2.5 rounded-full ${
                      isDone
                        ? 'bg-emerald-500'
                        : isCurrent
                          ? 'bg-emerald-300 ring-2 ring-emerald-200'
                          : 'bg-neutral-200'
                    }`}
                  />
                );
              })}
            </div>
          </div>

          {/* ---- Timer ---- */}
          <div className="mt-8 flex flex-col items-center">
            <span className="text-xs font-medium uppercase tracking-widest text-neutral-400">
              {isResting ? t('restTime') : t('workTime')}
            </span>
            <span className="mt-1 font-mono text-5xl font-bold leading-none tabular-nums text-neutral-900 sm:text-6xl">
              {formatTime(displaySeconds)}
            </span>
          </div>

          {/* ---- Controls ---- */}
          <div className="mt-8 flex w-full flex-wrap items-center justify-center gap-2.5 sm:gap-2">
            {phase === 'READY' && (
              <button type="button" onClick={start} className={`${BUTTON_BASE} ${BUTTON_PRIMARY}`}>
                <Play className="h-4 w-4" aria-hidden="true" />
                {t('actions.start')}
              </button>
            )}

            {(phase === 'EXERCISING' || phase === 'RESTING') && (
              <>
                <button
                  type="button"
                  onClick={isRunning ? pause : resume}
                  className={`${BUTTON_BASE} ${BUTTON_SECONDARY}`}
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
                    className={`${BUTTON_BASE} ${BUTTON_PRIMARY}`}
                  >
                    <Check className="h-4 w-4" aria-hidden="true" />
                    {t('actions.completeSet')}
                  </button>
                )}

                {phase === 'RESTING' && (
                  <button
                    type="button"
                    onClick={skipRest}
                    className={`${BUTTON_BASE} ${BUTTON_PRIMARY}`}
                  >
                    <SkipForward className="h-4 w-4" aria-hidden="true" />
                    {t('actions.skipRest')}
                  </button>
                )}

                <button
                  type="button"
                  onClick={previousExercise}
                  disabled={currentExerciseIndex === 0}
                  className={`${BUTTON_BASE} ${BUTTON_GHOST}`}
                >
                  {t('actions.previous')}
                </button>
                <button
                  type="button"
                  onClick={nextExercise}
                  disabled={currentExerciseIndex >= totalExercises - 1}
                  className={`${BUTTON_BASE} ${BUTTON_GHOST}`}
                >
                  {t('actions.next')}
                </button>
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
}

export default WorkoutPlayer;
