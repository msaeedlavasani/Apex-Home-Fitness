/**
 * Outcome domain public entry point (AL-01 — Workout outcome / feedback
 * model).
 *
 * Exposes the workout-outcome contract types, the closed subjective
 * difficulty / completion vocabularies with EN display text, the
 * deterministic fail-closed validator, the derived read-model summary, and
 * the pure recording-pipeline adapter over the S-04 `SessionSummary`. This
 * domain is PURE and framework-independent — no Prisma, React, services, or
 * runtime side effects. Nothing in the application imports this module yet
 * (no runtime behavior change by design).
 */

export {
  OUTCOME_CONTRACT_VERSION,
  SUBJECTIVE_DIFFICULTY_DISPLAY,
  SUBJECTIVE_DIFFICULTY_FEELINGS,
  WORKOUT_COMPLETION_KINDS,
  isSubjectiveDifficultyFeeling,
  isWorkoutCompletionKind,
  outcomeBaseFromSummary,
  summarizeOutcome,
  validateOutcomeRecord,
  type OutcomeContractVersion,
  type OutcomeContext,
  type OutcomeProblem,
  type OutcomeProblemKind,
  type OutcomeSummary,
  type OutcomeValidation,
  type PerExerciseOutcome,
  type SubjectiveDifficultyFeeling,
  type WorkoutCompletion,
  type WorkoutCompletionKind,
  type WorkoutFeedback,
  type WorkoutOutcomeRecord,
} from './types';
