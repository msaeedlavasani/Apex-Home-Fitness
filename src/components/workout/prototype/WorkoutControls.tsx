import {MoreHorizontal, Pause, Play, Volume2} from 'lucide-react';
import type {WorkoutPrototypeState} from './workoutState';

interface WorkoutControlsProps {
  state: WorkoutPrototypeState;
  onPauseToggle: () => void;
}

export function WorkoutControls({state, onPauseToggle}: WorkoutControlsProps) {
  const paused = state === 'PAUSED';
  const start = state === 'START';
  const prepare = state === 'PREPARE';

  return (
    <nav className="workout-controls" data-layer="z7" data-workout-state={state} aria-label="Workout controls">
      <button className="workout-control-button" type="button" aria-label="Toggle workout sound">
        <Volume2 size={19} strokeWidth={1.7} />
        <span>Sound</span>
      </button>
      {prepare ? <span className="workout-control-placeholder" aria-hidden="true" /> : <button
        className={`workout-control-button workout-control-button-primary${start ? ' workout-control-button-start' : ''}`}
        type="button"
        data-start-workout-cta={start ? '' : undefined}
        aria-label={start ? 'Start workout' : paused ? 'Resume Mentor animation' : 'Pause Mentor animation'}
        onClick={start ? undefined : onPauseToggle}
      >
        {start ? <Play size={18} strokeWidth={1.9} /> : paused ? <Play size={21} strokeWidth={1.7} /> : <Pause size={21} strokeWidth={1.7} />}
        <span>{start ? 'Start Workout' : paused ? 'Resume' : 'Pause'}</span>
      </button>}
      <button className="workout-control-button" type="button" aria-label="Open more workout controls">
        <MoreHorizontal size={21} strokeWidth={1.7} />
        <span>More</span>
      </button>
    </nav>
  );
}
