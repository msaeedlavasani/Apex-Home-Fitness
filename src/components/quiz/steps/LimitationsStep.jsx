import React from 'react';
import { t as defaultT } from '../i18n';

const LIMITATION_OPTIONS = [
  { id: 'none', labelKey: 'quiz.limitations.none' },
  { id: 'knee', labelKey: 'quiz.limitations.knee' },
  { id: 'lower_back', labelKey: 'quiz.limitations.lower_back' },
  { id: 'shoulder', labelKey: 'quiz.limitations.shoulder' },
  { id: 'wrist', labelKey: 'quiz.limitations.wrist' },
  { id: 'ankle', labelKey: 'quiz.limitations.ankle' },
  { id: 'hip', labelKey: 'quiz.limitations.hip' },
  { id: 'neck', labelKey: 'quiz.limitations.neck' },
];

const NONE_ID = 'none';

/**
 * Step 4 — Injuries / limitations (checkboxes + free-text details).
 * Optional step: can be completed with empty values.
 * "None" is mutually exclusive with the other options.
 *
 * @param {object} props
 * @param {string[]} [props.value=[]]
 * @param {(limitations: string[]) => void} props.onChange
 * @param {string} [props.details='']
 * @param {(details: string) => void} props.onDetailsChange
 * @param {(key: string, params?: object) => string} [props.t]
 */
export default function LimitationsStep({
  value = [],
  onChange,
  details = '',
  onDetailsChange,
  t = defaultT,
}) {
  const isSelected = (id) => value.includes(id);

  const handleToggle = (id) => {
    if (id === NONE_ID) {
      // "None" is exclusive — selecting it clears everything else.
      onChange(isSelected(NONE_ID) ? [] : [NONE_ID]);
      return;
    }
    const withoutNone = value.filter((item) => item !== NONE_ID);
    onChange(
      isSelected(id)
        ? withoutNone.filter((item) => item !== id)
        : [...withoutNone, id]
    );
  };

  return (
    <fieldset className="quiz-step">
      <legend className="quiz-step__title">{t('quiz.limitations.title')}</legend>
      <p className="quiz-step__subtitle">{t('quiz.limitations.subtitle')}</p>

      <div className="quiz-step__options quiz-step__options--checkboxes">
        {LIMITATION_OPTIONS.map((option) => {
          const checked = isSelected(option.id);
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
              <span className="quiz-check__label">{t(option.labelKey)}</span>
            </label>
          );
        })}
      </div>

      <label className="quiz-field" htmlFor="quiz-limitations-details">
        <span className="quiz-field__label">{t('quiz.limitations.details.label')}</span>
        <textarea
          id="quiz-limitations-details"
          className="quiz-field__input"
          rows={3}
          value={details}
          onChange={(event) => onDetailsChange(event.target.value)}
          placeholder={t('quiz.limitations.details.placeholder')}
        />
      </label>
    </fieldset>
  );
}
