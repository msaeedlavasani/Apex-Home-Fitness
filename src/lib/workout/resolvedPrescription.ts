/**
 * Resolved-prescription resolution (SPEC 0001 plan §4) — first-slice minimum.
 *
 * The V2 session consumes a RESOLVED PRESCRIPTION with explicit execution
 * semantics (`REP_BASED | TIME_BASED`, targets, set count, rest) — never raw
 * plan fields with the mode inferred in the UI. This module resolves today's
 * canonical plan contract (`SessionExercise` — already prescription-shaped:
 * sets/reps/durationSeconds/restSeconds per exercise) into that form.
 *
 * Deliberately NOT here (later work packages / future authorization):
 *   - no mode-choosing policy (plan §4: "no invented policy that chooses
 *     between modes — that policy is future authorization");
 *   - no AI/rules provenance path (source independence is resolved into this
 *     SAME contract when those sources are wired — WP-03 territory);
 *   - no storage/schema change — this is pure resolution of in-memory plan
 *     data at session entry (spec §16 leaves storage undecided; DB_SCHEMA
 *     stays untouched).
 *
 * Failure posture: a prescription with no usable explicit target (neither
 * reps nor duration) fails CLOSED with `UnresolvedPrescriptionError` —
 * never silently coerced (plan §4, spec §7 fail-closed).
 *
 * PURE: no React, no I/O.
 */

import type {SessionExercise, SessionSetPrescription} from './sessionContracts';
import {
  type ExecutionMode,
  type ResolvedExercisePrescription,
  type ResolvedSetPrescription,
  type ResolvedPrescription,
  normalizePositiveInt,
} from './sessionV2Contracts';

/** A plan item carried no explicit execution target — fail closed, never guess. */
export class UnresolvedPrescriptionError extends Error {
  constructor(stepId: string) {
    super(`Exercise step "${stepId}" has no explicit execution target (reps or durationSeconds); the prescription cannot be resolved without inventing semantics.`);
    this.name = 'UnresolvedPrescriptionError';
  }
}

/**
 * Resolves one plan step. Mode precedence is structural, not a policy: the
 * explicit duration defines `TIME_BASED` when present; otherwise an explicit
 * rep target defines `REP_BASED`. A step with neither target fails closed.
 */
export function resolveExercisePrescription(exercise: SessionExercise): ResolvedExercisePrescription {
  const setCount = Math.max(1, Math.floor(exercise.sets ?? 1));
  const authoredSets = Array.isArray(exercise.setPrescriptions) && exercise.setPrescriptions.length > 0
    ? exercise.setPrescriptions
    : Array.from({length: setCount}, () => ({
      executionMode: (normalizePositiveInt(exercise.durationSeconds) != null ? 'TIME_BASED' : 'REP_BASED') as ExecutionMode,
      reps: exercise.reps,
      durationSeconds: exercise.durationSeconds,
      fallbackDurationSeconds: exercise.fallbackDurationSeconds,
      restSeconds: exercise.restSeconds,
    }));
  const sets = authoredSets.map((set, index) => resolveSetPrescription(exercise.id, set as SessionSetPrescription, index));
  const first = sets[0]!;
  return {
    exercise: {...exercise},
    executionMode: first.executionMode,
    targetReps: first.targetReps,
    targetSeconds: first.targetSeconds,
    setCount: sets.length,
    restSeconds: first.restSeconds,
    fallbackDurationSeconds: first.fallbackDurationSeconds,
    sets,
  };
}

function resolveSetPrescription(stepId: string, set: SessionSetPrescription, index: number): ResolvedSetPrescription {
  const targetSeconds = normalizePositiveInt(set.durationSeconds);
  const targetReps = normalizePositiveInt(set.reps);
  const executionMode: ExecutionMode = set.executionMode ?? (targetSeconds != null ? 'TIME_BASED' : 'REP_BASED');
  const resolvedTarget = executionMode === 'TIME_BASED' ? targetSeconds : targetReps;
  if (resolvedTarget == null || (executionMode === 'REP_BASED' && targetSeconds != null) || (executionMode === 'TIME_BASED' && targetReps != null)) {
    throw new UnresolvedPrescriptionError(`${stepId}.sets[${index}]`);
  }
  return {
    executionMode,
    targetReps: executionMode === 'REP_BASED' ? targetReps : null,
    targetSeconds: executionMode === 'TIME_BASED' ? targetSeconds : null,
    restSeconds: normalizePositiveInt(set.restSeconds),
    fallbackDurationSeconds: normalizePositiveInt(set.fallbackDurationSeconds),
  };
}

/** Resolves a full plan into the canonical resolved prescription (fail-closed). */
export function resolvePrescription(plan: readonly SessionExercise[]): ResolvedPrescription {
  if (plan.length === 0) throw new UnresolvedPrescriptionError('<empty plan>');
  return {exercises: plan.map(resolveExercisePrescription)};
}
