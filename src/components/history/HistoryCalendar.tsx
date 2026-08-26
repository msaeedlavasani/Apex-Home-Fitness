'use client';

import {useEffect, useMemo, useState} from 'react';
import {Check, ChevronLeft, ChevronRight, CalendarDays} from 'lucide-react';
import type {HistoryTranslator} from './HistorySummary';

/**
 * HistoryCalendar — interactive monthly training calendar (client component).
 *
 * Every calendar day is marked with one of:
 *   - a green check   → a workout was completed that day (from the completed
 *                       sessions' `startedAt` instants, bucketed into LOCAL
 *                       calendar days — the visitor's own timezone);
 *   - a gray dot      → the weekday is one of the user's rest days (from the
 *                       program's `restDays` selection);
 *   - a red dot       → a PAST training day with no completed session — the
 *                       workout was missed.
 *
 * Months navigate with ‹ / › buttons. The `fa` locale renders the Persian
 * (Jalali) calendar — month boundaries, month label and day numbers all come
 * from `Intl` with the Persian calendar — and starts the week on Saturday;
 * `en` renders the Gregorian month starting on Monday.
 *
 * `today` is resolved in a mount effect (like the dashboard) so the
 * server-rendered HTML never differs from the first client render.
 */
export interface HistoryCalendarProps {
  /** ISO instants of completed sessions — bucketed into local days here. */
  sessionStarts: string[];
  /** Canonical rest-day weekday ids ('monday'…'sunday'), or null without a program. */
  restDays: string[] | null;
  locale: 'en' | 'fa';
  /** Localized messages under the `History` namespace. */
  t: HistoryTranslator;
}

/** Weekday order per locale as `getDay()` values (0 = Sunday … 6 = Saturday). */
const WEEKDAY_ORDER: Record<'en' | 'fa', number[]> = {
  en: [1, 2, 3, 4, 5, 6, 0], // Monday first
  fa: [6, 0, 1, 2, 3, 4, 5], // Saturday (شنبه) first
};

/** Canonical weekday id per `getDay()` (0 = Sunday … 6 = Saturday). */
const WEEKDAY_IDS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'] as const;

/** Local calendar-day key, e.g. `2026-8-26` — timezone-free on the client. */
function localDayKey(date: Date): string {
  return `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
}

interface JalaliParts {
  year: number;
  month: number;
  day: number;
}

/** Persian (Jalali) calendar parts with Latin digits — used for fa month math. */
function jalaliParts(date: Date): JalaliParts {
  const parts = new Intl.DateTimeFormat('en-US-u-ca-persian', {
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
  }).formatToParts(date);
  const get = (type: string) => Number(parts.find((part) => part.type === type)?.value ?? 0);
  return {year: get('year'), month: get('month'), day: get('day')};
}

/** Stable month key: `year-month` in the locale's calendar. */
function monthKeyOf(date: Date, locale: 'en' | 'fa'): string {
  if (locale === 'fa') {
    const parts = jalaliParts(date);
    return `${parts.year}-${parts.month}`;
  }
  return `${date.getFullYear()}-${date.getMonth() + 1}`;
}

/** A date inside the month that is `monthOffset` months away from `today`. */
function anchorForMonth(monthOffset: number, today: Date, locale: 'en' | 'fa'): Date {
  if (monthOffset === 0) return today;
  if (locale !== 'fa') {
    return new Date(today.getFullYear(), today.getMonth() + monthOffset, 1);
  }
  const current = jalaliParts(today);
  const total = current.year * 12 + (current.month - 1) + monthOffset;
  const targetYear = Math.floor(total / 12);
  const targetMonth = (total % 12) + 1;
  // Walk day by day from today toward the target Jalali month (bounded — the
  // anchor only needs to land anywhere inside the target month).
  const direction =
    targetYear * 12 + targetMonth >= current.year * 12 + current.month ? 1 : -1;
  let cursor = new Date(today);
  for (let i = 0; i <= Math.abs(monthOffset) * 33 + 5; i += 1) {
    const parts = jalaliParts(cursor);
    if (parts.year === targetYear && parts.month === targetMonth) return cursor;
    cursor = new Date(cursor.getFullYear(), cursor.getMonth(), cursor.getDate() + direction);
  }
  return today;
}

/** Every calendar day (local Date objects) of the month containing `anchor`. */
function daysOfMonth(anchor: Date, locale: 'en' | 'fa'): Date[] {
  const target = monthKeyOf(anchor, locale);
  // Walk back to the first day of the month, then forward collecting all days.
  let cursor = new Date(anchor);
  while (monthKeyOf(cursor, locale) === target) {
    cursor = new Date(cursor.getFullYear(), cursor.getMonth(), cursor.getDate() - 1);
  }
  cursor = new Date(cursor.getFullYear(), cursor.getMonth(), cursor.getDate() + 1);
  const days: Date[] = [];
  while (monthKeyOf(cursor, locale) === target) {
    days.push(cursor);
    cursor = new Date(cursor.getFullYear(), cursor.getMonth(), cursor.getDate() + 1);
  }
  return days;
}

type DayStatus = 'done' | 'rest' | 'missed' | 'plain';

export function HistoryCalendar({sessionStarts, restDays, locale, t}: HistoryCalendarProps) {
  // Resolved after mount so SSR and the first client render agree (null state).
  const [today, setToday] = useState<Date | null>(null);
  const [monthOffset, setMonthOffset] = useState(0);

  useEffect(() => {
    setToday(new Date());
  }, []);

  const activeDays = useMemo(
    () => new Set(sessionStarts.map((iso) => localDayKey(new Date(iso)))),
    [sessionStarts],
  );
  const restSet = useMemo(() => new Set(restDays ?? []), [restDays]);

  // Everything below needs the client-resolved `today`.
  const todayStart = today ? new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime() : null;
  const todayKey = today ? localDayKey(today) : null;

  const month = useMemo(() => {
    if (!today) return null;
    return daysOfMonth(anchorForMonth(monthOffset, today, locale), locale);
  }, [today, monthOffset, locale]);

  const monthLabel = month
    ? new Intl.DateTimeFormat(locale === 'fa' ? 'fa-IR' : 'en-US', {
        year: 'numeric',
        month: 'long',
      }).format(month[0])
    : '';

  const weekdayLabels = WEEKDAY_ORDER[locale].map((getDay) => {
    const base = new Date(2026, 7, 9); // Sunday, Aug 9 2026 — a known Sunday
    const date = new Date(base.getFullYear(), base.getMonth(), base.getDate() + getDay);
    return new Intl.DateTimeFormat(locale === 'fa' ? 'fa-IR' : 'en-US', {
      weekday: 'short',
    }).format(date);
  });

  function statusOf(date: Date): DayStatus {
    if (activeDays.has(localDayKey(date))) return 'done';
    const weekdayId = WEEKDAY_IDS[date.getDay()];
    const isRest = restDays !== null && restSet.has(weekdayId);
    if (isRest) return 'rest';
    // Past training day with no completed session → missed. Only meaningful
    // when a program exists (restDays !== null) — otherwise every empty past
    // day would look like a failure. Today and the future are never missed.
    if (restDays !== null && todayStart !== null && date.getTime() < todayStart) return 'missed';
    return 'plain';
  }

  const dayNumber = (date: Date): string => {
    const value = locale === 'fa' ? jalaliParts(date).day : date.getDate();
    return locale === 'fa' ? new Intl.NumberFormat('fa-IR').format(value) : String(value);
  };

  const leadingBlanks = month ? WEEKDAY_ORDER[locale].indexOf(month[0].getDay()) : 0;

  return (
    <section
      aria-label={t('calendar.title')}
      className="mt-5 rounded-3xl border border-apex-border bg-apex-card p-4 shadow-sm sm:p-5"
    >
      <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold text-apex-text-primary">
        <CalendarDays className="h-4 w-4 text-apex-primary" aria-hidden="true" />
        {t('calendar.title')}
      </h2>

      {!month || todayStart === null ? (
        <div role="status" aria-live="polite" className="flex h-56 items-center justify-center">
          <span className="h-5 w-5 animate-spin rounded-full border-2 border-apex-primary border-t-transparent" />
        </div>
      ) : (
        <>
          <div className="flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={() => setMonthOffset((offset) => offset - 1)}
              aria-label={t('calendar.prevMonth')}
              className="flex h-10 w-10 items-center justify-center rounded-full text-apex-text-secondary transition-colors hover:bg-apex-fill hover:text-apex-text-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-apex-focus-ring"
            >
              <ChevronLeft className="h-5 w-5 rtl:rotate-180" aria-hidden="true" />
            </button>
            <h3 className="min-w-0 truncate px-2 text-center text-[15px] font-bold tracking-tight text-apex-text-primary">
              {monthLabel}
            </h3>
            <button
              type="button"
              onClick={() => setMonthOffset((offset) => offset + 1)}
              aria-label={t('calendar.nextMonth')}
              className="flex h-10 w-10 items-center justify-center rounded-full text-apex-text-secondary transition-colors hover:bg-apex-fill hover:text-apex-text-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-apex-focus-ring"
            >
              <ChevronRight className="h-5 w-5 rtl:rotate-180" aria-hidden="true" />
            </button>
          </div>

          <div className="mt-3 grid grid-cols-7 gap-1 text-center">
            {weekdayLabels.map((label) => (
              <span
                key={label}
                className="text-[11px] font-semibold uppercase tracking-wide text-apex-text-tertiary"
              >
                {label}
              </span>
            ))}
            {Array.from({length: leadingBlanks}, (_, index) => (
              <span key={`blank-${index}`} aria-hidden="true" />
            ))}
            {month.map((date) => {
              const status = statusOf(date);
              const isToday = todayKey !== null && localDayKey(date) === todayKey;
              return (
                <div
                  key={localDayKey(date)}
                  className={[
                    'flex min-h-10 flex-col items-center justify-center gap-0.5 rounded-xl py-1',
                    isToday
                      ? 'bg-apex-primary-soft ring-1 ring-inset ring-apex-primary'
                      : 'hover:bg-apex-fill',
                  ].join(' ')}
                >
                  <span
                    className={[
                      'text-[13px] font-semibold tabular-nums',
                      isToday ? 'text-apex-primary' : 'text-apex-text-primary',
                    ].join(' ')}
                  >
                    {dayNumber(date)}
                  </span>
                  {status === 'done' ? (
                    <Check className="h-3.5 w-3.5 text-emerald-500" aria-hidden="true" />
                  ) : status === 'rest' ? (
                    <span className="h-1.5 w-1.5 rounded-full bg-slate-400" aria-hidden="true" />
                  ) : status === 'missed' ? (
                    <span className="h-1.5 w-1.5 rounded-full bg-rose-500" aria-hidden="true" />
                  ) : (
                    <span className="h-1.5 w-1.5" aria-hidden="true" />
                  )}
                </div>
              );
            })}
          </div>

          <div className="mt-4 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 border-t border-apex-border pt-3 text-xs text-apex-text-secondary">
            <span className="flex items-center gap-1.5">
              <Check className="h-3.5 w-3.5 text-emerald-500" aria-hidden="true" />
              {t('calendar.legendWorkout')}
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-slate-400" aria-hidden="true" />
              {t('calendar.legendRest')}
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-rose-500" aria-hidden="true" />
              {t('calendar.legendMissed')}
            </span>
          </div>
        </>
      )}
    </section>
  );
}

export default HistoryCalendar;
