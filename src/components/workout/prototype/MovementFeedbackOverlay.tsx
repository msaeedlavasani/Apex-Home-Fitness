import type {WorkoutPrototypeState} from './workoutState';

export function MovementFeedbackOverlay({state}: {state: WorkoutPrototypeState}) {
  const trackingLost = state === 'TRACKING_LOST';

  return (
    <div
      className={`movement-feedback-overlay${trackingLost ? ' is-tracking-lost' : ''}`}
      data-layer="z4"
      data-workout-state={state}
      data-state={trackingLost ? 'RECOVERY_GUIDANCE' : 'INACTIVE'}
      aria-hidden={!trackingLost}
    >
      {trackingLost ? (
        <>
          <div className="tracking-recovery-frame" aria-hidden="true">
            <span className="tracking-recovery-corner tracking-recovery-corner-top-left" />
            <span className="tracking-recovery-corner tracking-recovery-corner-top-right" />
            <span className="tracking-recovery-corner tracking-recovery-corner-bottom-left" />
            <span className="tracking-recovery-corner tracking-recovery-corner-bottom-right" />
            <span className="tracking-recovery-label">STEP INTO VIEW</span>
          </div>
        </>
      ) : null}
    </div>
  );
}
