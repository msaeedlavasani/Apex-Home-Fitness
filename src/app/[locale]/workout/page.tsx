'use client';

import {useLocale, useTranslations} from 'next-intl';
import {useMemo} from 'react';
import {AppShell} from '@/components/layout/AppShell';
import {WorkoutPlayer} from '@/components/workout/WorkoutPlayer';
import type {WorkoutExercise} from '@/components/workout/useWorkoutEngine';
import {
  SAMPLE_WORKOUT_EXERCISES,
  resolveWorkoutKeyForDate,
  toWorkoutExercises,
} from '@/lib/workout/samplePlan';

/**
 * Workout player route (`/[locale]/workout`).
 *
 * This is the destination of the dashboard's "Start workout" button. It
 * renders the existing, fully-localized `WorkoutPlayer` with today's session
 * from the sample weekly plan (the same schedule the dashboard displays), so
 * the button lands on a live player instead of a 404 in both locales.
 */
export default function WorkoutPage() {
  const locale = useLocale();
  const tNav = useTranslations('Nav');
  const tDashboard = useTranslations('Dashboard');
  const tLibrary = useTranslations('Library');

  const workoutKey = useMemo(() => resolveWorkoutKeyForDate(new Date()), []);

  const exercises = useMemo<WorkoutExercise[]>(
    () =>
      toWorkoutExercises(
        SAMPLE_WORKOUT_EXERCISES[workoutKey] ?? [],
        (nameKey) => tLibrary(`exercises.${nameKey}`),
      ),
    [workoutKey, tLibrary],
  );

  return (
    <AppShell
      title={tNav('workout')}
      subtitle={tDashboard(`workouts.${workoutKey}`)}
      backHref={`/${locale}/dashboard`}
    >
      <div className="mx-auto w-full max-w-md px-4 sm:max-w-lg md:max-w-xl">
        <WorkoutPlayer exercises={exercises} />
      </div>
    </AppShell>
  );
}
