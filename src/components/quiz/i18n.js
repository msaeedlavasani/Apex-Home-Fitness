/**
 * Placeholder i18n helper.
 *
 * All quiz components call `t('some.key', params?)` exactly like they would
 * with react-i18next, so swapping this implementation later requires no
 * changes to the components. To plug in a real solution, replace:
 *
 *   import { t } from '../i18n';
 *
 * with e.g.:
 *
 *   import { useTranslation } from 'react-i18next';
 *   // const { t } = useTranslation();
 */

export const DEFAULT_MESSAGES = {
  // ---- Generic ----
  'quiz.title': 'Build your training plan',
  'quiz.subtitle': 'Answer a few quick questions so we can personalize your workouts.',
  'quiz.progress': 'Step {{current}} of {{total}}',
  'quiz.next': 'Next',
  'quiz.back': 'Back',
  'quiz.finish': 'See my plan',
  'quiz.error.required': 'Please select an option to continue.',
  'quiz.error.equipment.required': 'Please select at least one option, or choose "None".',

  // ---- Step 1 — Current level ----
  'quiz.level.title': 'What is your current training level?',
  'quiz.level.subtitle': 'Choose the option that fits you best.',
  'quiz.level.beginner': 'Beginner',
  'quiz.level.beginner.hint': 'New to training or back after a long break',
  'quiz.level.intermediate': 'Intermediate',
  'quiz.level.intermediate.hint': 'Training consistently for 1–3 years',
  'quiz.level.advanced': 'Advanced',
  'quiz.level.advanced.hint': '3+ years of training, comfortable with advanced movements',

  // ---- Step 2 — Goal ----
  'quiz.goal.title': 'What is your main goal?',
  'quiz.goal.subtitle': 'Pick the goal you want to focus on most.',
  'quiz.goal.strength': 'Strength',
  'quiz.goal.strength.hint': 'Build muscle and get stronger',
  'quiz.goal.fat_loss': 'Fat Loss',
  'quiz.goal.fat_loss.hint': 'Lose fat and improve conditioning',
  'quiz.goal.flexibility': 'Flexibility',
  'quiz.goal.flexibility.hint': 'Improve mobility and range of motion',
  'quiz.goal.functional_fitness': 'Functional Fitness',
  'quiz.goal.functional_fitness.hint': 'Move better in everyday life and sports',

  // ---- Step 3 — Equipment ----
  'quiz.equipment.title': 'What equipment do you have available?',
  'quiz.equipment.subtitle':
    'Select everything you can use. Choose "None" if you train with bodyweight only.',
  'quiz.equipment.none': 'None — bodyweight only',
  'quiz.equipment.pull_up_bar': 'Pull-up bar',
  'quiz.equipment.bands': 'Resistance bands',
  'quiz.equipment.dumbbells': 'Dumbbells',
  'quiz.equipment.barbell': 'Barbell',
  'quiz.equipment.kettlebells': 'Kettlebells',
  'quiz.equipment.bench': 'Bench',
  'quiz.equipment.cable_machine': 'Cable machine',
  'quiz.equipment.jump_rope': 'Jump rope',

  // ---- Step 4 — Limitations ----
  'quiz.limitations.title': 'Do you have any injuries or limitations?',
  'quiz.limitations.subtitle':
    'This helps us avoid exercises that may cause discomfort. You can skip this step.',
  'quiz.limitations.none': 'None — I am healthy',
  'quiz.limitations.knee': 'Knee',
  'quiz.limitations.lower_back': 'Lower back',
  'quiz.limitations.shoulder': 'Shoulder',
  'quiz.limitations.wrist': 'Wrist',
  'quiz.limitations.ankle': 'Ankle',
  'quiz.limitations.hip': 'Hip',
  'quiz.limitations.neck': 'Neck',
  'quiz.limitations.details.label': 'Additional details (optional)',
  'quiz.limitations.details.placeholder':
    'e.g. "Recovering from a sprained ankle — no jumping for 4 weeks"',
};

/**
 * Translate a key with optional `{{param}}` interpolation.
 * Falls back to the raw key when the message is missing.
 *
 * @param {string} key
 * @param {Record<string, string | number>} [params]
 * @returns {string}
 */
export function translate(key, params = {}) {
  let message = DEFAULT_MESSAGES[key] ?? key;
  Object.entries(params).forEach(([name, value]) => {
    message = message.replace(new RegExp(`\\{\\{\\s*${name}\\s*\\}\\}`, 'g'), String(value));
  });
  return message;
}

/** Alias so components can call `t('some.key')` everywhere. */
export const t = translate;

export default translate;
