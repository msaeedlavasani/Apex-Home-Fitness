import React from 'react';
import { t as defaultT } from '../i18n';

/**
 * Back / Next (or Finish) navigation row for the quiz.
 *
 * @param {object} props
 * @param {number} props.currentStep — 0-based index of the active step
 * @param {number} props.total — number of steps
 * @param {() => void} props.onBack
 * @param {() => void} props.onNext
 * @param {boolean} props.isLastStep
 * @param {boolean} [props.disabled=false] — disables Next (e.g. while submitting)
 * @param {(key: string, params?: object) => string} [props.t]
 */
export default function NavigationButtons({
  currentStep,
  total,
  onBack,
  onNext,
  isLastStep,
  disabled = false,
  t = defaultT,
}) {
  return (
    <div className="quiz-nav">
      {currentStep > 0 ? (
        <button
          type="button"
          className="quiz-nav__back"
          onClick={onBack}
          disabled={disabled}
        >
          {t('quiz.back')}
        </button>
      ) : (
        <span className="quiz-nav__spacer" aria-hidden="true" />
      )}

      <button
        type="button"
        className="quiz-nav__next"
        onClick={onNext}
        disabled={disabled}
      >
        {isLastStep ? t('quiz.finish') : t('quiz.next')}
      </button>
    </div>
  );
}
