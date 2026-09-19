/**
 * Workout V2 orchestration authority.
 *
 * The orchestrator owns lifecycle, applicability, and global sequencing. Run
 * 1 capabilities (`setCapability.ts` and `restCapability.ts`) own only their
 * local state/result contracts and return intents here. Presentation renders
 * the view-model and dispatches typed actions; it never routes globally.
 */

import {
  type ExperienceModuleId,
  type ResolvedPrescription,
  type RestKind,
  type SessionAction,
  type SessionOrchestrationEffect,
  type SessionViewModel,
  initialModuleStates,
} from './sessionV2Contracts';
import {createRestCapability, type RestCapability} from './restCapability';
import {createSetCapability, type SetCapability} from './setCapability';

/** PREPARING remains the first-slice implementation decision. */
export const PREPARING_DURATION_SECONDS = 5;
/** SET_RESULT is stable evidence, not a global routing authority. */
export const SET_RESULT_DURATION_SECONDS = 2;
/** INTRO remains hands-free; Run 1 attaches the deterministic SET handoff. */
export const INTRO_HANDOFF_DELAY_MS = 3_000;

export type OrchestrationState = SessionViewModel;

export interface OrchestrationTransition {
  state: OrchestrationState;
  effects: SessionOrchestrationEffect[];
}

function isStartModule(moduleId: ExperienceModuleId | null): boolean {
  return moduleId === 'START';
}

function isPreparingModule(moduleId: ExperienceModuleId | null): boolean {
  return moduleId === 'PREPARING';
}

function isIntroModule(moduleId: ExperienceModuleId | null): boolean {
  return moduleId === 'EXERCISE_INTRO';
}

function initialViewModel(prescription: ResolvedPrescription): OrchestrationState {
  const modules = initialModuleStates();
  const totalSetCount = prescription.exercises.reduce((total, exercise) => total + exercise.setCount, 0);
  return {
    lifecycle: 'READY_TO_START',
    activeModule: 'START',
    modules,
    activeExercise: prescription.exercises[0] ?? null,
    activeExerciseIndex: prescription.exercises.length > 0 ? 0 : null,
    introExercise: null,
    preparingSecondsRemaining: null,
    executionElapsedSeconds: 0,
    pausedFromModule: null,
    setProgress: null,
    setResult: null,
    restState: null,
    currentSetNumber: null,
    completedSetCount: 0,
    totalSetCount,
  };
}

/** Creates one session-level sequencing authority over a resolved prescription. */
export function createSessionOrchestrator(prescription: ResolvedPrescription) {
  let state = initialViewModel(prescription);
  let setCapability: SetCapability | null = null;
  let restCapability: RestCapability | null = null;

  const setActiveModule = (modules: OrchestrationState['modules'], moduleId: ExperienceModuleId): OrchestrationState['modules'] => ({
    ...modules,
    START: moduleId === 'START' ? 'ACTIVE' : modules.START === 'ACTIVE' ? 'DONE' : modules.START,
    PREPARING: moduleId === 'PREPARING' ? 'ACTIVE' : modules.PREPARING === 'ACTIVE' ? 'DONE' : modules.PREPARING,
    EXERCISE_INTRO: moduleId === 'EXERCISE_INTRO' ? 'ACTIVE' : modules.EXERCISE_INTRO === 'ACTIVE' ? 'DONE' : modules.EXERCISE_INTRO,
    WORK_SET: moduleId === 'WORK_SET' ? 'ACTIVE' : modules.WORK_SET === 'ACTIVE' ? 'DONE' : modules.WORK_SET,
    SET_RESULT: moduleId === 'SET_RESULT' ? 'ACTIVE' : modules.SET_RESULT === 'ACTIVE' ? 'DONE' : modules.SET_RESULT,
    REST: moduleId === 'REST' ? 'ACTIVE' : modules.REST === 'ACTIVE' ? 'DONE' : modules.REST,
  }) as OrchestrationState['modules'];

  const emitModuleChange = (moduleId: ExperienceModuleId): SessionOrchestrationEffect => ({kind: 'MODULE_CHANGED', moduleId});

  const activateSet = (exerciseIndex: number, setNumber: number): OrchestrationTransition => {
    const exercise = prescription.exercises[exerciseIndex];
    if (!exercise) return {state, effects: []};
    setCapability = createSetCapability(exercise, setNumber);
    restCapability = null;
    const next: OrchestrationState = {
      ...state,
      lifecycle: 'RUNNING',
      activeModule: 'WORK_SET',
      modules: setActiveModule(state.modules, 'WORK_SET'),
      activeExercise: exercise,
      activeExerciseIndex: exerciseIndex,
      introExercise: null,
      setProgress: setCapability.state,
      setResult: null,
      restState: null,
      currentSetNumber: setNumber,
    };
    state = next;
    return {state: next, effects: [emitModuleChange('WORK_SET')]};
  };

  const started = (atMs: number): OrchestrationTransition => {
    if (!isStartModule(state.activeModule) || state.lifecycle !== 'READY_TO_START') return {state, effects: []};
    const next: OrchestrationState = {
      ...state,
      lifecycle: 'PREPARING',
      activeModule: 'PREPARING',
      modules: setActiveModule(state.modules, 'PREPARING'),
      preparingSecondsRemaining: PREPARING_DURATION_SECONDS,
    };
    state = next;
    return {state, effects: [{kind: 'SESSION_STARTED', startedAtMs: atMs}, emitModuleChange('PREPARING')]};
  };

  const enterIntro = (exerciseIndex: number): OrchestrationTransition => {
    const exercise = prescription.exercises[exerciseIndex];
    if (!exercise) return {state, effects: []};
    const next: OrchestrationState = {
      ...state,
      lifecycle: 'AWAITING_WORK_SET',
      activeModule: 'EXERCISE_INTRO',
      modules: setActiveModule(state.modules, 'EXERCISE_INTRO'),
      activeExercise: exercise,
      activeExerciseIndex: exerciseIndex,
      introExercise: exercise,
      currentSetNumber: 1,
      setProgress: null,
      setResult: null,
      restState: null,
    };
    state = next;
    return {state: next, effects: [emitModuleChange('EXERCISE_INTRO')]};
  };

  const completeSet = (): OrchestrationTransition => {
    if (!setCapability || state.activeExerciseIndex == null || state.currentSetNumber == null) return {state, effects: []};
    const progress = setCapability.state;
    if (progress.status !== 'COMPLETE') return {state, effects: []};
    const exerciseIndex = state.activeExerciseIndex;
    const exercise = prescription.exercises[exerciseIndex];
    if (!exercise) return {state, effects: []};
    const setNumber = state.currentSetNumber;
    const isFinalSet = setNumber >= exercise.setCount;
    const isFinalExercise = exerciseIndex >= prescription.exercises.length - 1;
    const result = {
      exerciseIndex,
      setNumber,
      setCount: exercise.setCount,
      executionMode: progress.executionMode,
      completedReps: progress.completedReps,
      targetReps: progress.targetReps,
      elapsedSeconds: progress.elapsedSeconds,
      targetSeconds: progress.targetSeconds,
      isFinalSet,
      isFinalExercise,
      elapsedInResultSeconds: 0,
    } as const;
    const next: OrchestrationState = {
      ...state,
      lifecycle: 'SET_RESULT',
      activeModule: 'SET_RESULT',
      modules: setActiveModule(state.modules, 'SET_RESULT'),
      setProgress: progress,
      setResult: result,
      restState: null,
      completedSetCount: (state.completedSetCount ?? 0) + 1,
    };
    state = next;
    return {
      state: next,
      effects: [
        {kind: 'SET_COMPLETED', exerciseIndex, setNumber},
        {kind: 'SET_RESULT_READY', exerciseIndex, setNumber},
        emitModuleChange('SET_RESULT'),
      ],
    };
  };

  const startRest = (kind: RestKind, seconds: number): OrchestrationTransition => {
    if (seconds <= 0) return {state, effects: []};
    restCapability = createRestCapability(kind, seconds);
    const next: OrchestrationState = {
      ...state,
      lifecycle: 'RESTING',
      activeModule: 'REST',
      modules: setActiveModule(state.modules, 'REST'),
      setResult: null,
      restState: restCapability.state,
    };
    state = next;
    return {
      state: next,
      effects: [
        {kind: 'REST_STARTED', restKind: kind, seconds},
        emitModuleChange('REST'),
      ],
    };
  };

  const finishRest = (): OrchestrationTransition => {
    if (!restCapability || state.activeExerciseIndex == null || state.currentSetNumber == null) return {state, effects: []};
    const kind = restCapability.state.kind;
    const exerciseIndex = state.activeExerciseIndex;
    const currentSetNumber = state.currentSetNumber;
    const exercise = prescription.exercises[exerciseIndex];
    if (!exercise) return {state, effects: []};
    state = {...state, restState: restCapability.state, setResult: null};
    const transition = kind === 'BETWEEN_SETS'
      ? activateSet(exerciseIndex, currentSetNumber + 1)
      : enterIntro(exerciseIndex + 1);
    transition.effects.unshift({kind: 'REST_COMPLETED', restKind: kind});
    return transition;
  };

  const afterSetResult = (): OrchestrationTransition => {
    if (!state.setResult || state.activeExerciseIndex == null || state.currentSetNumber == null) return {state, effects: []};
    const result = state.setResult;
    if (result.isFinalSet && result.isFinalExercise) {
      // WP-12 owns WORKOUT_RESULT/EXIT. Run 1 freezes final SET_RESULT and
      // never creates a terminal REST.
      return {state, effects: []};
    }
    const exercise = prescription.exercises[state.activeExerciseIndex];
    if (!exercise) return {state, effects: []};
    const kind: RestKind = result.isFinalSet ? 'BETWEEN_EXERCISES' : 'BETWEEN_SETS';
    const restSeconds = exercise.restSeconds ?? 0;
    if (restSeconds > 0) return startRest(kind, restSeconds);
    return result.isFinalSet
      ? enterIntro(state.activeExerciseIndex + 1)
      : activateSet(state.activeExerciseIndex, state.currentSetNumber + 1);
  };

  const advance = (elapsedSeconds: number): OrchestrationTransition => {
    const elapsed = Math.max(0, Math.floor(elapsedSeconds));
    if (elapsed <= 0 || state.lifecycle === 'PAUSED') return {state, effects: []};

    if (isPreparingModule(state.activeModule) && state.lifecycle === 'PREPARING') {
      const remaining = Math.max(0, (state.preparingSecondsRemaining ?? 0) - elapsed);
      const total = state.executionElapsedSeconds + elapsed;
      if (remaining > 0) {
        const next = {...state, preparingSecondsRemaining: remaining, executionElapsedSeconds: total};
        state = next;
        return {state: next, effects: []};
      }
      const next: OrchestrationState = {
        ...state,
        lifecycle: 'AWAITING_WORK_SET',
        activeModule: 'EXERCISE_INTRO',
        modules: setActiveModule(state.modules, 'EXERCISE_INTRO'),
        introExercise: state.activeExercise,
        preparingSecondsRemaining: null,
        executionElapsedSeconds: total,
      };
      state = next;
      return {state: next, effects: [emitModuleChange('EXERCISE_INTRO')]};
    }

    if (state.lifecycle === 'RUNNING' && setCapability) {
      const transition = setCapability.advance(elapsed);
      const next = {...state, executionElapsedSeconds: state.executionElapsedSeconds + elapsed, setProgress: transition.state};
      state = next;
      return transition.completed ? completeSet() : {state: next, effects: []};
    }

    if (state.lifecycle === 'SET_RESULT' && state.setResult) {
      const resultElapsed = Math.min(SET_RESULT_DURATION_SECONDS, state.setResult.elapsedInResultSeconds + elapsed);
      const next = {...state, executionElapsedSeconds: state.executionElapsedSeconds + elapsed, setResult: {...state.setResult, elapsedInResultSeconds: resultElapsed}};
      state = next;
      return resultElapsed >= SET_RESULT_DURATION_SECONDS ? afterSetResult() : {state: next, effects: []};
    }

    if (state.lifecycle === 'RESTING' && restCapability) {
      const transition = restCapability.advance(elapsed);
      const next = {...state, executionElapsedSeconds: state.executionElapsedSeconds + elapsed, restState: transition.state};
      state = next;
      return transition.completed ? finishRest() : {state: next, effects: []};
    }

    return {state, effects: []};
  };

  const freeze = (duringModule: ExperienceModuleId | null): OrchestrationTransition => {
    if (!['PREPARING', 'RUNNING', 'AWAITING_WORK_SET', 'SET_RESULT', 'RESTING'].includes(state.lifecycle)) return {state, effects: []};
    const next = {...state, lifecycle: 'PAUSED' as const, pausedFromModule: state.activeModule};
    state = next;
    return {state: next, effects: [{kind: 'PAUSED', duringModule}]};
  };

  const unfreeze = (): OrchestrationTransition => {
    if (state.lifecycle !== 'PAUSED') return {state, effects: []};
    const duringModule = state.pausedFromModule;
    const lifecycle = duringModule === 'PREPARING'
      ? 'PREPARING'
      : duringModule === 'EXERCISE_INTRO'
        ? 'AWAITING_WORK_SET'
        : duringModule === 'SET_RESULT'
          ? 'SET_RESULT'
          : duringModule === 'REST'
            ? 'RESTING'
            : 'RUNNING';
    const next = {...state, lifecycle: lifecycle as OrchestrationState['lifecycle'], pausedFromModule: null};
    state = next;
    return {state: next, effects: [{kind: 'RESUMED', duringModule}]};
  };

  const beginWorkSet = (): OrchestrationTransition => {
    if (!isIntroModule(state.activeModule) || state.lifecycle !== 'AWAITING_WORK_SET' || state.activeExerciseIndex == null) return {state, effects: []};
    return activateSet(state.activeExerciseIndex, state.currentSetNumber ?? 1);
  };

  const recordRep = (): OrchestrationTransition => {
    if (state.lifecycle !== 'RUNNING' || !setCapability) return {state, effects: []};
    const transition = setCapability.recordRep();
    const next = {...state, setProgress: transition.state};
    state = next;
    return transition.completed ? completeSet() : {state: next, effects: []};
  };

  const skipRest = (): OrchestrationTransition => {
    if (state.lifecycle !== 'RESTING' || !restCapability) return {state, effects: []};
    restCapability.skip();
    state = {...state, restState: restCapability.state};
    return finishRest();
  };

  return {
    get state(): OrchestrationState {
      return {
        ...state,
        modules: {...state.modules},
        setProgress: state.setProgress ? {...state.setProgress} : state.setProgress,
        setResult: state.setResult ? {...state.setResult} : state.setResult,
        restState: state.restState ? {...state.restState} : state.restState,
      };
    },
    advance,
    dispatch(action: SessionAction, atMs = Date.now()): OrchestrationTransition {
      switch (action.type) {
        case 'START_SESSION': return started(atMs);
        case 'PAUSE': return freeze(state.activeModule);
        case 'RESUME': return unfreeze();
        case 'BEGIN_WORK_SET': return beginWorkSet();
        case 'RECORD_REP': return recordRep();
        case 'SKIP_REST': return skipRest();
        default: {
          const exhaustive: never = action;
          void exhaustive;
          return {state, effects: []};
        }
      }
    },
  };
}

export type SessionOrchestrator = ReturnType<typeof createSessionOrchestrator>;
