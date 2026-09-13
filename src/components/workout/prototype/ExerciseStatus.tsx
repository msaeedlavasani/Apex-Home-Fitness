import type {CSSProperties} from 'react';
import type {WorkoutPrototypeState, WorkoutSetNumber} from './workoutState';

interface ExerciseStatusProps {
  state: WorkoutPrototypeState;
  currentSet: WorkoutSetNumber;
  workSecondsRemaining: number;
  restRemainingSeconds: number;
  countdownValue: number;
}

const WORK_SET_DURATION_SECONDS = 30;

function formatSeconds(value: number) {
  return `00:${String(Math.max(0, Math.min(59, value))).padStart(2, '0')}`;
}

export function ExerciseStatus({state, currentSet, workSecondsRemaining, restRemainingSeconds, countdownValue}: ExerciseStatusProps) {

  if (state === 'PREPARE') {
    return (
      <section className="workout-exercise-status" data-layer="z5" data-workout-state={state} aria-hidden="true" />
    );
  }

  const nextPreview = state === 'REST_NEXT_PREVIEW';
  const transitionCountdown = state === 'TRANSITION_COUNTDOWN';
  const nextExercise = state === 'NEXT_EXERCISE';
  const start = state === 'START';
  const workNormal = state === 'WORK_NORMAL';
  const activeSet = workNormal || nextExercise;
  const activeSetLabel = `SET ${String(currentSet).padStart(2, '0')}`;
  const upcomingContext = nextPreview || transitionCountdown;
  const timerProgress = activeSet
    ? ((WORK_SET_DURATION_SECONDS - workSecondsRemaining) / WORK_SET_DURATION_SECONDS) * 360
    : 0;

  return (
    <section className="workout-exercise-status" data-layer="z5" data-workout-state={state} aria-labelledby="workout-title">
      <div className="workout-exercise-copy">
        <p className="workout-status-eyebrow">{upcomingContext ? 'NEXT SET' : 'BODYWEIGHT'}</p>
        <h1 id="workout-title" className={upcomingContext ? 'workout-preview-exercise-name' : undefined}>
          {upcomingContext ? 'Bodyweight Squat' : 'Squat'}
        </h1>
        {upcomingContext || start || state === 'REST_QUIET' ? null : <p className="workout-status-set">{activeSet ? activeSetLabel : 'Set 02'} <span>/ 03</span></p>}
      </div>
      <div
        className={`workout-reps-status${transitionCountdown ? ' workout-countdown-status' : ''}${workNormal ? ' workout-active-timer' : ''}`}
        style={workNormal ? {'--workout-timer-progress': `${timerProgress}deg`} as CSSProperties : undefined}
        aria-hidden={start ? 'true' : undefined}
        aria-label={transitionCountdown ? `Starting in ${countdownValue}` : nextPreview ? 'Next set in 5 seconds' : state === 'REST_QUIET' ? '30 second rest' : activeSet ? 'Active set timer' : `${nextExercise ? '0' : '8'} of 12 repetitions`}
      >
        {start ? null : transitionCountdown ? (
          <>
            <span className="workout-status-eyebrow workout-countdown-status-eyebrow">STARTING</span>
            <strong className="workout-countdown-value">{countdownValue}</strong>
          </>
        ) : nextPreview ? (
          <>
            <span className="workout-status-eyebrow workout-next-status-eyebrow">NEXT</span>
            <strong>{formatSeconds(restRemainingSeconds)}</strong>
          </>
        ) : state === 'REST_QUIET' ? (
          <>
            <span className="workout-status-eyebrow workout-rest-status-eyebrow">REST</span>
            <strong>{formatSeconds(restRemainingSeconds)}</strong>
          </>
        ) : activeSet ? (
          <>
            <span className="workout-status-eyebrow">TIME</span>
            <strong>{formatSeconds(workSecondsRemaining)}</strong>
          </>
        ) : (
          <>
            <span className="workout-status-eyebrow">REPS</span>
            <strong>{nextExercise ? '00' : '08'} <i>/ 12</i></strong>
          </>
        )}
      </div>
    </section>
  );
}
