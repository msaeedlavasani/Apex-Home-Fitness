'use client';

import {useEffect, useState, type ReactNode} from 'react';
import {BackstageScene} from './BackstageScene';
import {CompleteStage} from './CompleteStage';
import {ExerciseStatus} from './ExerciseStatus';
import {MentorViewport} from './MentorViewport';
import {QuietCoach} from './QuietCoach';
import {PrepareStage} from './PrepareStage';
import {SessionBar} from './SessionBar';
import {StartStage} from './StartStage';
import {WorkoutControls} from './WorkoutControls';
import type {BoneProjection, VisualBounds} from './tracking';
import {getWorkoutPrototypeStateConfig, type WorkoutPrototypeState, type WorkoutSetNumber} from './workoutState';
import {WorkoutStateDebugControl} from './WorkoutStateDebugControl';

interface WorkoutExperienceShellProps {
  mentorRenderer: (
    onBoneProjection: (points: BoneProjection) => void,
    onVisualBounds: (bounds: VisualBounds) => void,
  ) => ReactNode;
  state: WorkoutPrototypeState;
  currentSet: WorkoutSetNumber;
  onStateChange: (state: WorkoutPrototypeState) => void;
  onCurrentSetChange: (set: WorkoutSetNumber) => void;
  onPauseToggle: () => void;
  onStartWorkout: () => void;
  onWorkTimerComplete: () => void;
  onFinishWorkout: () => void;
  onRepeatWorkout: () => void;
  prototypeFlowEnabled: boolean;
  flowElapsedMs: number;
  restRemainingSeconds: number;
  countdownValue: number;
}

export function WorkoutExperienceShell({
  mentorRenderer,
  state,
  currentSet,
  onStateChange,
  onCurrentSetChange,
  onPauseToggle,
  onStartWorkout,
  onWorkTimerComplete,
  onFinishWorkout,
  onRepeatWorkout,
  prototypeFlowEnabled,
  flowElapsedMs,
  restRemainingSeconds,
  countdownValue,
}: WorkoutExperienceShellProps) {
  const [debugLayout, setDebugLayout] = useState(false);
  const [debugWorkout, setDebugWorkout] = useState(false);
  const stateConfig = getWorkoutPrototypeStateConfig(state);
  const coachMessage = state === 'TRANSITION_COUNTDOWN'
    ? `Starting in ${countdownValue}`
    : stateConfig.coachMessage;

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setDebugLayout(params.get('debug') === '1');
    setDebugWorkout(params.get('debugWorkout') === '1');
  }, []);

  return (
    <main
      className="workout-experience-shell"
      data-debug-layout={debugLayout ? 'true' : 'false'}
      data-prototype-flow={prototypeFlowEnabled ? 'true' : 'false'}
      data-workout-state={state}
      data-current-set={currentSet}
      data-flow-elapsed-ms={Math.round(flowElapsedMs)}
      aria-label="AHF Active Workout"
    >
      <BackstageScene />

      <MentorViewport
        state={state}
        trackingVisible={stateConfig.trackingEnabled && stateConfig.skeletonVisible}
        mentorVisible={stateConfig.mentorVisible}
        mentorRenderer={mentorRenderer}
      />

      {state === 'START' ? (
        <StartStage onPauseToggle={onPauseToggle} onStartWorkout={onStartWorkout} />
      ) : state === 'PREPARE' ? (
        <PrepareStage onPauseToggle={onPauseToggle} onPrepareComplete={() => onStateChange('WORK_NORMAL')} />
      ) : state === 'COMPLETE' ? (
        <CompleteStage onFinishWorkout={onFinishWorkout} onRepeatWorkout={onRepeatWorkout} />
      ) : (
        <>
          <div className="workout-zone workout-zone-session" data-zone-label="ZONE A · SESSION BAR">
            <SessionBar state={state} />
          </div>

          <div className="workout-zone workout-zone-status" data-zone-label="ZONE B · EXERCISE STATUS">
            <ExerciseStatus
              state={state}
              currentSet={currentSet}
              restRemainingSeconds={restRemainingSeconds}
              countdownValue={countdownValue}
              onWorkTimerComplete={onWorkTimerComplete}
            />
          </div>

          <div className="workout-zone workout-zone-coach" data-zone-label="ZONE D · QUIET COACH">
            <QuietCoach state={state} message={coachMessage} />
          </div>

          <div className="workout-zone workout-zone-controls" data-zone-label="ZONE E · CONTROLS">
            <WorkoutControls state={state} onPauseToggle={onPauseToggle} />
          </div>
        </>
      )}

      {debugWorkout ? (
        <WorkoutStateDebugControl
          state={state}
          currentSet={currentSet}
          onStateChange={onStateChange}
          onCurrentSetChange={onCurrentSetChange}
        />
      ) : null}
    </main>
  );
}
