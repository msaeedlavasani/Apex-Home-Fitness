'use client';

import {useTranslations} from 'next-intl';
import {useSearchParams} from 'next/navigation';
import {useEffect, useMemo, useState} from 'react';
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
 * first slice on the frozen design delta.
 *
 * ROUTE ADAPTER (delta §2): this page is the only prototype/review-specific
 * layer — plan loading, day selection and rest-day copy live HERE, while the
 * ExperienceShell/stages stay route-independent, fixture-independent and
 * promotion-ready. The shipped `/[locale]/workout` route and the V1 player
 * are UNTOUCHED operational fallback (plan §13).
 *
 * COMPOSITION (delta §7): the shell renders on a bare full-viewport surface
 * (100vw/100dvh) with NO app chrome — AppShell would impose platform chrome
 * and require an unauthorized back/exit control (§19: no real exit behavior
 * is authorized, so none is exposed). Plan loading mirrors the shipped page
 * exactly: generated program for the selected day with the localized
 * sample-plan fallback when no program exists, so the slice is reviewable in
 * both locales, in CI (open mode) and on device. Rest days render the
 * localized rest notice on the same bare surface.
 */
export default function WorkoutV2Page() {
  const tDashboard = useTranslations('Dashboard');
  const tLibrary = useTranslations('Library');
  const searchParams = useSearchParams();
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

  // START hero workout context: the resolved workout title for the day
  // (generated plan label or the localized fallback plan name — resolved
  // data, never a hardcoded fixture).
  const subtitle = program && selectedDay
    ? tDashboard('workouts.generated')
    : tDashboard(`workouts.${fallbackKey}`);

  return (
    <main data-workout-v2-surface="" className="h-[100dvh] w-full overflow-hidden bg-[color:var(--app-background)]">
      {programLoading ? (
        <div className="flex h-full items-center justify-center px-4">
          <p role="status" className="text-sm text-[color:var(--apex-text-secondary)]">
            {tDashboard('loading')}
          </p>
        </div>
      ) : exercises.length === 0 ? (
        <div className="flex h-full items-center justify-center px-4 text-center">
          <div>
            <h1 className="text-xl font-bold text-[color:var(--apex-text)]">{tDashboard('summaryRest')}</h1>
            <p className="mt-2 text-sm text-[color:var(--apex-text-secondary)]">{tDashboard('summaryRestDesc')}</p>
          </div>
        </div>
      ) : (
        <ExperienceShell exercises={exercises} sessionTitle={subtitle} />
      )}
    </main>
  );
}
