'use client';

import React from 'react';
import {useMemo} from 'react';
import {cn} from '@/lib/cn';
import {useTranslations} from 'next-intl';
import {useTheme} from '@/components/providers/ThemeProvider';
import {useWorkoutSession} from '@/components/workout/useWorkoutSession';
import type {SessionExercise} from '@/lib/workout/sessionContracts';
import {BackstageBackdrop} from './BackstageBackdrop';
import {StartStage} from './StartStage';
import {PreparingStage} from './PreparingStage';

/**
 * ExperienceShell (WP-04) — the full-surface V2 shell for the authorized
 * first slice: Backstage environment → shell → START/PREPARING presentation.
 *
 * OWNERSHIP (plan §3/§11): this shell is a CONSUMER of the orchestration
 * view-model. It dispatches start/pause/resume through the adapter and
 * renders stage components per module — it NEVER sequences (no module
 * ordering, no timers of its own, no progression logic). PREPARING
 * presentation is fully text-rendered (non-animation-only), so the
 * orchestrator's authoritative countdown remains available without motion.
 *
 * Reduced motion: the stage swap uses the existing `animate-phase-enter`
 * convention (transform/opacity only, 240ms) and is disabled under
 * `prefers-reduced-motion` — the same CSS media query that already guards
 * the V1 player (globals.css §reduced-motion). No essential information
 * rides on the animation.
 *
 * Pausing during PREPARING freezes the authoritative countdown (FR-9
 * first-slice posture); presentation adds no competing timer.
 *
 * Theme/density: the purpose-built Backstage variant resolves from the
 * ThemeProvider post-mount (theme is a client-only fact in the consumer
 * app); density resolves inside the backdrop via matchMedia after mount —
 * SSR/first render stay deterministic (Design Brain §3.2).
 */

export interface ExperienceShellProps {
  /** The workout plan for this session (prescription-resolved inside the adapter). */
  exercises: readonly SessionExercise[];
  /** Fired when START commits (after the orchestration transition succeeds). */
  onSessionStarted?: () => void;
  /** Extra classes on the shell surface. */
  className?: string;
}

export function ExperienceShell({exercises, onSessionStarted, className}: ExperienceShellProps) {
  const t = useTranslations('WorkoutV2');
  const {resolvedTheme} = useTheme();
  const theme = resolvedTheme === 'dark' ? 'dark' : 'light';

  const {viewModel, startSession, pause, resume} = useWorkoutSession(exercises, {
    onEffect: useMemo(() => {
      const handler = (effect: {kind: string}) => {
        if (effect.kind === 'SESSION_STARTED') onSessionStarted?.();
      };
      return handler;
    }, [onSessionStarted]),
  });

  const activeModule = viewModel.activeModule;
  const motionClass = 'animate-phase-enter'; // CSS gates it under reduced motion.
  const stageKey = `${viewModel.lifecycle}-${activeModule ?? 'none'}`;

  return (
    <section
      aria-label={t('shellLabel')}
      className={cn(
        'relative isolate flex min-h-[60svh] w-full flex-col overflow-hidden rounded-3xl sm:min-h-[70svh]',
        className,
      )}
    >
      <BackstageBackdrop theme={theme} />
      <div
        key={stageKey}
        className={cn(
          'relative z-10 flex flex-1 flex-col items-center justify-center p-6 pt-[max(1.5rem,env(safe-area-inset-top))] pb-[max(1.5rem,env(safe-area-inset-bottom))]',
          motionClass,
        )}
      >
        {activeModule === 'START' && (
          <StartStage
            viewModel={viewModel}
            label={t('start.title')}
            hint={t('start.hint')}
            onStart={startSession}
          />
        )}
        {activeModule === 'PREPARING' && (
          <PreparingStage
            viewModel={viewModel}
            label={t('preparing.label')}
            announcement={t('preparing.announcement', {seconds: viewModel.preparingSecondsRemaining ?? 0})}
            pauseLabel={t('actions.pause')}
            resumeLabel={t('actions.resume')}
            workingTowardsLabel={t('preparing.workingTowards', {exercise: viewModel.activeExercise?.exercise.name ?? ''})}
            onPause={pause}
            onResume={resume}
          />
        )}
        {activeModule === null && (
          <div role="status" className="text-center">
            <p className="text-sm text-[color:var(--apex-text-secondary)]">{t('sessionLive')}</p>
          </div>
        )}
      </div>
    </section>
  );
}

export default ExperienceShell;
