import {X} from 'lucide-react';
import type {WorkoutPrototypeState} from './workoutState';
import {PROTOTYPE_SESSION_SUMMARY} from './workoutSession';

export function SessionBar({state}: {state: WorkoutPrototypeState}) {
  const sessionSummary = state === 'PREPARE' || state === 'START';

  return (
    <header className="workout-session-bar" data-layer="z5" data-workout-state={state}>
      <button className="workout-zone-icon-button" type="button" aria-label="Exit workout">
        <X size={20} strokeWidth={1.8} />
      </button>

      {sessionSummary ? <div className="workout-session-center" aria-label="Today's workout">
        {state === 'START' ? null : (
          <div className="workout-prepare-session-summary">
            <span className="workout-prepare-session-label">{PROTOTYPE_SESSION_SUMMARY.label}</span>
            <span className="workout-prepare-session-meta">{PROTOTYPE_SESSION_SUMMARY.meta}</span>
          </div>
        )}
      </div> : null}
    </header>
  );
}
