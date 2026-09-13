'use client';

import {useEffect, useRef, useState, type ReactNode} from 'react';
import {BackstageScene} from './BackstageScene';
import {CompleteStage} from './CompleteStage';
import {ExerciseIntroStage} from './ExerciseIntroStage';
import {ExerciseStatus} from './ExerciseStatus';
import {MentorViewport} from './MentorViewport';
import {QuietCoach} from './QuietCoach';
import {PrepareStage} from './PrepareStage';
import {RestStage} from './RestStage';
import {SessionBar} from './SessionBar';
import {StartStage} from './StartStage';
import {WorkoutControls} from './WorkoutControls';
import {WorkoutDebugOverlay, type WorkoutDebugRenderBranch, type WorkoutDebugTransition} from './WorkoutDebugOverlay';
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
  workSecondsRemaining: number;
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
  workSecondsRemaining,
  onFinishWorkout,
  onRepeatWorkout,
  prototypeFlowEnabled,
  flowElapsedMs,
  restRemainingSeconds,
  countdownValue,
}: WorkoutExperienceShellProps) {
  const [debugLayout, setDebugLayout] = useState(false);
  const [debugWorkout, setDebugWorkout] = useState(false);
  const [runtimeDebug, setRuntimeDebug] = useState(false);
  const [debugTransitions, setDebugTransitions] = useState<readonly WorkoutDebugTransition[]>([]);
  const previousDebugStateRef = useRef<{state: WorkoutPrototypeState; currentSet: WorkoutSetNumber} | null>(null);
  const introSeenRef = useRef(false);
  const stateConfig = getWorkoutPrototypeStateConfig(state);
  const activeWorkPresentation = state === 'WORK_NORMAL' || state === 'NEXT_EXERCISE';
  const restState = state === 'REST_QUIET' || state === 'REST_NEXT_PREVIEW';
  const renderBranch: WorkoutDebugRenderBranch = state === 'EXERCISE_INTRO'
    ? 'EXERCISE_INTRO'
    : activeWorkPresentation
      ? 'ACTIVE_WORK'
      : restState
        ? 'REST'
        : state === 'TRANSITION_COUNTDOWN'
          ? 'TRANSITION'
          : state === 'PAUSED'
            ? 'PAUSED'
            : 'OTHER';
  const introStageMounted = state === 'EXERCISE_INTRO';
  const exerciseStatusMounted = state !== 'START'
    && state !== 'PREPARE'
    && state !== 'EXERCISE_INTRO'
    && !restState
    && state !== 'COMPLETE';
  const restStageMounted = restState;

  if (runtimeDebug && state === 'EXERCISE_INTRO') introSeenRef.current = true;
  const coachMessage = state === 'TRANSITION_COUNTDOWN'
    ? `Starting in ${countdownValue}`
    : stateConfig.coachMessage;

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setDebugLayout(params.get('debug') === '1');
    setDebugWorkout(params.get('debugWorkout') === '1');
    setRuntimeDebug(params.get('workoutDebug') === '1');
  }, []);

  useEffect(() => {
    if (!runtimeDebug) return;
    const previous = previousDebugStateRef.current;
    if (previous && (previous.state !== state || previous.currentSet !== currentSet)) {
      const transition: WorkoutDebugTransition = {
        timestamp: new Date().toISOString(),
        previousState: previous.state,
        nextState: state,
        setBefore: previous.currentSet,
        setAfter: currentSet,
        renderBranchAfter: renderBranch,
      };
      setDebugTransitions((entries) => [...entries, transition].slice(-20));
    }
    previousDebugStateRef.current = {state, currentSet};
  }, [currentSet, renderBranch, runtimeDebug, state]);

  return (
    <main
      className="workout-experience-shell"
      data-debug-layout={debugLayout ? 'true' : 'false'}
      data-prototype-flow={prototypeFlowEnabled ? 'true' : 'false'}
      data-workout-state={state}
      data-active-presentation={activeWorkPresentation ? 'WORK_NORMAL' : undefined}
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
        <StartStage onPauseToggle={onPauseToggle} />
      ) : state === 'PREPARE' ? (
        <PrepareStage onPauseToggle={onPauseToggle} onPrepareComplete={() => onStateChange('EXERCISE_INTRO')} />
      ) : state === 'EXERCISE_INTRO' ? (
        <>
          <div className="workout-zone workout-zone-session" data-zone-label="ZONE A · SESSION BAR">
            <SessionBar state={state} />
          </div>
          <div className="workout-zone workout-zone-status" data-zone-label="ZONE B · EXERCISE INTRO">
            <ExerciseIntroStage debug={runtimeDebug} />
          </div>
        </>
      ) : restState ? (
        <RestStage
          state={state}
          currentSet={currentSet}
          restRemainingSeconds={restRemainingSeconds}
          onPauseToggle={onPauseToggle}
          debug={runtimeDebug}
        />
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
              workSecondsRemaining={workSecondsRemaining}
              restRemainingSeconds={restRemainingSeconds}
              countdownValue={countdownValue}
              debug={runtimeDebug}
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

      {runtimeDebug ? (
        <WorkoutDebugOverlay
          state={state}
          currentSet={currentSet}
          renderBranch={renderBranch}
          introStageMounted={introStageMounted}
          exerciseStatusMounted={exerciseStatusMounted}
          restStageMounted={restStageMounted}
          mentorVisible={stateConfig.mentorVisible}
          introSeen={introSeenRef.current}
          transitions={debugTransitions.slice(-8)}
        />
      ) : null}

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
