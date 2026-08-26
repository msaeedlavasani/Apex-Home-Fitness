import React from 'react';
import OptionCard from '../components/OptionCard';
import {t as defaultT} from '../i18n';

const TRAINING_DAY_OPTIONS = [2, 3, 4, 5, 6];

/** Weekly training frequency, deliberately separate from unavailable/rest days. */
export default function TrainingDaysStep({value, onChange, t = defaultT, error}) {
  return (
    <fieldset className="quiz-step">
      <legend className="quiz-step__title">{t('quiz.trainingDays.title')}</legend>
      <p className="quiz-step__subtitle">{t('quiz.trainingDays.subtitle')}</p>
      <div className="quiz-step__options" role="radiogroup" aria-label={t('quiz.trainingDays.title')}>
        {TRAINING_DAY_OPTIONS.map((days) => (
          <OptionCard
            key={days}
            selected={value === days}
            onSelect={() => onChange(days)}
            title={t('quiz.trainingDays.option', {count: days})}
            description={t(`quiz.trainingDays.${days}.hint`)}
          />
        ))}
      </div>
      {error ? <p className="quiz-step__error" role="alert">{error}</p> : null}
    </fieldset>
  );
}
