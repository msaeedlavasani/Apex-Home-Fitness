/**
 * Shared Program ↔ Workout prescription contract (WP-13).
 *
 * Program/Prescription owns WHAT is prescribed. Workout consumes this
 * resolved, versioned boundary; the session orchestrator owns HOW the
 * resolved items become runtime modules. This file deliberately contains no
 * UI, persistence, scheduling, or adaptation policy.
 *
 * The existing `resolvedPrescription.ts` resolver remains the pure semantic
 * normalizer for one in-memory plan. This module adds the cross-source
 * version/provenance envelope, fail-closed validation, and source adapters so
 * AI, rules, and persisted program inputs converge before Workout consumes
 * them.
 */

import type {AiExercise} from '@/lib/ai/contracts';
import type {SessionExercise} from './sessionContracts';
import {
  type ResolvedExercisePrescription,
  type ResolvedPrescription,
} from './sessionV2Contracts';
import {resolvePrescription} from './resolvedPrescription';

export const SHARED_PRESCRIPTION_CONTRACT_VERSION = 1 as const;
export type SharedPrescriptionContractVersion = typeof SHARED_PRESCRIPTION_CONTRACT_VERSION;
export type SharedPrescriptionSource = 'AI' | 'RULES' | 'PERSISTED_PROGRAM';

export type CameraLessExecutionSupport = 'SUPPORTED' | 'UNSUPPORTED';

export interface SharedPrescriptionExercise extends ResolvedExercisePrescription {
  /** Explicit fallback supplied by the Program authority; never calculated here. */
  readonly fallbackDurationSeconds: number | null;
  readonly cameraLessExecution: CameraLessExecutionSupport;
}

export interface SharedWorkoutPrescription extends ResolvedPrescription {
  readonly contractVersion: SharedPrescriptionContractVersion;
  readonly source: SharedPrescriptionSource;
  /** Source adapter version, not a storage schema version. */
  readonly sourceVersion: string;
  readonly exercises: readonly SharedPrescriptionExercise[];
}

export type SharedPrescriptionValidationIssueKind =
  | 'BAD_CONTRACT_VERSION'
  | 'BAD_SOURCE'
  | 'BAD_SOURCE_VERSION'
  | 'EMPTY_PRESCRIPTION'
  | 'BAD_EXERCISE_IDENTITY'
  | 'DUPLICATE_EXERCISE_IDENTITY'
  | 'BAD_SET_COUNT'
  | 'BAD_EXECUTION_MODE'
  | 'TARGET_MODE_MISMATCH'
  | 'BAD_TARGET'
  | 'BAD_REST'
  | 'BAD_FALLBACK';

export interface SharedPrescriptionValidationIssue {
  readonly kind: SharedPrescriptionValidationIssueKind;
  readonly path: string;
  readonly message: string;
}

export interface SharedPrescriptionValidation {
  readonly valid: boolean;
  readonly issues: readonly SharedPrescriptionValidationIssue[];
}

function issue(
  issues: SharedPrescriptionValidationIssue[],
  kind: SharedPrescriptionValidationIssueKind,
  path: string,
  message: string,
): void {
  issues.push({kind, path, message});
}

/** Runtime validation for the shared boundary. It never repairs or guesses. */
export function validateSharedWorkoutPrescription(
  prescription: SharedWorkoutPrescription,
): SharedPrescriptionValidation {
  const issues: SharedPrescriptionValidationIssue[] = [];
  if (prescription.contractVersion !== SHARED_PRESCRIPTION_CONTRACT_VERSION) {
    issue(issues, 'BAD_CONTRACT_VERSION', 'contractVersion', 'unsupported shared prescription contract version');
  }
  if (!['AI', 'RULES', 'PERSISTED_PROGRAM'].includes(prescription.source)) {
    issue(issues, 'BAD_SOURCE', 'source', 'source must identify an approved Program/Prescription authority');
  }
  if (typeof prescription.sourceVersion !== 'string' || prescription.sourceVersion.trim() === '') {
    issue(issues, 'BAD_SOURCE_VERSION', 'sourceVersion', 'sourceVersion is required for compatibility checks');
  }
  if (prescription.exercises.length === 0) {
    issue(issues, 'EMPTY_PRESCRIPTION', 'exercises', 'a Workout prescription must contain at least one exercise');
  }

  const seen = new Set<string>();
  prescription.exercises.forEach((item, index) => {
    const path = `exercises[${index}]`;
    const identity = item.exercise.id.trim();
    if (identity === '' || item.exercise.name.trim() === '') {
      issue(issues, 'BAD_EXERCISE_IDENTITY', `${path}.exercise`, 'exercise id and display name are required');
    }
    if (seen.has(identity)) {
      issue(issues, 'DUPLICATE_EXERCISE_IDENTITY', `${path}.exercise.id`, 'exercise step identity must be unique');
    }
    seen.add(identity);
    if (!Number.isInteger(item.setCount) || item.setCount < 1) {
      issue(issues, 'BAD_SET_COUNT', `${path}.setCount`, 'setCount must be a positive integer');
    }
    if (item.executionMode !== 'REP_BASED' && item.executionMode !== 'TIME_BASED') {
      issue(issues, 'BAD_EXECUTION_MODE', `${path}.executionMode`, 'executionMode must be REP_BASED or TIME_BASED');
    }
    const repTarget = item.targetReps;
    const timeTarget = item.targetSeconds;
    if (item.executionMode === 'REP_BASED' && (repTarget == null || timeTarget != null)) {
      issue(issues, 'TARGET_MODE_MISMATCH', `${path}.targetReps`, 'REP_BASED requires reps and forbids duration');
    }
    if (item.executionMode === 'TIME_BASED' && (timeTarget == null || repTarget != null)) {
      issue(issues, 'TARGET_MODE_MISMATCH', `${path}.targetSeconds`, 'TIME_BASED requires duration and forbids reps');
    }
    const target = item.executionMode === 'REP_BASED' ? repTarget : timeTarget;
    if (target == null || !Number.isInteger(target) || target < 1) {
      issue(issues, 'BAD_TARGET', `${path}.target`, 'the active target must be a positive integer');
    }
    if (item.restSeconds != null && (!Number.isInteger(item.restSeconds) || item.restSeconds < 1)) {
      issue(issues, 'BAD_REST', `${path}.restSeconds`, 'restSeconds must be null or a positive integer');
    }
    if (item.fallbackDurationSeconds != null && (!Number.isInteger(item.fallbackDurationSeconds) || item.fallbackDurationSeconds < 1)) {
      issue(issues, 'BAD_FALLBACK', `${path}.fallbackDurationSeconds`, 'fallbackDurationSeconds must be null or a positive integer');
    }
    if (item.executionMode === 'REP_BASED' && item.cameraLessExecution === 'SUPPORTED' && item.fallbackDurationSeconds == null) {
      issue(issues, 'BAD_FALLBACK', `${path}.fallbackDurationSeconds`, 'camera-less REP_BASED execution requires an explicit fallback duration');
    }
    if (item.executionMode === 'TIME_BASED' && item.fallbackDurationSeconds != null) {
      issue(issues, 'BAD_FALLBACK', `${path}.fallbackDurationSeconds`, 'TIME_BASED execution must not carry a REP fallback duration');
    }
    if (item.sets && item.sets.length !== item.setCount) {
      issue(issues, 'BAD_SET_COUNT', `${path}.sets`, 'resolved per-set dosage must match setCount');
    }
    item.sets?.forEach((set, setIndex) => {
      const setPath = `${path}.sets[${setIndex}]`;
      const setTarget = set.executionMode === 'REP_BASED' ? set.targetReps : set.targetSeconds;
      if (setTarget == null || !Number.isInteger(setTarget) || setTarget < 1) {
        issue(issues, 'BAD_TARGET', `${setPath}.target`, 'each resolved set must have a positive active target');
      }
      if (set.executionMode === 'REP_BASED' && item.cameraLessExecution === 'SUPPORTED' && set.fallbackDurationSeconds == null) {
        issue(issues, 'BAD_FALLBACK', `${setPath}.fallbackDurationSeconds`, 'REP_BASED sets require an explicit fallback duration');
      }
      if (set.executionMode === 'TIME_BASED' && set.fallbackDurationSeconds != null) {
        issue(issues, 'BAD_FALLBACK', `${setPath}.fallbackDurationSeconds`, 'TIME_BASED sets must not carry a REP fallback duration');
      }
    });
  });
  return {valid: issues.length === 0, issues};
}

export class InvalidSharedPrescriptionError extends Error {
  readonly validation: SharedPrescriptionValidation;

  constructor(validation: SharedPrescriptionValidation) {
    super(`Shared Workout prescription failed validation: ${validation.issues.map((item) => item.kind).join(', ')}`);
    this.name = 'InvalidSharedPrescriptionError';
    this.validation = validation;
  }
}

function createSharedPrescription(
  plan: readonly SessionExercise[],
  source: SharedPrescriptionSource,
  sourceVersion: string,
): SharedWorkoutPrescription {
  const resolved = resolvePrescription(plan);
  const prescription: SharedWorkoutPrescription = {
    contractVersion: SHARED_PRESCRIPTION_CONTRACT_VERSION,
    source,
    sourceVersion,
    exercises: resolved.exercises.map((item, index) => {
      const raw = plan[index] as SessionExercise & {fallbackDurationSeconds?: unknown};
      const fallbackDurationSeconds = positiveInteger(raw.fallbackDurationSeconds);
      return {
        ...item,
        fallbackDurationSeconds,
        cameraLessExecution: fallbackDurationSeconds == null ? 'UNSUPPORTED' : 'SUPPORTED',
      };
    }),
  };
  const validation = validateSharedWorkoutPrescription(prescription);
  if (!validation.valid) throw new InvalidSharedPrescriptionError(validation);
  return prescription;
}

/** Adapter for an already resolved/persisted session plan. */
export function sharedPrescriptionFromPersistedPlan(
  plan: readonly SessionExercise[],
): SharedWorkoutPrescription {
  return createSharedPrescription(plan, 'PERSISTED_PROGRAM', 'persisted-program-v1');
}

/** Minimal source shape accepted from AI/rules program generators. */
export type ProgramPrescriptionExerciseInput = Pick<AiExercise, 'id' | 'name' | 'sets' | 'reps' | 'rest_seconds'> & {
  readonly duration_seconds?: number | null;
  readonly fallback_duration_seconds?: number | null;
};

function positiveInteger(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) && value > 0 ? Math.floor(value) : null;
}

/**
 * Normalizes the legacy generator representation at the authority boundary.
 * `"30 seconds"` is an explicit time target; a numeric/range rep string uses
 * its authored lower bound, matching the existing program adapter. No UI or
 * orchestrator infers a mode, and unparseable input fails closed.
 */
function programInputToSessionExercise(
  input: ProgramPrescriptionExerciseInput,
): SessionExercise {
  const duration = positiveInteger(input.duration_seconds);
  const repsText = typeof input.reps === 'string' ? input.reps.trim() : '';
  const secondsMatch = /^([1-9]\d*)\s*seconds?$/i.exec(repsText);
  const repsMatch = /^([1-9]\d*)/.exec(repsText);
  const targetSeconds = duration ?? (secondsMatch ? Number(secondsMatch[1]) : null);
  const targetReps = targetSeconds == null && repsMatch ? Number(repsMatch[1]) : null;
  if (targetSeconds == null && targetReps == null) {
    throw new InvalidSharedPrescriptionError({
      valid: false,
      issues: [{kind: 'BAD_TARGET', path: `exercise.${input.id}`, message: 'source exercise has no explicit reps or duration'}],
    });
  }
  const sets = positiveInteger(input.sets);
  if (sets == null) {
    throw new InvalidSharedPrescriptionError({
      valid: false,
      issues: [{kind: 'BAD_SET_COUNT', path: `exercise.${input.id}`, message: 'source exercise has no explicit set count'}],
    });
  }
  return {
    id: input.id,
    name: input.name,
    sets,
    reps: targetSeconds == null ? targetReps : null,
    durationSeconds: targetSeconds,
    restSeconds: positiveInteger(input.rest_seconds),
    ...(input.fallback_duration_seconds != null ? {fallbackDurationSeconds: input.fallback_duration_seconds} : {}),
  } as SessionExercise;
}

export function sharedPrescriptionFromAiExercises(
  exercises: readonly ProgramPrescriptionExerciseInput[],
): SharedWorkoutPrescription {
  return createSharedPrescription(
    exercises.map(programInputToSessionExercise),
    'AI',
    'ai-program-v1',
  );
}

export function sharedPrescriptionFromRuleExercises(
  exercises: readonly ProgramPrescriptionExerciseInput[],
): SharedWorkoutPrescription {
  return createSharedPrescription(
    exercises.map(programInputToSessionExercise),
    'RULES',
    'rules-program-v2',
  );
}

/**
 * Mapping seam for a future outcome recorder. It carries prescription facts
 * into AL-01-compatible per-exercise inputs without deciding completion,
 * feedback, or adaptation policy.
 */
export interface PrescriptionOutcomeMapping {
  readonly exerciseIndex: number;
  readonly exerciseId?: string;
  readonly slug?: string;
  readonly name: string;
  readonly plannedSets: number;
  readonly plannedReps: number | null;
  readonly targetSeconds: number | null;
}

export function mapPrescriptionToOutcomeInputs(
  prescription: SharedWorkoutPrescription,
): readonly PrescriptionOutcomeMapping[] {
  return prescription.exercises.map((item, exerciseIndex) => ({
    exerciseIndex,
    exerciseId: item.exercise.exerciseId,
    slug: item.exercise.slug,
    name: item.exercise.name,
    plannedSets: item.setCount,
    plannedReps: item.targetReps,
    targetSeconds: item.targetSeconds,
  }));
}

export type {ResolvedExercisePrescription, ResolvedPrescription};
