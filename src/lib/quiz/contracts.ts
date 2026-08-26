/**
 * Canonical Quiz-domain contracts (S-01 Shared Contract Ownership).
 *
 * These types belong to the Quiz/Onboarding domain and are consumed by the
 * quiz flow, the draft store and the profile service. Previously owned by the
 * higher-level `@/services/userService` — moved here so lower-level reusable
 * modules never depend on a service implementation for a shared contract.
 *
 * `userService.ts` re-exports `QuizAnswers` for backward compatibility; new
 * code should import from this module.
 */

/**
 * Onboarding quiz answers as produced by `src/components/quiz/OnboardingQuiz`:
 * `{ level, goal, exerciseStyles, equipment, limitations, limitationsDetails, restDays }`.
 * `goal` accepts the current multi-select string array and the legacy single
 * string. The schema stores the payload as a flexible Json value, so extra
 * keys are allowed (e.g. future steps such as `timePerSessionMin`).
 */
export interface QuizAnswers {
  /** 'beginner' | 'intermediate' | 'advanced' */
  level?: string;
  /** Current multi-select ids, or one legacy goal id. */
  goal?: string | string[];
  /** Preferred training-style ids selected in the quiz. */
  exerciseStyles?: string[];
  equipment?: string[];
  limitations?: string[];
  limitationsDetails?: string;
  [key: string]: unknown;
}
