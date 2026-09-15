'use client';

import React from 'react';
import {cn} from '@/lib/cn';
import type {SessionViewModel} from '@/lib/workout/sessionV2Contracts';

/**
 * PreparingStage — the PREPARING module presentation (WP-05 first slice).
 *
 * Presents the orchestrator's authoritative PREPARING countdown as TEXT —
 * never animation-only (spec §5.8: timers have a non-animation-only
 * representation). Accessibility: exactly ONE live region — the sr-only
 * localized sentence ("Starting in {seconds} seconds") announced politely on
 * each whole-second change (keyed remount per second makes announcements
 * reliable); the big visible number stays plain text in the accessibility
 * tree for sighted + braille display use. No animation carries information;
 * the optional per-second swap is transform/opacity only and is disabled
 * under reduced motion (the shell's CSS-gated convention).
 *
 * Presentation-only: pause/resume dispatch orchestration actions; this
 * component owns no timer, no sequencing, no module logic.
 */

export interface PreparingStageProps {
  viewModel: SessionViewModel;
  /** Localized module label ("Getting ready"). */
  label: string;
  /** Localized live announcement, e.g. "Starting in {seconds} seconds". */
  announcement: string;
  /** Localized pause control label. */
  pauseLabel: string;
  /** Localized resume control label. */
  resumeLabel: string;
  /** Localized first-exercise line, e.g. "First: {exercise}". */
  workingTowardsLabel: string;
  onPause: () => void;
  onResume: () => void;
}

export function PreparingStage({
  viewModel,
  label,
  announcement,
  pauseLabel,
  resumeLabel,
  workingTowardsLabel,
  onPause,
  onResume,
}: PreparingStageProps) {
  const seconds = viewModel.preparingSecondsRemaining ?? 0;
  const paused = viewModel.lifecycle === 'PAUSED';

  return (
    <div className="flex w-full max-w-sm flex-col items-center text-center">
      <p className="text-xs font-semibold uppercase tracking-widest text-[color:var(--apex-text-secondary)]">{label}</p>
      <span
        data-workout-v2-countdown=""
        className="mt-4 block text-7xl font-black tabular-nums leading-none text-[color:var(--apex-text)] sm:text-8xl"
      >
        <span key={seconds} className={cn(!paused && 'animate-phase-enter')}>{seconds}</span>
      </span>
      {/* The single polite live region: localized sentence, remounted each second. */}
      <p role="status" aria-live="polite" aria-atomic="true" className="sr-only">
        <span key={seconds}>{announcement}</span>
      </p>
      <p className="mt-6 text-sm text-[color:var(--apex-text-secondary)]">{workingTowardsLabel}</p>
      <button
        type="button"
        data-workout-v2-pause
        onClick={paused ? onResume : onPause}
        className={cn(
          'mt-8 inline-flex min-h-14 w-full touch-manipulation items-center justify-center rounded-2xl px-8 py-4 text-sm font-semibold',
          'transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--apex-focus-ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[color:var(--app-background)]',
          'bg-[color:var(--apex-fill)] text-[color:var(--apex-text)] hover:opacity-80',
        )}
      >
        {paused ? resumeLabel : pauseLabel}
      </button>
    </div>
  );
}

export default PreparingStage;
