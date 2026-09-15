'use client';

import {useLocale, useTranslations} from 'next-intl';
import {useSearchParams} from 'next/navigation';
import {useEffect, useMemo, useState} from 'react';
import {AppShell} from '@/components/layout/AppShell';
import {ExperienceShell} from '@/components/workout/experience/ExperienceShell';
import type {SessionExercise} from '@/lib/workout/sessionContracts';
import {
  enrichScheduleExercises,
  exerciseIdentityIndex,
  generatedExerciseDefaults,
  workoutExercisesFromSchedule,
  type PersistedScheduleExercise,
  type RelationalExercise,
  type ExerciseIdentityIndex,
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
    /** Relational ProgramExercise → Exercise rows the API already returns (S02-D2). */
    exercises?: RelationalExercise[];
  } | null;
};

const WEEKDAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'] as const;

type GeneratedProgram = NonNullable<CurrentProgramResponse['program']>;

function validWeekday(value: string | null): (typeof WEEKDAYS)[number] | null {
  return value && WEEKDAYS.includes(value as (typeof WEEKDAYS)[number])
    ? value as (typeof WEEKDAYS)[number]
    : null;
}

function generatedExercisesForShell(
  exercises: PersistedScheduleExercise[],
  identityIndex: ExerciseIdentityIndex,
): SessionExercise[] {
  // S02-D2: enrich the step plan with canonical movement identity where the
  // relational ProgramExercise→Exercise payload can resolve it — identical
  // seam to the shipped /workout page (canonical identity only, never
  // invented). The V2 shell resolves the prescription internally.
  const enriched = enrichScheduleExercises(exercises, identityIndex);
  return exercises.map((exercise, index) => {
    const base = generatedExerciseDefaults(exercise, index);
    const identity = enriched[index];
    if (identity?.exerciseId || identity?.slug) {
      return {...base, exerciseId: identity.exerciseId, slug: identity.slug};
    }
    return base;
  });
}

/**
 * Workout V2 review surface (`/[locale]/workout/v2`) — WORKOUT-V2-IMPL-01
 * FIRST SLICE (START + PREPARING on the V2 architecture).
 *
 * This page is ADDITIVE review surface for the Owner's staged/real-device
 * acceptance. The shipped `/[locale]/workout` route and the V1 player are
 * UNTOUCHED operational fallback (plan §13) and remain the default product
 * surface until V2 stages freeze.
 *
 * Plan loading mirrors the shipped page exactly: generated program for the
 * selected day (canonical identity via the S02-D1 seam) with the localized
 * sample-plan fallback when no program exists — so the slice is reviewable
 * in both locales, in CI (open mode) and on device, without any backend or
 * schema change. Rest-day handling stays with the shipped surface; this
 * slice has no WORK_SET/REST presentation to host a rest day.
 */
export default function WorkoutV2Page() {
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
  const fallbackExercises = useMemo<SessionExercise[]>(
    () => toWorkoutExercises(
      SAMPLE_WORKOUT_EXERCISES[fallbackKey] ?? [],
      (nameKey) => tLibrary(`exercises.${nameKey}`),
    ),
    [fallbackKey, tLibrary],
  );

  const generatedExercises = useMemo(() => {
    if (!program || !selectedDay) return [];
    const restDays = Array.isArray(program.restDays) ? program.restDays.filter((day): day is string => typeof day === 'string') : [];
    const identityIndex = exerciseIdentityIndex(program.exercises ?? []);
    return generatedExercisesForShell(
      workoutExercisesFromSchedule(program.weeklySchedule, selectedDay, restDays),
      identityIndex,
    );
  }, [program, selectedDay]);

  // Same plan source as the shipped page: generated program when present,
  // localized sample plan otherwise (never an empty plan).
  const exercises: SessionExercise[] = program ? generatedExercises : fallbackExercises;

  const subtitle = program && selectedDay
    ? tDashboard('workouts.generated')
    : tDashboard(`workouts.${fallbackKey}`);

  return (
    <AppShell
      title={`${tNav('workout')} · V2`}
      subtitle={subtitle}
      backHref={`/${locale}/dashboard`}
    >
      <div className="mx-auto w-full max-w-md px-4 sm:max-w-lg md:max-w-xl">
        {programLoading ? (
          <p role="status" className="mb-4 rounded-2xl border border-slate-200 bg-white p-4 text-center text-sm text-slate-500">
            {tDashboard('loading')}
          </p>
        ) : null}
        {exercises.length === 0 ? (
          <section className="card-surface w-full p-6 text-center text-[color:var(--apex-text)]" aria-label={tDashboard('summaryRest')}>
            <h1 className="text-xl font-bold">{tDashboard('summaryRest')}</h1>
            <p className="mt-2 text-sm text-[color:var(--apex-text-secondary)]">{tDashboard('summaryRestDesc')}</p>
          </section>
        ) : (
          <ExperienceShell exercises={exercises} />
        )}
      </div>
    </AppShell>
  );
}
