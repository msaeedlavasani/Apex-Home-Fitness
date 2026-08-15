import React from 'react';
import OptionCard from '../components/OptionCard';
import { t as defaultT } from '../i18n';

const LEVEL_OPTIONS = [
  { id: 'beginner', labelKey: 'quiz.level.beginner', hintKey: 'quiz.level.beginner.hint' },
  { id: 'intermediate', labelKey: 'quiz.level.intermediate', hintKey: 'quiz.level.intermediate.hint' },
  { id: 'advanced', labelKey: 'quiz.level.advanced', hintKey: 'quiz.level.advanced.hint' },
];

/**
 * Step 1 — Current training level (single choice).
 *
 * @param {object} props
 * @param {string} [props.value='']
 * @param {(level: string) => void} props.onChange
 * @param {(key: string, params?: object) => string} [props.t]
 * @param {string} [props.error]
 */
export default function CurrentLevelStep({ value = '', onChange, t = defaultT, error }) {
  return (
    <fieldset className="quiz-step">
      <legend className="quiz-step__title">{t('quiz.level.title')}</legend>
      <p className="quiz-step__subtitle">{t('quiz.level.subtitle')}</p>

      <div className="quiz-step__options" role="radiogroup" aria-label={t('quiz.level.title')}>
        {LEVEL_OPTIONS.map((option) => (
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
