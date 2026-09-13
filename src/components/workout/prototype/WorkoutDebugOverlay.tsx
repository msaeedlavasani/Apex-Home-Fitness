import type {CSSProperties} from 'react';
import type {WorkoutPrototypeState, WorkoutSetNumber} from './workoutState';

export type WorkoutDebugRenderBranch = 'EXERCISE_INTRO' | 'ACTIVE_WORK' | 'REST' | 'TRANSITION' | 'PAUSED' | 'OTHER';

export type WorkoutDebugTransition = {
  timestamp: string;
  previousState: WorkoutPrototypeState;
  nextState: WorkoutPrototypeState;
  setBefore: WorkoutSetNumber;
  setAfter: WorkoutSetNumber;
  renderBranchAfter: WorkoutDebugRenderBranch;
};

interface WorkoutDebugOverlayProps {
  state: WorkoutPrototypeState;
  currentSet: WorkoutSetNumber;
  renderBranch: WorkoutDebugRenderBranch;
  introStageMounted: boolean;
  exerciseStatusMounted: boolean;
  restStageMounted: boolean;
  mentorVisible: boolean;
  introSeen: boolean;
  transitions: readonly WorkoutDebugTransition[];
}

const overlayStyle: CSSProperties = {
  position: 'fixed',
  inset: 'auto 8px 8px 8px',
  zIndex: 10000,
  maxHeight: '42dvh',
  overflow: 'auto',
  padding: '8px',
  border: '1px solid rgba(255, 107, 61, 0.85)',
  borderRadius: '8px',
  background: 'rgba(10, 10, 10, 0.92)',
  color: '#fff',
  fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
  fontSize: '10px',
  lineHeight: 1.35,
  pointerEvents: 'none',
  whiteSpace: 'pre-wrap',
};

const rowStyle: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'max-content 1fr',
  columnGap: '6px',
};

function bool(value: boolean) {
  return value ? 'true' : 'false';
}

export function WorkoutDebugOverlay({
  state,
  currentSet,
  renderBranch,
  introStageMounted,
  exerciseStatusMounted,
  restStageMounted,
  mentorVisible,
  introSeen,
  transitions,
}: WorkoutDebugOverlayProps) {
  return (
    <aside style={overlayStyle} aria-label="Workout runtime diagnostics">
      <div style={rowStyle}><strong>workoutState:</strong><span>{state}</span></div>
      <div style={rowStyle}><strong>currentSet:</strong><span>{currentSet}</span></div>
      <div style={rowStyle}><strong>exerciseId:</strong><span>bodyweight-squat</span></div>
      <div style={rowStyle}><strong>renderBranch:</strong><span>{renderBranch}</span></div>
      <div style={rowStyle}><strong>introStageMounted:</strong><span>{bool(introStageMounted)}</span></div>
      <div style={rowStyle}><strong>exerciseStatusMounted:</strong><span>{bool(exerciseStatusMounted)}</span></div>
      <div style={rowStyle}><strong>restStageMounted:</strong><span>{bool(restStageMounted)}</span></div>
      <div style={rowStyle}><strong>mentorVisible:</strong><span>{bool(mentorVisible)}</span></div>
      <div style={rowStyle}><strong>introSeen:</strong><span>{bool(introSeen)}</span></div>
      <div style={rowStyle}><strong>timestamp:</strong><span>{new Date().toISOString()}</span></div>
      <div style={{marginTop: '6px'}}><strong>lastTransitions:</strong></div>
      {transitions.length === 0 ? <div>none</div> : transitions.map((transition, index) => (
        <div key={`${transition.timestamp}-${index}`}>
          {transition.timestamp} {transition.previousState}[{transition.setBefore}] → {transition.nextState}[{transition.setAfter}] → {transition.renderBranchAfter}
        </div>
      ))}
    </aside>
  );
}
