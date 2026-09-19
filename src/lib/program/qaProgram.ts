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
  {name: 'Push-Up', sets: 3, reps: 10, restSeconds: 25},
  {name: 'Plank Hold', sets: 1, reps: null, restSeconds: 30},
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
    name: 'Push-Up',
    description: 'Classic upper-body exercise for the chest, shoulders and triceps.',
    category: 'CALISTHENICS',
    equipment: [],
    difficulty: 'BEGINNER',
    durationSeconds: 45,
    reps: 10,
    sets: 3,
    restSeconds: 30,
    instructions: [
      'Start in a high plank with hands slightly wider than the shoulders.',
      'Lower the chest toward the floor with elbows at 45 degrees.',
      'Press back up, keeping the body in one straight line.',
    ],
  },
  {
    name: 'Plank Hold',
    description: 'Full-body isometric hold for core and shoulder stability.',
    category: 'ISOMETRIC',
    equipment: ['yoga mat (optional)'],
    difficulty: 'BEGINNER',
    durationSeconds: 45,
    reps: null,
    sets: 3,
    restSeconds: 30,
    instructions: [
      'Hold a forearm or high plank with a straight line from head to heels.',
      'Squeeze the glutes and brace the abs.',
      'Keep breathing; do not let the hips sag.',
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
      {id: 'qa-squat', name: 'Jump Squats', method: 'strength', equipment: 'none', sets: 2, reps: '8', duration_seconds: null, fallback_duration_seconds: 45, rest_seconds: 20, instruction_cue: 'Move with control.', alternatives: [], contraindicated_for: []},
      {id: 'qa-push-up', name: 'Push-Up', method: 'strength', equipment: 'none', sets: 3, reps: '10', duration_seconds: null, fallback_duration_seconds: 50, rest_seconds: 25, instruction_cue: 'Keep a steady pace.', alternatives: [], contraindicated_for: []},
      {id: 'qa-plank', name: 'Plank Hold', method: 'isometric', equipment: 'none', sets: 1, reps: null, duration_seconds: 30, fallback_duration_seconds: null, rest_seconds: 30, instruction_cue: 'Breathe steadily.', alternatives: [], contraindicated_for: []},
    ],
    cooldown: [],
    notes: 'QA data only; the normal Program path remains authoritative.',
  },
] as const;
