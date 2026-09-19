/**
 * Reusable REST capability (Workout V2 WP-07).
 *
 * REST owns only its typed countdown and local SKIP REST behavior. It returns
 * completion state to orchestration and never routes to SET, INTRO, or any
 * other global destination.
 */

import type {RestKind, RestState} from './sessionV2Contracts';

export interface RestCapabilityTransition {
  readonly state: RestState;
  readonly completed: boolean;
}

export function createRestCapability(kind: RestKind, totalSeconds: number) {
  const total = Math.max(0, Math.floor(totalSeconds));
  let state: RestState = {
    status: total === 0 ? 'COMPLETE' : 'ACTIVE',
    kind,
    elapsedSeconds: 0,
    totalSeconds: total,
    remainingSeconds: total,
  };

  const complete = (): RestCapabilityTransition => {
    state = {
      ...state,
      status: 'COMPLETE',
      elapsedSeconds: state.totalSeconds,
      remainingSeconds: 0,
    };
    return {state, completed: true};
  };

  const advance = (elapsedSeconds: number): RestCapabilityTransition => {
    if (state.status === 'COMPLETE' || elapsedSeconds <= 0) {
      return {state, completed: state.status === 'COMPLETE'};
    }
    const elapsed = Math.min(state.totalSeconds, state.elapsedSeconds + Math.floor(elapsedSeconds));
    state = {
      ...state,
      status: elapsed >= state.totalSeconds ? 'COMPLETE' : 'ACTIVE',
      elapsedSeconds: elapsed,
      remainingSeconds: Math.max(0, state.totalSeconds - elapsed),
    };
    return {state, completed: state.status === 'COMPLETE'};
  };

  return {
    get state(): RestState {
      return state;
    },
    advance,
    skip: complete,
  };
}

export type RestCapability = ReturnType<typeof createRestCapability>;
