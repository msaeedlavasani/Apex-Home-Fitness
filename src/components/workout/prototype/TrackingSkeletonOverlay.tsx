import {CORRECTION_TARGET, SKELETON_CONNECTIONS, SKELETON_POINT_ORDER, type BoneProjection} from './tracking';
import type {WorkoutPrototypeState} from './workoutState';

interface TrackingSkeletonOverlayProps {
  points: BoneProjection;
  visible: boolean;
  state: WorkoutPrototypeState;
  width: number;
  height: number;
}

export function TrackingSkeletonOverlay({points, visible, state, width, height}: TrackingSkeletonOverlayProps) {
  const correctionVisible = visible && state === 'WORK_CORRECTION';

  return (
    <div
      className={`tracking-skeleton-overlay${visible ? ' is-visible' : ''}`}
      data-layer="z3"
      data-workout-state={state}
      data-state={visible ? 'TRACKING_ACTIVE' : 'INACTIVE'}
    >
      <svg
        className="tracking-skeleton-svg"
        viewBox={`0 0 ${Math.max(width, 1)} ${Math.max(height, 1)}`}
        preserveAspectRatio="none"
        aria-label="Tracking skeleton overlay"
      >
        <g className="tracking-skeleton-lines">
          {SKELETON_CONNECTIONS.map(([from, to]) => {
            const start = points[from];
            const end = points[to];
            if (!start || !end) return null;
            return <line key={`${from}-${to}`} x1={start.x} y1={start.y} x2={end.x} y2={end.y} />;
          })}
        </g>
        {correctionVisible ? (
          <g className="tracking-skeleton-correction-lines">
            {CORRECTION_TARGET.edges.map(([from, to]) => {
              const start = points[from];
              const end = points[to];
              if (!start || !end) return null;
              return <line key={`${from}-${to}`} x1={start.x} y1={start.y} x2={end.x} y2={end.y} />;
            })}
          </g>
        ) : null}
        <g className="tracking-skeleton-points">
          {SKELETON_POINT_ORDER.map((key) => {
            const point = points[key];
            if (!point) return null;
            return <circle key={key} cx={point.x} cy={point.y} r="3.5" />;
          })}
        </g>
        {correctionVisible ? (
          <g className="tracking-skeleton-correction-points">
            {CORRECTION_TARGET.joints.map((key) => {
              const point = points[key];
              if (!point) return null;
              return (
                <circle
                  key={key}
                  className={key === CORRECTION_TARGET.primaryJoint ? 'is-primary' : undefined}
                  cx={point.x}
                  cy={point.y}
                  r={key === CORRECTION_TARGET.primaryJoint ? 5 : 4.1}
                />
              );
            })}
          </g>
        ) : null}
      </svg>
      <span className="tracking-status"><i /> TRACKING</span>
    </div>
  );
}
