'use client';

import {useFormatter, useLocale, useTranslations} from 'next-intl';
import Link from 'next/link';
import {useEffect, useMemo, useState} from 'react';
import type {LucideIcon} from 'lucide-react';
import {dayIndexInWeek, mondayPlanIndex, weekDaysFor} from '@/lib/weekCalendar';
import {AppShell} from '@/components/layout/AppShell';
import {PreferencesEditor} from '@/components/dashboard/PreferencesEditor';
import {ANALYTICS_EVENTS, trackEvent} from '@/services/analyticsEvents';
import {dashboardPlanFromSchedule, type DashboardDayPlan} from '@/lib/programSchedule';
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
  focus?: string;
};

type DayPlan = {type: 'rest'} | {type: 'workout'; workout: Workout};

type CurrentProgramResponse = {
  program: {
    restDays: unknown;
    weeklySchedule: unknown;
    workoutSessions?: Array<{id: string; startedAt: string; completedAt: string | null}>;
  } | null;
};

type ProfileResponse = {
  quizCompleted: boolean;
  preferences: {exerciseStyles: string[]; equipment: string[]};
};

function toDayPlans(schedule: unknown, restDays: readonly string[], level: Difficulty = 'intermediate'): DayPlan[] {
  return dashboardPlanFromSchedule(schedule, restDays).map((plan) =>
    plan.type === 'rest'
      ? plan
      : {
          type: 'workout',
          workout: {
            nameKey: 'workouts.generated',
            durationMin: plan.durationMin,
            exercises: plan.exercises,
            calories: plan.calories,
            difficulty: level,
            focus: plan.focus,
          },
        },
  );
}

const DIFFICULTY_BADGE: Record<Difficulty, string> = {
  beginner: 'bg-emerald-400/20 text-emerald-300',
  intermediate: 'bg-amber-400/20 text-amber-300',
  advanced: 'bg-rose-400/20 text-rose-300',
};

export default function DashboardPage() {
  const t = useTranslations('Dashboard');
  const format = useFormatter();
  const locale = useLocale();

  const [today, setToday] = useState<Date | null>(null);
  const [clientTimeZone, setClientTimeZone] = useState<string | null>(null);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [program, setProgram] = useState<CurrentProgramResponse['program']>(null);
  const [programLoading, setProgramLoading] = useState(true);
  const [profile, setProfile] = useState<ProfileResponse | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);

  useEffect(() => {
    // Calendar dates must come from the visitor's device, not the server's
    // timezone. This also avoids a server/client midnight mismatch.
    const clientToday = new Date();
    setToday(clientToday);
    setClientTimeZone(Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC');
    setSelectedIndex(dayIndexInWeek(clientToday, locale));
  }, [locale]);

  const todayIndex = today ? dayIndexInWeek(today, locale) : 0;

  useEffect(() => {
    let cancelled = false;
    fetch('/api/profile')
      .then(async (response) => {
        if (!response.ok) throw new Error('profile lookup failed');
        return (await response.json()) as ProfileResponse;
      })
      .then((data) => { if (!cancelled) setProfile(data); })
      .catch(() => { if (!cancelled) setProfile({quizCompleted: false, preferences: {exerciseStyles: [], equipment: []}}); })
      .finally(() => { if (!cancelled) setProfileLoading(false); });
    fetch('/api/program/current')
      .then(async (response) => {
        if (!response.ok) throw new Error('program lookup failed');
        return (await response.json()) as CurrentProgramResponse;
      })
      .then((data) => {
        if (!cancelled) setProgram(data.program);
      })
      .catch(() => {
        if (!cancelled) setProgram(null);
      })
      .finally(() => {
        if (!cancelled) setProgramLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const weekDays = useMemo(
    () => (today ? weekDaysFor(today, locale) : []),
    [today, locale],
  );

  const startOfToday = useMemo(
    () => (today ? new Date(today.getFullYear(), today.getMonth(), today.getDate()) : null),
    [today],
  );

  const actualPlan = useMemo(
    () => program
      ? toDayPlans(
          program.weeklySchedule,
          Array.isArray(program.restDays) ? program.restDays as string[] : [],
        )
      : [],
    [program],
  );
  const selectedDay = weekDays[selectedIndex] ?? null;
  const selectedPlanIndex = selectedDay ? mondayPlanIndex(selectedDay) : 0;
  const selectedPlan: DayPlan = actualPlan[selectedPlanIndex] ?? {type: 'rest'};
  const isTodaySelected = selectedIndex === todayIndex;
  const selectedWeekday = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'][selectedPlanIndex];

  const completedSessionDates = useMemo(() => {
    const dates = new Set<string>();
    for (const session of program?.workoutSessions ?? []) {
      const date = new Date(session.startedAt);
      dates.add(`${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`);
    }
    return dates;
  }, [program]);

  const dateKey = (date: Date) => `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
  const isSelectedDayCompleted = selectedDay ? completedSessionDates.has(dateKey(selectedDay)) : false;
  const sessionsDone = weekDays.filter((day) => completedSessionDates.has(dateKey(day))).length;
  const totalSessions = actualPlan.filter((plan) => plan.type === 'workout').length;
  const hour = today?.getHours() ?? 12;
  const greetingKey =
    hour < 12
      ? 'greeting.morning'
      : hour < 18
        ? 'greeting.afternoon'
        : 'greeting.evening';

  const formatDateTime = (
    date: Date,
    options: Pick<Intl.DateTimeFormatOptions, 'weekday' | 'day' | 'month'>,
  ) => new Intl.DateTimeFormat(locale === 'fa' ? 'fa-IR' : 'en-US', {
    ...options,
    ...(clientTimeZone ? {timeZone: clientTimeZone} : {}),
  }).format(date);

  const selectedDateLabel = selectedDay
    ? formatDateTime(selectedDay, {
        weekday: 'long',
        day: 'numeric',
      })
    : '';

  return (
    <AppShell
      overline={t(greetingKey)}
      title={today
        ? formatDateTime(today, {
            weekday: 'long',
            day: 'numeric',
            month: 'long',
          })
        : t('loading')}
      subtitle={t('weekLabel')}
    >
      {/* Page content — the platform shell owns safe areas & navigation. */}
      <div className="mx-auto w-full max-w-md px-4 sm:max-w-lg md:max-w-xl">
        {!profileLoading && profile && !profile.quizCompleted ? (
          <section className="rounded-3xl border border-amber-200 bg-amber-50 p-6 text-center shadow-sm">
            <h1 className="text-lg font-bold text-amber-950">{t('quizRequiredTitle')}</h1>
            <p className="mt-2 text-sm text-amber-800">{t('quizRequiredBody')}</p>
            <Link href={`/${locale}/quiz`} className="mt-5 inline-flex rounded-xl bg-amber-600 px-5 py-3 font-semibold text-white">{t('quizRequiredCta')}</Link>
          </section>
        ) : null}
        {!profileLoading && profile?.quizCompleted ? (
          <PreferencesEditor
            labels={{
              title: t('preferences.title'),
              save: t('preferences.save'),
              saved: t('preferences.saved'),
              error: t('preferences.error'),
              stylesTitle: t('preferences.styles.title'),
              equipmentTitle: t('preferences.equipment.title'),
              styles: Object.fromEntries(['yoga','hiit','calisthenics','pilates','mobility','isometric','resistance_band','animal_flow'].map((id) => [id, t(`preferences.styles.${id}`)])),
              equipment: Object.fromEntries(['none','pull_up_bar','bands','dumbbells','barbell','kettlebells','bench','cable_machine','jump_rope'].map((id) => [id, t(`preferences.equipment.${id}`)])),
            }}
            initial={profile.preferences}
          />
        ) : null}
        {profileLoading ? (
          <p role="status" className="mb-4 rounded-2xl border border-slate-200 bg-white p-4 text-center text-sm text-slate-500">{t('loading')}</p>
        ) : null}

        {profile?.quizCompleted && !programLoading && !program ? (
          <section className="mt-5 rounded-3xl border border-amber-200 bg-amber-50 p-6 text-center shadow-sm">
            <h2 className="text-lg font-bold text-amber-950">{t('programPendingTitle')}</h2>
            <p className="mt-2 text-sm leading-relaxed text-amber-800">{t('programPendingBody')}</p>
            <Link href={`/${locale}/quiz`} className="mt-5 inline-flex rounded-xl bg-amber-600 px-5 py-3 font-semibold text-white">{t('programPendingCta')}</Link>
          </section>
        ) : null}

        {profile?.quizCompleted && !programLoading && program && today ? <>
        {/* Weekly calendar */}
        <section
          aria-label={t('calendarTitle')}
          className="rounded-3xl border border-slate-200 bg-white p-3 shadow-sm sm:p-5"
        >
          <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold text-slate-700">
            <CalendarDays className="h-4 w-4 text-emerald-600" aria-hidden="true" />
            {t('calendarTitle')}
          </h2>

        <div dir={locale === 'fa' ? 'rtl' : 'ltr'} className="grid grid-cols-7 gap-1 sm:gap-2">
            {weekDays.map((day, index) => {
              const plan = actualPlan[mondayPlanIndex(day)] ?? {type: 'rest'};
              const isToday = index === todayIndex;
              const isSelected = index === selectedIndex;
              const isPast = startOfToday ? day.getTime() < startOfToday.getTime() : false;
              const isRest = plan.type === 'rest';
              const isDayCompleted = completedSessionDates.has(dateKey(day));

              return (
                <button
                  key={day.toISOString()}
                  type="button"
                  aria-pressed={isSelected}
                  aria-label={formatDateTime(day, {
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
                    {formatDateTime(day, {weekday: 'short'})}
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
                    {formatDateTime(day, {day: 'numeric'})}
                  </span>

                  {isDayCompleted ? (
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
                    {selectedPlan.workout.nameKey === 'workouts.generated'
                      ? selectedPlan.workout.focus ?? t('workouts.generated')
                      : t(selectedPlan.workout.nameKey)}
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
                href={`/${locale}/workout?day=${selectedWeekday}`}
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
        </> : null}
        {profile?.quizCompleted && programLoading ? (
          <p role="status" className="mt-4 rounded-2xl border border-slate-200 bg-white p-4 text-center text-sm text-slate-500">{t('loading')}</p>
        ) : null}
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
