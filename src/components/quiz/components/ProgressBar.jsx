import React from 'react';
import { t as defaultT } from '../i18n';

/**
 * Shows step position ("Step 2 of 4") plus a progress bar.
 *
 * @param {object} props
 * @param {number} props.current — 1-based index of the active step
 * @param {number} props.total — number of steps
 * @param {(key: string, params?: object) => string} [props.t]
 */
export default function ProgressBar({ current, total, t = defaultT }) {
  const percent = Math.round((current / total) * 100);

  return (
    <div className="quiz-progress">
      <div className="quiz-progress__track">
        <div
          className="quiz-progress__bar"
          role="progressbar"
          aria-valuenow={current}
          aria-valuemin={0}
          aria-valuemax={total}
          style={{ width: `${percent}%` }}
        />
      </div>
      <span className="quiz-progress__label">
        {t('quiz.progress', { current, total })}
      </span>
    </div>
  );
}
