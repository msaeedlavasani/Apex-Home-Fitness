import React from 'react';
import {CalendarCheck, CalendarDays, Dumbbell, Flame} from 'lucide-react';
import type {LucideIcon} from 'lucide-react';
import type {WorkoutAnalytics} from '@/services/analyticsService';

/**
 * Minimal translator signature — compatible with next-intl's `t` and easy to
 * stub in unit tests (same pattern as `src/components/quiz/steps/GoalStep`).
 */
export type HistoryTranslator = (key: string, values?: Record<string, unknown>) => string;

export interface HistorySummaryProps {
  /** Aggregated workout statistics from `analyticsService.getWorkoutAnalytics`. */
  analytics: WorkoutAnalytics;
  /** Localized messages under the `History` namespace. */
  t: HistoryTranslator;
  /** Accessible section label (defaults to `History.title`). */
  label?: string;
}

interface SummaryCard {
  icon: LucideIcon;
  label: string;
  value: string;
}

/**
 * History summary data cards — total sessions, total volume (sets · reps),
 * active days and the current streak. Pure presentational component: the
 * parent owns data fetching and translations, so this renders identically
 * in server components and unit tests.
 */
export function HistorySummary({analytics, t, label}: HistorySummaryProps) {
  const cards: SummaryCard[] = [
    {
      icon: CalendarCheck,
      label: t('summary.sessions'),
      value: t('summaryUnits.sessions', {count: analytics.totalSessions}),
    },
    {
      icon: Dumbbell,
      label: t('summary.volume'),
      value: t('summaryUnits.volume', {
        sets: analytics.totalSets,
        reps: analytics.totalReps,
      }),
    },
    {
      icon: CalendarDays,
      label: t('summary.activeDays'),
      value: t('summaryUnits.days', {count: analytics.activeDays}),
    },
    {
      icon: Flame,
      label: t('summary.streak'),
      value: t('summaryUnits.days', {count: analytics.currentStreak}),
    },
  ];

  return (
    <section aria-label={label ?? t('title')} className="grid grid-cols-2 gap-3">
      {cards.map(({icon: Icon, label: cardLabel, value}) => (
        <div key={cardLabel} className="glass rounded-2xl p-4">
          <div className="flex items-center justify-between gap-2">
            <p className="text-[13px] font-medium leading-snug text-apex-text-secondary">
              {cardLabel}
            </p>
            <Icon className="h-4 w-4 shrink-0 text-apex-primary" aria-hidden="true" />
          </div>
          <p className="mt-1.5 break-words text-lg font-bold tabular-nums leading-snug tracking-tight text-apex-text-primary">
            {value}
          </p>
        </div>
      ))}
    </section>
  );
}

export default HistorySummary;
