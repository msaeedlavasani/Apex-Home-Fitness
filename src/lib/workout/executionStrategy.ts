import type {ResolvedExercisePrescription} from './sessionV2Contracts';

/** Runtime strategy is deliberately separate from the prescription mode. */
export type RuntimeExecutionStrategy = 'TRACKED_REP' | 'TIMED_FALLBACK' | 'TIMED';
export type TrackingState = 'TRACKED' | 'TRACKING_LOST' | 'REACQUIRE';
export type RepQuality = 'VALID' | 'INVALID' | 'UNCERTAIN';

export interface RuntimeCapabilitySnapshot {
  readonly camera: 'USABLE' | 'UNAVAILABLE';
  readonly poseHarness: 'READY' | 'UNREADY';
  readonly calibration: 'VALID' | 'UNAVAILABLE';
  /** Movement keys supported by the installed harness. */
  readonly supportedMovementKeys: readonly string[];
}

export interface NormalizedMovementEvidence {
  readonly kind: 'REP_ATTEMPT';
  readonly attemptId: string;
  readonly movementKey: string;
  readonly quality: RepQuality;
  readonly confidence: number | null;
  readonly observedAtMs: number;
}

export interface RuntimeExecutionResolution {
  readonly prescriptionMode: ResolvedExercisePrescription['executionMode'];
  strategy: RuntimeExecutionStrategy;
  fallbackDurationSeconds: number | null;
  readonly movementKey: string | null;
}

export type RuntimePrescriptionExercise = ResolvedExercisePrescription & {
  readonly fallbackDurationSeconds?: number | null;
};

/** Current CP-05 harness capability. Provider-specific inference stays outside this module. */
export function movementKeyForExercise(exercise: ResolvedExercisePrescription): string | null {
  const identity = `${exercise.exercise.slug ?? ''} ${exercise.exercise.name}`.toLowerCase();
  return identity.includes('squat') || identity.includes('اسکات') || identity.includes('اسکوات') ? 'squat' : null;
}

export function resolveRuntimeExecution(
  exercise: RuntimePrescriptionExercise,
  capability: RuntimeCapabilitySnapshot,
  setNumber = 1,
): RuntimeExecutionResolution {
  const set = exercise.sets?.[setNumber - 1] ?? exercise.sets?.[0] ?? {
    executionMode: exercise.executionMode,
    targetReps: exercise.targetReps,
    targetSeconds: exercise.targetSeconds,
    restSeconds: exercise.restSeconds,
    fallbackDurationSeconds: exercise.fallbackDurationSeconds ?? null,
  };
  const movementKey = movementKeyForExercise(exercise);
  const fallbackDurationSeconds = set.fallbackDurationSeconds;
  if (set.executionMode === 'TIME_BASED') {
    return {prescriptionMode: 'TIME_BASED', strategy: 'TIMED', fallbackDurationSeconds: null, movementKey};
  }

  const usableTracking = capability.camera === 'USABLE'
    && capability.poseHarness === 'READY'
    && capability.calibration === 'VALID'
    && ((movementKey != null && capability.supportedMovementKeys.includes(movementKey))
      || capability.supportedMovementKeys.includes('*'));

  if (usableTracking) {
    return {prescriptionMode: 'REP_BASED', strategy: 'TRACKED_REP', fallbackDurationSeconds, movementKey};
  }

  if (fallbackDurationSeconds == null) {
    throw new Error(`REP_BASED exercise "${exercise.exercise.id}" has no resolved fallback duration`);
  }
  return {prescriptionMode: 'REP_BASED', strategy: 'TIMED_FALLBACK', fallbackDurationSeconds, movementKey};
}

export function capabilityUnavailable(): RuntimeCapabilitySnapshot {
  return {
    camera: 'UNAVAILABLE',
    poseHarness: 'UNREADY',
    calibration: 'UNAVAILABLE',
    supportedMovementKeys: [],
  };
}

export function capabilityUsableForSquat(): RuntimeCapabilitySnapshot {
  return {
    camera: 'USABLE',
    poseHarness: 'READY',
    calibration: 'VALID',
    supportedMovementKeys: ['squat'],
  };
}
