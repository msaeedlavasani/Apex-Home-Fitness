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

export const QA_PROGRAM_EXERCISES = [
  {name: 'Jump Squats', sets: 2, reps: 8, restSeconds: 20},
  {name: 'Bodyweight Squat', sets: 1, reps: null, restSeconds: 25},
] as const;

export const QA_PROGRAM_EXERCISE_RECORDS = [
  {
    name: 'Jump Squats',
    description: 'Explosive squat variation that builds power in the legs.',
    category: 'HIIT',
    equipment: [],
    difficulty: 'INTERMEDIATE',
    durationSeconds: 40,
    reps: null,
    sets: null,
    restSeconds: 30,
    instructions: [
      'Lower into a squat with the chest up and weight in the heels.',
      'Drive through the feet and jump as high as possible.',
      'Land softly and immediately lower into the next rep.',
    ],
  },
  {
    name: 'Bodyweight Squat',
    description: 'Foundational squat pattern for lower-body strength and control.',
    category: 'CALISTHENICS',
    equipment: [],
    difficulty: 'BEGINNER',
    durationSeconds: 30,
    reps: null,
    sets: 1,
    restSeconds: 25,
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
      {id: 'qa-jump-squat', name: 'Jump Squats', method: 'strength', equipment: 'none', sets: 2, reps: '8', duration_seconds: null, fallback_duration_seconds: 45, rest_seconds: 20, instruction_cue: 'Move with control.', alternatives: [], contraindicated_for: []},
      {id: 'qa-bodyweight-squat', name: 'Bodyweight Squat', method: 'strength', equipment: 'none', sets: 1, reps: null, duration_seconds: 30, fallback_duration_seconds: null, rest_seconds: 25, instruction_cue: 'Track the knees over the toes.', alternatives: [], contraindicated_for: []},
    ],
    cooldown: [],
    notes: 'QA data only; the normal Program path remains authoritative.',
  },
] as const;
