/**
 * Canonical goal definitions + normalization helpers for the quiz's
 * multi-goal step (Step 3).
 *
 * `GoalStep` and `OnboardingQuiz` share this module so the quiz UI, the
 * step validation and any persisted/legacy answers agree on one shape:
 * an array of goal ids from `GOAL_IDS` (option order preserved).
 *
 * Backward compatibility: previously `goal` was a single string
 * (`'strength'`). Every entry point that reads a goal answer goes through
 * `normalizeGoals`, so a persisted string is transparently treated as a
 * one-element array.
 */

/** Goal option ids in the order they are rendered by the quiz. */
export const GOAL_IDS = ['strength', 'fat_loss', 'flexibility', 'functional_fitness'];

/** Rendered goal options — label/hint keys live in the quiz i18n catalog. */
export const GOAL_OPTIONS = [
  { id: 'strength', labelKey: 'quiz.goal.strength', hintKey: 'quiz.goal.strength.hint' },
  { id: 'fat_loss', labelKey: 'quiz.goal.fat_loss', hintKey: 'quiz.goal.fat_loss.hint' },
  { id: 'flexibility', labelKey: 'quiz.goal.flexibility', hintKey: 'quiz.goal.flexibility.hint' },
  {
    id: 'functional_fitness',
    labelKey: 'quiz.goal.functional_fitness',
    hintKey: 'quiz.goal.functional_fitness.hint',
  },
];

/**
 * Normalize any `goal` answer (legacy string, array, empty, junk) into a
 * canonical array of known goal ids. Unknown ids are dropped, duplicates
 * removed, and the render order of `GOAL_IDS` is preserved.
 *
 * @param {unknown} value
 * @returns {string[]}
 */
export function normalizeGoals(value) {
  const raw = Array.isArray(value) ? value : value == null || value === '' ? [] : [value];
  const seen = new Set();
  const result = [];
  for (const item of raw) {
    if (typeof item === 'string' && GOAL_IDS.includes(item) && !seen.has(item)) {
      seen.add(item);
      result.push(item);
    }
  }
  return result;
}
