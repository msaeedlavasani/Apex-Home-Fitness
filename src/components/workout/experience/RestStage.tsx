'use client';

import React from 'react';
import {Button} from '@/components/ui/platform';
import type {SessionViewModel} from '@/lib/workout/sessionV2Contracts';

export interface RestStageProps {
  viewModel: SessionViewModel;
  onSkipRest?: () => void;
  restLabel?: string;
  betweenSetsLabel?: string;
  betweenExercisesLabel?: string;
  skipRestLabel?: string;
}

/** REST presentation: local countdown + SKIP REST intent only. */
export function RestStage({
  viewModel,
  onSkipRest = () => undefined,
  restLabel = 'Rest',
  betweenSetsLabel = 'Before the next set',
  betweenExercisesLabel = 'Before the next exercise',
  skipRestLabel = 'Skip rest',
}: RestStageProps) {
  const rest = viewModel.restState;
  const boundaryLabel = rest?.kind === 'BETWEEN_EXERCISES' ? betweenExercisesLabel : betweenSetsLabel;
  return (
    <div data-workout-v2-rest-stage="" className="flex h-full w-full flex-col items-center justify-center px-4 text-center">
      <p data-workout-v2-rest-label="" className="text-sm font-bold uppercase tracking-[0.3em] text-apex-primary rtl:normal-case rtl:tracking-normal">
        {restLabel}
      </p>
      <p data-workout-v2-rest-boundary="" className="mt-3 text-lg text-[color:var(--apex-text-secondary)]">
        {boundaryLabel}
      </p>
      <p data-workout-v2-rest-countdown="" role="status" aria-live="polite" className="mt-5 text-6xl font-black tabular-nums text-[color:var(--apex-text)]">
        {rest?.remainingSeconds ?? 0}
      </p>
      <Button
        type="button"
        data-workout-v2-skip-rest=""
        variant="outlined"
        tone="primary"
        size="lg"
        className="mt-8 min-w-48"
        onClick={onSkipRest}
      >
        {skipRestLabel}
      </Button>
    </div>
  );
}

export default RestStage;
