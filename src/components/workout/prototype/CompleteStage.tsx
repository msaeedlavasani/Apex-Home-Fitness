import {Check} from 'lucide-react';

interface CompleteStageProps {
  onFinishWorkout: () => void;
  onRepeatWorkout: () => void;
}

export function CompleteStage({onFinishWorkout, onRepeatWorkout}: CompleteStageProps) {
  return (
    <section className="workout-complete-stage" data-layer="z5" data-workout-state="COMPLETE" aria-label="Workout complete">
      <div className="workout-complete-content">
        <div className="workout-complete-heading">
          <h1>WORKOUT COMPLETE</h1>
          <p className="workout-complete-lede">Great work.</p>
          <p className="workout-complete-supporting-copy">You showed up, stayed consistent, and completed every set.</p>
        </div>

        <section className="workout-complete-summary" aria-label="Workout summary">
          <div className="workout-complete-metric">
            <strong>3 / 3</strong>
            <span>SETS COMPLETED</span>
          </div>
          <div className="workout-complete-metric">
            <strong>100%</strong>
            <span>WORKOUT COMPLETED</span>
          </div>
          <div className="workout-complete-metric">
            <strong>01:30</strong>
            <span>ACTIVE TIME</span>
          </div>
          <div className="workout-complete-metric">
            <strong>01:00</strong>
            <span>REST TIME</span>
          </div>
        </section>

        <div className="workout-complete-movement" aria-label="Completed movement">
          <span className="workout-complete-movement-icon" aria-hidden="true"><Check size={17} strokeWidth={2} /></span>
          <div>
            <strong>Bodyweight Squat</strong>
            <span>COMPLETED</span>
          </div>
        </div>

        <div className="workout-complete-actions">
          <button className="workout-complete-finish" type="button" onClick={onFinishWorkout}>
            Finish Workout
          </button>
          <button className="workout-complete-repeat" type="button" onClick={onRepeatWorkout}>
            Repeat Workout
          </button>
        </div>
      </div>
    </section>
  );
}
