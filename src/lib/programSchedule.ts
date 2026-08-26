import {isRestDay, weekdayOf} from '@/lib/ai/restDays';
import type { ExerciseId, ExerciseSlug } from '@/lib/exercise';

export type PersistedScheduleExercise = {
  id?: unknown;
  name?: unknown;
  /** Optional canonical resolution slug hint (S02-D1 propagation). */
  slug?: unknown;
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

// --------------------------------------------------------------------------
// S02-D1 — canonical Exercise-identity propagation contract
//
// A pure enrichment seam: it joins a persisted weekly-schedule exercise with
// the relational `ProgramExercise → Exercise` data that `GET /api/program/current`
// already returns, so downstream consumers can receive canonical exercise
// identity WHERE AVAILABLE while every existing legacy path keeps working.
//
// Source of truth = the persisted `Exercise` row id. Canonical identity is
// never invented; it is always read from a matched relational row.
//
// Identity model (Exercise identity ≠ workout-step identity):
//   - `exerciseId` = the movement's durable identity (DB Exercise.id).
//   - `legacyId`  = the workout STEP's existing session-local id
//                   (EX-001 / rule-{day}-{n} / generated-{n}).
// Two step entries may share the same `exerciseId` (same movement twice /
// alias collapse) while remaining distinct steps via `legacyId` + position.
// --------------------------------------------------------------------------

/** The relational program→exercise data available from the current API. */
export type RelationalExercise = {
  /** Global 1-based order within the program (informational). */
  order: number;
  exercise: {
    /** Canonical durable identity (DB `Exercise.id`). */
    id: string;
    /** Display name of the persisted row (incoming or canonical). */
    name: string;
    /** Canonical resolution slug when the row has been resolved (S02-C). */
    slug?: string | null;
  };
};

/**
 * The propagation contract a consumer receives for one workout exercise.
 * Canonical identity is ADDITIVE — every field except `legacyId`/`name` is
 * optional and only present when it can be sourced from persisted data.
 */
export type WorkoutExerciseIdentity = {
  /** Canonical movement identity (persisted `Exercise.id`) when resolvable. */
  exerciseId?: ExerciseId;
  /** Canonical source-controlled slug when available. */
  slug?: ExerciseSlug;
  /** The workout STEP's existing generated/session-local id (always present). */
  legacyId: string;
  /** Display/metadata name (never identity). */
  name: string;
};

/** Name/slug lookup index over the relational program exercises. */
export type ExerciseIdentityIndex = {
  byName: Map<string, RelationalExercise['exercise']>;
  bySlug: Map<string, RelationalExercise['exercise']>;
};

/**
 * Builds a match index from the relational `program.exercises` payload. First
 * occurrence wins for each name/slug (the composite program PK already makes
 * each exercise unique per program). Slug keys are only populated from rows
 * that actually carry one.
 */
export function exerciseIdentityIndex(
  exercises: readonly RelationalExercise[],
): ExerciseIdentityIndex {
  const byName = new Map<string, RelationalExercise['exercise']>();
  const bySlug = new Map<string, RelationalExercise['exercise']>();
  for (const { exercise } of exercises) {
    if (!byName.has(exercise.name)) byName.set(exercise.name, exercise);
    if (exercise.slug && !bySlug.has(exercise.slug)) bySlug.set(exercise.slug, exercise);
  }
  return { byName, bySlug };
}

/**
 * Matching policy (S02-D1, GA-04-derived, NO fuzzy matching):
 *   1. exact relational display-name match (strongest — the DB relation);
 *   2. exact relational slug match (when the input already carries a slug);
 *   3. legacy-only reference (no invented canonical id).
 *
 * Canonical identity is read ONLY from a matched relational row. If no row
 * matches, the reference returns the preserved legacy id + name.
 */
export function enrichExerciseIdentity(
  exercise: PersistedScheduleExercise,
  index: number,
  identityIndex: ExerciseIdentityIndex,
): WorkoutExerciseIdentity {
  const name =
    typeof exercise.name === 'string' && exercise.name.trim()
      ? exercise.name.trim()
      : `Exercise ${index + 1}`;
  const legacyId = typeof exercise.id === 'string' ? exercise.id : `generated-${index}`;

  const byName = identityIndex.byName.get(name);
  if (byName) {
    return {
      exerciseId: byName.id as ExerciseId,
      slug: (byName.slug ?? undefined) as ExerciseSlug | undefined,
      legacyId,
      name,
    };
  }

  if (typeof exercise.slug === 'string') {
    const bySlug = identityIndex.bySlug.get(exercise.slug);
    if (bySlug) {
      return {
        exerciseId: bySlug.id as ExerciseId,
        slug: exercise.slug as ExerciseSlug,
        legacyId,
        name,
      };
    }
  }

  return { legacyId, name };
}

/** Enrich an ordered array of schedule exercises into identity references. */
export function enrichScheduleExercises(
  scheduleExercises: readonly PersistedScheduleExercise[],
  identityIndex: ExerciseIdentityIndex,
): WorkoutExerciseIdentity[] {
  return scheduleExercises.map((exercise, index) =>
    enrichExerciseIdentity(exercise, index, identityIndex),
  );
}
