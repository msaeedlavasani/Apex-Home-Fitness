'use client';

import React from 'react';
import type {SessionViewModel} from '@/lib/workout/sessionV2Contracts';

export interface SessionOutcomeSummaryProps {
  viewModel: SessionViewModel;
  completedLabel: string;
  deferredLabel: string;
  skippedLabel: string;
}

/**
 * WP-08 outcome presentation. Counts are derived only from orchestration's
 * session-scoped outcome state; this surface never infers completion from
 * array position or mutates the resolved prescription.
 */
export function SessionOutcomeSummary({
  viewModel,
  completedLabel,
  deferredLabel,
  skippedLabel,
}: SessionOutcomeSummaryProps) {
  const completed = viewModel.exerciseOutcomes.filter((outcome) => outcome.status === 'COMPLETED').length;
  const deferred = viewModel.exerciseOutcomes.filter((outcome) => outcome.status === 'OUTSTANDING_DEFERRED').length;
  const skipped = viewModel.exerciseOutcomes.filter((outcome) => outcome.status === 'SKIPPED_FOR_SESSION').length;
  if (
    viewModel.lifecycle === 'READY_TO_START' ||
    viewModel.lifecycle === 'PREPARING' ||
    viewModel.lifecycle === 'AWAITING_WORK_SET' ||
    viewModel.lifecycle === 'WORKOUT_RESULT' ||
    viewModel.lifecycle === 'EXIT_REQUESTED' ||
    viewModel.exerciseOutcomes.length === 0
  ) return null;

  return (
    <div
      data-workout-v2-outcomes=""
      role="status"
      aria-live="polite"
      className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 px-4 pb-2 text-[11px] font-semibold text-[color:var(--apex-text-secondary)]"
    >
      <span data-workout-v2-outcome="completed">{completedLabel}: {completed}</span>
      {deferred > 0 && <span data-workout-v2-outcome="deferred">{deferredLabel}: {deferred}</span>}
      {skipped > 0 && <span data-workout-v2-outcome="skipped">{skippedLabel}: {skipped}</span>}
    </div>
  );
}

export default SessionOutcomeSummary;
