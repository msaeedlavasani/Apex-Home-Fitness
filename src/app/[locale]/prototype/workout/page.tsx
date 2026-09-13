'use client';

import dynamic from 'next/dynamic';
import {useCallback, useEffect, useRef, useState} from 'react';
import {useLocale} from 'next-intl';
import {useRouter} from 'next/navigation';
import {WorkoutExperienceShell} from '@/components/workout/prototype/WorkoutExperienceShell';
import {getCountdownValue, getPrototypeFlowState, getRestRemainingSeconds} from '@/components/workout/prototype/prototypeFlow';
import {START_WORKOUT_EVENT, START_WORKOUT_REQUEST_ATTRIBUTE} from '@/components/workout/prototype/startWorkoutBridge';
import {
  getNextWorkoutSetNumber,
  isResumableWorkoutState,
  parseWorkoutPrototypeState,
  type ResumableWorkoutState,
  type WorkoutPrototypeState,
  type WorkoutSetNumber,
} from '@/components/workout/prototype/workoutState';

const MentorStage = dynamic(
  () => import('@/components/workout/MentorStage').then((module) => module.MentorStage),
    {
      ssr: false,
      loading: () => (
        <div className="mentor-stage-fallback" role="status">
          <span className="mentor-stage-fallback-mark" aria-hidden="true">◌</span>
          <span>Loading Mentor</span>
        </div>
      ),
    },
  );

const REST_PHASE_DURATION_MS = 30_000;
const TRANSITION_COUNTDOWN_START_VALUE = 3;

function isRestPhaseState(state: WorkoutPrototypeState) {
  return state === 'REST_QUIET' || state === 'REST_NEXT_PREVIEW';
}

export default function WorkoutPrototypePage() {
  const locale = useLocale();
  const router = useRouter();
  const [workoutState, setWorkoutState] = useState<WorkoutPrototypeState>('START');
  const [prototypeFlowEnabled, setPrototypeFlowEnabled] = useState(false);
  const [flowElapsedMs, setFlowElapsedMs] = useState(0);
  const [currentSet, setCurrentSet] = useState<WorkoutSetNumber>(1);
  const previousResumableStateRef = useRef<ResumableWorkoutState>('WORK_NORMAL');
  const workoutStateRef = useRef<WorkoutPrototypeState>('START');
  const flowElapsedMsRef = useRef(0);
  const flowStartedAtRef = useRef<number | null>(null);
  const restDeadlineRef = useRef<number | null>(null);
  const transitionCountdownStartedAtRef = useRef<number | null>(null);
  const transitionCountdownHandoffTimeoutRef = useRef<number | null>(null);
  const transitionToStateRef = useRef<(nextState: WorkoutPrototypeState) => void>(() => {});
  const [manualRestRemainingSeconds, setManualRestRemainingSeconds] = useState(30);
  const [manualTransitionCountdownValue, setManualTransitionCountdownValue] = useState(TRANSITION_COUNTDOWN_START_VALUE);

  workoutStateRef.current = workoutState;

  const readFlowElapsedMs = useCallback(() => {
    if (flowStartedAtRef.current === null) return flowElapsedMsRef.current;
    return flowElapsedMsRef.current + (Date.now() - flowStartedAtRef.current);
  }, []);

  const startManualRestPhase = useCallback(() => {
    restDeadlineRef.current = Date.now() + REST_PHASE_DURATION_MS;
    setManualRestRemainingSeconds(30);
  }, []);

  const clearManualRestPhase = useCallback(() => {
    restDeadlineRef.current = null;
    setManualRestRemainingSeconds(30);
  }, []);

  const startManualTransitionCountdown = useCallback(() => {
    const startedAt = Date.now();
    transitionCountdownStartedAtRef.current = startedAt;
    setManualTransitionCountdownValue(TRANSITION_COUNTDOWN_START_VALUE);
  }, []);

  const clearManualTransitionCountdown = useCallback(() => {
    transitionCountdownStartedAtRef.current = null;
    setManualTransitionCountdownValue(TRANSITION_COUNTDOWN_START_VALUE);
    if (transitionCountdownHandoffTimeoutRef.current !== null) {
      window.clearTimeout(transitionCountdownHandoffTimeoutRef.current);
      transitionCountdownHandoffTimeoutRef.current = null;
    }
  }, []);

  const resetPrototypeFlow = useCallback(() => {
    flowElapsedMsRef.current = 0;
    flowStartedAtRef.current = Date.now();
    setFlowElapsedMs(0);
    setCurrentSet(1);
    previousResumableStateRef.current = 'PREPARE';
    workoutStateRef.current = 'PREPARE';
    setWorkoutState('PREPARE');
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const flowEnabled = params.get('prototypeFlow') === '1';
    setPrototypeFlowEnabled(flowEnabled);

    if (flowEnabled) {
      resetPrototypeFlow();
      return;
    }

    const workoutStateParam = params.get('workoutState');
    const initialState = workoutStateParam === null
      ? 'START'
      : parseWorkoutPrototypeState(workoutStateParam);
    if (isRestPhaseState(initialState)) {
      startManualRestPhase();
    } else {
      clearManualRestPhase();
    }
    if (initialState === 'TRANSITION_COUNTDOWN') {
      startManualTransitionCountdown();
    } else {
      clearManualTransitionCountdown();
    }
    previousResumableStateRef.current = isResumableWorkoutState(initialState) ? initialState : 'WORK_NORMAL';
    workoutStateRef.current = initialState;
    setWorkoutState(initialState);
  }, [clearManualRestPhase, clearManualTransitionCountdown, resetPrototypeFlow, startManualRestPhase, startManualTransitionCountdown]);

  useEffect(() => {
    if (!prototypeFlowEnabled) {
      flowStartedAtRef.current = null;
      return;
    }

    if (flowStartedAtRef.current === null) flowStartedAtRef.current = Date.now();
    const interval = window.setInterval(() => {
      if (workoutStateRef.current === 'PAUSED') return;

      const elapsedMs = readFlowElapsedMs();
      flowElapsedMsRef.current = elapsedMs;
      flowStartedAtRef.current = Date.now();
      setFlowElapsedMs(elapsedMs);

      const nextState = getPrototypeFlowState(elapsedMs);
      if (nextState !== workoutStateRef.current) {
        if (nextState === 'NEXT_EXERCISE') {
          setCurrentSet((previousSet) => getNextWorkoutSetNumber(previousSet));
        }
        workoutStateRef.current = nextState;
        setWorkoutState(nextState);
      }
    }, 50);

    return () => {
      window.clearInterval(interval);
      flowStartedAtRef.current = null;
    };
  }, [prototypeFlowEnabled, readFlowElapsedMs]);

  useEffect(() => {
    if (prototypeFlowEnabled) return;

    let timer = 0;
    const updateRestTimer = () => {
      const deadline = restDeadlineRef.current;
      const state = workoutStateRef.current;
      if (deadline === null || !isRestPhaseState(state)) return;

      const remainingSeconds = Math.max(0, Math.min(
        REST_PHASE_DURATION_MS / 1_000,
        Math.ceil((deadline - Date.now()) / 1_000),
      ));
      setManualRestRemainingSeconds(remainingSeconds);

      if (remainingSeconds === 5 && state === 'REST_QUIET') {
        workoutStateRef.current = 'REST_NEXT_PREVIEW';
        setWorkoutState('REST_NEXT_PREVIEW');
      }

      if (remainingSeconds === 0) {
        window.clearInterval(timer);
      }
    };

    updateRestTimer();
    timer = window.setInterval(updateRestTimer, 100);

    return () => {
      window.clearInterval(timer);
    };
  }, [prototypeFlowEnabled, workoutState]);

  useEffect(() => {
    if (
      prototypeFlowEnabled
      || workoutState !== 'REST_NEXT_PREVIEW'
      || manualRestRemainingSeconds !== 0
    ) return;

    const timeout = window.setTimeout(() => {
      if (workoutStateRef.current !== 'REST_NEXT_PREVIEW') return;

      restDeadlineRef.current = null;
      startManualTransitionCountdown();
      workoutStateRef.current = 'TRANSITION_COUNTDOWN';
      setWorkoutState('TRANSITION_COUNTDOWN');
    }, 500);

    return () => window.clearTimeout(timeout);
  }, [manualRestRemainingSeconds, prototypeFlowEnabled, startManualTransitionCountdown, workoutState]);

  useEffect(() => {
    if (prototypeFlowEnabled || workoutState !== 'TRANSITION_COUNTDOWN') return;

    if (transitionCountdownStartedAtRef.current === null) {
      transitionCountdownStartedAtRef.current = Date.now();
    }

    const startedAt = transitionCountdownStartedAtRef.current;
    let timer = 0;
    if (transitionCountdownHandoffTimeoutRef.current === null) {
      transitionCountdownHandoffTimeoutRef.current = window.setTimeout(() => {
        transitionCountdownHandoffTimeoutRef.current = null;
        if (workoutStateRef.current === 'TRANSITION_COUNTDOWN') {
          transitionToStateRef.current('NEXT_EXERCISE');
        }
      }, Math.max(0, startedAt + 3_000 - Date.now()));
    }
    const updateTransitionCountdown = () => {
      const elapsedSeconds = Math.floor((Date.now() - startedAt) / 1_000);
      const value = Math.max(1, Math.min(
        TRANSITION_COUNTDOWN_START_VALUE,
        TRANSITION_COUNTDOWN_START_VALUE - elapsedSeconds,
      ));
      setManualTransitionCountdownValue(value);

      if (value === 1) return;

      timer = window.setTimeout(
        updateTransitionCountdown,
        Math.max(0, startedAt + ((elapsedSeconds + 1) * 1_000) - Date.now()),
      );
    };

    updateTransitionCountdown();

    return () => {
      window.clearTimeout(timer);
      if (transitionCountdownHandoffTimeoutRef.current !== null) {
        window.clearTimeout(transitionCountdownHandoffTimeoutRef.current);
        transitionCountdownHandoffTimeoutRef.current = null;
      }
    };
  }, [prototypeFlowEnabled, workoutState]);

  const transitionToState = useCallback((nextState: WorkoutPrototypeState) => {
    const currentRestPhase = isRestPhaseState(workoutState);
    const nextRestPhase = isRestPhaseState(nextState);

    if (nextState === 'PAUSED') {
      previousResumableStateRef.current = isResumableWorkoutState(workoutState)
        ? workoutState
        : 'WORK_NORMAL';
    }

    if (nextState === 'NEXT_EXERCISE') {
      setCurrentSet((previousSet) => getNextWorkoutSetNumber(previousSet));
    }

    if (!prototypeFlowEnabled) {
      if (nextRestPhase && !currentRestPhase) startManualRestPhase();
      if (!nextRestPhase && currentRestPhase && nextState !== 'PAUSED') clearManualRestPhase();
      if (nextState === 'TRANSITION_COUNTDOWN' && workoutState !== 'TRANSITION_COUNTDOWN') {
        startManualTransitionCountdown();
      }
      if (nextState !== 'TRANSITION_COUNTDOWN' && workoutState === 'TRANSITION_COUNTDOWN' && nextState !== 'PAUSED') {
        clearManualTransitionCountdown();
      }
    }

    workoutStateRef.current = nextState;
    setWorkoutState(nextState);
  }, [clearManualRestPhase, clearManualTransitionCountdown, prototypeFlowEnabled, startManualRestPhase, startManualTransitionCountdown, workoutState]);

  transitionToStateRef.current = transitionToState;

  const startWorkout = useCallback(() => {
    if (workoutStateRef.current !== 'START') return;
    setCurrentSet(1);
    transitionToState('PREPARE');
  }, [transitionToState]);

  useEffect(() => {
    const root = document.documentElement;
    const handleStartWorkoutRequest = () => {
      root.removeAttribute(START_WORKOUT_REQUEST_ATTRIBUTE);
      startWorkout();
    };

    window.addEventListener(START_WORKOUT_EVENT, handleStartWorkoutRequest);
    if (root.hasAttribute(START_WORKOUT_REQUEST_ATTRIBUTE)) handleStartWorkoutRequest();

    return () => window.removeEventListener(START_WORKOUT_EVENT, handleStartWorkoutRequest);
  }, [startWorkout]);

  const togglePause = useCallback(() => {
    if (workoutState === 'PAUSED') {
      if (prototypeFlowEnabled) flowStartedAtRef.current = Date.now();
      const resumableState = previousResumableStateRef.current;
      workoutStateRef.current = resumableState;
      setWorkoutState(resumableState);
      return;
    }

    if (prototypeFlowEnabled) {
      const elapsedMs = readFlowElapsedMs();
      flowElapsedMsRef.current = elapsedMs;
      flowStartedAtRef.current = null;
      setFlowElapsedMs(elapsedMs);
    }
    previousResumableStateRef.current = isResumableWorkoutState(workoutState)
      ? workoutState
      : 'WORK_NORMAL';
    workoutStateRef.current = 'PAUSED';
    setWorkoutState('PAUSED');
  }, [prototypeFlowEnabled, readFlowElapsedMs, workoutState]);

  const handleStateChange = useCallback((nextState: WorkoutPrototypeState) => {
    if (prototypeFlowEnabled) return;
    workoutStateRef.current = nextState;
    setWorkoutState(nextState);
  }, [prototypeFlowEnabled]);

  const handleCurrentSetChange = useCallback((nextSet: WorkoutSetNumber) => {
    setCurrentSet(nextSet);
  }, []);

  const handleActiveSetTimerComplete = useCallback(() => {
    if (prototypeFlowEnabled) return;
    transitionToState(currentSet < 3 ? 'REST_QUIET' : 'COMPLETE');
  }, [currentSet, prototypeFlowEnabled, transitionToState]);

  const handleFinishWorkout = useCallback(() => {
    router.push(`/${locale}/dashboard`);
  }, [locale, router]);

  const handleRepeatWorkout = useCallback(() => {
    flowElapsedMsRef.current = 0;
    flowStartedAtRef.current = null;
    restDeadlineRef.current = null;
    transitionCountdownStartedAtRef.current = null;
    if (transitionCountdownHandoffTimeoutRef.current !== null) {
      window.clearTimeout(transitionCountdownHandoffTimeoutRef.current);
      transitionCountdownHandoffTimeoutRef.current = null;
    }
    setFlowElapsedMs(0);
    setManualRestRemainingSeconds(30);
    setManualTransitionCountdownValue(TRANSITION_COUNTDOWN_START_VALUE);
    setCurrentSet(1);
    previousResumableStateRef.current = 'WORK_NORMAL';
    workoutStateRef.current = 'START';
    setWorkoutState('START');
  }, []);

  const restRemainingSeconds = workoutState === 'REST_QUIET'
    ? prototypeFlowEnabled ? getRestRemainingSeconds(flowElapsedMs) : manualRestRemainingSeconds
    : workoutState === 'REST_NEXT_PREVIEW'
      ? prototypeFlowEnabled ? getRestRemainingSeconds(flowElapsedMs) : manualRestRemainingSeconds
      : 30;
  const countdownValue = workoutState === 'TRANSITION_COUNTDOWN'
    ? prototypeFlowEnabled ? getCountdownValue(flowElapsedMs) : manualTransitionCountdownValue
    : 3;

  return (
    <WorkoutExperienceShell
      state={workoutState}
      currentSet={currentSet}
      onStateChange={prototypeFlowEnabled ? handleStateChange : transitionToState}
      onCurrentSetChange={handleCurrentSetChange}
      onPauseToggle={togglePause}
      onWorkTimerComplete={handleActiveSetTimerComplete}
      onFinishWorkout={handleFinishWorkout}
      onRepeatWorkout={handleRepeatWorkout}
      prototypeFlowEnabled={prototypeFlowEnabled}
      flowElapsedMs={flowElapsedMs}
      restRemainingSeconds={restRemainingSeconds}
      countdownValue={countdownValue}
      mentorRenderer={(onBoneProjection, onVisualBounds) => (
        <MentorStage
          paused={workoutState === 'PAUSED' || workoutState === 'START'}
          onBoneProjection={onBoneProjection}
          onVisualBounds={onVisualBounds}
        />
      )}
    />
  );
}
