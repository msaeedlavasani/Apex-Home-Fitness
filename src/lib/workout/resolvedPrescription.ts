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

import type {SessionExercise} from './sessionContracts';
import {
  type ExecutionMode,
  type ResolvedExercisePrescription,
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
  const targetSeconds = normalizePositiveInt(exercise.durationSeconds);
  const targetReps = normalizePositiveInt(exercise.reps);
  const executionMode: ExecutionMode = targetSeconds != null ? 'TIME_BASED' : 'REP_BASED';
  if (targetSeconds == null && targetReps == null) throw new UnresolvedPrescriptionError(exercise.id);
  const setCount = Math.max(1, Math.floor(exercise.sets ?? 1));
  return {
    exercise: {...exercise},
    executionMode,
    targetReps: executionMode === 'REP_BASED' ? targetReps : null,
    targetSeconds: executionMode === 'TIME_BASED' ? targetSeconds : null,
    setCount,
    restSeconds: normalizePositiveInt(exercise.restSeconds),
    fallbackDurationSeconds: normalizePositiveInt(exercise.fallbackDurationSeconds),
  };
}

/** Resolves a full plan into the canonical resolved prescription (fail-closed). */
export function resolvePrescription(plan: readonly SessionExercise[]): ResolvedPrescription {
  if (plan.length === 0) throw new UnresolvedPrescriptionError('<empty plan>');
  return {exercises: plan.map(resolveExercisePrescription)};
}
