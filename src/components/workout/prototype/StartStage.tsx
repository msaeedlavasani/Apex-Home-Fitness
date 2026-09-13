import {SessionBar} from './SessionBar';
import {WorkoutControls} from './WorkoutControls';
import {PROTOTYPE_SESSION_SUMMARY} from './workoutSession';

export function StartStage({onPauseToggle}: {onPauseToggle: () => void}) {
  return (
    <section className="workout-start-stage" data-layer="z5" data-workout-state="START" aria-label="Start workout">
      <div className="workout-start-stage-top">
        <SessionBar state="START" />
      </div>

      <div className="workout-start-content">
        <div className="workout-start-hero">
          <h1><span>TODAY&apos;S</span><span>WORKOUT</span></h1>
          <p className="workout-start-summary">{PROTOTYPE_SESSION_SUMMARY.meta}</p>
          <p className="workout-start-level">FULL BODY · BEGINNER</p>
        </div>
        <section className="workout-start-details" aria-label="Workout information">
          <span className="workout-start-details-label">SESSION INFORMATION</span>
          <div className="workout-start-details-grid workout-start-details-grid-two">
            <div><span>GOAL</span><strong>Full Body</strong></div>
            <div><span>EQUIPMENT</span><strong>None</strong></div>
          </div>
        </section>
        <div className="workout-start-message">
          <h2>READY TO MOVE?</h2>
          <p>Your workout is ready when you are.</p>
        </div>
      </div>

      <div className="workout-start-stage-controls">
        <WorkoutControls state="START" onPauseToggle={onPauseToggle} />
      </div>
    </section>
  );
}
