/** Reusable SET capability; runtime strategy is resolved before creation. */
import type {ResolvedExercisePrescription, SetProgress} from './sessionV2Contracts';
import type {NormalizedMovementEvidence, RuntimeExecutionResolution, TrackingState} from './executionStrategy';

export interface SetCapabilityTransition { readonly state: SetProgress; readonly completed: boolean; }
interface MutableState {
  status: 'ACTIVE' | 'COMPLETE';
  performedRepCount: number;
  validRepCount: number;
  elapsedSeconds: number;
  trackingState: TrackingState | null;
}

function snapshot(prescription: ResolvedExercisePrescription, runtime: RuntimeExecutionResolution, setNumber: number, state: MutableState): SetProgress {
  const targetSeconds = runtime.strategy === 'TIMED_FALLBACK' ? runtime.fallbackDurationSeconds : prescription.targetSeconds;
  return {
    status: state.status,
    executionMode: prescription.executionMode,
    runtimeStrategy: runtime.strategy,
    trackingState: state.trackingState,
    setNumber,
    setCount: prescription.setCount,
    performedRepCount: state.performedRepCount,
    validRepCount: state.validRepCount,
    completedReps: state.performedRepCount,
    targetReps: prescription.targetReps,
    elapsedSeconds: state.elapsedSeconds,
    targetSeconds,
    remainingSeconds: targetSeconds == null ? null : Math.max(0, targetSeconds - state.elapsedSeconds),
  };
}

export function createSetCapability(prescription: ResolvedExercisePrescription, runtime: RuntimeExecutionResolution, setNumber: number) {
  let state: MutableState = {status: 'ACTIVE', performedRepCount: 0, validRepCount: 0, elapsedSeconds: 0, trackingState: runtime.strategy === 'TRACKED_REP' ? 'TRACKED' : null};
  const view = (): SetProgress => snapshot(prescription, runtime, setNumber, state);

  const advance = (elapsedSeconds: number): SetCapabilityTransition => {
    if (state.status === 'COMPLETE' || elapsedSeconds <= 0) return {state: view(), completed: state.status === 'COMPLETE'};
    const targetSeconds = runtime.strategy === 'TIMED_FALLBACK' ? runtime.fallbackDurationSeconds : prescription.targetSeconds;
    if (targetSeconds == null || (runtime.strategy !== 'TIMED' && runtime.strategy !== 'TIMED_FALLBACK')) return {state: view(), completed: false};
    const elapsed = Math.min(targetSeconds, state.elapsedSeconds + Math.floor(elapsedSeconds));
    const complete = elapsed >= targetSeconds;
    state = {...state, status: complete ? 'COMPLETE' : 'ACTIVE', elapsedSeconds: elapsed};
    return {state: view(), completed: complete};
  };

  const recordMovementEvidence = (evidence: NormalizedMovementEvidence): SetCapabilityTransition => {
    if (state.status === 'COMPLETE' || runtime.strategy !== 'TRACKED_REP' || evidence.kind !== 'REP_ATTEMPT') return {state: view(), completed: state.status === 'COMPLETE'};
    const performedRepCount = state.performedRepCount + 1;
    const validRepCount = evidence.quality === 'VALID' ? state.validRepCount + 1 : state.validRepCount;
    const complete = prescription.targetReps != null && performedRepCount >= prescription.targetReps;
    state = {...state, status: complete ? 'COMPLETE' : 'ACTIVE', performedRepCount, validRepCount, trackingState: 'TRACKED'};
    return {state: view(), completed: complete};
  };

  const markTrackingLost = (): SetCapabilityTransition => {
    if (state.status === 'COMPLETE' || runtime.strategy !== 'TRACKED_REP') return {state: view(), completed: false};
    state = {...state, trackingState: 'TRACKING_LOST'};
    return {state: view(), completed: false};
  };
  const markTrackingReacquired = (): SetCapabilityTransition => {
    if (state.status === 'COMPLETE' || runtime.strategy !== 'TRACKED_REP') return {state: view(), completed: false};
    state = {...state, trackingState: 'TRACKED'};
    return {state: view(), completed: false};
  };
  const switchToTimedFallback = (fallbackRemainingSeconds: number): SetCapabilityTransition => {
    if (state.status === 'COMPLETE' || runtime.strategy !== 'TRACKED_REP' || fallbackRemainingSeconds < 1) return {state: view(), completed: state.status === 'COMPLETE'};
    runtime.strategy = 'TIMED_FALLBACK';
    runtime.fallbackDurationSeconds = Math.floor(fallbackRemainingSeconds);
    state = {...state, trackingState: 'REACQUIRE', elapsedSeconds: 0};
    return {state: view(), completed: false};
  };

  return {get state(): SetProgress { return view(); }, advance, recordMovementEvidence, markTrackingLost, markTrackingReacquired, switchToTimedFallback};
}

export type SetCapability = ReturnType<typeof createSetCapability>;
