/**
 * Analytics service — workout statistics derived from `WorkoutSession`
 * history: total sessions, weekly volume (sets / reps), estimated calories
 * burned and the user's current workout streak.
 *
 * Reference (prisma/schema.prisma):
 *   model WorkoutSession {
 *     id              String     @id @default(cuid())
 *     userId          String
 *     programId       String?
 *     startedAt       DateTime   @default(now())
 *     completedAt     DateTime?
 *     durationSeconds Int?
 *     caloriesBurned  Int?       // stored when the player tracked it
 *     exercises       WorkoutSessionExercise[]
 *     ...
 *   }
 *   model WorkoutSessionExercise {
 *     completed       Boolean    @default(false)
 *     actualSets      Int?
 *     actualReps      Int?
 *     durationSeconds Int?
 *     exercise        Exercise   // -> category drives the calorie estimate
 *     ...
 *   }
 *
 * Design notes
 * ------------
 * - The computation helpers (`computeWorkoutAnalytics`, `computeWeeklyVolume`,
 *   `computeCurrentStreak`, `estimateCaloriesBurned`, ...) are pure: they take
 *   a plain session-history array and return plain data. Prisma
 *   `WorkoutSession` rows (fetched with `exercises.include.exercise`) satisfy
 *   the structural input types, so the same functions can be reused in tests
 *   or inside client-side memoization.
 * - A session is "completed" when `completedAt` is set. Only completed
 *   sessions contribute to totals, volume and streaks; only exercises with
 *   `completed === true` contribute sets / reps.
 * - Calories: the stored `caloriesBurned` value is preferred when present;
 *   otherwise an estimate is derived from duration and exercise-category METs
 *   (kcal = MET × 3.5 × weightKg / 200 × minutes). Any estimated figure is
 *   flagged with `estimated: true` on the result.
 * - All day boundaries (week, streak) are resolved in an IANA timezone
 *   (default: the server's runtime timezone) and are DST-safe.
 *
 * Server-only: `getWorkoutAnalytics` reads the request's auth cookie (via
 * `createServerSupabaseClient`) and queries Prisma. Call it from Route
 * Handlers, Server Actions or Server Components — never from Client
 * Components. Authentication failures propagate as `UnauthenticatedError`
 * from `./userService`.
 */
import { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { getSupabaseAuthUser, syncUserWithSupabase } from './userService';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Minimal shape of a session-exercise row accepted by the analytics helpers. */
export interface AnalyticsSessionExercise {
  /** Whether the exercise was actually performed (schema default: false). */
  completed?: boolean | null;
  /** Actual sets performed during the session. */
  actualSets?: number | null;
  /** Actual reps performed during the session. */
  actualReps?: number | null;
  /** Time spent on this exercise (seconds). */
  durationSeconds?: number | null;
  /** Linked exercise — only `category` is needed for calorie estimation. */
  exercise?: { category?: string | null } | null;
}

/** Minimal shape of a `WorkoutSession` row accepted by the analytics helpers. */
export interface AnalyticsSession {
  id?: string;
  /** Session start — the reference instant for day / week / streak bucketing. */
  startedAt: Date | string;
  /** Set when the session was finished; marks it as completed. */
  completedAt?: Date | string | null;
  /** Total active duration of the session (seconds). */
  durationSeconds?: number | null;
  /** Stored calorie figure (preferred over estimates when present). */
  caloriesBurned?: number | null;
  exercises?: AnalyticsSessionExercise[];
}

export interface AnalyticsOptions {
  /**
   * IANA timezone used for day boundaries (weekly volume, streak, relative
   * dates). Defaults to the server's runtime timezone.
   */
  timeZone?: string;
  /**
   * Body weight (kg) used when estimating calories. Defaults to the user's
   * stored `weightKg`, falling back to {@link DEFAULT_WEIGHT_KG}.
   */
  weightKg?: number;
  /** Reference "now" instant (mainly useful for tests). Defaults to `new Date()`. */
  now?: Date;
}

/** Sets / reps volume for the current week (Monday → Sunday, local time). */
export interface WeeklyVolume {
  /** Monday 00:00 local — inclusive start of the week. */
  weekStart: Date;
  /** Next Monday 00:00 local — exclusive end of the week. */
  weekEnd: Date;
  /** Completed sessions within the week. */
  sessions: number;
  /** Actual sets performed (completed exercises only). */
  sets: number;
  /** Actual reps performed (completed exercises only). */
  reps: number;
}

export interface WorkoutAnalytics {
  /** Owner id — populated by the server-side entry point. */
  userId?: string;
  /** Completed sessions, all time. */
  totalSessions: number;
  /** Total active duration of completed sessions (seconds). */
  totalDurationSeconds: number;
  /** Total calories — stored values preferred, the rest estimated. */
  totalCaloriesBurned: number;
  /** True when at least one session's calories had to be estimated. */
  estimated: boolean;
  /** Actual sets performed across all completed sessions. */
  totalSets: number;
  /** Actual reps performed across all completed sessions. */
  totalReps: number;
  /** Volume for the current week (Monday → Sunday, local time). */
  weeklyVolume: WeeklyVolume;
  /**
   * Consecutive active days ending today — or ending yesterday when today has
   * no workout yet (the day isn't over, so the streak stays alive).
   */
  currentStreak: number;
  /** Local midnight of the last day counted in the streak (null when 0). */
  streakEndDate: Date | null;
  /** First / most recent completed session. */
  firstWorkoutAt: Date | null;
  lastWorkoutAt: Date | null;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** MET (metabolic equivalents) per exercise category, used for estimates. */
const MET_BY_CATEGORY: Record<string, number> = {
  YOGA: 3.0,
  MOBILITY: 2.5,
  PILATES: 3.0,
  CALISTHENICS: 6.0,
  HIIT: 8.0,
  ISOMETRIC: 4.0,
  RESISTANCE_BAND: 5.0,
  ANIMAL_FLOW: 7.0,
};

/** MET used when a category is unknown or no exercises carry durations. */
const FALLBACK_MET = 5.0;

/** Assumed body weight when the user profile has no `weightKg`. */
export const DEFAULT_WEIGHT_KG = 70;

const MS_PER_DAY = 86_400_000;

// ---------------------------------------------------------------------------
// Locales / bilingual date formatting
// ---------------------------------------------------------------------------

/** Locales the analytics layer formats dates for (mirrors `src/i18n/routing.ts`). */
export type AppLocale = 'en' | 'fa';

/** Intl locales backing each app locale. `fa` uses the Persian (Jalali)
 *  calendar and Persian digits via `Intl.DateTimeFormat('fa-IR', ...)`. */
const INTL_LOCALE: Record<AppLocale, string> = {
  en: 'en-US',
  fa: 'fa-IR',
};

const RELATIVE_DAY_LABELS: Record<AppLocale, { today: string; yesterday: string }> = {
  en: { today: 'Today', yesterday: 'Yesterday' },
  fa: { today: 'امروز', yesterday: 'دیروز' },
};

/** Optional translated labels for `formatRelativeDay` (e.g. from next-intl messages). */
export interface RelativeDayLabels {
  today?: string;
  yesterday?: string;
}

function defaultTimeZone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
}

/** Normalizes a `Date | string` to a `Date`. */
function toDate(value: Date | string): Date {
  return value instanceof Date ? value : new Date(value);
}

/**
 * Formats `date` with the `Intl` locale backing an app locale.
 * `en` → `en-US`, `fa` → `fa-IR` (Persian calendar + Persian digits).
 */
export function formatDate(
  date: Date | string,
  locale: AppLocale,
  options: Intl.DateTimeFormatOptions = {},
): string {
  return new Intl.DateTimeFormat(INTL_LOCALE[locale], options).format(toDate(date));
}

/** Compact date, e.g. `Aug 15, 2026` / `۱۵ اوت ۲۰۲۶`. */
export function formatShortDate(date: Date | string, locale: AppLocale): string {
  return formatDate(date, locale, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

/** Full date, e.g. `Saturday, August 15, 2026` / `شنبه ۱۵ اوت ۲۰۲۶`. */
export function formatLongDate(date: Date | string, locale: AppLocale): string {
  return formatDate(date, locale, {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

/** Weekday name, e.g. `Sat` / `شنبه` (`'short'`) or `Saturday` / `شنبه` (`'long'`). */
export function formatWeekday(
  date: Date | string,
  locale: AppLocale,
  style: 'short' | 'long' = 'long',
): string {
  return formatDate(date, locale, { weekday: style });
}

/** Month + year, e.g. `August 2026` / `اوت ۲۰۲۶`. */
export function formatMonthYear(date: Date | string, locale: AppLocale): string {
  return formatDate(date, locale, { year: 'numeric', month: 'long' });
}

/**
 * Human-friendly day label: `Today` / `Yesterday` when the date is the current
 * (or previous) calendar day in `timeZone`, otherwise a full localized date.
 * Pass translated labels (e.g. from next-intl) to override the built-ins.
 */
export function formatRelativeDay(
  date: Date | string,
  locale: AppLocale,
  labels: RelativeDayLabels = {},
  timeZone?: string,
): string {
  const tz = timeZone ?? defaultTimeZone();
  const diff = dayKey(new Date(), tz) - dayKey(toDate(date), tz);
  if (diff === 0) {
    return labels.today ?? RELATIVE_DAY_LABELS[locale].today;
  }
  if (diff === 1) {
    return labels.yesterday ?? RELATIVE_DAY_LABELS[locale].yesterday;
  }
  // Fall back to a full date — formatted in the SAME timezone used for the
  // day diff, so the shown date always matches the computed relative day.
  return formatDate(date, locale, {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: tz,
  });
}

// ---------------------------------------------------------------------------
// Internal timezone helpers (DST-safe day math)
// ---------------------------------------------------------------------------

/** Parses `Intl` offset names such as "GMT+03:30", "GMT-05:00", "GMT". */
const GMT_OFFSET_RE = /^GMT([+-])(\d{1,2}):?(\d{2})?$/;

/** Offset (ms) of `timeZone` at the instant `date`, evaluated via Intl. */
function timeZoneOffsetMs(date: Date, timeZone: string): number {
  let value: string | undefined;
  try {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone,
      timeZoneName: 'longOffset',
    }).formatToParts(date);
    value = parts.find((part) => part.type === 'timeZoneName')?.value;
  } catch {
    return 0; // unknown timezone — fall back to a UTC frame
  }
  const match = GMT_OFFSET_RE.exec(value ?? '');
  if (!match) return 0;
  const sign = match[1] === '-' ? -1 : 1;
  const hours = Number(match[2]);
  const minutes = Number(match[3] ?? '0');
  return sign * (hours * 60 + minutes) * 60_000;
}

/**
 * Calendar-day index of `date` in `timeZone` (days since Unix epoch in the
 * local frame). Two instants share a key iff they fall on the same local day.
 */
function dayKey(date: Date, timeZone: string): number {
  return Math.floor((date.getTime() + timeZoneOffsetMs(date, timeZone)) / MS_PER_DAY);
}

/** A fake-UTC `Date` whose UTC fields equal `date`'s wall clock in `timeZone`. */
function wallClockDate(date: Date, timeZone: string): Date {
  return new Date(date.getTime() + timeZoneOffsetMs(date, timeZone));
}

/** Real epoch ms of local midnight of calendar day `key` in `timeZone`. */
function localMidnightMs(key: number, timeZone: string): number {
  const fakeMidnight = new Date(key * MS_PER_DAY);
  return fakeMidnight.getTime() - timeZoneOffsetMs(fakeMidnight, timeZone);
}

// ---------------------------------------------------------------------------
// Pure computation helpers
// ---------------------------------------------------------------------------

/** A session counts as a workout once `completedAt` is recorded. */
export function isCompletedSession(session: AnalyticsSession): boolean {
  return session.completedAt !== null && session.completedAt !== undefined;
}

/** Number of completed sessions in the history. */
export function countCompletedSessions(
  sessions: readonly AnalyticsSession[],
): number {
  return sessions.reduce((count, session) => count + (isCompletedSession(session) ? 1 : 0), 0);
}

/** Sets / reps actually performed in a session (completed exercises only). */
function volumeOf(session: AnalyticsSession): { sets: number; reps: number } {
  let sets = 0;
  let reps = 0;
  for (const exercise of session.exercises ?? []) {
    if (exercise.completed !== true) continue;
    if (typeof exercise.actualSets === 'number' && exercise.actualSets > 0) {
      sets += exercise.actualSets;
    }
    if (typeof exercise.actualReps === 'number' && exercise.actualReps > 0) {
      reps += exercise.actualReps;
    }
  }
  return { sets, reps };
}

/**
 * Estimated calories for one session.
 *
 * Uses the stored `caloriesBurned` when present; otherwise derives a MET
 * average from the completed exercises' categories and durations and applies
 * the standard formula `kcal = MET × 3.5 × weightKg / 200 × minutes`.
 *
 * @returns `{ calories, estimated }` — `estimated` is false only when the
 *          stored value was used.
 */
export function estimateSessionCalories(
  session: AnalyticsSession,
  opts: AnalyticsOptions = {},
): { calories: number; estimated: boolean } {
  const stored =
    typeof session.caloriesBurned === 'number' && session.caloriesBurned > 0
      ? session.caloriesBurned
      : null;
  if (stored !== null) {
    return { calories: Math.round(stored), estimated: false };
  }

  const weightKg =
    opts.weightKg && opts.weightKg > 0 ? opts.weightKg : DEFAULT_WEIGHT_KG;

  let durationSeconds =
    typeof session.durationSeconds === 'number' && session.durationSeconds > 0
      ? session.durationSeconds
      : 0;

  // Weighted MET average across completed exercises with recorded durations.
  let metSeconds = 0;
  let exerciseSeconds = 0;
  for (const exercise of session.exercises ?? []) {
    if (exercise.completed !== true) continue;
    const seconds = exercise.durationSeconds;
    if (typeof seconds !== 'number' || seconds <= 0) continue;
    const met = MET_BY_CATEGORY[exercise.exercise?.category ?? ''] ?? FALLBACK_MET;
    metSeconds += met * seconds;
    exerciseSeconds += seconds;
  }

  if (durationSeconds === 0) durationSeconds = exerciseSeconds;
  if (durationSeconds <= 0) {
    return { calories: 0, estimated: true };
  }

  const averageMet = exerciseSeconds > 0 ? metSeconds / exerciseSeconds : FALLBACK_MET;
  const minutes = durationSeconds / 60;
  const calories = Math.round((averageMet * 3.5 * weightKg) / 200 * minutes);
  return { calories, estimated: true };
}

/** Estimated total calories across all completed sessions. */
export function estimateCaloriesBurned(
  sessions: readonly AnalyticsSession[],
  opts: AnalyticsOptions = {},
): { calories: number; estimated: boolean } {
  let calories = 0;
  let estimated = false;
  for (const session of sessions) {
    if (!isCompletedSession(session)) continue;
    const result = estimateSessionCalories(session, opts);
    calories += result.calories;
    estimated = estimated || result.estimated;
  }
  return { calories, estimated };
}

/**
 * Volume (completed sessions, sets, reps) for the week containing `opts.now`
 * (default: the current week), bucketed Monday → Sunday in `opts.timeZone`.
 */
export function computeWeeklyVolume(
  sessions: readonly AnalyticsSession[],
  opts: AnalyticsOptions = {},
): WeeklyVolume {
  const timeZone = opts.timeZone ?? defaultTimeZone();
  const now = opts.now ?? new Date();

  const nowKey = dayKey(now, timeZone);
  const weekday = wallClockDate(now, timeZone).getUTCDay(); // 0 = Sunday
  const mondayKey = nowKey - ((weekday + 6) % 7);
  const weekEndKey = mondayKey + 7;

  let weekSessions = 0;
  let sets = 0;
  let reps = 0;
  for (const session of sessions) {
    if (!isCompletedSession(session)) continue;
    const key = dayKey(toDate(session.startedAt), timeZone);
    if (key < mondayKey || key >= weekEndKey) continue;
    weekSessions += 1;
    const volume = volumeOf(session);
    sets += volume.sets;
    reps += volume.reps;
  }

  return {
    weekStart: new Date(localMidnightMs(mondayKey, timeZone)),
    weekEnd: new Date(localMidnightMs(weekEndKey, timeZone)),
    sessions: weekSessions,
    sets,
    reps,
  };
}

/**
 * Current streak: consecutive calendar days (in `opts.timeZone`) with at least
 * one completed session, ending today — or ending yesterday when today has no
 * workout yet (the current day isn't over, so the streak remains alive).
 */
export function computeCurrentStreak(
  sessions: readonly AnalyticsSession[],
  opts: AnalyticsOptions = {},
): { days: number; endDate: Date | null } {
  const timeZone = opts.timeZone ?? defaultTimeZone();
  const now = opts.now ?? new Date();

  const activeDays = new Set<number>();
  for (const session of sessions) {
    if (!isCompletedSession(session)) continue;
    activeDays.add(dayKey(toDate(session.startedAt), timeZone));
  }

  let cursor = dayKey(now, timeZone);
  if (!activeDays.has(cursor)) {
    // Today not done yet — keep the streak alive if yesterday was active.
    cursor -= 1;
    if (!activeDays.has(cursor)) {
      return { days: 0, endDate: null };
    }
  }

  const endKey = cursor;
  let days = 0;
  while (activeDays.has(cursor)) {
    days += 1;
    cursor -= 1;
  }

  return { days, endDate: new Date(localMidnightMs(endKey, timeZone)) };
}

/**
 * Full analytics snapshot from a `WorkoutSession` history: total sessions,
 * all-time volume, estimated calories, current-week volume and current streak.
 * Pure — no database or auth access.
 */
export function computeWorkoutAnalytics(
  sessions: readonly AnalyticsSession[],
  opts: AnalyticsOptions = {},
): WorkoutAnalytics {
  // Sort internally so first/last workout don't depend on caller ordering.
  const completed = sessions
    .filter(isCompletedSession)
    .slice()
    .sort((a, b) => toDate(a.startedAt).getTime() - toDate(b.startedAt).getTime());

  let totalSets = 0;
  let totalReps = 0;
  let totalDurationSeconds = 0;
  for (const session of completed) {
    const volume = volumeOf(session);
    totalSets += volume.sets;
    totalReps += volume.reps;
    totalDurationSeconds += session.durationSeconds ?? 0;
  }

  const { calories: totalCaloriesBurned, estimated } =
    estimateCaloriesBurned(completed, opts);
  const streak = computeCurrentStreak(completed, opts);
  const weeklyVolume = computeWeeklyVolume(completed, opts);

  const firstWorkoutAt = completed[0] ? toDate(completed[0].startedAt) : null;
  const lastWorkoutAt = completed.length > 0
    ? toDate(completed[completed.length - 1].startedAt)
    : null;

  return {
    totalSessions: completed.length,
    totalDurationSeconds,
    totalCaloriesBurned,
    estimated,
    totalSets,
    totalReps,
    weeklyVolume,
    currentStreak: streak.days,
    streakEndDate: streak.endDate,
    firstWorkoutAt,
    lastWorkoutAt,
  };
}

// ---------------------------------------------------------------------------
// Server-side entry point (auth + Prisma)
// ---------------------------------------------------------------------------

/**
 * Returns workout analytics for the authenticated user (or `userId` when
 * provided). Fetches the `WorkoutSession` history with exercise categories
 * (needed for calorie estimates) and uses the stored body weight when no
 * `weightKg` option is passed.
 *
 * Query optimizations (vs. the previous full-graph `findMany` + nested
 * `include`):
 * - `completedAt IS NOT NULL` is pushed into the WHERE clause, so incomplete
 *   sessions and their exercises never leave the database (the pure helpers
 *   only ever count completed sessions anyway).
 * - Sessions are fetched with only the scalar columns analytics needs
 *   (`startedAt`, `completedAt`, `durationSeconds`, `caloriesBurned`) — the
 *   heavy exercise graph is no longer loaded for every session.
 * - Volume + calorie inputs are read in ONE join-table query on
 *   `WorkoutSessionExercise`, filtered via the session relation and restricted
 *   to `completed === true` rows (the helpers skip anything else).
 * - Ordering by `startedAt` is served by `@@index([userId, startedAt])`;
 *   the completion filter is served by `@@index([userId, completedAt])`.
 *
 * @throws {UnauthenticatedError} when the request has no auth session.
 */
export async function getWorkoutAnalytics(
  userId?: string,
  opts: AnalyticsOptions = {},
): Promise<WorkoutAnalytics> {
  const supabaseUser = await getSupabaseAuthUser();
  const ownerId = userId ?? (await syncUserWithSupabase(supabaseUser)).id;

  // Only completed sessions contribute to totals, volume, streaks and calorie
  // estimates — filter at the database so nothing else is transferred.
  const completedWhere: Prisma.WorkoutSessionWhereInput = {
    userId: ownerId,
    completedAt: { not: null },
  };

  const [sessionRows, exerciseRows, profile] = await Promise.all([
    prisma.workoutSession.findMany({
      where: completedWhere,
      select: {
        id: true,
        startedAt: true,
        completedAt: true,
        durationSeconds: true,
        caloriesBurned: true,
      },
      orderBy: { startedAt: 'asc' }, // index-backed: @@index([userId, startedAt])
    }),
    prisma.workoutSessionExercise.findMany({
      where: {
        completed: true,
        session: completedWhere,
      },
      select: {
        sessionId: true,
        completed: true,
        actualSets: true,
        actualReps: true,
        durationSeconds: true,
        exercise: { select: { category: true } },
      },
    }),
    prisma.user.findUnique({
      where: { id: ownerId },
      select: { weightKg: true },
    }),
  ]);

  // Group the join-table rows back onto their sessions — the resulting shape
  // matches `AnalyticsSession` so the pure helpers consume it unchanged.
  const exercisesBySession = new Map<string, AnalyticsSessionExercise[]>();
  for (const row of exerciseRows) {
    const list = exercisesBySession.get(row.sessionId);
    if (list) {
      list.push(row);
    } else {
      exercisesBySession.set(row.sessionId, [row]);
    }
  }

  const sessions: AnalyticsSession[] = sessionRows.map((session) => ({
    ...session,
    exercises: exercisesBySession.get(session.id) ?? [],
  }));

  const resolvedOptions: AnalyticsOptions = {
    ...opts,
    weightKg: opts.weightKg ?? profile?.weightKg ?? undefined,
  };

  return {
    ...computeWorkoutAnalytics(sessions, resolvedOptions),
    userId: ownerId,
  };
}
