import React from 'react';
import OptionCard from '../components/OptionCard';
import { t as defaultT } from '../i18n';

const GOAL_OPTIONS = [
  { id: 'strength', labelKey: 'quiz.goal.strength', hintKey: 'quiz.goal.strength.hint' },
  { id: 'fat_loss', labelKey: 'quiz.goal.fat_loss', hintKey: 'quiz.goal.fat_loss.hint' },
  { id: 'flexibility', labelKey: 'quiz.goal.flexibility', hintKey: 'quiz.goal.flexibility.hint' },
  {
    id: 'functional_fitness',
    labelKey: 'quiz.goal.functional_fitness',
    hintKey: 'quiz.goal.functional_fitness.hint',
  },
];

/**
 * Step 2 — Main goal (single choice).
 *
 * @param {object} props
 * @param {string} [props.value='']
 * @param {(goal: string) => void} props.onChange
 * @param {(key: string, params?: object) => string} [props.t]
 * @param {string} [props.error]
 */
export default function GoalStep({ value = '', onChange, t = defaultT, error }) {
  return (
    <fieldset className="quiz-step">
      <legend className="quiz-step__title">{t('quiz.goal.title')}</legend>
      <p className="quiz-step__subtitle">{t('quiz.goal.subtitle')}</p>

      <div className="quiz-step__options" role="radiogroup" aria-label={t('quiz.goal.title')}>
        {GOAL_OPTIONS.map((option) => (
          <OptionCard
            key={option.id}
            selected={value === option.id}
            onSelect={() => onChange(option.id)}
            title={t(option.labelKey)}
            description={t(option.hintKey)}
          />
        ))}
      </div>

      {error ? <p className="quiz-step__error" role="alert">{error}</p> : null}
    </fieldset>
  );
}
