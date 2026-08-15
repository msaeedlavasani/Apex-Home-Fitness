/**
 * Week-order helpers for the dashboard weekly calendar.
 *
 * Locale conventions:
 * - `en`: the week starts on Monday (existing convention — kept unchanged).
 * - `fa`: the week starts on Saturday (شنبه) and runs شنبه → جمعه.
 *
 * The dashboard's sample plan (`WEEK_PLAN` in the dashboard page) stays
 * anchored to a Monday → Sunday schedule in both locales. `mondayPlanIndex`
 * maps any calendar day back to that plan ordering, so day selection and
 * the "sessions done" completion count never depend on the locale's column
 * order.
 */

/**
 * JS `Date.prototype.getDay()` value (0=Sunday … 6=Saturday) that opens the
 * week for a locale.
 */
const WEEK_START_DAY: Record<string, number> = {
  en: 1, // Monday
  fa: 6, // Saturday
};

/** Fallback when an unknown locale is passed (keeps the Monday convention). */
const DEFAULT_WEEK_START_DAY = 1;

/** Resolve the first day of the week for `locale` as a `getDay()` value. */
export function getWeekStartDay(locale: string): number {
  return WEEK_START_DAY[locale] ?? DEFAULT_WEEK_START_DAY;
}

/** Date of the first day of the week containing `date`, per `locale`. */
export function startOfWeek(date: Date, locale: string): Date {
  const start = getWeekStartDay(locale);
  const offset = (date.getDay() - start + 7) % 7;
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() - offset);
}

/** 0-based position of `date` inside its week (0 = first calendar column). */
export function dayIndexInWeek(date: Date, locale: string): number {
  const start = getWeekStartDay(locale);
  return (date.getDay() - start + 7) % 7;
}

/**
 * 0-based position of `date` inside the Monday-anchored `WEEK_PLAN`
 * (Sunday=0 → Monday=0). Used to look up the plan entry for a calendar day
 * regardless of the locale's column order.
 */
export function mondayPlanIndex(date: Date): number {
  return (date.getDay() + 6) % 7;
}

/**
 * The seven calendar days of the week containing `date`, in column order for
 * `locale` (en: Monday → Sunday, fa: Saturday → Friday).
 */
export function weekDaysFor(date: Date, locale: string): Date[] {
  const first = startOfWeek(date, locale);
  return Array.from({length: 7}, (_, i) => {
    const day = new Date(first);
    day.setDate(first.getDate() + i);
    return day;
  });
}
