/**
 * Canonical persisted QA Program input for Workout V2 integration checks.
 *
 * This module is data only. It contains no user/account branching and is
 * consumed by the normal Prisma seed plus the bounded Beta QA-data gateway
 * operation. Workout Experience still resolves the persisted Program and
 * shared prescription contract at runtime.
 */

export const QA_PROGRAM_NAME = 'Apex Workout V2 QA Program';
export const QA_PROGRAM_DESCRIPTION = 'Small repeatable QA input for the real Workout V2 Program path.';
export const QA_PROGRAM_LEVEL = 'BEGINNER' as const;
export const QA_PROGRAM_DURATION_WEEKS = 1 as const;
export const QA_PROGRAM_SESSIONS_PER_WEEK = 1 as const;
export const QA_PROGRAM_REST_DAYS = [] as const;

export const QA_PROGRAM_EXERCISES = [
  {name: 'Bodyweight Squat', sets: 2, reps: 8, restSeconds: 20},
  {name: 'Bodyweight Squat', sets: 2, reps: 8, restSeconds: 25},
] as const;

export const QA_PROGRAM_EXERCISE_RECORDS = [
  {
    name: 'Bodyweight Squat',
    description: 'Foundational squat pattern for lower-body strength and control.',
    category: 'CALISTHENICS',
    equipment: [],
    difficulty: 'BEGINNER',
    durationSeconds: 30,
    reps: null,
    sets: 1,
    restSeconds: 20,
    instructions: [
      'Stand with feet about hip-width apart and keep the chest lifted.',
      'Lower with control while tracking the knees over the toes.',
      'Drive through the feet to return to standing.',
    ],
  },
] as const;

export const QA_PROGRAM_WEEKLY_SCHEDULE = [
  {
    day: 1,
    day_name: 'Monday',
    focus: 'Workout V2 QA',
    is_rest_day: false,
    warmup: [],
    exercises: [
      {id: 'qa-bodyweight-squat-entry-1', name: 'Bodyweight Squat', method: 'strength', equipment: 'none', sets: 2, reps: '8', duration_seconds: null, fallback_duration_seconds: 45, rest_seconds: 20, set_prescriptions: [{execution_mode: 'REP_BASED', reps: '8', fallback_duration_seconds: 45, rest_seconds: 20}, {execution_mode: 'TIME_BASED', duration_seconds: 30, rest_seconds: 20}], instruction_cue: 'Track the knees over the toes.', alternatives: [], contraindicated_for: []},
      {id: 'qa-bodyweight-squat-entry-2', name: 'Bodyweight Squat', method: 'strength', equipment: 'none', sets: 2, reps: '8', duration_seconds: null, fallback_duration_seconds: 45, rest_seconds: 25, set_prescriptions: [{execution_mode: 'REP_BASED', reps: '8', fallback_duration_seconds: 45, rest_seconds: 25}, {execution_mode: 'TIME_BASED', duration_seconds: 30, rest_seconds: 25}], instruction_cue: 'Track the knees over the toes.', alternatives: [], contraindicated_for: []},
    ],
    cooldown: [],
    notes: 'QA data only; the normal Program path remains authoritative.',
  },
] as const;
