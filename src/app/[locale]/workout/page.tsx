'use client';

import {useLocale, useTranslations} from 'next-intl';
import {useSearchParams} from 'next/navigation';
import {useEffect, useMemo, useState} from 'react';
import {AppShell} from '@/components/layout/AppShell';
import {WorkoutPlayer} from '@/components/workout/WorkoutPlayer';
import type {WorkoutExercise} from '@/components/workout/useWorkoutEngine';
import {
  generatedExerciseDefaults,
  workoutExercisesFromSchedule,
  type PersistedScheduleExercise,
} from '@/lib/programSchedule';
import {
  SAMPLE_WORKOUT_EXERCISES,
  resolveWorkoutKeyForDate,
  toWorkoutExercises,
} from '@/lib/workout/samplePlan';

type CurrentProgramResponse = {
  program: {
    id: string;
    restDays: unknown;
    weeklySchedule: unknown;
  } | null;
};

const WEEKDAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'] as const;

type GeneratedProgram = NonNullable<CurrentProgramResponse['program']>;

function validWeekday(value: string | null): (typeof WEEKDAYS)[number] | null {
  return value && WEEKDAYS.includes(value as (typeof WEEKDAYS)[number])
    ? value as (typeof WEEKDAYS)[number]
    : null;
}

function generatedExercisesForPlayer(
  exercises: PersistedScheduleExercise[],
): WorkoutExercise[] {
  return exercises.map((exercise, index) => generatedExerciseDefaults(exercise, index));
}

export default function WorkoutPage() {
  const locale = useLocale();
  const searchParams = useSearchParams();
  const tNav = useTranslations('Nav');
  const tDashboard = useTranslations('Dashboard');
  const tLibrary = useTranslations('Library');
  const selectedDay = validWeekday(searchParams.get('day')) ?? validWeekday(
    ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'][new Date().getDay()],
  );
  const [program, setProgram] = useState<GeneratedProgram | null>(null);
  const [programLoading, setProgramLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
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

  const fallbackKey = useMemo(() => resolveWorkoutKeyForDate(new Date()), []);
  const fallbackExercises = useMemo<WorkoutExercise[]>(
    () => toWorkoutExercises(
      SAMPLE_WORKOUT_EXERCISES[fallbackKey] ?? [],
      (nameKey) => tLibrary(`exercises.${nameKey}`),
    ),
    [fallbackKey, tLibrary],
  );

  const generatedExercises = useMemo(() => {
    if (!program || !selectedDay) return [];
    const restDays = Array.isArray(program.restDays) ? program.restDays.filter((day): day is string => typeof day === 'string') : [];
    return generatedExercisesForPlayer(workoutExercisesFromSchedule(program.weeklySchedule, selectedDay, restDays));
  }, [program, selectedDay]);

  const isGeneratedRestDay = Boolean(program && selectedDay && generatedExercises.length === 0);
  const exercises = program ? generatedExercises : fallbackExercises;
  const subtitle = program && selectedDay
    ? (isGeneratedRestDay ? tDashboard('summaryRest') : tDashboard('workouts.generated'))
    : tDashboard(`workouts.${fallbackKey}`);

  return (
    <AppShell
      title={tNav('workout')}
      subtitle={subtitle}
      backHref={`/${locale}/dashboard`}
    >
      <div className="mx-auto w-full max-w-md px-4 sm:max-w-lg md:max-w-xl">
        {programLoading ? (
          <p role="status" className="mb-4 rounded-2xl border border-slate-200 bg-white p-4 text-center text-sm text-slate-500">
            {tDashboard('loading')}
          </p>
        ) : null}

        {isGeneratedRestDay ? (
          <section className="card-surface w-full p-6 text-center text-[color:var(--apex-text)]" aria-label={tDashboard('summaryRest')}>
            <h1 className="text-xl font-bold">{tDashboard('summaryRest')}</h1>
            <p className="mt-2 text-sm text-[color:var(--apex-text-secondary)]">{tDashboard('summaryRestDesc')}</p>
          </section>
        ) : (
          <WorkoutPlayer exercises={exercises} />
        )}
      </div>
    </AppShell>
  );
}
