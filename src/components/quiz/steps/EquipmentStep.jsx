import React from 'react';
import { t as defaultT } from '../i18n';

const EQUIPMENT_OPTIONS = [
  { id: 'none', labelKey: 'quiz.equipment.none' },
  { id: 'pull_up_bar', labelKey: 'quiz.equipment.pull_up_bar' },
  { id: 'bands', labelKey: 'quiz.equipment.bands' },
  { id: 'dumbbells', labelKey: 'quiz.equipment.dumbbells' },
  { id: 'barbell', labelKey: 'quiz.equipment.barbell' },
  { id: 'kettlebells', labelKey: 'quiz.equipment.kettlebells' },
  { id: 'bench', labelKey: 'quiz.equipment.bench' },
  { id: 'cable_machine', labelKey: 'quiz.equipment.cable_machine' },
  { id: 'jump_rope', labelKey: 'quiz.equipment.jump_rope' },
];

const NONE_ID = 'none';

/**
 * Step 3 — Equipment available (multi-select checkboxes).
 * "None" is mutually exclusive with the other options.
 *
 * @param {object} props
 * @param {string[]} [props.value=[]]
 * @param {(equipment: string[]) => void} props.onChange
 * @param {(key: string, params?: object) => string} [props.t]
 * @param {string} [props.error]
 */
export default function EquipmentStep({ value = [], onChange, t = defaultT, error }) {
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
      <legend className="quiz-step__title">{t('quiz.equipment.title')}</legend>
      <p className="quiz-step__subtitle">{t('quiz.equipment.subtitle')}</p>

      <div className="quiz-step__options quiz-step__options--checkboxes">
        {EQUIPMENT_OPTIONS.map((option) => {
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

      {error ? <p className="quiz-step__error" role="alert">{error}</p> : null}
    </fieldset>
  );
}
