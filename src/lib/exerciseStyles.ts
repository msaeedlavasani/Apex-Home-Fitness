export const EXERCISE_STYLE_IDS = [
  'yoga',
  'hiit',
  'calisthenics',
  'pilates',
  'mobility',
  'isometric',
  'resistance_band',
  'animal_flow',
] as const;

export type ExerciseStyleId = (typeof EXERCISE_STYLE_IDS)[number];
