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
  type SessionExerciseOutcome,
  type SessionOrchestrationEffect,
  type SessionViewModel,
  type WorkoutResultSummary,
  initialModuleStates,
} from './sessionV2Contracts';
import {createRestCapability, type RestCapability} from './restCapability';
import {createSetCapability, type SetCapability} from './setCapability';
import {capabilityUnavailable, resolveRuntimeExecution, type NormalizedMovementEvidence, type RuntimeCapabilitySnapshot} from './executionStrategy';

/** PREPARING remains the first-slice implementation decision. */
export const PREPARING_DURATION_SECONDS = 5;
/** SET_RESULT is stable evidence, not a global routing authority. */
export const SET_RESULT_DURATION_SECONDS = 2;

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

function initialExerciseOutcomes(prescription: ResolvedPrescription): SessionExerciseOutcome[] {
  return prescription.exercises.map((_, exerciseIndex) => ({exerciseIndex, status: 'PENDING'}));
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
    exerciseOutcomes: initialExerciseOutcomes(prescription),
    completionEligible: prescription.exercises.length === 0,
    workoutResult: null,
    exitRequested: false,
  };
}

/** Creates one session-level sequencing authority over a resolved prescription. */
export interface SessionExecutionOptions { readonly capability?: RuntimeCapabilitySnapshot; }

export function createSessionOrchestrator(prescription: ResolvedPrescription, options: SessionExecutionOptions = {}) {
  let state = initialViewModel(prescription);
  const exerciseOrder = prescription.exercises.map((_, exerciseIndex) => exerciseIndex);
  const capability = options.capability ?? capabilityUnavailable();
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
    WORKOUT_RESULT: moduleId === 'WORKOUT_RESULT' ? 'ACTIVE' : modules.WORKOUT_RESULT === 'ACTIVE' ? 'DONE' : modules.WORKOUT_RESULT,
  }) as OrchestrationState['modules'];

  const emitModuleChange = (moduleId: ExperienceModuleId | null): SessionOrchestrationEffect => ({kind: 'MODULE_CHANGED', moduleId});

  const outcomeStatus = (exerciseIndex: number) =>
    state.exerciseOutcomes.find((outcome) => outcome.exerciseIndex === exerciseIndex)?.status ?? 'PENDING';

  const withOutcome = (
    exerciseIndex: number,
    status: SessionExerciseOutcome['status'],
  ): SessionExerciseOutcome[] =>
    state.exerciseOutcomes.map((outcome) =>
      outcome.exerciseIndex === exerciseIndex ? {...outcome, status} : outcome,
    );

  const completionEligible = (outcomes: readonly SessionExerciseOutcome[]) =>
    outcomes.every((outcome) => outcome.status === 'COMPLETED' || outcome.status === 'SKIPPED_FOR_SESSION');

  const currentOrderPosition = () =>
    state.activeExerciseIndex == null ? -1 : exerciseOrder.indexOf(state.activeExerciseIndex);

  const nextExerciseIndex = (fromPosition: number): number | null => {
    const pendingAfter = exerciseOrder
      .slice(Math.max(0, fromPosition + 1))
      .find((exerciseIndex) => outcomeStatus(exerciseIndex) === 'PENDING');
    if (pendingAfter != null) return pendingAfter;
    const deferred = exerciseOrder.find((exerciseIndex) => outcomeStatus(exerciseIndex) === 'OUTSTANDING_DEFERRED');
    return deferred ?? null;
  };

  const markActiveExercise = (exerciseIndex: number): SessionExerciseOutcome[] => {
    const status = outcomeStatus(exerciseIndex);
    return status === 'PENDING' ? withOutcome(exerciseIndex, 'ACTIVE') : state.exerciseOutcomes.slice();
  };

  const resultSummary = (outcomes: readonly SessionExerciseOutcome[]): WorkoutResultSummary => ({
    totalExercises: outcomes.length,
    completedExercises: outcomes.filter((outcome) => outcome.status === 'COMPLETED').length,
    skippedExercises: outcomes.filter((outcome) => outcome.status === 'SKIPPED_FOR_SESSION').length,
    completedSets: state.completedSetCount ?? 0,
    totalSets: state.totalSetCount ?? 0,
    completionKind: outcomes.every((outcome) => outcome.status === 'COMPLETED')
      ? 'COMPLETED_FULLY'
      : outcomes.every((outcome) => outcome.status === 'SKIPPED_FOR_SESSION') && state.completedSetCount === 0
        ? 'ENDED_WITHOUT_COMPLETION'
        : 'COMPLETED_PARTIALLY',
  });

  const enterWorkoutResult = (): OrchestrationTransition => {
    if (!completionEligible(state.exerciseOutcomes)) return {state, effects: []};
    const summary = resultSummary(state.exerciseOutcomes);
    const next: OrchestrationState = {
      ...state,
      lifecycle: 'WORKOUT_RESULT',
      activeModule: 'WORKOUT_RESULT',
      modules: setActiveModule(state.modules, 'WORKOUT_RESULT'),
      activeExercise: null,
      activeExerciseIndex: null,
      introExercise: null,
      setProgress: null,
      setResult: null,
      restState: null,
      completionEligible: true,
      workoutResult: summary,
    };
    state = next;
    return {
      state: next,
      effects: [{kind: 'WORKOUT_RESULT_READY', summary}, emitModuleChange('WORKOUT_RESULT')],
    };
  };

  const activateSet = (exerciseIndex: number, setNumber: number): OrchestrationTransition => {
    const exercise = prescription.exercises[exerciseIndex];
    if (!exercise) return {state, effects: []};
    setCapability = createSetCapability(exercise, resolveRuntimeExecution(exercise, capability), setNumber);
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
      exerciseOutcomes: markActiveExercise(exerciseIndex),
      completionEligible: false,
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
    const status = outcomeStatus(exerciseIndex);
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
      exerciseOutcomes: status === 'PENDING' ? withOutcome(exerciseIndex, 'ACTIVE') : state.exerciseOutcomes,
      completionEligible: false,
    };
    state = next;
    return {state: next, effects: [emitModuleChange('EXERCISE_INTRO')]};
  };

  const enterNextExercise = (fromPosition: number): OrchestrationTransition => {
    const exerciseIndex = nextExerciseIndex(fromPosition);
    if (exerciseIndex == null) {
      if (completionEligible(state.exerciseOutcomes)) return enterWorkoutResult();
      const next: OrchestrationState = {
        ...state,
        activeModule: null,
        activeExercise: null,
        activeExerciseIndex: null,
        introExercise: null,
        setProgress: null,
        setResult: null,
        restState: null,
        completionEligible: completionEligible(state.exerciseOutcomes),
      };
      state = next;
      return {state: next, effects: [emitModuleChange(null)]};
    }
    return enterIntro(exerciseIndex);
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
    const isFinalExercise = isFinalSet && !state.exerciseOutcomes.some(
      (outcome) => outcome.exerciseIndex !== exerciseIndex &&
        (outcome.status === 'PENDING' || outcome.status === 'ACTIVE' || outcome.status === 'OUTSTANDING_DEFERRED'),
    );
    const outcomes = isFinalSet ? withOutcome(exerciseIndex, 'COMPLETED') : state.exerciseOutcomes;
    const result = {
      exerciseIndex,
      setNumber,
      setCount: exercise.setCount,
      executionMode: progress.executionMode,
      runtimeStrategy: progress.runtimeStrategy,
      trackingState: progress.trackingState,
      performedRepCount: progress.performedRepCount,
      validRepCount: progress.validRepCount,
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
      exerciseOutcomes: outcomes,
      completionEligible: completionEligible(outcomes),
    };
    state = next;
    return {
      state: next,
      effects: [
        {kind: 'SET_COMPLETED', exerciseIndex, setNumber},
        {kind: 'SET_RESULT_READY', exerciseIndex, setNumber},
        ...(isFinalSet ? [{kind: 'EXERCISE_COMPLETED', exerciseIndex} as const] : []),
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
      : enterNextExercise(currentOrderPosition());
    transition.effects.unshift({kind: 'REST_COMPLETED', restKind: kind});
    return transition;
  };

  const afterSetResult = (): OrchestrationTransition => {
    if (!state.setResult || state.activeExerciseIndex == null || state.currentSetNumber == null) return {state, effects: []};
    const result = state.setResult;
    if (result.isFinalSet && result.isFinalExercise) {
      return enterWorkoutResult();
    }
    const exercise = prescription.exercises[state.activeExerciseIndex];
    if (!exercise) return {state, effects: []};
    const kind: RestKind = result.isFinalSet ? 'BETWEEN_EXERCISES' : 'BETWEEN_SETS';
    const restSeconds = exercise.restSeconds ?? 0;
    if (restSeconds > 0) return startRest(kind, restSeconds);
    return result.isFinalSet
      ? enterNextExercise(currentOrderPosition())
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
        currentSetNumber: 1,
        exerciseOutcomes: state.activeExerciseIndex == null ? state.exerciseOutcomes : markActiveExercise(state.activeExerciseIndex),
        completionEligible: false,
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
    if (outcomeStatus(state.activeExerciseIndex) === 'OUTSTANDING_DEFERRED') return {state, effects: []};
    return activateSet(state.activeExerciseIndex, state.currentSetNumber ?? 1);
  };

  const movementEvidence = (evidence: NormalizedMovementEvidence): OrchestrationTransition => {
    if (state.lifecycle !== 'RUNNING' || !setCapability) return {state, effects: []};
    const transition = setCapability.recordMovementEvidence(evidence);
    const next = {...state, setProgress: transition.state};
    state = next;
    return transition.completed ? completeSet() : {state: next, effects: []};
  };

  const trackingLost = (): OrchestrationTransition => {
    if (state.lifecycle !== 'RUNNING' || !setCapability) return {state, effects: []};
    const transition = setCapability.markTrackingLost();
    state = {...state, setProgress: transition.state};
    return {state, effects: []};
  };

  const trackingReacquired = (): OrchestrationTransition => {
    if (state.lifecycle !== 'RUNNING' || !setCapability) return {state, effects: []};
    const transition = setCapability.markTrackingReacquired();
    state = {...state, setProgress: transition.state};
    return {state, effects: []};
  };

  const trackingUnrecoverable = (fallbackRemainingSeconds: number): OrchestrationTransition => {
    if (state.lifecycle !== 'RUNNING' || !setCapability) return {state, effects: []};
    const transition = setCapability.switchToTimedFallback(fallbackRemainingSeconds);
    state = {...state, setProgress: transition.state};
    return {state, effects: []};
  };

  const skipRest = (): OrchestrationTransition => {
    if (state.lifecycle !== 'RESTING' || !restCapability) return {state, effects: []};
    restCapability.skip();
    state = {...state, restState: restCapability.state};
    return finishRest();
  };

  const requestExit = (): OrchestrationTransition => {
    if (state.lifecycle === 'EXIT_REQUESTED') return {state, effects: []};
    const next: OrchestrationState = {
      ...state,
      lifecycle: 'EXIT_REQUESTED',
      activeModule: null,
      pausedFromModule: state.activeModule,
      exitRequested: true,
    };
    state = next;
    return {state: next, effects: [{kind: 'EXIT_REQUESTED'}, emitModuleChange(null)]};
  };

  const confirmExit = (): OrchestrationTransition => {
    if (state.lifecycle !== 'EXIT_REQUESTED') return {state, effects: []};
    return {state, effects: [{kind: 'EXIT_CONFIRMED'}]};
  };

  const cancelExit = (): OrchestrationTransition => {
    if (state.lifecycle !== 'EXIT_REQUESTED') return {state, effects: []};
    const moduleId = state.pausedFromModule;
    const lifecycle = moduleId === 'PREPARING'
      ? 'PREPARING'
      : moduleId === 'EXERCISE_INTRO'
        ? 'AWAITING_WORK_SET'
        : moduleId === 'SET_RESULT'
          ? 'SET_RESULT'
          : moduleId === 'REST'
            ? 'RESTING'
            : moduleId === 'WORKOUT_RESULT'
              ? 'WORKOUT_RESULT'
              : 'RUNNING';
    const next: OrchestrationState = {
      ...state,
      lifecycle,
      activeModule: moduleId,
      pausedFromModule: null,
      exitRequested: false,
    };
    state = next;
    return {state: next, effects: [{kind: 'EXIT_CANCELLED'}, emitModuleChange(moduleId)]};
  };

  const restartCurrentSet = (): OrchestrationTransition => {
    if (!['RUNNING', 'SET_RESULT'].includes(state.lifecycle) || state.activeExerciseIndex == null || state.currentSetNumber == null) return {state, effects: []};
    const exercise = prescription.exercises[state.activeExerciseIndex];
    if (!exercise) return {state, effects: []};
    const exerciseIndex = state.activeExerciseIndex;
    const setNumber = state.currentSetNumber;
    const wasResult = state.lifecycle === 'SET_RESULT';
    setCapability = createSetCapability(exercise, resolveRuntimeExecution(exercise, capability), setNumber);
    restCapability = null;
    const next: OrchestrationState = {
      ...state,
      lifecycle: 'RUNNING',
      activeModule: 'WORK_SET',
      modules: setActiveModule(state.modules, 'WORK_SET'),
      introExercise: null,
      setProgress: setCapability.state,
      setResult: null,
      restState: null,
      completedSetCount: Math.max(0, (state.completedSetCount ?? 0) - (wasResult ? 1 : 0)),
      exerciseOutcomes: withOutcome(state.activeExerciseIndex, 'ACTIVE'),
      completionEligible: false,
    };
    state = next;
    return {
      state: next,
      effects: [
        {kind: 'SET_RESTARTED', exerciseIndex, setNumber},
        emitModuleChange('WORK_SET'),
      ],
    };
  };

  const skipExercise = (): OrchestrationTransition => {
    if (!isIntroModule(state.activeModule) || state.lifecycle !== 'AWAITING_WORK_SET' || state.activeExerciseIndex == null) return {state, effects: []};
    const exerciseIndex = state.activeExerciseIndex;
    const outcomes = withOutcome(exerciseIndex, 'SKIPPED_FOR_SESSION');
    state = {
      ...state,
      exerciseOutcomes: outcomes,
      completionEligible: completionEligible(outcomes),
      setProgress: null,
      setResult: null,
      restState: null,
    };
    const transition = enterNextExercise(currentOrderPosition());
    transition.effects.unshift({kind: 'EXERCISE_SKIPPED', exerciseIndex});
    return transition;
  };

  const deferExercise = (disposition: 'MOVE_TO_END' | 'SKIP_FOR_SESSION'): OrchestrationTransition => {
    if (!isIntroModule(state.activeModule) || state.lifecycle !== 'AWAITING_WORK_SET' || state.activeExerciseIndex == null || state.currentSetNumber !== 1 || state.setProgress != null) return {state, effects: []};
    if (disposition === 'SKIP_FOR_SESSION') return skipExercise();
    const exerciseIndex = state.activeExerciseIndex;
    const position = currentOrderPosition();
    if (position < 0) return {state, effects: []};
    exerciseOrder.splice(position, 1);
    exerciseOrder.push(exerciseIndex);
    const outcomes = withOutcome(exerciseIndex, 'OUTSTANDING_DEFERRED');
    state = {
      ...state,
      exerciseOutcomes: outcomes,
      completionEligible: false,
      setProgress: null,
      setResult: null,
      restState: null,
    };
    const transition = enterNextExercise(-1);
    transition.effects.unshift({kind: 'EXERCISE_DEFERRED', exerciseIndex});
    return transition;
  };

  const resolveDeferredExercise = (disposition: 'PERFORM_NOW' | 'SKIP_FOR_SESSION'): OrchestrationTransition => {
    if (!isIntroModule(state.activeModule) || state.lifecycle !== 'AWAITING_WORK_SET' || state.activeExerciseIndex == null || outcomeStatus(state.activeExerciseIndex) !== 'OUTSTANDING_DEFERRED') return {state, effects: []};
    const exerciseIndex = state.activeExerciseIndex;
    if (disposition === 'SKIP_FOR_SESSION') return skipExercise();
    // Resolution is an orchestration boundary, not a presentation-only state
    // change. A deferred exercise that is explicitly performed now must enter
    // the real first Set in the same transition; otherwise the view returns to
    // INTRO with an ACTIVE outcome but no execution engine, which was the
    // rejected Beta behavior.
    const activated = activateSet(exerciseIndex, state.currentSetNumber ?? 1);
    activated.effects.unshift({kind: 'DEFERRED_EXERCISE_RESOLVED', exerciseIndex, disposition: 'PERFORM_NOW'});
    return activated;
  };

  return {
    get state(): OrchestrationState {
      return {
        ...state,
        modules: {...state.modules},
        setProgress: state.setProgress ? {...state.setProgress} : state.setProgress,
        setResult: state.setResult ? {...state.setResult} : state.setResult,
        restState: state.restState ? {...state.restState} : state.restState,
        exerciseOutcomes: state.exerciseOutcomes.map((outcome) => ({...outcome})),
        workoutResult: state.workoutResult ? {...state.workoutResult} : state.workoutResult,
      };
    },
    advance,
    dispatch(action: SessionAction, atMs = Date.now()): OrchestrationTransition {
      switch (action.type) {
        case 'START_SESSION': return started(atMs);
        case 'PAUSE': return freeze(state.activeModule);
        case 'RESUME': return unfreeze();
        case 'BEGIN_WORK_SET': return beginWorkSet();
        case 'MOVEMENT_EVIDENCE': return movementEvidence(action.evidence);
        case 'TRACKING_LOST': return trackingLost();
        case 'TRACKING_REACQUIRED': return trackingReacquired();
        case 'TRACKING_UNRECOVERABLE': return trackingUnrecoverable(action.fallbackRemainingSeconds);
        case 'SKIP_REST': return skipRest();
        case 'EXIT_WORKOUT': return requestExit();
        case 'CONFIRM_EXIT': return confirmExit();
        case 'CANCEL_EXIT': return cancelExit();
        case 'RESTART_CURRENT_SET': return restartCurrentSet();
        case 'DEFER_EXERCISE': return deferExercise(action.disposition);
        case 'RESOLVE_DEFERRED_EXERCISE': return resolveDeferredExercise(action.disposition);
        case 'SKIP_EXERCISE': return skipExercise();
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
