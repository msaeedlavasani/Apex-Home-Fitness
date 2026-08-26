import { EXERCISE_STYLE_IDS } from '@/lib/exerciseStyles';

export { EXERCISE_STYLE_IDS };

export const EXERCISE_STYLE_OPTIONS = [
  {id: 'yoga', labelKey: 'quiz.exerciseStyles.yoga', hintKey: 'quiz.exerciseStyles.yoga.hint'},
  {id: 'hiit', labelKey: 'quiz.exerciseStyles.hiit', hintKey: 'quiz.exerciseStyles.hiit.hint'},
  {
    id: 'calisthenics',
    labelKey: 'quiz.exerciseStyles.calisthenics',
    hintKey: 'quiz.exerciseStyles.calisthenics.hint',
  },
  {
    id: 'pilates',
    labelKey: 'quiz.exerciseStyles.pilates',
    hintKey: 'quiz.exerciseStyles.pilates.hint',
  },
  {
    id: 'mobility',
    labelKey: 'quiz.exerciseStyles.mobility',
    hintKey: 'quiz.exerciseStyles.mobility.hint',
  },
  {
    id: 'isometric',
    labelKey: 'quiz.exerciseStyles.isometric',
    hintKey: 'quiz.exerciseStyles.isometric.hint',
  },
  {
    id: 'resistance_band',
    labelKey: 'quiz.exerciseStyles.resistance_band',
    hintKey: 'quiz.exerciseStyles.resistance_band.hint',
  },
  {
    id: 'animal_flow',
    labelKey: 'quiz.exerciseStyles.animal_flow',
    hintKey: 'quiz.exerciseStyles.animal_flow.hint',
  },
];

export function normalizeExerciseStyles(value) {
  const raw = Array.isArray(value) ? value : value == null || value === '' ? [] : [value];
  const selected = new Set(
    raw.filter((item) => typeof item === 'string' && EXERCISE_STYLE_IDS.includes(item)),
  );
  return EXERCISE_STYLE_IDS.filter((id) => selected.has(id));
}

/** Legacy answers did not include this preference; keep them valid and broad. */
export function exerciseStylesOrDefault(value) {
  const normalized = normalizeExerciseStyles(value);
  return normalized.length > 0 ? normalized : [...EXERCISE_STYLE_IDS];
}
