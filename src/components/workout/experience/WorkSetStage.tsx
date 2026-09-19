'use client';

import React from 'react';
import {Button} from '@/components/ui/platform';
import type {SessionViewModel} from '@/lib/workout/sessionV2Contracts';

export interface WorkSetStageProps {
  viewModel: SessionViewModel;
  recordRep?: () => void;
  setLabel?: string;
  recordRepLabel?: string;
  repsLabel?: string;
  secondsLabel?: string;
  resultLabel?: string;
  restartCurrentSet?: () => void;
  restartSetLabel?: string;
}

/**
 * SET + SET_RESULT presentation. The component renders the pure capability's
 * progress and dispatches only RECORD_REP; it never starts REST or chooses a
 * next destination.
 */
export function WorkSetStage({
  viewModel,
  recordRep = () => undefined,
  setLabel = 'Set',
  recordRepLabel = 'Record rep',
  repsLabel = 'reps',
  secondsLabel = 'seconds',
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

  const isRepBased = progress?.executionMode === 'REP_BASED';
  const progressLabel = isRepBased
    ? `${progress?.completedReps ?? 0} / ${progress?.targetReps ?? 0} ${repsLabel}`
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
      {isRepBased && (
        <Button
          type="button"
          data-workout-v2-record-rep=""
          variant="filled"
          tone="primary"
          size="lg"
          className="mt-8 min-w-48"
          onClick={recordRep}
          disabled={progress?.status === 'COMPLETE'}
        >
          {recordRepLabel}
        </Button>
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
