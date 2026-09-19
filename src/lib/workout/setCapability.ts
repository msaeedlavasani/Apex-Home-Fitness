/**
 * Reusable SET capability (Workout V2 WP-06).
 *
 * This module executes exactly one resolved Set. It owns mode-aware progress
 * and completion evidence, but never chooses REST, INTRO, the next Set, or a
 * global session destination. The orchestrator consumes its transitions.
 */

import type {ResolvedExercisePrescription, SetProgress} from './sessionV2Contracts';

export interface SetCapabilityTransition {
  readonly state: SetProgress;
  readonly completed: boolean;
}

function snapshot(
  prescription: ResolvedExercisePrescription,
  setNumber: number,
  state: Pick<SetProgress, 'status' | 'completedReps' | 'elapsedSeconds'>,
): SetProgress {
  const targetSeconds = prescription.targetSeconds;
  return {
    status: state.status,
    executionMode: prescription.executionMode,
    setNumber,
    setCount: prescription.setCount,
    completedReps: state.completedReps,
    targetReps: prescription.targetReps,
    elapsedSeconds: state.elapsedSeconds,
    targetSeconds,
    remainingSeconds:
      targetSeconds == null ? null : Math.max(0, targetSeconds - state.elapsedSeconds),
  };
}

export function createSetCapability(
  prescription: ResolvedExercisePrescription,
  setNumber: number,
) {
  let state = snapshot(prescription, setNumber, {
    status: 'ACTIVE',
    completedReps: 0,
    elapsedSeconds: 0,
  });

  const advance = (elapsedSeconds: number): SetCapabilityTransition => {
    if (state.status === 'COMPLETE' || elapsedSeconds <= 0) {
      return {state, completed: state.status === 'COMPLETE'};
    }
    if (state.executionMode !== 'TIME_BASED' || state.targetSeconds == null) {
      return {state, completed: false};
    }
    const elapsed = Math.min(state.targetSeconds, state.elapsedSeconds + Math.floor(elapsedSeconds));
    const complete = elapsed >= state.targetSeconds;
    state = snapshot(prescription, setNumber, {
      status: complete ? 'COMPLETE' : 'ACTIVE',
      completedReps: 0,
      elapsedSeconds: elapsed,
    });
    return {state, completed: complete};
  };

  const recordRep = (count = 1): SetCapabilityTransition => {
    if (state.status === 'COMPLETE' || state.executionMode !== 'REP_BASED' || count <= 0) {
      return {state, completed: state.status === 'COMPLETE'};
    }
    const target = state.targetReps ?? Number.MAX_SAFE_INTEGER;
    const completedReps = Math.min(target, state.completedReps + Math.floor(count));
    const complete = state.targetReps != null && completedReps >= state.targetReps;
    state = snapshot(prescription, setNumber, {
      status: complete ? 'COMPLETE' : 'ACTIVE',
      completedReps,
      elapsedSeconds: state.elapsedSeconds,
    });
    return {state, completed: complete};
  };

  return {
    get state(): SetProgress {
      return state;
    },
    advance,
    recordRep,
  };
}

export type SetCapability = ReturnType<typeof createSetCapability>;
