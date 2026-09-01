import type {SessionExercise} from '@/lib/workout/sessionContracts';

/**
 * Sample weekly workout plan for the `/workout` player route.
 *
 * The dashboard (`src/app/[locale]/dashboard/page.tsx`) renders a static
 * weekly plan (Monday → Sunday) with workout days on Mon/Tue/Thu/Fri/Sun and
 * rest days on Wed/Sat. Its "Start workout" button links to `/[locale]/workout`,
 * so this module mirrors that exact schedule: the player plays the session
 * the dashboard is showing, and the route never 404s in either locale.
 */

/** Exercise template: same shape as the canonical `SessionExercise`, but
 * `name` is stored as a translation key into `Library.exercises.*` and
 * localized by the page. */
export interface SampleExercise {
  id: string;
  nameKey: string;
  sets: number;
  reps?: number | null;
  durationSeconds?: number | null;
  restSeconds?: number | null;
}

/**
 * Workout key (`Dashboard.workouts.*`) per weekday, Monday (index 0) →
 * Sunday (index 6). `null` = rest day. Keep in sync with the dashboard's
 * `WEEK_PLAN`.
 */
export const WEEK_WORKOUT_KEYS: ReadonlyArray<string | null> = [
  'fullBodyHiit', // Monday
  'yogaFlow', // Tuesday
  null, // Wednesday — rest
  'upperBody', // Thursday
  'corePilates', // Friday
  null, // Saturday — rest
  'mobility', // Sunday
];

/** Exercise breakdown per workout key (exercise counts mirror the
 * dashboard's summary card: 6 / 8 / 5 / 7 / 6). */
export const SAMPLE_WORKOUT_EXERCISES: Record<
  string,
  ReadonlyArray<SampleExercise>
> = {
  fullBodyHiit: [
    {id: 'fbi-1', nameKey: 'jumpingJacks', sets: 4, durationSeconds: 40, restSeconds: 20},
    {id: 'fbi-2', nameKey: 'burpees', sets: 4, durationSeconds: 30, restSeconds: 30},
    {id: 'fbi-3', nameKey: 'squats', sets: 3, durationSeconds: 45, restSeconds: 30},
    {id: 'fbi-4', nameKey: 'pushUps', sets: 3, durationSeconds: 40, restSeconds: 30},
    {id: 'fbi-5', nameKey: 'mountainClimbers', sets: 3, durationSeconds: 40, restSeconds: 20},
    {id: 'fbi-6', nameKey: 'plank', sets: 3, durationSeconds: 45, restSeconds: 30},
  ],
  yogaFlow: [
    {id: 'yf-1', nameKey: 'yogaFlow', sets: 3, durationSeconds: 45, restSeconds: 10},
    {id: 'yf-2', nameKey: 'hipMobility', sets: 3, durationSeconds: 45, restSeconds: 10},
    {id: 'yf-3', nameKey: 'plank', sets: 3, durationSeconds: 30, restSeconds: 15},
    {id: 'yf-4', nameKey: 'gluteBridge', sets: 3, durationSeconds: 45, restSeconds: 15},
    {id: 'yf-5', nameKey: 'lunges', sets: 2, reps: 12, restSeconds: 20},
    {id: 'yf-6', nameKey: 'squats', sets: 2, reps: 15, restSeconds: 20},
    {id: 'yf-7', nameKey: 'mountainClimbers', sets: 2, durationSeconds: 30, restSeconds: 15},
    {id: 'yf-8', nameKey: 'jumpingJacks', sets: 2, durationSeconds: 30, restSeconds: 15},
  ],
  upperBody: [
    {id: 'ub-1', nameKey: 'pushUps', sets: 4, reps: 15, restSeconds: 60},
    {id: 'ub-2', nameKey: 'plank', sets: 4, durationSeconds: 60, restSeconds: 45},
    {id: 'ub-3', nameKey: 'mountainClimbers', sets: 3, durationSeconds: 45, restSeconds: 30},
    {id: 'ub-4', nameKey: 'burpees', sets: 3, durationSeconds: 30, restSeconds: 45},
    {id: 'ub-5', nameKey: 'jumpingJacks', sets: 3, durationSeconds: 45, restSeconds: 30},
  ],
  corePilates: [
    {id: 'cp-1', nameKey: 'plank', sets: 4, durationSeconds: 45, restSeconds: 20},
    {id: 'cp-2', nameKey: 'gluteBridge', sets: 3, reps: 15, restSeconds: 30},
    {id: 'cp-3', nameKey: 'hipMobility', sets: 3, durationSeconds: 45, restSeconds: 20},
    {id: 'cp-4', nameKey: 'mountainClimbers', sets: 3, durationSeconds: 40, restSeconds: 20},
    {id: 'cp-5', nameKey: 'squats', sets: 3, reps: 15, restSeconds: 30},
    {id: 'cp-6', nameKey: 'lunges', sets: 3, reps: 12, restSeconds: 30},
    {id: 'cp-7', nameKey: 'yogaFlow', sets: 2, durationSeconds: 60, restSeconds: 20},
  ],
  mobility: [
    {id: 'mb-1', nameKey: 'hipMobility', sets: 3, durationSeconds: 45, restSeconds: 15},
    {id: 'mb-2', nameKey: 'yogaFlow', sets: 3, durationSeconds: 60, restSeconds: 15},
    {id: 'mb-3', nameKey: 'gluteBridge', sets: 3, durationSeconds: 30, restSeconds: 15},
    {id: 'mb-4', nameKey: 'plank', sets: 3, durationSeconds: 30, restSeconds: 20},
    {id: 'mb-5', nameKey: 'squats', sets: 3, durationSeconds: 45, restSeconds: 20},
    {id: 'mb-6', nameKey: 'lunges', sets: 2, durationSeconds: 45, restSeconds: 20},
  ],
};

/**
 * Resolve the workout to play for `date`: today's session when today is a
 * workout day, otherwise the next upcoming workout day (wrapping around the
 * week). The dashboard hides "Start workout" on rest days, but the route is
 * directly navigable — this keeps it deterministic in both cases.
 *
 * Weekday math matches the dashboard's `startOfWeek`/`todayIndex`
 * (Sunday=0 → Monday=0), so today maps to the same plan entry.
 */
export function resolveWorkoutKeyForDate(date: Date): string {
  const mondayOffset = (date.getDay() + 6) % 7;
  for (let offset = 0; offset < 7; offset++) {
    const key = WEEK_WORKOUT_KEYS[(mondayOffset + offset) % 7];
    if (key) return key;
  }
  return 'fullBodyHiit'; // unreachable — the plan always has workout days
}

/** Localize `SampleExercise[]` into `SessionExercise[]` ready for the player. */
export function toWorkoutExercises(
  templates: ReadonlyArray<SampleExercise>,
  nameFor: (nameKey: string) => string,
): SessionExercise[] {
  return templates.map((exercise) => ({
    id: exercise.id,
    name: nameFor(exercise.nameKey),
    sets: exercise.sets,
    reps: exercise.reps ?? null,
    durationSeconds: exercise.durationSeconds ?? null,
    restSeconds: exercise.restSeconds ?? null,
  }));
}
