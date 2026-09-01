'use client';

import {useLocale, useTranslations} from 'next-intl';
import {useSearchParams} from 'next/navigation';
import {useEffect, useMemo, useRef, useState} from 'react';
import {AppShell} from '@/components/layout/AppShell';
import {WorkoutPlayer} from '@/components/workout/WorkoutPlayer';
import type {SessionExercise, SessionSummary} from '@/lib/workout/sessionContracts';
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

function generatedExercisesForPlayer(
  exercises: PersistedScheduleExercise[],
  identityIndex: ExerciseIdentityIndex,
): SessionExercise[] {
  // S02-D2: enrich the step plan with canonical movement identity where the
  // relational ProgramExercise→Exercise payload can resolve it. The step's
  // `id` (generated/session-local) is always preserved — canonical identity
  // adds optional `exerciseId`/`slug` only. Legacy-only when unresolvable.
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
    // Canonical identity comes ONLY from the relational ProgramExercise→Exercise
    // rows the API already returns (never invented), via the S02-D1 seam.
    const identityIndex = exerciseIdentityIndex(program.exercises ?? []);
    return generatedExercisesForPlayer(
      workoutExercisesFromSchedule(program.weeklySchedule, selectedDay, restDays),
      identityIndex,
    );
  }, [program, selectedDay]);

  const isGeneratedRestDay = Boolean(program && selectedDay && generatedExercises.length === 0);
  const exercises = program ? generatedExercises : fallbackExercises;

  const sessionIdRef = useRef<string | null>(null);
  const sessionStartRef = useRef<Promise<void> | null>(null);

  function startPersistedSession() {
    const startPromise = (async () => {
      try {
        const response = await fetch('/api/workout/session', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({
          action: 'start',
          programId: program?.id,
          exerciseNames: exercises.map((exercise) => exercise.name),
        }),
      });
        if (!response.ok) return;
        const data = await response.json() as {session?: {id?: string}};
        sessionIdRef.current = data.session?.id ?? null;
      } catch {
        // The local player remains usable when a session write is temporarily offline.
      }
    })();
    sessionStartRef.current = startPromise;
    return startPromise;
  }

  async function completePersistedSession(summary: SessionSummary) {
    await sessionStartRef.current;
    const sessionId = sessionIdRef.current;
    if (!sessionId) return;
    try {
      await fetch('/api/workout/session', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({action: 'complete', sessionId, durationSeconds: summary.durationSeconds, completedSets: summary.completedSets}),
      });
    } catch {
      // Completion remains available locally; a later sync can be added without blocking UX.
    }
  }
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
          <WorkoutPlayer
            exercises={exercises}
            onWorkoutStart={() => { void startPersistedSession(); }}
            onWorkoutComplete={(summary) => { void completePersistedSession(summary); }}
          />
        )}
      </div>
    </AppShell>
  );
}
