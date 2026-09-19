'use client';

import React from 'react';
import {Button} from '@/components/ui/platform';
import type {SessionViewModel} from '@/lib/workout/sessionV2Contracts';

export interface WorkoutResultStageProps {
  viewModel: SessionViewModel;
  title: string;
  subtitle: string;
  completedSetsLabel: string;
  exercisesLabel: string;
  skippedLabel: string;
  exitLabel: string;
  onExit: () => void;
}

/** WORKOUT_RESULT presentation; semantic completion comes from orchestration. */
export function WorkoutResultStage({
  viewModel,
  title,
  subtitle,
  completedSetsLabel,
  exercisesLabel,
  skippedLabel,
  exitLabel,
  onExit,
}: WorkoutResultStageProps) {
  const result = viewModel.workoutResult;
  if (result == null) return null;
  return (
    <div data-workout-v2-result-stage="" className="flex h-full w-full flex-col items-center justify-center px-4 text-center">
      <p data-workout-v2-result-title="" role="status" className="text-3xl font-extrabold text-[color:var(--apex-text)]">
        {title}
      </p>
      <p className="mt-3 max-w-md text-sm text-[color:var(--apex-text-secondary)]">{subtitle}</p>
      <div data-workout-v2-result-summary="" className="mt-6 flex flex-wrap justify-center gap-3 text-sm font-semibold text-[color:var(--apex-text-secondary)]">
        <span data-workout-v2-result-sets="">{completedSetsLabel}: {result.completedSets} / {result.totalSets}</span>
        <span data-workout-v2-result-exercises="">{exercisesLabel}: {result.completedExercises} / {result.totalExercises}</span>
        {result.skippedExercises > 0 && <span data-workout-v2-result-skipped="">{skippedLabel}: {result.skippedExercises}</span>}
      </div>
      <Button
        type="button"
        data-workout-v2-result-exit=""
        variant="filled"
        tone="primary"
        size="lg"
        className="mt-8 min-w-48"
        onClick={onExit}
      >
        {exitLabel}
      </Button>
    </div>
  );
}

export default WorkoutResultStage;
