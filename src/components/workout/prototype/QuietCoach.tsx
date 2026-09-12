import {Waves} from 'lucide-react';
import type {WorkoutPrototypeState} from './workoutState';

export function QuietCoach({state, message}: {state: WorkoutPrototypeState; message: string}) {
  return (
    <section className="workout-quiet-coach" data-layer="z6" data-workout-state={state} aria-label="Quiet Coach feedback">
      <div className="workout-quiet-coach-activity" aria-hidden="true">
        <Waves size={16} strokeWidth={1.7} />
      </div>
      <div className="workout-quiet-coach-copy">
        <div className="workout-quiet-coach-label-row">
          <span className="workout-quiet-coach-label">QUIET COACH</span>
          {state === 'START' ? <span className="workout-quiet-coach-start-cue">READY</span> : null}
          {state === 'WORK_POSITIVE' ? <span className="workout-quiet-coach-positive-cue">GOOD FORM</span> : null}
          {state === 'WORK_CORRECTION' ? <span className="workout-quiet-coach-correction-cue">ADJUST FORM</span> : null}
          {state === 'TRACKING_LOST' ? <span className="workout-quiet-coach-recovery-cue">TRACKING LOST</span> : null}
          {state === 'REST_QUIET' ? <span className="workout-quiet-coach-rest-cue">REST</span> : null}
          {state === 'REST_NEXT_PREVIEW' ? <span className="workout-quiet-coach-preview-cue">NEXT UP</span> : null}
          {state === 'TRANSITION_COUNTDOWN' ? <span className="workout-quiet-coach-countdown-cue">GET READY</span> : null}
        </div>
        <p>“{message}”</p>
      </div>
    </section>
  );
}
