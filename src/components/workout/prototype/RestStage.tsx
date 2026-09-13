import {Lightbulb, RefreshCw, Wind} from 'lucide-react';
import type {CSSProperties} from 'react';
import {SessionBar} from './SessionBar';
import {WorkoutControls} from './WorkoutControls';
import type {WorkoutSetNumber} from './workoutState';

interface RestStageProps {
  state: 'REST_QUIET' | 'REST_NEXT_PREVIEW';
  currentSet: WorkoutSetNumber;
  restRemainingSeconds: number;
  onPauseToggle: () => void;
}

const REST_PHASE_SECONDS = 30;

function formatSetNumber(value: number) {
  return String(Math.max(1, Math.min(3, value))).padStart(2, '0');
}

export function RestStage({state, currentSet, restRemainingSeconds, onPauseToggle}: RestStageProps) {
  const nextSet = Math.min(3, currentSet + 1);
  const remaining = Math.max(0, Math.min(REST_PHASE_SECONDS, restRemainingSeconds));
  const progressDegrees = ((REST_PHASE_SECONDS - remaining) / REST_PHASE_SECONDS) * 360;

  return (
    <section className="workout-rest-stage" data-layer="z5" data-workout-state={state} aria-label="Rest and recover">
      <div className="workout-rest-stage-top">
        <SessionBar state={state} />
      </div>

      <div className="workout-rest-content">
        <div className="workout-rest-heading">
          <span className="workout-rest-kicker">REST</span>
          <h1>Rest</h1>
          <p>Take a breath. You’re doing great.</p>
        </div>

        <div className="workout-rest-focus">
          <div className="workout-rest-companion-slot" aria-hidden="true">
            <svg className="workout-rest-companion-silhouette" viewBox="0 0 72 84" focusable="false">
              <ellipse className="workout-rest-companion-ground" cx="37" cy="77" rx="25" ry="4" />
              <circle className="workout-rest-companion-head" cx="34" cy="16" r="8" />
              <path className="workout-rest-companion-body" d="M27 29c4-4 13-4 17 1l4 15c1 5-3 10-9 11l-8-1c-6-1-9-5-8-10l4-16Z" />
              <path className="workout-rest-companion-line" d="M29 43c-6 5-9 11-11 18M41 47c7 4 14 10 19 17M30 53c0 9 4 17 11 23M39 54c7 6 14 10 23 10" />
            </svg>
          </div>
          <div
            className="workout-rest-countdown-ring"
            style={{'--rest-progress': `${progressDegrees}deg`} as CSSProperties}
            aria-label={`${remaining} seconds remaining`}
          >
            <div className="workout-rest-countdown-center">
              <strong>{remaining}</strong>
              <span>SECONDS</span>
            </div>
          </div>
        </div>

        <div className="workout-rest-cues" aria-label="Recovery cues">
          <div className="workout-rest-cue">
            <span className="workout-rest-cue-icon" aria-hidden="true"><Wind size={16} strokeWidth={1.7} /></span>
            <strong>Breathe</strong>
            <span>Inhale</span>
          </div>
          <div className="workout-rest-cue">
            <span className="workout-rest-cue-icon" aria-hidden="true"><RefreshCw size={16} strokeWidth={1.7} /></span>
            <strong>Recover</strong>
            <span>You’ve got this</span>
          </div>
          <div className="workout-rest-cue">
            <span className="workout-rest-cue-icon" aria-hidden="true"><Wind size={16} strokeWidth={1.7} /></span>
            <strong>Prepare</strong>
            <span>Next set soon</span>
          </div>
        </div>

        <div className="workout-rest-next-card" aria-label={`Next set ${formatSetNumber(nextSet)} of 03`}>
          <div>
            <span className="workout-rest-card-label">NEXT · SET {formatSetNumber(nextSet)}/03</span>
            <strong>Bodyweight Squat</strong>
          </div>
        </div>

        <div className="workout-rest-tip-card" aria-label="Rest tip">
          <span className="workout-rest-tip-icon" aria-hidden="true"><Lightbulb size={17} strokeWidth={1.6} /></span>
          <div>
            <span className="workout-rest-card-label">TIP</span>
            <p>Keep your breathing steady and maintain good form in the next set.</p>
          </div>
        </div>
      </div>

      <div className="workout-rest-stage-controls">
        <WorkoutControls state={state} onPauseToggle={onPauseToggle} />
      </div>
    </section>
  );
}
