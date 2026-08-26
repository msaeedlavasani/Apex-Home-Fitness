import React from 'react';
import { EXERCISE_STYLE_OPTIONS, normalizeExerciseStyles } from '../exerciseStyles';
import { t as defaultT } from '../i18n';

/**
 * Exercise styles step — the user can choose one or more training methods.
 * At least one selection is required by the parent quiz flow.
 */
export default function ExerciseStylesStep({ value = [], onChange, t = defaultT, error }) {
  const selected = normalizeExerciseStyles(value);

  const handleToggle = (id) => {
    const next = selected.includes(id)
      ? selected.filter((style) => style !== id)
      : [...selected, id];
    onChange(next);
  };

  return (
    <fieldset className="quiz-step">
      <legend className="quiz-step__title">{t('quiz.exerciseStyles.title')}</legend>
      <p className="quiz-step__subtitle">{t('quiz.exerciseStyles.subtitle')}</p>

      <div className="quiz-step__options quiz-step__options--checkboxes">
        {EXERCISE_STYLE_OPTIONS.map((option) => {
          const checked = selected.includes(option.id);
          return (
            <label
              key={option.id}
              className={`quiz-check${checked ? ' quiz-check--checked' : ''}`}
            >
              <input
                type="checkbox"
                checked={checked}
                onChange={() => handleToggle(option.id)}
              />
              <span className="quiz-check__text">
                <span className="quiz-check__label">{t(option.labelKey)}</span>
                <span className="quiz-check__description">{t(option.hintKey)}</span>
              </span>
            </label>
          );
        })}
      </div>

      {error ? <p className="quiz-step__error" role="alert">{error}</p> : null}
    </fieldset>
  );
}
