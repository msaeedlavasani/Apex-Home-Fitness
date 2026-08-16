import {z} from 'zod';

/**
 * Rest-days support for program generation.
 *
 * The onboarding quiz asks the user to pick 1–3 rest days (weekdays). The
 * payload flows end-to-end:
 *
 *   quiz step (`restDays: ['wednesday', 'sunday']`)
 *     → `GENERATE_PROGRAM_INPUT_SCHEMA` (API input, see requestSecurity.ts)
 *     → the AI prompt (sessions must never be placed on rest days)
 *     → the validated program output (`rest_days` + `day_name`/`is_rest_day`
 *       on each `weekly_schedule` entry, see the route's `ProgramSchema`)
 *     → persistence (`Program.restDays`; `buildProgramDraft` skips rest-day
 *       sessions, so no exercise is ever linked to a rest day).
 *
 * Enforcement (defense in depth, deterministic — not prompt-told-only):
 *   1. The AI prompt pins the weekday contract (numeric `day` = ISO weekday
 *      number 1=Monday…7=Sunday, `day_name` = English "Monday"…"Sunday").
 *   2. `enforceRestDays` post-processes the validated output: any session
 *      whose weekday is a user-selected rest day is rewritten into an
 *      explicit rest entry (`is_rest_day: true`, no warmup/exercises/
 *      cooldown). Weekday resolution is `day_name` first (English AND
 *      Persian names — the model cannot dodge the invariant by localizing),
 *      with the numeric `day` as a documented ISO fallback when `day_name`
 *      is absent.
 *   3. `buildProgramDraft` independently skips every session whose weekday
 *      is a selected rest day at persistence time (`isRestDay`), so even a
 *      caller that bypassed the route-level pass cannot persist a workout
 *      on a rest day.
 *
 * The guarantee "selected days never contain workouts" therefore holds in
 * the API response AND in the persisted program, independent of model
 * behavior.
 */

/** Canonical weekday ids (ISO order, Monday first) — mirrors the quiz's `WEEKDAY_IDS`. */
export const WEEKDAY_VALUES = [
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
  'sunday',
] as const;

export type Weekday = (typeof WEEKDAY_VALUES)[number];

/**
 * Reasonable bounds for the rest-day selection, mirrored by the quiz UI
 * (`src/components/quiz/restDays.js`) and the API schema:
 *   - min 1 — recovery is non-negotiable (at least one full rest day/week),
 *   - max 3 — keeps at least 4 training days, matching the 3–6 sessions/week
 *     clamp used by the program generator.
 */
export const REST_DAY_MIN = 1;
export const REST_DAY_MAX = 3;

export const REST_DAYS_SCHEMA = z
  .array(z.enum(WEEKDAY_VALUES))
  .min(REST_DAY_MIN)
  .max(REST_DAY_MAX)
  .refine((items) => new Set(items).size === items.length, 'Duplicate rest days are not allowed')
  // Backward compatibility is handled at the usage site: the input schema
  // wraps this with `.optional()`, so requests that omit `restDays` keep the
  // previous behavior (no rest-day constraint). An EXPLICIT empty array is
  // rejected (min 1).
  .describe('1–3 unique weekday ids kept workout-free');

/** A session that has been enforced into an explicit rest day. */
export function isRestDaySession(session: {is_rest_day?: boolean}): boolean {
  return session.is_rest_day === true;
}

/**
 * Collapses spelling variants into the lookup-key form used by
 * `DAY_NAME_ALIASES`: lowercase, ZWNJ (U+200C) and all whitespace removed,
 * Arabic yeh/kaf mapped to the Persian glyphs. «سه‌شنبه» and «سه شنبه» both
 * land on «سه‌شنبه».
 */
function normalizeDayNameKey(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/\u200c/g, '')
    .replace(/\s+/g, '')
    .replace(/ي/g, 'ی')
    .replace(/ك/g, 'ک');
}

/**
 * Raw weekday-name aliases (English primary, Persian accepted) in their
 * human-readable spelling. Keys are normalized once at module load via
 * `normalizeDayNameKey`, so the lookup table and the input normalization can
 * never drift apart (ZWNJ/space variants of «سه‌شنبه» match regardless of how
 * this file's literals were typed).
 */
const DAY_NAME_ALIAS_RAW: Record<string, Weekday> = {
  monday: 'monday',
  tuesday: 'tuesday',
  wednesday: 'wednesday',
  thursday: 'thursday',
  friday: 'friday',
  saturday: 'saturday',
  sunday: 'sunday',
  // Persian week (شنبه = Saturday … جمعه = Friday).
  'شنبه': 'saturday',
  'یکشنبه': 'sunday',
  'دوشنبه': 'monday',
  'سه‌شنبه': 'tuesday',
  'چهارشنبه': 'wednesday',
  'پنجشنبه': 'thursday',
  'جمعه': 'friday',
};

const DAY_NAME_ALIASES: Record<string, Weekday> = Object.fromEntries(
  Object.entries(DAY_NAME_ALIAS_RAW).map(([key, value]) => [normalizeDayNameKey(key), value]),
);

/**
 * Normalizes a model-emitted weekday name to the canonical id
 * ("Monday" / "MONDAY" / " monday " → 'monday'; «جمعه» → 'friday'). Returns
 * null for anything that is not a weekday name, so enforcement never guesses.
 */
export function normalizeDayName(value: unknown): Weekday | null {
  if (typeof value !== 'string') return null;
  return DAY_NAME_ALIASES[normalizeDayNameKey(value)] ?? null;
}

/**
 * Resolves the weekday of a schedule entry to a canonical id, or null when it
 * cannot be determined:
 *
 *   1. `day_name` wins — it is the semantic contract the generation prompt
 *      pins down (English "Monday"…"Sunday"; Persian names are accepted).
 *   2. When `day_name` is absent or not a recognizable weekday name, the
 *      numeric `day` is used as a documented fallback with ISO numbering
 *      (1 = Monday … 7 = Sunday) — the same convention the app's own
 *      fixtures and the generation prompt use.
 *   3. When neither is usable the entry is unmappable and enforcement leaves
 *      it untouched rather than guess.
 */
export function weekdayOf(session: {day_name?: unknown; day?: unknown}): Weekday | null {
  const named = normalizeDayName(session.day_name);
  if (named) return named;
  const day = session.day;
  if (typeof day === 'number' && Number.isInteger(day) && day >= 1 && day <= 7) {
    return WEEKDAY_VALUES[day - 1] ?? null;
  }
  return null;
}

/**
 * True when a schedule entry must not carry a workout for the given rest-day
 * selection: the entry is explicitly flagged as a rest day, OR its weekday
 * (via `weekdayOf`) is one of the selected rest days. Used by
 * `buildProgramDraft` so persistence skips rest-day sessions even when the
 * route-level `enforceRestDays` pass was bypassed.
 */
export function isRestDay(
  session: {day_name?: unknown; day?: unknown; is_rest_day?: boolean},
  restDays: readonly string[],
): boolean {
  if (session.is_rest_day === true) return true;
  const weekday = weekdayOf(session);
  return weekday !== null && restDays.includes(weekday);
}

/**
 * Enforces the "selected days have no workout" invariant on a generated
 * program (pure — exported for tests):
 *
 *   1. Echoes the user's `rest_days` into the output (`rest_days` field).
 *   2. Every `weekly_schedule` entry whose weekday is a rest day is rewritten
 *      into an explicit rest entry: `is_rest_day: true` and EMPTY
 *      warmup / exercises / cooldown. The entry stays in the schedule (marked
 *      as a rest day) so downstream code can see the full week at a glance.
 *      Weekday resolution is `day_name` (English or Persian) first, then the
 *      numeric `day` (ISO 1=Monday…7=Sunday) — see `weekdayOf`.
 *   3. Non-rest entries are left untouched (their `is_rest_day` is preserved
 *      if the model already set it).
 *
 * The generic keeps the caller's session type intact (e.g. `AiWeeklySession`
 * or the route's Zod-inferred type), so downstream code keeps full typing.
 *
 * @param program   the validated AI output (`ProgramSchema` shape)
 * @param restDays  canonical weekday ids selected by the user (may be empty)
 */
export function enforceRestDays<
  TProgram extends object,
  TSession extends {day_name?: unknown; day?: unknown; is_rest_day?: boolean; notes?: unknown},
>(
  program: TProgram & {weekly_schedule?: TSession[]},
  restDays: readonly string[],
): TProgram & {rest_days: string[]; weekly_schedule: (TSession & {is_rest_day: boolean})[]} {
  const restSet = new Set<string>(restDays);
  const schedule = (program.weekly_schedule ?? []).map((session) => {
    const weekday = weekdayOf(session);
    if (weekday !== null && restSet.has(weekday)) {
      return {
        ...session,
        is_rest_day: true,
        warmup: [],
        exercises: [],
        cooldown: [],
        notes:
          typeof session.notes === 'string' && session.notes.trim().length > 0
            ? session.notes
            : 'Rest day — no workout scheduled.',
      };
    }
    return {...session, is_rest_day: session.is_rest_day === true};
  });
  return {...program, rest_days: [...restDays], weekly_schedule: schedule};
}
