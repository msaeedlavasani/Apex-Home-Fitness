'use client';

import {useTranslations} from 'next-intl';
import {useSearchParams} from 'next/navigation';
import {useEffect, useMemo, useRef, useState} from 'react';
import {ExperienceShell} from '@/components/workout/experience/ExperienceShell';
import type {SessionExercise} from '@/lib/workout/sessionContracts';
import type {WorkoutResultSummary} from '@/lib/workout/sessionV2Contracts';
import {completionKindForPersistence} from '@/lib/workout/completionSemantics';
import {
  exerciseIdentityIndex,
  workoutSessionExercisesFromProgram,
  type RelationalExercise,
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

export default function WorkoutPage() {
  const searchParams = useSearchParams();
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
    return workoutSessionExercisesFromProgram(program.weeklySchedule, selectedDay, restDays, identityIndex);
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

  async function completePersistedSession(summary: WorkoutResultSummary) {
    await sessionStartRef.current;
    const sessionId = sessionIdRef.current;
    if (!sessionId) return;
    try {
      await fetch('/api/workout/session', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({action: 'complete', sessionId, completedSets: summary.completedSets, completionKind: completionKindForPersistence(summary)}),
      });
    } catch {
      // Completion remains available locally; a later sync can be added without blocking UX.
    }
  }
  const subtitle = program && selectedDay
    ? (isGeneratedRestDay ? tDashboard('summaryRest') : tDashboard('workouts.generated'))
    : tDashboard(`workouts.${fallbackKey}`);

  return (
    <main data-workout-v2-surface="" className="h-[100dvh] w-full overflow-hidden bg-[color:var(--app-background)]">
      {programLoading ? (
        <div className="flex h-full items-center justify-center px-4">
          <p role="status" className="text-sm text-[color:var(--apex-text-secondary)]">{tDashboard('loading')}</p>
        </div>
      ) : isGeneratedRestDay ? (
        <div className="flex h-full items-center justify-center px-4 text-center">
          <div>
            <h1 className="text-xl font-bold text-[color:var(--apex-text)]">{tDashboard('summaryRest')}</h1>
            <p className="mt-2 text-sm text-[color:var(--apex-text-secondary)]">{tDashboard('summaryRestDesc')}</p>
          </div>
        </div>
      ) : (
        <ExperienceShell
          exercises={exercises}
          sessionTitle={subtitle}
          onSessionStarted={() => { void startPersistedSession(); }}
          onWorkoutResultReady={(summary) => { void completePersistedSession(summary); }}
        />
      )}
    </main>
  );
}
