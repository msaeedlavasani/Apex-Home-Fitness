import React from 'react';

/**
 * Reusable selectable card for single-choice options
 * (used by Current Level and Goal steps).
 *
 * Note: this component receives already-translated strings, so the parent
 * step (which owns the `t` function) is responsible for calling t('key').
 *
 * @param {object} props
 * @param {boolean} [props.selected=false]
 * @param {() => void} props.onSelect
 * @param {string} props.title — translated option label
 * @param {string} [props.description] — translated hint text
 * @param {boolean} [props.disabled=false]
 */
export default function OptionCard({
  selected = false,
  onSelect,
  title,
  description,
  disabled = false,
}) {
  return (
    <button
      type="button"
      className={`quiz-option${selected ? ' quiz-option--selected' : ''}`}
      onClick={onSelect}
      disabled={disabled}
      aria-pressed={selected}
    >
      <span className="quiz-option__title">{title}</span>
      {description ? (
        <span className="quiz-option__description">{description}</span>
      ) : null}
    </button>
  );
}
