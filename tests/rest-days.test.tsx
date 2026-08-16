import assert from 'node:assert/strict';
import test, { mock } from 'node:test';
import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';
import RestDaysStep from '../src/components/quiz/steps/RestDaysStep';
import { REST_DAY_MAX, WEEKDAY_IDS, normalizeRestDays } from '../src/components/quiz/restDays';
import { translate } from '../src/components/quiz/i18n';

/**
 * Component-level tests for the rest-days step: rendering, min/max bounds
 * (unchecked options lock once the cap is reached), toggling, the error /
 * cap hints and the locale-aware display order (fa renders Saturday first).
 * React 18 test-renderer environment (no DOM available in Node).
 */

/** A `t` bound to the built-in Persian catalog (as OnboardingQuiz does). */
const faT = (key, params) => translate(key, params, 'fa');

function renderStep(props = {}) {
  const component = TestRenderer.create(
    <RestDaysStep
      value={props.value}
      onChange={props.onChange}
      error={props.error}
      locale={props.locale}
      t={props.t}
    />,
  );
  return { root: component.root, component };
}

/** Inputs render in display order: WEEKDAY_IDS (en) / WEEKDAY_IDS_FA (fa). */
function checkboxes(root) {
  return root.findAllByType('input');
}

/** Visible option label texts in DOM (render) order. */
function optionLabels(root) {
  return root.findAllByType('input').map((box) => {
    // The innermost span inside the wrapping <label> holds the label text.
    const spans = box.parent.findAllByType('span');
    return spans[spans.length - 1].props.children;
  });
}

test('renders one checkbox per weekday, none selected by default', () => {
  const { root } = renderStep({ value: [] });
  const boxes = checkboxes(root);
  assert.equal(boxes.length, WEEKDAY_IDS.length);
  for (const box of boxes) {
    assert.equal(box.props.type, 'checkbox');
    assert.equal(box.props.checked, false);
    assert.equal(box.props.disabled, false);
  }
});

test('renders the selection counter with the current count and max', () => {
  const { root } = renderStep({ value: ['monday', 'friday'] });
  const counter = root.findByProps({ 'aria-live': 'polite' });
  assert.match(counter.props.children, /2 of 3/);
});

test('toggling builds the canonical array and allows up to the max', () => {
  const onChange = mock.fn();
  let value = [];
  const component = TestRenderer.create(<RestDaysStep value={value} onChange={onChange} />);

  const toggle = (index) => {
    const inputs = component.root.findAllByType('input');
    act(() => inputs[index].props.onChange());
    value = onChange.mock.calls[onChange.mock.calls.length - 1].arguments[0];
    act(() => component.update(<RestDaysStep value={value} onChange={onChange} />));
  };

  toggle(0); // Monday
  assert.deepEqual(value, ['monday']);
  toggle(1); // Tuesday
  assert.deepEqual(value, ['monday', 'tuesday']);

  toggle(0); // un-check Monday — the remaining day stays selected
  assert.deepEqual(value, ['tuesday']);
});

test('reaching the max disables unchecked options and shows the cap hint', () => {
  const onChange = mock.fn();
  const value = ['monday', 'tuesday', 'wednesday']; // 3 = REST_DAY_MAX
  const component = TestRenderer.create(<RestDaysStep value={value} onChange={onChange} />);
  const boxes = component.root.findAllByType('input');

  // Selected options stay enabled (so the user can uncheck), the rest lock.
  assert.equal(boxes[0].props.disabled, false); // monday (selected)
  assert.equal(boxes[3].props.disabled, true); // thursday (unchecked)
  assert.equal(boxes[6].props.disabled, true); // sunday (unchecked)

  // A click on a disabled option must not extend the selection.
  act(() => boxes[3].props.onChange());
  assert.equal(onChange.mock.calls.length, 0);
});

test('unchecking frees the cap and re-enables unchecked options', () => {
  const onChange = mock.fn();
  let value = ['monday', 'tuesday', 'wednesday'];
  const component = TestRenderer.create(<RestDaysStep value={value} onChange={onChange} />);

  const uncheck = component.root.findAllByType('input')[0];
  act(() => uncheck.props.onChange());
  value = onChange.mock.calls[onChange.mock.calls.length - 1].arguments[0];
  assert.deepEqual(value, ['tuesday', 'wednesday']);

  act(() => component.update(<RestDaysStep value={value} onChange={onChange} />));
  const boxes = component.root.findAllByType('input');
  assert.equal(boxes[3].props.disabled, false); // thursday re-enabled
  assert.equal(boxes[6].props.disabled, false); // sunday re-enabled
  assert.equal(REST_DAY_MAX, 3);
});

test('renders the validation error via role=alert when provided', () => {
  const { root } = renderStep({ value: [], error: 'Please pick 1–3 rest days to continue.' });
  const alert = root.findByProps({ role: 'alert' });
  assert.equal(alert.props.children, 'Please pick 1–3 rest days to continue.');
});

test('renders the cap hint via role=status only when the max is reached', () => {
  const atMax = renderStep({ value: ['monday', 'tuesday', 'wednesday'] });
  assert.ok(atMax.root.findByProps({ role: 'status' }));

  const underMax = renderStep({ value: ['monday'] });
  assert.equal(underMax.root.findAllByProps({ role: 'status' }).length, 0);
});

// ---------------------------------------------------------------------------
// Locale display order (en = canonical Monday first; fa = Saturday first).
// ---------------------------------------------------------------------------

test('en (default) locale renders options in canonical Monday → Sunday order', () => {
  const { root } = renderStep({ value: [] });
  assert.deepEqual(optionLabels(root), [
    'Monday',
    'Tuesday',
    'Wednesday',
    'Thursday',
    'Friday',
    'Saturday',
    'Sunday',
  ]);
});

test('fa locale renders options Saturday → Friday (Persian week)', () => {
  const { root } = renderStep({ value: [], locale: 'fa', t: faT });
  assert.deepEqual(optionLabels(root), [
    'شنبه',
    'یکشنبه',
    'دوشنبه',
    'سه‌شنبه',
    'چهارشنبه',
    'پنجشنبه',
    'جمعه',
  ]);
});

test('fa locale toggling stores canonical weekday ids (display order is UI-only)', () => {
  const onChange = mock.fn();
  let value = [];
  const component = TestRenderer.create(
    <RestDaysStep value={value} onChange={onChange} locale="fa" t={faT} />,
  );

  const toggle = (index) => {
    const inputs = component.root.findAllByType('input');
    act(() => inputs[index].props.onChange());
    value = onChange.mock.calls[onChange.mock.calls.length - 1].arguments[0];
    act(() =>
      component.update(<RestDaysStep value={value} onChange={onChange} locale="fa" t={faT} />),
    );
  };

  toggle(0); // first fa option = Saturday
  assert.deepEqual(value, ['saturday']);
  toggle(1); // second fa option = Sunday
  assert.deepEqual(value, ['saturday', 'sunday']);
  toggle(4); // fifth fa option = Wednesday
  assert.deepEqual(value, ['saturday', 'sunday', 'wednesday']);

  // The cap still locks the remaining unchecked options.
  const boxes = component.root.findAllByType('input');
  assert.equal(boxes[5].props.disabled, true); // Thursday (unchecked)
  assert.equal(boxes[0].props.disabled, false); // Saturday (selected)

  // Stored ids are canonical; normalization (submit/API boundary) keeps ISO order.
  assert.deepEqual(normalizeRestDays(value), ['wednesday', 'saturday', 'sunday']);
});
