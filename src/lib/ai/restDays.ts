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
 * Enforcement (defense in depth): even if the model schedules a session on a
 * user-selected rest day, `enforceRestDays` strips it into an explicit rest
 * entry (`is_rest_day: true`, no warmup/exercises/cooldown). The guarantee
 * "selected days never contain workouts" therefore holds in the API response
 * AND in the persisted program, independent of model behavior.
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
 * Normalizes a model-emitted weekday name to the canonical id
 * ("Monday" / "MONDAY" / " monday " → 'monday'). Returns null for anything
 * that is not a weekday name, so enforcement never guesses.
 */
export function normalizeDayName(value: unknown): Weekday | null {
  if (typeof value !== 'string') return null;
  const name = value.trim().toLowerCase();
  return (WEEKDAY_VALUES as readonly string[]).includes(name) ? (name as Weekday) : null;
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
  TSession extends {day_name?: unknown; is_rest_day?: boolean; notes?: unknown},
>(
  program: TProgram & {weekly_schedule?: TSession[]},
  restDays: readonly string[],
): TProgram & {rest_days: string[]; weekly_schedule: (TSession & {is_rest_day: boolean})[]} {
  const restSet = new Set<string>(restDays);
  const schedule = (program.weekly_schedule ?? []).map((session) => {
    const dayName = normalizeDayName(session.day_name);
    if (dayName && restSet.has(dayName)) {
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
