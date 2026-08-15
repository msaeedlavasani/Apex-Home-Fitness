import React from 'react';
import { GOAL_OPTIONS, normalizeGoals } from '../goals';
import { t as defaultT } from '../i18n';

/**
 * Step 3 — Goals (multi-select checkboxes).
 *
 * The user can pick one or more goals; at least one is required (validated
 * by `OnboardingQuiz`). "None"-style exclusivity does not apply here.
 *
 * Backward compatibility: `value` may be a legacy single string
 * (`'strength'`) or an array of ids — `normalizeGoals` handles both, and
 * `onChange` always reports a canonical array.
 *
 * @param {object} props
 * @param {string | string[]} [props.value='']
 *        Legacy single goal id or an array of goal ids.
 * @param {(goals: string[]) => void} props.onChange
 *        Called with the new canonical array on every toggle.
 * @param {(key: string, params?: object) => string} [props.t]
 * @param {string} [props.error]
 */
export default function GoalStep({ value = '', onChange, t = defaultT, error }) {
  const selected = normalizeGoals(value);

  const handleToggle = (id) => {
    const next = selected.includes(id)
      ? selected.filter((goal) => goal !== id)
      : [...selected, id];
    onChange(next);
  };

  return (
    <fieldset className="quiz-step">
      <legend className="quiz-step__title">{t('quiz.goal.title')}</legend>
      <p className="quiz-step__subtitle">{t('quiz.goal.subtitle')}</p>

      <div className="quiz-step__options quiz-step__options--checkboxes">
        {GOAL_OPTIONS.map((option) => {
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
