'use client';

import React from 'react';
import {Button} from '@/components/ui/platform';
import type {SessionViewModel} from '@/lib/workout/sessionV2Contracts';

export interface SessionControlSurfaceProps {
  viewModel: SessionViewModel;
  onPause: () => void;
  onResume: () => void;
  pauseLabel: string;
  resumeLabel: string;
}

/** Shared PAUSE/RESUME surface; orchestration remains the only state owner. */
export function SessionControlSurface({
  viewModel,
  onPause,
  onResume,
  pauseLabel,
  resumeLabel,
}: SessionControlSurfaceProps) {
  if (
    viewModel.lifecycle === 'READY_TO_START' ||
    viewModel.lifecycle === 'EXIT_REQUESTED' ||
    viewModel.activeModule == null ||
    viewModel.activeModule === 'WORKOUT_RESULT'
  ) return null;
  const paused = viewModel.lifecycle === 'PAUSED';
  return (
    <div data-workout-v2-session-controls="" className="flex justify-center px-4 pb-2">
      <Button
        type="button"
        data-workout-v2-session-control={paused ? 'resume' : 'pause'}
        variant="text"
        tone="primary"
        size="sm"
        onClick={paused ? onResume : onPause}
      >
        {paused ? resumeLabel : pauseLabel}
      </Button>
    </div>
  );
}

export default SessionControlSurface;
