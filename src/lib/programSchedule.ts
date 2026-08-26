import {isRestDay, weekdayOf} from '@/lib/ai/restDays';

export type PersistedScheduleExercise = {
  id?: unknown;
  name?: unknown;
  sets?: unknown;
  reps?: unknown;
  duration_seconds?: unknown;
  rest_seconds?: unknown;
};

export type PersistedScheduleSession = {
  day?: unknown;
  day_name?: unknown;
  is_rest_day?: boolean;
  focus?: string;
  exercises?: PersistedScheduleExercise[];
};

export type DashboardDayPlan =
  | {type: 'rest'}
  | {type: 'workout'; focus: string; exercises: number; durationMin: number; calories: number};

const WEEKDAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'] as const;

function toPositiveInt(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) && value > 0
    ? Math.floor(value)
    : fallback;
}

function toReps(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value) && value > 0) return Math.floor(value);
  if (typeof value !== 'string') return null;
  const match = /^\s*(\d+)/.exec(value);
  return match ? Number(match[1]) : null;
}

export function dashboardPlanFromSchedule(
  schedule: unknown,
  restDays: readonly string[] = [],
): DashboardDayPlan[] {
  const entries = Array.isArray(schedule) ? schedule as PersistedScheduleSession[] : [];
  const byDay = new Map<string, PersistedScheduleSession>();

  for (const entry of entries) {
    const weekday = weekdayOf(entry);
    if (weekday && !byDay.has(weekday)) byDay.set(weekday, entry);
  }

  return WEEKDAYS.map((weekday) => {
    const entry = byDay.get(weekday);
    if (!entry || isRestDay(entry, restDays)) return {type: 'rest'};
    const exercises = Array.isArray(entry.exercises) ? entry.exercises : [];
    const durationMin = Math.max(15, Math.round(exercises.length * 5));
    return {
      type: 'workout',
      focus: typeof entry.focus === 'string' && entry.focus.trim() ? entry.focus : 'Workout',
      exercises: exercises.length,
      durationMin,
      calories: durationMin * 7,
    };
  });
}

export function workoutExercisesFromSchedule(
  schedule: unknown,
  weekday: string,
  restDays: readonly string[] = [],
): PersistedScheduleExercise[] {
  const entries = Array.isArray(schedule) ? schedule as PersistedScheduleSession[] : [];
  const entry = entries.find((candidate) => weekdayOf(candidate) === weekday);
  if (!entry || isRestDay(entry, restDays) || !Array.isArray(entry.exercises)) return [];
  return entry.exercises.filter((exercise) => typeof exercise === 'object' && exercise !== null);
}

export function generatedExerciseDefaults(exercise: PersistedScheduleExercise, index: number) {
  return {
    id: typeof exercise.id === 'string' ? exercise.id : `generated-${index}`,
    name: typeof exercise.name === 'string' && exercise.name.trim() ? exercise.name : `Exercise ${index + 1}`,
    sets: Math.max(1, toPositiveInt(exercise.sets, 3)),
    reps: toReps(exercise.reps),
    durationSeconds: toPositiveInt(exercise.duration_seconds, 0) || null,
    restSeconds: toPositiveInt(exercise.rest_seconds, 30) || null,
  };
}

export function scheduleHasRestDayViolation(schedule: unknown, restDays: readonly string[]): boolean {
  if (!Array.isArray(schedule)) return false;
  return schedule.some((entry) => {
    if (!entry || typeof entry !== 'object') return false;
    const session = entry as PersistedScheduleSession;
    return isRestDay(session, restDays) && Array.isArray(session.exercises) && session.exercises.length > 0;
  });
}

export function scheduleExerciseCount(
  schedule: unknown,
  weekday: string,
  restDays: readonly string[] = [],
): number {
  return workoutExercisesFromSchedule(schedule, weekday, restDays).length;
}
