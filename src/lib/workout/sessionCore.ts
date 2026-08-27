import type {
  SessionCommand,
  SessionEffect,
  SessionHydrateInput,
  SessionPhase,
  SessionState,
  SessionSummary,
} from './sessionContracts';

export interface SessionExercise {
  id: string;
  name: string;
  sets: number;
  reps?: number | null;
  durationSeconds?: number | null;
  restSeconds?: number | null;
  exerciseId?: string;
  slug?: string;
}

export interface SessionDerived {
  currentExercise: SessionExercise | undefined;
  totalExercises: number;
  totalSets: number;
  completedSets: number;
  progress: number;
  phaseDurationSeconds: number | null;
  secondsLeft: number | null;
}

export interface TransitionResult {
  state: SessionState;
  effects: SessionEffect[];
}

export interface SessionCore {
  readonly plan: readonly SessionExercise[];
  readonly state: SessionState;
  transition(command: SessionCommand, now?: number): TransitionResult;
  derive(state?: SessionState): SessionDerived;
}

type RestTarget = 'set' | 'exercise';

function clampSets(sets: number | null | undefined): number {
  return Math.max(1, Math.floor(sets ?? 1));
}

function normalizeDuration(seconds: number | null | undefined): number | null {
  return seconds != null && seconds > 0 ? Math.floor(seconds) : null;
}

function totalSets(plan: readonly SessionExercise[]): number {
  return plan.reduce((sum, exercise) => sum + clampSets(exercise.sets), 0);
}

function initialState(plan: readonly SessionExercise[]): SessionState {
  return {
    phase: 'READY', currentExerciseIndex: 0, currentSet: 1, completedSets: 0,
    totalSets: totalSets(plan), phaseElapsedSeconds: 0, totalElapsedSeconds: 0,
    isRunning: false, startedAt: null, completedAt: null,
  };
}

function isActive(phase: SessionPhase): boolean {
  return phase === 'EXERCISING' || phase === 'RESTING';
}

function deriveFor(plan: readonly SessionExercise[], state: SessionState, restTarget: RestTarget): SessionDerived {
  const currentExercise = plan[state.currentExerciseIndex];
  const total = totalSets(plan);
  let completed = 0;
  for (let index = 0; index < Math.min(state.currentExerciseIndex, plan.length); index += 1) {
    completed += clampSets(plan[index].sets);
  }
  if (state.phase === 'COMPLETED') completed = total;
  else if (state.phase === 'RESTING' && restTarget === 'exercise') completed += clampSets(currentExercise?.sets);
  else completed += Math.max(0, state.currentSet - 1);

  const phaseDurationSeconds = state.phase === 'RESTING'
    ? normalizeDuration(currentExercise?.restSeconds)
    : state.phase === 'EXERCISING' || state.phase === 'READY'
      ? normalizeDuration(currentExercise?.durationSeconds)
      : null;
  return {
    currentExercise, totalExercises: plan.length, totalSets: total,
    completedSets: completed, progress: total > 0 ? Math.min(1, completed / total) : 0,
    phaseDurationSeconds,
    secondsLeft: phaseDurationSeconds == null ? null : Math.max(0, phaseDurationSeconds - state.phaseElapsedSeconds),
  };
}

function withDerived(plan: readonly SessionExercise[], state: SessionState, restTarget: RestTarget): SessionState {
  const derived = deriveFor(plan, state, restTarget);
  return {...state, totalSets: derived.totalSets, completedSets: derived.completedSets};
}

function stateEffect(state: SessionState): SessionEffect {
  return {kind: 'STATE_CHANGED', state};
}

function hydratedState(
  plan: readonly SessionExercise[],
  current: SessionState,
  input: SessionHydrateInput,
  now: number,
): SessionState {
  const index = Math.min(Math.max(Math.floor(input.currentExerciseIndex ?? 0), 0), plan.length - 1);
  const exercise = plan[index];
  const sets = clampSets(exercise?.sets);
  const set = Math.min(Math.max(Math.floor(input.currentSet ?? 1), 1), sets);
  const phase: SessionPhase = input.phase === 'RESTING' || input.phase === 'COMPLETED' || input.phase === 'READY'
    ? input.phase
    : 'EXERCISING';
  const duration = normalizeDuration(phase === 'RESTING' ? exercise?.restSeconds : exercise?.durationSeconds);
  let phaseElapsedSeconds = Math.max(0, Math.floor(input.phaseElapsedSeconds ?? 0));
  if (duration != null && phaseElapsedSeconds >= duration) phaseElapsedSeconds = Math.max(0, duration - 1);
  return {
    ...current,
    phase,
    currentExerciseIndex: index,
    currentSet: set,
    phaseElapsedSeconds,
    totalElapsedSeconds: Math.max(0, Math.floor(input.totalElapsedSeconds ?? 0)),
    isRunning: false,
    startedAt: input.startedAt ?? null,
    completedAt: input.completedAt ?? (phase === 'COMPLETED' ? now : null),
  };
}

export function createSessionCore(plan: readonly SessionExercise[]): SessionCore {
  const exercises = plan.map((exercise) => ({...exercise}));
  let currentState = initialState(exercises);
  let restTarget: RestTarget = 'set';

  const goToExercise = (state: SessionState, index: number): SessionState => ({
    ...state,
    currentExerciseIndex: Math.min(Math.max(index, 0), exercises.length - 1),
    currentSet: 1, phaseElapsedSeconds: 0, phase: 'EXERCISING', isRunning: true,
  });

  const transition = (command: SessionCommand, now = 0): TransitionResult => {
    const before = currentState;
    let next = before;
    const effects: SessionEffect[] = [];
    const exercise = exercises[before.currentExerciseIndex];

    switch (command.kind) {
      case 'START':
        if (before.phase === 'READY' && exercises.length > 0) next = {...before, phase: 'EXERCISING', phaseElapsedSeconds: 0, isRunning: true, startedAt: now, completedAt: null};
        break;
      case 'PAUSE':
        if (isActive(before.phase)) next = {...before, isRunning: false};
        break;
      case 'RESUME':
        if (isActive(before.phase)) next = {...before, isRunning: true};
        break;
      case 'COMPLETE_SET': {
        if (before.phase !== 'EXERCISING' || !exercise) break;
        const sets = clampSets(exercise.sets);
        const lastSet = before.currentSet >= sets;
        const lastExercise = before.currentExerciseIndex >= exercises.length - 1;
        effects.push({kind: 'SET_COMPLETED', exerciseIndex: before.currentExerciseIndex, set: before.currentSet});
        if (lastSet) {
          effects.push({kind: 'EXERCISE_COMPLETED', exerciseIndex: before.currentExerciseIndex});
          if (lastExercise) {
            const total = totalSets(exercises);
            next = {...before, phase: 'COMPLETED', isRunning: false, phaseElapsedSeconds: 0, completedAt: now};
            effects.push({kind: 'WORKOUT_COMPLETED', summary: {totalExercises: exercises.length, totalSets: total, completedSets: total, durationSeconds: before.totalElapsedSeconds} satisfies SessionSummary});
          } else if (normalizeDuration(exercise.restSeconds) != null) {
            restTarget = 'exercise';
            next = {...before, phase: 'RESTING', phaseElapsedSeconds: 0, isRunning: true};
          } else next = goToExercise(before, before.currentExerciseIndex + 1);
        } else {
          restTarget = normalizeDuration(exercise.restSeconds) != null ? 'set' : restTarget;
          next = {...before, currentSet: before.currentSet + 1, phase: restTarget === 'set' ? 'RESTING' : 'EXERCISING', phaseElapsedSeconds: 0, isRunning: true};
        }
        break;
      }
      case 'SKIP_REST':
        if (before.phase === 'RESTING' && exercise) next = restTarget === 'set'
          ? {...before, phase: 'EXERCISING', phaseElapsedSeconds: 0, isRunning: true}
          : goToExercise(before, before.currentExerciseIndex + 1);
        break;
      case 'NEXT_EXERCISE':
        if (isActive(before.phase) && exercises.length > 0) next = goToExercise(before, before.currentExerciseIndex + 1);
        break;
      case 'PREVIOUS_EXERCISE':
        if (isActive(before.phase) && exercises.length > 0) next = goToExercise(before, before.currentExerciseIndex - 1);
        break;
      case 'JUMP_TO':
        if (isActive(before.phase) && exercises.length > 0) next = goToExercise(before, command.index);
        break;
      case 'RESET':
        restTarget = 'set';
        next = initialState(exercises);
        break;
      case 'RESTART':
        if (exercises.length > 0) {
          restTarget = 'set';
          next = {...initialState(exercises), phase: 'EXERCISING', isRunning: true, startedAt: now};
        }
        break;
      case 'HYDRATE':
        if (before.phase === 'READY' && !before.isRunning && exercises.length > 0) next = hydratedState(exercises, before, command.input, now);
        if (next.phase === 'RESTING') restTarget = next.currentSet >= clampSets(exercises[next.currentExerciseIndex]?.sets) ? 'exercise' : 'set';
        break;
      case 'ACCOUNT': {
        const elapsed = Math.max(0, Math.floor(command.elapsedSeconds));
        if (before.isRunning && isActive(before.phase) && elapsed > 0) {
          const accounted = {...before, phaseElapsedSeconds: before.phaseElapsedSeconds + elapsed, totalElapsedSeconds: before.totalElapsedSeconds + elapsed};
          const duration = normalizeDuration(before.phase === 'RESTING' ? exercise?.restSeconds : exercise?.durationSeconds);
          if (duration != null && accounted.phaseElapsedSeconds >= duration) {
            currentState = accounted;
            const advanced = transition({kind: before.phase === 'EXERCISING' ? 'COMPLETE_SET' : 'SKIP_REST'}, now);
            return advanced;
          }
          next = accounted;
        }
        break;
      }
    }

    next = withDerived(exercises, next, restTarget);
    if (next !== before) {
      if (next.phase !== before.phase && command.kind !== 'HYDRATE') {
        effects.push(stateEffect(next));
        effects.push({kind: 'PHASE_CHANGED', phase: next.phase});
      } else {
        effects.push(stateEffect(next));
      }
    }
    currentState = next;
    return {state: {...next}, effects};
  };

  return {
    plan: exercises,
    get state() { return {...currentState}; },
    transition,
    derive: (state = currentState) => deriveFor(exercises, state, restTarget),
  };
}
