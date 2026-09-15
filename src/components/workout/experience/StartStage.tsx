'use client';

import React from 'react';
import {cn} from '@/lib/cn';
import type {SessionViewModel} from '@/lib/workout/sessionV2Contracts';

/**
 * StartStage — the START module presentation (WP-05 first slice).
 *
 * One primary, reliably actionable control: a native `<button>` with
 * `type="button"` (inherent iOS touch reliability; no delegation layer, no
 * custom gesture handling — the legacy prototype's unreliable START is
 * explicitly NOT inherited, spec §14/§15). Disabled while the session cannot
 * start (no resolvable exercise). Keyboard activation works natively
 * (Space/Enter); focus-visible ring per the accessibility baseline.
 *
 * Presentation-only: renders view-model state; sequencing happens solely
 * through the orchestration `onStart` action dispatch.
 */

export interface StartStageProps {
  viewModel: SessionViewModel;
  /** Localized primary label ("Start workout"). */
  label: string;
  /** Localized hint line beneath the CTA. */
  hint: string;
  /** Dispatches the START_SESSION orchestration action (idempotent; guard lives in orchestration). */
  onStart: () => void;
}

export function StartStage({viewModel, label, hint, onStart}: StartStageProps) {
  const startable = viewModel.lifecycle === 'READY_TO_START' && viewModel.activeExercise != null;

  return (
    <div className="flex w-full max-w-sm flex-col items-center text-center">
      <h2 className="text-2xl font-bold text-[color:var(--apex-text)] sm:text-3xl">{label}</h2>
      <p className="mt-2 text-sm text-[color:var(--apex-text-secondary)]">{hint}</p>
      <button
        type="button"
        data-workout-v2-start
        onClick={onStart}
        disabled={!startable}
        aria-disabled={!startable}
        className={cn(
          'mt-8 inline-flex min-h-14 w-full touch-manipulation select-none items-center justify-center gap-2 rounded-2xl px-8 py-4 text-lg font-semibold',
          'transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--apex-focus-ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[color:var(--app-background)]',
          'bg-[color:var(--apex-primary)] text-[color:var(--apex-on-primary)]',
          'active:bg-[color:var(--apex-primary-active)] hover:bg-[color:var(--apex-primary-hover)]',
          'disabled:cursor-not-allowed disabled:opacity-50',
        )}
      >
        {label}
      </button>
    </div>
  );
}

export default StartStage;
