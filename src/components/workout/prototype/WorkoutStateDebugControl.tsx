import {WORKOUT_PROTOTYPE_STATES, type WorkoutPrototypeState, type WorkoutSetNumber} from './workoutState';

interface WorkoutStateDebugControlProps {
  state: WorkoutPrototypeState;
  currentSet: WorkoutSetNumber;
  onStateChange: (state: WorkoutPrototypeState) => void;
  onCurrentSetChange: (set: WorkoutSetNumber) => void;
}

export function WorkoutStateDebugControl({state, currentSet, onStateChange, onCurrentSetChange}: WorkoutStateDebugControlProps) {
  return (
    <aside className="workout-state-debug-control" data-layer="z8" aria-label="Workout prototype state debug control">
      <label>
        <span>STATE DEBUG</span>
        <select
          value={state}
          aria-label="Workout prototype state"
          onChange={(event) => onStateChange(event.target.value as WorkoutPrototypeState)}
        >
          {WORKOUT_PROTOTYPE_STATES.map((option) => <option key={option} value={option}>{option}</option>)}
        </select>
      </label>
      <label>
        <span>SET DEBUG</span>
        <select
          value={currentSet}
          aria-label="Workout prototype current set"
          onChange={(event) => onCurrentSetChange(Number(event.target.value) as WorkoutSetNumber)}
        >
          {[1, 2, 3].map((option) => <option key={option} value={option}>SET {String(option).padStart(2, '0')}</option>)}
        </select>
      </label>
    </aside>
  );
}
