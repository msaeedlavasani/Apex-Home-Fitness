'use client';

import {useFormatter, useLocale, useTranslations} from 'next-intl';
import Link from 'next/link';
import {useMemo, useState} from 'react';
import type {LucideIcon} from 'lucide-react';
import {AppShell} from '@/components/layout/AppShell';
import {ANALYTICS_EVENTS, trackEvent} from '@/services/analyticsEvents';
import {
  CalendarDays,
  Check,
  Clock,
  Dumbbell,
  Flame,
  Moon,
  Play,
  Sparkles,
} from 'lucide-react';

type Difficulty = 'beginner' | 'intermediate' | 'advanced';

type Workout = {
  /** Key into messages `Dashboard.workouts.*` */
  nameKey: string;
  durationMin: number;
  exercises: number;
  calories: number;
  difficulty: Difficulty;
};

type DayPlan = {type: 'rest'} | {type: 'workout'; workout: Workout};

/**
 * Sample weekly plan (Monday → Sunday).
 * Swap this for real data (Program / WorkoutSession from Prisma)
 * once the data layer is wired up.
 */
const WEEK_PLAN: DayPlan[] = [
  {
    type: 'workout',
    workout: {
      nameKey: 'workouts.fullBodyHiit',
      durationMin: 30,
      exercises: 6,
      calories: 280,
      difficulty: 'intermediate',
    },
  },
  {
    type: 'workout',
    workout: {
      nameKey: 'workouts.yogaFlow',
      durationMin: 20,
      exercises: 8,
      calories: 120,
      difficulty: 'beginner',
    },
  },
  {type: 'rest'},
  {
    type: 'workout',
    workout: {
      nameKey: 'workouts.upperBody',
      durationMin: 35,
      exercises: 5,
      calories: 240,
      difficulty: 'intermediate',
    },
  },
  {
    type: 'workout',
    workout: {
      nameKey: 'workouts.corePilates',
      durationMin: 25,
      exercises: 7,
      calories: 160,
      difficulty: 'beginner',
    },
  },
  {type: 'rest'},
  {
    type: 'workout',
    workout: {
      nameKey: 'workouts.mobility',
      durationMin: 20,
      exercises: 6,
      calories: 100,
      difficulty: 'beginner',
    },
  },
];

const DIFFICULTY_BADGE: Record<Difficulty, string> = {
  beginner: 'bg-emerald-400/20 text-emerald-300',
  intermediate: 'bg-amber-400/20 text-amber-300',
  advanced: 'bg-rose-400/20 text-rose-300',
};

/** Monday of the week containing `date`. */
function startOfWeek(date: Date): Date {
  const mondayOffset = (date.getDay() + 6) % 7; // Sunday=0 → Monday=0
  return new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate() - mondayOffset,
  );
}

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export default function DashboardPage() {
  const t = useTranslations('Dashboard');
  const format = useFormatter();
  const locale = useLocale();

  const today = useMemo(() => new Date(), []);

  const todayIndex = useMemo(() => {
    const monday = startOfWeek(today);
    const diff = Math.floor((today.getTime() - monday.getTime()) / 86_400_000);
    return Math.min(Math.max(diff, 0), 6);
  }, [today]);

  const [selectedIndex, setSelectedIndex] = useState(todayIndex);

  const weekDays = useMemo(() => {
    const monday = startOfWeek(today);
    return Array.from({length: 7}, (_, i) => {
      const day = new Date(monday);
      day.setDate(monday.getDate() + i);
      return day;
    });
  }, [today]);

  const startOfToday = useMemo(
    () => new Date(today.getFullYear(), today.getMonth(), today.getDate()),
    [today],
  );

  const selectedPlan = WEEK_PLAN[selectedIndex];
  const isTodaySelected = selectedIndex === todayIndex;

  const sessionsDone = WEEK_PLAN.slice(0, todayIndex).filter(
    (plan) => plan.type === 'workout',
  ).length;
  const totalSessions = WEEK_PLAN.filter(
    (plan) => plan.type === 'workout',
  ).length;

  const hour = today.getHours();
  const greetingKey =
    hour < 12
      ? 'greeting.morning'
      : hour < 18
        ? 'greeting.afternoon'
        : 'greeting.evening';

  const selectedDateLabel = format.dateTime(weekDays[selectedIndex], {
    weekday: 'long',
    day: 'numeric',
  });

  return (
    <AppShell
      overline={t(greetingKey)}
      title={format.dateTime(today, {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
      })}
      subtitle={t('weekLabel')}
    >
      {/* Page content — the platform shell owns safe areas & navigation. */}
      <div className="mx-auto w-full max-w-md px-4 sm:max-w-lg md:max-w-xl">

        {/* Weekly calendar */}
        <section
          aria-label={t('calendarTitle')}
          className="rounded-3xl border border-slate-200 bg-white p-3 shadow-sm sm:p-5"
        >
          <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold text-slate-700">
            <CalendarDays className="h-4 w-4 text-emerald-600" aria-hidden="true" />
            {t('calendarTitle')}
          </h2>

          <div className="grid grid-cols-7 gap-1 sm:gap-2">
            {weekDays.map((day, index) => {
              const plan = WEEK_PLAN[index];
              const isToday = index === todayIndex;
              const isSelected = index === selectedIndex;
              const isPast = day.getTime() < startOfToday.getTime();
              const isRest = plan.type === 'rest';

              return (
                <button
                  key={day.toISOString()}
                  type="button"
                  aria-pressed={isSelected}
                  aria-label={format.dateTime(day, {
                    weekday: 'long',
                    day: 'numeric',
                    month: 'long',
                  })}
                  onClick={() => setSelectedIndex(index)}
                  className={[
                    'flex min-h-10 min-w-0 flex-col items-center gap-1 rounded-2xl px-1 py-2 transition touch-manipulation sm:py-3',
                    isSelected
                      ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30'
                      : isToday
                        ? 'bg-emerald-50 ring-2 ring-emerald-500 hover:bg-emerald-100'
                        : 'hover:bg-emerald-50',
                  ].join(' ')}
                >
                  <span
                    className={[
                      'text-[10px] font-semibold uppercase sm:text-xs',
                      isSelected ? 'text-emerald-100' : 'text-slate-400',
                    ].join(' ')}
                  >
                    {format.dateTime(day, {weekday: 'short'})}
                  </span>
                  <span
                    className={[
                      'text-sm font-bold tabular-nums sm:text-base',
                      isSelected
                        ? 'text-white'
                        : isToday
                          ? 'text-emerald-700'
                          : 'text-slate-800',
                    ].join(' ')}
                  >
                    {format.dateTime(day, {day: 'numeric'})}
                  </span>

                  {isPast ? (
                    <Check
                      className={[
                        'h-3 w-3',
                        isSelected ? 'text-emerald-200' : 'text-emerald-500',
                      ].join(' ')}
                      aria-hidden="true"
                    />
                  ) : (
                    <span
                      aria-hidden="true"
                      className={[
                        'h-1.5 w-1.5 rounded-full',
                        isRest
                          ? 'bg-slate-300'
                          : isSelected
                            ? 'bg-white'
                            : 'bg-emerald-500',
                      ].join(' ')}
                    />
                  )}
                </button>
              );
            })}
          </div>

          <p className="mt-4 border-t border-slate-100 pt-3 text-center text-xs font-medium text-slate-500">
            {t('weekProgress', {done: sessionsDone, total: totalSessions})}
          </p>
        </section>

        {/* Current day's workout summary */}
        <section
          aria-label={t('summaryTitle')}
          className={[
            'mt-5 rounded-3xl p-5 text-white shadow-lg sm:p-6',
            selectedPlan.type === 'rest'
              ? 'bg-gradient-to-br from-slate-600 to-slate-700 shadow-slate-600/20'
              : 'bg-gradient-to-br from-emerald-600 to-teal-600 shadow-emerald-600/25',
          ].join(' ')}
        >
          {selectedPlan.type === 'rest' ? (
            <>
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/10">
                  <Moon className="h-6 w-6" aria-hidden="true" />
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-300">
                    {isTodaySelected ? t('summaryTitle') : selectedDateLabel}
                  </p>
                  <h2 className="mt-1 text-xl font-bold sm:text-2xl">
                    {t('summaryRest')}
                  </h2>
                </div>
              </div>
              <p className="mt-4 text-sm leading-relaxed text-slate-200">
                {t('summaryRestDesc')}
              </p>
            </>
          ) : (
            <>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-emerald-200">
                    <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
                    {isTodaySelected ? t('summaryTitle') : selectedDateLabel}
                  </p>
                  <h2 className="mt-2 text-xl font-bold leading-tight sm:text-2xl">
                    {t(selectedPlan.workout.nameKey)}
                  </h2>
                  <span
                    className={[
                      'mt-2 inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold',
                      DIFFICULTY_BADGE[selectedPlan.workout.difficulty],
                    ].join(' ')}
                  >
                    {t(`difficulty.${selectedPlan.workout.difficulty}`)}
                  </span>
                </div>
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/15">
                  <Dumbbell className="h-6 w-6" aria-hidden="true" />
                </div>
              </div>

              <div className="mt-5 grid grid-cols-3 gap-2">
                <Stat
                  icon={Clock}
                  value={t('units.minutes', {
                    count: selectedPlan.workout.durationMin,
                  })}
                  label={t('stats.duration')}
                />
                <Stat
                  icon={Dumbbell}
                  value={t('units.exercisesCount', {
                    count: selectedPlan.workout.exercises,
                  })}
                  label={t('stats.exercises')}
                />
                <Stat
                  icon={Flame}
                  value={t('units.caloriesCount', {
                    count: selectedPlan.workout.calories,
                  })}
                  label={t('stats.calories')}
                />
              </div>

              <Link
                href={`/${locale}/workout`}
                onClick={() =>
                  trackEvent(ANALYTICS_EVENTS.WORKOUT_START_CLICKED, {
                    workout: selectedPlan.workout.nameKey,
                    durationMin: selectedPlan.workout.durationMin,
                    difficulty: selectedPlan.workout.difficulty,
                  })
                }
                className="mt-5 flex w-full items-center justify-center gap-2 rounded-2xl bg-white px-5 py-3.5 text-base font-semibold text-emerald-700 shadow-sm transition hover:bg-emerald-50 active:scale-[0.98]"
              >
                <Play className="h-5 w-5 fill-current" aria-hidden="true" />
                {t('startWorkout')}
              </Link>
            </>
          )}
        </section>
      </div>
    </AppShell>
  );
}

function Stat({
  icon: Icon,
  value,
  label,
}: {
  icon: LucideIcon;
  value: string;
  label: string;
}) {
  return (
    <div className="rounded-2xl bg-white/10 px-2 py-3 text-center">
      <Icon className="mx-auto h-4 w-4 text-emerald-200" aria-hidden="true" />
      <p className="mt-1 text-sm font-bold">{value}</p>
      <p className="text-[10px] font-medium uppercase tracking-wide text-emerald-100/80">
        {label}
      </p>
    </div>
  );
}
