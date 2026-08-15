/**
 * Canonical rest-day definitions + normalization helpers for the quiz's
 * rest-days step (Step 6).
 *
 * `RestDaysStep` and `OnboardingQuiz` share this module so the quiz UI, the
 * step validation and any persisted/legacy answers agree on one shape:
 * an array of weekday ids from `WEEKDAY_IDS` (ISO order, Monday first).
 *
 * The server mirrors this contract in `src/lib/ai/restDays.ts`
 * (`WEEKDAY_VALUES`, `REST_DAYS_SCHEMA`) — keep the two in sync.
 *
 * Bounds: REST_DAY_MIN (1) — recovery is non-negotiable; REST_DAY_MAX (3) —
 * keeps at least 4 training days, matching the program generator's 3–6
 * sessions/week clamp.
 */

/** Weekday option ids in the order they are rendered by the quiz. */
export const WEEKDAY_IDS = [
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
  'sunday',
];

/** Rendered rest-day options — label keys live in the quiz i18n catalog. */
export const WEEKDAY_OPTIONS = WEEKDAY_IDS.map((id) => ({
  id,
  labelKey: `quiz.restDays.${id}`,
}));

/** At least one rest day per week (UI + API enforce this). */
export const REST_DAY_MIN = 1;

/** At most three rest days per week (UI + API enforce this). */
export const REST_DAY_MAX = 3;

/**
 * Normalize any `restDays` answer (string, array, empty, junk) into a
 * canonical array of known weekday ids. Unknown ids are dropped, duplicates
 * removed, and the render order of `WEEKDAY_IDS` is preserved (mirrors
 * `normalizeGoals` in ./goals).
 *
 * @param {unknown} value
 * @returns {string[]}
 */
export function normalizeRestDays(value) {
  const raw = Array.isArray(value) ? value : value == null || value === '' ? [] : [value];
  const selected = new Set(raw.filter((item) => typeof item === 'string' && WEEKDAY_IDS.includes(item)));
  return WEEKDAY_IDS.filter((id) => selected.has(id));
}
