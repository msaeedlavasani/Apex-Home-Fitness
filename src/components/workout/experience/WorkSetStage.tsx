'use client';

import React from 'react';
import {Button} from '@/components/ui/platform';
import type {SessionViewModel} from '@/lib/workout/sessionV2Contracts';

export interface WorkSetStageProps {
  viewModel: SessionViewModel;
  setLabel?: string;
  repsLabel?: string;
  secondsLabel?: string;
  trackingLabel?: string;
  resultLabel?: string;
  restartCurrentSet?: () => void;
  restartSetLabel?: string;
}

/**
 * SET + SET_RESULT presentation. The component renders the resolved runtime
 * strategy and receives progression through normalized movement evidence; it
 * never starts REST or chooses a next destination.
 */
export function WorkSetStage({
  viewModel,
  setLabel = 'Set',
  repsLabel = 'reps',
  secondsLabel = 'seconds',
  trackingLabel = 'Tracking movement…',
  resultLabel = 'Set complete',
  restartCurrentSet = () => undefined,
  restartSetLabel = 'Restart current set',
}: WorkSetStageProps) {
  const exercise = viewModel.activeExercise;
  const progress = viewModel.setProgress;
  const result = viewModel.setResult;

  if (viewModel.activeModule === 'SET_RESULT' && result) {
    return (
      <div data-workout-v2-set-result-stage="" className="flex h-full w-full flex-col items-center justify-center px-4 text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[color:var(--apex-text-secondary)] rtl:normal-case rtl:tracking-normal">
          {exercise?.exercise.name ?? ''}
        </p>
        <p data-workout-v2-set-result="" role="status" className="mt-5 text-3xl font-extrabold text-[color:var(--apex-text)]">
          {resultLabel}
        </p>
        <p className="mt-3 text-lg text-[color:var(--apex-text-secondary)]">
          {result.executionMode === 'REP_BASED'
            ? `${result.completedReps} / ${result.targetReps ?? result.completedReps} ${repsLabel}`
            : `${result.targetSeconds ?? result.elapsedSeconds} ${secondsLabel}`}
        </p>
        <Button
          type="button"
          data-workout-v2-restart-set=""
          variant="outlined"
          tone="primary"
          size="sm"
          className="mt-6"
          onClick={restartCurrentSet}
        >
          {restartSetLabel}
        </Button>
      </div>
    );
  }

  const isTrackedRep = progress?.runtimeStrategy === 'TRACKED_REP';
  const progressLabel = isTrackedRep
    ? `${progress?.performedRepCount ?? 0} / ${progress?.targetReps ?? 0} ${repsLabel}`
    : `${progress?.remainingSeconds ?? 0} ${secondsLabel}`;

  return (
    <div data-workout-v2-workset-stage="" data-workout-v2-set-stage="" className="flex h-full w-full flex-col items-center justify-center px-4 text-center">
      <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[color:var(--apex-text-secondary)] rtl:normal-case rtl:tracking-normal">
        {exercise?.exercise.name ?? ''}
      </p>
      <p data-workout-v2-set-position="" className="mt-4 text-sm font-semibold text-apex-primary">
        {setLabel} {progress?.setNumber ?? viewModel.currentSetNumber ?? 1} / {progress?.setCount ?? exercise?.setCount ?? 1}
      </p>
      <p data-workout-v2-set-progress="" role="status" aria-live="polite" className="mt-5 text-5xl font-black tabular-nums text-[color:var(--apex-text)]">
        {progressLabel}
      </p>
      {isTrackedRep && (
        <p data-workout-v2-tracking-status="active" role="status" className="mt-8 text-sm text-[color:var(--apex-text-secondary)]">
          {trackingLabel}
        </p>
      )}
      <Button
        type="button"
        data-workout-v2-restart-set=""
        variant="text"
        tone="primary"
        size="sm"
        className="mt-3"
        onClick={restartCurrentSet}
      >
        {restartSetLabel}
      </Button>
    </div>
  );
}

export default WorkSetStage;
