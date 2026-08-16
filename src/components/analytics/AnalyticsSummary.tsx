import React from 'react';
import {Activity, Clock, Dumbbell, Flame} from 'lucide-react';
import type {LucideIcon} from 'lucide-react';
import type {WorkoutAnalytics} from '@/services/analyticsService';

/**
 * Minimal translator signature — compatible with next-intl's `t` and easy to
 * stub in unit tests (same pattern as `src/components/quiz/steps/GoalStep`).
 */
export type AnalyticsTranslator = (key: string, values?: Record<string, unknown>) => string;

export interface AnalyticsSummaryProps {
  /** Aggregated workout statistics from `analyticsService.getWorkoutAnalytics`. */
  analytics: WorkoutAnalytics;
  /** Localized messages under the `Analytics` namespace. */
  t: AnalyticsTranslator;
  /** Accessible section label (defaults to `Analytics.stats.title`). */
  label?: string;
}

interface StatCard {
  icon: LucideIcon;
  label: string;
  value: string;
}

/** Total active time in whole minutes (rounds down partial minutes). */
function totalMinutes(analytics: WorkoutAnalytics): number {
  return Math.floor(analytics.totalDurationSeconds / 60);
}

/**
 * Analytics "All time" stat cards — sessions, volume (sets), active minutes
 * and calories burned. Pure presentational component: the parent owns data
 * fetching and translations, so this renders identically in server
 * components and unit tests.
 */
export function AnalyticsSummary({analytics, t, label}: AnalyticsSummaryProps) {
  const cards: StatCard[] = [
    {
      icon: Activity,
      label: t('stats.sessions'),
      value: t('statsUnits.sessions', {count: analytics.totalSessions}),
    },
    {
      icon: Dumbbell,
      label: t('stats.volume'),
      value: t('statsUnits.sets', {count: analytics.totalSets}),
    },
    {
      icon: Clock,
      label: t('stats.minutes'),
      value: t('statsUnits.minutes', {count: totalMinutes(analytics)}),
    },
    {
      icon: Flame,
      label: t('stats.calories'),
      value: t('statsUnits.calories', {count: analytics.totalCaloriesBurned}),
    },
  ];

  return (
    <section aria-label={label ?? t('stats.title')} className="grid grid-cols-2 gap-3">
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

export default AnalyticsSummary;
