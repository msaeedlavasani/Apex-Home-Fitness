import type {SessionExercise} from './sessionContracts';
import {
  capabilityUnavailable,
  type RuntimeCapabilitySnapshot,
} from './executionStrategy';

export type CapabilityGateStatus = 'CHECKING' | 'CHOICE_REQUIRED' | 'INITIALIZING' | 'READY';

export interface CapabilityGateState {
  readonly status: CapabilityGateStatus;
  readonly capability: RuntimeCapabilitySnapshot;
  readonly consented: boolean;
  readonly scopes: readonly string[];
  readonly reason: string | null;
}

export function initialCapabilityGateState(): CapabilityGateState {
  return {
    status: 'CHECKING',
    capability: capabilityUnavailable(),
    consented: false,
    scopes: [],
    reason: null,
  };
}

/** The current provider capability is squat-only; unsupported movements safely use fallback. */
export function capabilityGateScopes(exercises: readonly SessionExercise[]): readonly ['poseTracking:squat'] {
  void exercises;
  return ['poseTracking:squat'];
}

export function cameraCapabilityUnavailable(reason: string | null = null): CapabilityGateState {
  return {
    status: 'READY',
    capability: capabilityUnavailable(),
    consented: false,
    scopes: [],
    reason,
  };
}
