import type {Page} from '@playwright/test';

/**
 * Deterministic dashboard-data fixture for E2E (SPEC-RECONCILIATION-02).
 *
 * The dashboard's weekly calendar, completion summary and "today's workout"
 * panels render only after `/api/profile` (quizCompleted) and
 * `/api/program/current` (program + workoutSessions) return data. Those
 * routes are auth-gated and CI has no session backend (AUTH_OTP_MODE=mock
 * never mints sessions — src/lib/auth/mode.ts), so the data-dependent
 * dashboard specs inject the same persisted shapes through Playwright route
 * interception. Every assertion in those specs still runs against the real
 * client-rendered dashboard markup; only the data source is deterministic.
 *
 * The plan mirrors the dashboard's Monday → Sunday convention:
 *   [workout, workout, rest, workout, workout, rest, workout]
 * Monday carries focus "Full Body HIIT" (rendered as the selected-day
 * workout heading), Wednesday and Saturday are rest days, so exactly five
 * workout sessions exist per week.
 */

/** Monday → Sunday workout flags (true = workout day). */
export const DASHBOARD_WEEK_PLAN = [true, true, false, true, true, false, true];

/** Total workout days in the plan — the denominator of the progress text. */
export const DASHBOARD_TOTAL_SESSIONS = DASHBOARD_WEEK_PLAN.filter(Boolean).length;

const WEEKDAY_NAMES = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
  'Sunday',
] as const;

/** Date-key format used by the dashboard for completed-session matching. */
function dateKey(date: Date): string {
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
}

/** 0-based position of `date` inside the Monday-anchored plan (Sunday=0 → Monday=0). */
function mondayPlanIndex(date: Date): number {
  return (date.getDay() + 6) % 7;
}

/** Monday 00:00 of the week containing `date` (the dashboard's en week start). */
function startOfWeekMonday(date: Date): Date {
  const first = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  first.setDate(first.getDate() - mondayPlanIndex(date));
  return first;
}

/**
 * The seven calendar days of the week containing `date`, in column order for
 * `locale` (en: Monday → Sunday, fa: Saturday → Friday) — mirrors
 * src/lib/weekCalendar.ts.
 */
function weekDaysFor(date: Date, locale: string): Date[] {
  const start = locale === 'fa' ? 6 : 1; // getDay(): 6=Saturday, 1=Monday
  const first = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  first.setDate(first.getDate() - ((date.getDay() - start + 7) % 7));
  return Array.from({length: 7}, (_, i) => {
    const day = new Date(first);
    day.setDate(first.getDate() + i);
    return day;
  });
}

/** Weekly schedule (the shape GET /api/program/current returns). */
function buildSchedule(): unknown[] {
  return WEEKDAY_NAMES.map((name, index) => {
    if (!DASHBOARD_WEEK_PLAN[index]) {
      return {day: index + 1, day_name: name, is_rest_day: true};
    }
    return {
      day: index + 1, // 1 = Monday (restDays WEEKDAY_VALUES convention)
      day_name: name,
      focus: index === 0 ? 'Full Body HIIT' : `${name} focus`,
      exercises: Array.from({length: 3 + (index % 3)}, (_, j) => ({
        id: `e2e-exercise-${index}-${j}`,
        name: `${name} exercise ${j + 1}`,
        sets: 3,
        reps: 10,
      })),
    };
  });
}

/**
 * Completed workout sessions on every workout day before `today` inside the
 * Monday-anchored week (the same window the en dashboard counts). Saturday
 * is a rest day, so the fa (Saturday-start) window never gains an extra
 * workout day beyond the en window.
 */
function buildCompletedSessions(today: Date): Array<{id: string; startedAt: string; completedAt: string}> {
  const weekStart = startOfWeekMonday(today);
  const sessions: Array<{id: string; startedAt: string; completedAt: string}> = [];
  for (let i = 0; i < mondayPlanIndex(today); i++) {
    if (!DASHBOARD_WEEK_PLAN[i]) continue;
    const date = new Date(weekStart);
    date.setDate(weekStart.getDate() + i);
    const iso = date.toISOString();
    sessions.push({id: `e2e-session-${i}`, startedAt: iso, completedAt: iso});
  }
  return sessions;
}

/**
 * The completion count the dashboard renders for `locale` with this fixture
 * (completed workout days inside the locale's current week window) — mirrors
 * the dashboard's sessionsDone computation so specs can assert exact text.
 */
export function expectedSessionsDone(locale: 'en' | 'fa', today = new Date()): number {
  const sessionKeys = new Set(
    buildCompletedSessions(today).map((session) => dateKey(new Date(session.startedAt))),
  );
  return weekDaysFor(today, locale).filter((day) => sessionKeys.has(dateKey(day))).length;
}

/**
 * Install route mocks for `/api/profile` and `/api/program/current`.
 *
 * Register AFTER any catch-all context.route handler (such as the offline
 * cache recorder) so these more specific routes win (Playwright routes are
 * LIFO), which lets the offline cache-replay specs re-serve the same
 * program data offline.
 */
export async function useDashboardData(page: Page, today = new Date()): Promise<void> {
  await page.route('**/api/profile', (route) =>
    route.fulfill({
      json: {
        quizCompleted: true,
        preferences: {exerciseStyles: ['calisthenics'], equipment: ['dumbbells']},
      },
    }),
  );
  await page.route('**/api/program/current', (route) =>
    route.fulfill({
      json: {
        program: {
          restDays: ['wednesday', 'saturday'],
          weeklySchedule: buildSchedule(),
          workoutSessions: buildCompletedSessions(today),
        },
      },
    }),
  );
}