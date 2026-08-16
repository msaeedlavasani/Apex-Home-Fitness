/**
 * Canonical rest-day definitions + normalization helpers for the quiz's
 * rest-days step (Step 6).
 *
 * `RestDaysStep` and `OnboardingQuiz` share this module so the quiz UI, the
 * step validation and any persisted/legacy answers agree on one shape:
 * an array of weekday ids from `WEEKDAY_IDS` (ISO order, Monday first).
 *
 * Rendering order is locale-aware (see `getWeekdayOptions`): the Persian
 * quiz shows the options Saturday → Friday to match the Persian week, but
 * that display order NEVER changes the stored ids — values are always
 * canonical ISO weekday ids and `normalizeRestDays` preserves `WEEKDAY_IDS`
 * order.
 *
 * The server mirrors this contract in `src/lib/ai/restDays.ts`
 * (`WEEKDAY_VALUES`, `REST_DAYS_SCHEMA`) — keep the two in sync.
 *
 * Bounds: REST_DAY_MIN (1) — recovery is non-negotiable; REST_DAY_MAX (3) —
 * keeps at least 4 training days, matching the program generator's 3–6
 * sessions/week clamp.
 */

/**
 * Canonical weekday option ids. This array doubles as the STORED/rendered
 * order for non-Persian locales and as the canonical order preserved by
 * `normalizeRestDays` — it must stay ISO (Monday first) and in sync with
 * `WEEKDAY_VALUES` in `src/lib/ai/restDays.ts`.
 */
export const WEEKDAY_IDS = [
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
  'sunday',
];

/**
 * Display-only weekday ids for the Persian quiz: the Persian week starts on
 * Saturday, so options are shown شنبه → جمعه (Saturday … Friday). This order
 * is ONLY used for rendering — stored ids, normalization and the server
 * schema keep the canonical `WEEKDAY_IDS` order.
 */
export const WEEKDAY_IDS_FA = [
  'saturday',
  'sunday',
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
];

/** Rendered rest-day options (canonical ISO order) — label keys live in the quiz i18n catalog. */
export const WEEKDAY_OPTIONS = WEEKDAY_IDS.map((id) => ({
  id,
  labelKey: `quiz.restDays.${id}`,
}));

/** Rendered rest-day options for the Persian quiz (Saturday first). */
export const WEEKDAY_OPTIONS_FA = WEEKDAY_IDS_FA.map((id) => ({
  id,
  labelKey: `quiz.restDays.${id}`,
}));

/**
 * Pick the display order for a locale. Persian renders Saturday first;
 * every other locale keeps the canonical ISO order (Monday first).
 *
 * @param {string} [locale] — 'fa' or 'en' (any other value → canonical order)
 * @returns {{id: string, labelKey: string}[]}
 */
export function getWeekdayOptions(locale) {
  return locale === 'fa' ? WEEKDAY_OPTIONS_FA : WEEKDAY_OPTIONS;
}

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
