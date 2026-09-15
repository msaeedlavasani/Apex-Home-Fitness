/**
 * Exercise Details read-model (WP-04, steering delta §27–§30) — WP-01 additive
 * extension of the V2 experience contracts.
 *
 * The More control opens an Exercise Details surface whose content MUST come
 * from the RESOLVED prescription/session view-model — never invented, never a
 * hardcoded validation fixture ("Squat / Bodyweight / 3 sets" are examples in
 * the delta, not data). Raw internal enums (`REP_BASED`/`TIME_BASED`) are
 * translated to a neutral descriptor the presentation localizes; absent
 * fields are OMITTED (no placeholders, no invented equipment).
 *
 * This is presentation-language derivation only: it adds no sequencing, no
 * actions, and no future-workout semantics (§30) — the details model is
 * read-only information for display.
 *
 * PURE: no React, no I/O.
 */

import type {ResolvedExercisePrescription} from '../sessionV2Contracts';

/**
 * Execution-mode descriptor carried in the read-model. The UI maps these to
 * localized human phrases ("Repetition based" / "Time based"); the raw
 * internal enum values never reach the DOM (§29).
 */
export type ExecutionModeDescriptor = 'repetitionBased' | 'timeBased';

export interface ExerciseDetailsField {
  /** i18n message key under `WorkoutV2.exerciseDetails.fields`. */
  readonly key: 'exercise' | 'prescription' | 'mode';
  /** Display value — already resolved data (localized exercise name). */
  readonly value: string;
}

/**
 * The Exercise Details read-model for ONE resolved exercise. Fields are
 * derived strictly from the resolved prescription; there is no equipment
 * field in the canonical `SessionExercise` contract, so equipment is
 * intentionally absent (§29: "If a field is absent: OMIT IT").
 */
export interface ExerciseDetailsModel {
  readonly exerciseName: string;
  /** Human-readable prescription, e.g. "3 × 15" (reps) or "3 × 30s" (time). */
  readonly prescription: string;
  /** Neutral mode descriptor — localized by the presentation layer. */
  readonly mode: ExecutionModeDescriptor | null;
  /** Total sets in this exercise block (prescription-driven, no fixed 3). */
  readonly setCount: number;
  /**
   * Presentational hints for the prescription display (reps/duration targets
   * when resolved). The presentation renders `prescription` directly; these
   * exist for tests and future richer surfaces without re-deriving.
   */
  readonly targetReps: number | null;
  readonly targetSeconds: number | null;
}

/** Derives the details read-model from ONE resolved exercise prescription. */
export function deriveExerciseDetails(
  prescription: ResolvedExercisePrescription,
): ExerciseDetailsModel {
  const {targetReps, targetSeconds, setCount} = prescription;
  const prescriptionText =
    targetSeconds != null
      ? `${setCount} × ${targetSeconds}s`
      : targetReps != null
        ? `${setCount} × ${targetReps}`
        : `${setCount} ×`;
  return {
    exerciseName: prescription.exercise.name,
    prescription: prescriptionText,
    mode:
      prescription.executionMode === 'TIME_BASED'
        ? 'timeBased'
        : prescription.executionMode === 'REP_BASED'
          ? 'repetitionBased'
          : null,
    setCount,
    targetReps,
    targetSeconds,
  };
}

/**
 * Ordered detail fields for the details surface (§29 field list). Absent
 * values are omitted by construction — `equipment` has no canonical source,
 * `mode` is omitted when the resolution carries no descriptor.
 */
export function exerciseDetailFields(model: ExerciseDetailsModel): readonly ExerciseDetailsField[] {
  const fields: ExerciseDetailsField[] = [
    {key: 'exercise', value: model.exerciseName},
    {key: 'prescription', value: model.prescription},
  ];
  if (model.mode != null) {
    fields.push({key: 'mode', value: model.mode});
  }
  return fields;
}
