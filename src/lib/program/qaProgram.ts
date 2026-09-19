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
