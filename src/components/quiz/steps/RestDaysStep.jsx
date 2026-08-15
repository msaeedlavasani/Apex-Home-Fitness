import React from 'react';
import { REST_DAY_MAX, REST_DAY_MIN, WEEKDAY_OPTIONS, normalizeRestDays } from '../restDays';
import { t as defaultT } from '../i18n';

/**
 * Step 6 — Rest days (multi-select checkboxes).
 *
 * The user picks 1–3 weekdays that stay workout-free. Enforcement lives at
 * multiple layers:
 *   - here: unchecked options are disabled once `REST_DAY_MAX` is reached,
 *     and a hint explains the cap;
 *   - `OnboardingQuiz` STEP_CONFIG: validates min/max on Next;
 *   - the API schema (`REST_DAYS_SCHEMA`): min/max + no duplicates;
 *   - the generator prompt + `enforceRestDays` / `buildProgramDraft`: the
 *     generated and persisted program never schedules work on these days.
 *
 * @param {object} props
 * @param {string[]} [props.value=[]] — array of weekday ids.
 * @param {(days: string[]) => void} props.onChange
 *        Called with the new canonical array on every toggle.
 * @param {(key: string, params?: object) => string} [props.t]
 * @param {string} [props.error]
 */
export default function RestDaysStep({ value = [], onChange, t = defaultT, error }) {
  const selected = normalizeRestDays(value);
  const atMax = selected.length >= REST_DAY_MAX;

  const handleToggle = (id) => {
    if (selected.includes(id)) {
      onChange(selected.filter((day) => day !== id));
    } else if (atMax) {
      // The cap is enforced in the UI (and again in STEP_CONFIG validation).
      return;
    } else {
      onChange([...selected, id]);
    }
  };

  return (
    <fieldset className="quiz-step">
      <legend className="quiz-step__title">{t('quiz.restDays.title')}</legend>
      <p className="quiz-step__subtitle">{t('quiz.restDays.subtitle')}</p>

      <p className="quiz-restdays__counter" aria-live="polite">
        {t('quiz.restDays.counter', { count: selected.length, max: REST_DAY_MAX })}
      </p>

      <div className="quiz-step__options quiz-step__options--checkboxes">
        {WEEKDAY_OPTIONS.map((option) => {
          const checked = selected.includes(option.id);
          // Only unchecked options lock up when the cap is reached — the
          // user can always uncheck a selected day.
          const disabled = !checked && atMax;
          return (
            <label
              key={option.id}
              className={`quiz-check${checked ? ' quiz-check--checked' : ''}${
                disabled ? ' quiz-check--disabled' : ''
              }`}
            >
              <input
                type="checkbox"
                checked={checked}
                disabled={disabled}
                onChange={() => handleToggle(option.id)}
              />
              <span className="quiz-check__text">
                <span className="quiz-check__label">{t(option.labelKey)}</span>
              </span>
            </label>
          );
        })}
      </div>

      {atMax ? (
        <p className="quiz-restdays__hint" role="status">
          {t('quiz.restDays.maxReached', { max: REST_DAY_MAX })}
        </p>
      ) : null}

      {error ? <p className="quiz-step__error" role="alert">{error}</p> : null}
    </fieldset>
  );
}
