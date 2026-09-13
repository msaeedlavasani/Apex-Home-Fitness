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
const WORK_SET_DURATION_MS = 30_000;
const EXERCISE_INTRO_DURATION_MS = 3_000;
const TRANSITION_COUNTDOWN_START_VALUE = 3;
const TRANSITION_COUNTDOWN_DURATION_MS = 3_000;
const PROTOTYPE_EXERCISE_ID = 'bodyweight-squat';

type PausedTimelineSnapshot = {
  state: ResumableWorkoutState;
  currentSet: WorkoutSetNumber;
  remainingMs: number | null;
};

function isRestPhaseState(state: WorkoutPrototypeState) {
  return state === 'REST_QUIET' || state === 'REST_NEXT_PREVIEW';
}

function isActiveSetState(state: WorkoutPrototypeState) {
  return state === 'WORK_NORMAL' || state === 'NEXT_EXERCISE';
}

export default function WorkoutPrototypePage() {
  const locale = useLocale();
  const router = useRouter();
  const [workoutState, setWorkoutState] = useState<WorkoutPrototypeState>('START');
  const [prototypeFlowEnabled, setPrototypeFlowEnabled] = useState(false);
  const [flowElapsedMs, setFlowElapsedMs] = useState(0);
  const [currentSet, setCurrentSet] = useState<WorkoutSetNumber>(1);
  const workoutStateRef = useRef<WorkoutPrototypeState>('START');
  const flowElapsedMsRef = useRef(0);
  const flowStartedAtRef = useRef<number | null>(null);
  const workDeadlineRef = useRef<number | null>(null);
  const workCompletionTimeoutRef = useRef<number | null>(null);
  const exerciseIntroTimeoutRef = useRef<number | null>(null);
  const restDeadlineRef = useRef<number | null>(null);
  const transitionCountdownStartedAtRef = useRef<number | null>(null);
  const transitionCountdownHandoffTimeoutRef = useRef<number | null>(null);
  const introducedExerciseIdsRef = useRef<Set<string>>(new Set());
  const pausedTimelineRef = useRef<PausedTimelineSnapshot | null>(null);
  const handleActiveSetTimerCompleteRef = useRef<() => void>(() => {});
  const transitionToStateRef = useRef<(nextState: WorkoutPrototypeState) => void>(() => {});
  const [manualWorkRemainingSeconds, setManualWorkRemainingSeconds] = useState(30);
  const [manualRestRemainingSeconds, setManualRestRemainingSeconds] = useState(30);
  const [manualTransitionCountdownValue, setManualTransitionCountdownValue] = useState(TRANSITION_COUNTDOWN_START_VALUE);

  workoutStateRef.current = workoutState;

  const readFlowElapsedMs = useCallback(() => {
    if (flowStartedAtRef.current === null) return flowElapsedMsRef.current;
    return flowElapsedMsRef.current + (Date.now() - flowStartedAtRef.current);
  }, []);

  const startManualRestPhase = useCallback((remainingMs = REST_PHASE_DURATION_MS) => {
    const clampedRemainingMs = Math.max(0, Math.min(REST_PHASE_DURATION_MS, remainingMs));
    restDeadlineRef.current = Date.now() + clampedRemainingMs;
    setManualRestRemainingSeconds(Math.ceil(clampedRemainingMs / 1_000));
  }, []);

  const clearManualRestPhase = useCallback(() => {
    restDeadlineRef.current = null;
    setManualRestRemainingSeconds(30);
  }, []);

  const startManualTransitionCountdown = useCallback((remainingMs = TRANSITION_COUNTDOWN_DURATION_MS) => {
    const clampedRemainingMs = Math.max(0, Math.min(TRANSITION_COUNTDOWN_DURATION_MS, remainingMs));
    const startedAt = Date.now() - (TRANSITION_COUNTDOWN_DURATION_MS - clampedRemainingMs);
    transitionCountdownStartedAtRef.current = startedAt;
    setManualTransitionCountdownValue(Math.max(1, Math.min(
      TRANSITION_COUNTDOWN_START_VALUE,
      Math.ceil(clampedRemainingMs / 1_000),
    )));
  }, []);

  const clearManualTransitionCountdown = useCallback(() => {
    transitionCountdownStartedAtRef.current = null;
    setManualTransitionCountdownValue(TRANSITION_COUNTDOWN_START_VALUE);
    if (transitionCountdownHandoffTimeoutRef.current !== null) {
      window.clearTimeout(transitionCountdownHandoffTimeoutRef.current);
      transitionCountdownHandoffTimeoutRef.current = null;
    }
  }, []);

  const clearManualWorkTimer = useCallback(() => {
    workDeadlineRef.current = null;
    setManualWorkRemainingSeconds(WORK_SET_DURATION_MS / 1_000);
    if (workCompletionTimeoutRef.current !== null) {
      window.clearTimeout(workCompletionTimeoutRef.current);
      workCompletionTimeoutRef.current = null;
    }
  }, []);

  const resetPrototypeFlow = useCallback(() => {
    flowElapsedMsRef.current = 0;
    flowStartedAtRef.current = Date.now();
    clearManualWorkTimer();
    introducedExerciseIdsRef.current.clear();
    setFlowElapsedMs(0);
    setCurrentSet(1);
    workoutStateRef.current = 'PREPARE';
    setWorkoutState('PREPARE');
  }, [clearManualWorkTimer]);

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
    workoutStateRef.current = initialState;
    if (initialState === 'EXERCISE_INTRO') {
      introducedExerciseIdsRef.current.add(PROTOTYPE_EXERCISE_ID);
    }
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

      const flowState = getPrototypeFlowState(elapsedMs);
      const nextState = flowState === 'EXERCISE_INTRO'
        && introducedExerciseIdsRef.current.has(PROTOTYPE_EXERCISE_ID)
        ? 'WORK_NORMAL'
        : flowState;
      if (flowState === 'EXERCISE_INTRO') {
        introducedExerciseIdsRef.current.add(PROTOTYPE_EXERCISE_ID);
      }
      if (nextState !== workoutStateRef.current) {
        if (nextState === 'WORK_NORMAL' && workoutStateRef.current === 'TRANSITION_COUNTDOWN') {
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
    const activeSet = workoutState === 'WORK_NORMAL' || workoutState === 'NEXT_EXERCISE';
    if (!activeSet) {
      clearManualWorkTimer();
      return;
    }

    const deadline = workDeadlineRef.current ?? Date.now() + WORK_SET_DURATION_MS;
    workDeadlineRef.current = deadline;

    const updateWorkTimer = () => {
      const remainingSeconds = Math.max(0, Math.min(
        WORK_SET_DURATION_MS / 1_000,
        Math.ceil((deadline - Date.now()) / 1_000),
      ));
      setManualWorkRemainingSeconds(remainingSeconds);
    };

    updateWorkTimer();
    workCompletionTimeoutRef.current = window.setTimeout(() => {
      workCompletionTimeoutRef.current = null;
      if (workDeadlineRef.current === deadline) {
        handleActiveSetTimerCompleteRef.current();
      }
    }, Math.max(0, deadline - Date.now()) + 500);

    const timer = window.setInterval(updateWorkTimer, 100);
    return () => {
      window.clearInterval(timer);
      if (workDeadlineRef.current === deadline) workDeadlineRef.current = null;
      if (workCompletionTimeoutRef.current !== null) {
        window.clearTimeout(workCompletionTimeoutRef.current);
        workCompletionTimeoutRef.current = null;
      }
    };
  }, [clearManualWorkTimer, currentSet, workoutState]);

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
          transitionToStateRef.current('WORK_NORMAL');
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

  useEffect(() => {
    if (prototypeFlowEnabled || workoutState !== 'EXERCISE_INTRO') return;

    exerciseIntroTimeoutRef.current = window.setTimeout(() => {
      exerciseIntroTimeoutRef.current = null;
      if (workoutStateRef.current === 'EXERCISE_INTRO') {
        transitionToStateRef.current('WORK_NORMAL');
      }
    }, EXERCISE_INTRO_DURATION_MS);

    return () => {
      if (exerciseIntroTimeoutRef.current !== null) {
        window.clearTimeout(exerciseIntroTimeoutRef.current);
        exerciseIntroTimeoutRef.current = null;
      }
    };
  }, [prototypeFlowEnabled, workoutState]);

  const pauseTimeline = useCallback(() => {
    const state = workoutStateRef.current;
    const snapshot: PausedTimelineSnapshot = {
      state: isResumableWorkoutState(state) ? state : 'WORK_NORMAL',
      currentSet,
      remainingMs: null,
    };

    if (isActiveSetState(state)) {
      snapshot.remainingMs = workDeadlineRef.current === null
        ? manualWorkRemainingSeconds * 1_000
        : Math.max(0, workDeadlineRef.current - Date.now());
      setManualWorkRemainingSeconds(Math.ceil(snapshot.remainingMs / 1_000));
      workDeadlineRef.current = null;
      if (workCompletionTimeoutRef.current !== null) {
        window.clearTimeout(workCompletionTimeoutRef.current);
        workCompletionTimeoutRef.current = null;
      }
    } else if (isRestPhaseState(state)) {
      snapshot.remainingMs = restDeadlineRef.current === null
        ? manualRestRemainingSeconds * 1_000
        : Math.max(0, restDeadlineRef.current - Date.now());
      setManualRestRemainingSeconds(Math.ceil(snapshot.remainingMs / 1_000));
      restDeadlineRef.current = null;
    } else if (state === 'TRANSITION_COUNTDOWN') {
      const startedAt = transitionCountdownStartedAtRef.current;
      snapshot.remainingMs = startedAt === null
        ? manualTransitionCountdownValue * 1_000
        : Math.max(0, startedAt + TRANSITION_COUNTDOWN_DURATION_MS - Date.now());
      transitionCountdownStartedAtRef.current = null;
      if (transitionCountdownHandoffTimeoutRef.current !== null) {
        window.clearTimeout(transitionCountdownHandoffTimeoutRef.current);
        transitionCountdownHandoffTimeoutRef.current = null;
      }
      setManualTransitionCountdownValue(Math.max(1, Math.min(
        TRANSITION_COUNTDOWN_START_VALUE,
        Math.ceil(snapshot.remainingMs / 1_000),
      )));
    }

    pausedTimelineRef.current = snapshot;

    if (prototypeFlowEnabled) {
      const elapsedMs = readFlowElapsedMs();
      flowElapsedMsRef.current = elapsedMs;
      flowStartedAtRef.current = null;
      setFlowElapsedMs(elapsedMs);
    }

    workoutStateRef.current = 'PAUSED';
    setWorkoutState('PAUSED');
  }, [currentSet, manualRestRemainingSeconds, manualTransitionCountdownValue, manualWorkRemainingSeconds, prototypeFlowEnabled, readFlowElapsedMs]);

  const transitionToState = useCallback((nextState: WorkoutPrototypeState) => {
    if (nextState === 'PAUSED' && workoutState !== 'PAUSED') {
      pauseTimeline();
      return;
    }

    const resolvedNextState = nextState === 'EXERCISE_INTRO'
      && introducedExerciseIdsRef.current.has(PROTOTYPE_EXERCISE_ID)
      ? 'WORK_NORMAL'
      : nextState;
    if (nextState === 'EXERCISE_INTRO') {
      introducedExerciseIdsRef.current.add(PROTOTYPE_EXERCISE_ID);
    }

    const currentRestPhase = isRestPhaseState(workoutState);
    const nextRestPhase = isRestPhaseState(resolvedNextState);

    if (resolvedNextState === 'WORK_NORMAL' && workoutStateRef.current === 'TRANSITION_COUNTDOWN') {
      setCurrentSet((previousSet) => getNextWorkoutSetNumber(previousSet));
    }

    if (!prototypeFlowEnabled) {
      if (nextRestPhase && !currentRestPhase) startManualRestPhase();
      if (!nextRestPhase && currentRestPhase && resolvedNextState !== 'PAUSED') clearManualRestPhase();
      if (resolvedNextState === 'TRANSITION_COUNTDOWN' && workoutState !== 'TRANSITION_COUNTDOWN') {
        startManualTransitionCountdown();
      }
      if (resolvedNextState !== 'TRANSITION_COUNTDOWN' && workoutState === 'TRANSITION_COUNTDOWN' && resolvedNextState !== 'PAUSED') {
        clearManualTransitionCountdown();
      }
    }

    workoutStateRef.current = resolvedNextState;
    setWorkoutState(resolvedNextState);
  }, [clearManualRestPhase, clearManualTransitionCountdown, pauseTimeline, prototypeFlowEnabled, startManualRestPhase, startManualTransitionCountdown, workoutState]);

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
    if (workoutStateRef.current === 'PAUSED') {
      const snapshot = pausedTimelineRef.current;
      if (!snapshot) return;

      pausedTimelineRef.current = null;
      setCurrentSet(snapshot.currentSet);

      if (prototypeFlowEnabled) {
        flowStartedAtRef.current = Date.now();
        workoutStateRef.current = snapshot.state;
        setWorkoutState(snapshot.state);
        return;
      }

      if (isActiveSetState(snapshot.state) && snapshot.remainingMs !== null) {
        workDeadlineRef.current = Date.now() + snapshot.remainingMs;
        setManualWorkRemainingSeconds(Math.ceil(snapshot.remainingMs / 1_000));
      } else if (isRestPhaseState(snapshot.state) && snapshot.remainingMs !== null) {
        startManualRestPhase(snapshot.remainingMs);
      } else if (snapshot.state === 'TRANSITION_COUNTDOWN' && snapshot.remainingMs !== null) {
        startManualTransitionCountdown(snapshot.remainingMs);
      }

      workoutStateRef.current = snapshot.state;
      setWorkoutState(snapshot.state);
      return;
    }

    pauseTimeline();
  }, [pauseTimeline, prototypeFlowEnabled, startManualRestPhase, startManualTransitionCountdown]);

  const handleStateChange = useCallback((nextState: WorkoutPrototypeState) => {
    if (prototypeFlowEnabled) return;
    const resolvedNextState = nextState === 'EXERCISE_INTRO'
      && introducedExerciseIdsRef.current.has(PROTOTYPE_EXERCISE_ID)
      ? 'WORK_NORMAL'
      : nextState;
    if (nextState === 'EXERCISE_INTRO') {
      introducedExerciseIdsRef.current.add(PROTOTYPE_EXERCISE_ID);
    }
    workoutStateRef.current = resolvedNextState;
    setWorkoutState(resolvedNextState);
  }, [prototypeFlowEnabled]);

  const handleCurrentSetChange = useCallback((nextSet: WorkoutSetNumber) => {
    setCurrentSet(nextSet);
  }, []);

  const handleActiveSetTimerComplete = useCallback(() => {
    if (prototypeFlowEnabled) return;
    transitionToState(currentSet < 3 ? 'REST_QUIET' : 'COMPLETE');
  }, [currentSet, prototypeFlowEnabled, transitionToState]);

  handleActiveSetTimerCompleteRef.current = handleActiveSetTimerComplete;

  const handleFinishWorkout = useCallback(() => {
    router.push(`/${locale}/dashboard`);
  }, [locale, router]);

  const handleRepeatWorkout = useCallback(() => {
    flowElapsedMsRef.current = 0;
    flowStartedAtRef.current = null;
    clearManualWorkTimer();
    introducedExerciseIdsRef.current.clear();
    if (exerciseIntroTimeoutRef.current !== null) {
      window.clearTimeout(exerciseIntroTimeoutRef.current);
      exerciseIntroTimeoutRef.current = null;
    }
    restDeadlineRef.current = null;
    transitionCountdownStartedAtRef.current = null;
    pausedTimelineRef.current = null;
    if (transitionCountdownHandoffTimeoutRef.current !== null) {
      window.clearTimeout(transitionCountdownHandoffTimeoutRef.current);
      transitionCountdownHandoffTimeoutRef.current = null;
    }
    setFlowElapsedMs(0);
    setManualRestRemainingSeconds(30);
    setManualTransitionCountdownValue(TRANSITION_COUNTDOWN_START_VALUE);
    setCurrentSet(1);
    workoutStateRef.current = 'START';
    setWorkoutState('START');
  }, [clearManualWorkTimer]);

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
      onFinishWorkout={handleFinishWorkout}
      onRepeatWorkout={handleRepeatWorkout}
      prototypeFlowEnabled={prototypeFlowEnabled}
      flowElapsedMs={flowElapsedMs}
      workSecondsRemaining={manualWorkRemainingSeconds}
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
