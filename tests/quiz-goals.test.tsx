import assert from 'node:assert/strict';
import test, { mock } from 'node:test';
import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';
import GoalStep from '../src/components/quiz/steps/GoalStep';
import { GOAL_IDS } from '../src/components/quiz/goals';

/**
 * Component-level tests for the multi-select GoalStep: rendering, legacy
 * string-value backward compatibility, multi-goal toggling and error display.
 * React 18 test-renderer environment (no DOM available in Node).
 */

function renderGoalStep(props = {}) {
  const component = TestRenderer.create(
    <GoalStep value={props.value} onChange={props.onChange} error={props.error} />,
  );
  return { root: component.root, component };
}

/** Inputs render in GOAL_IDS order (strength, fat_loss, flexibility, …). */
function checkboxes(root) {
  return root.findAllByType('input');
}

test('renders one checkbox per goal option', () => {
  const { root } = renderGoalStep({ value: [] });
  const boxes = checkboxes(root);
  assert.equal(boxes.length, GOAL_IDS.length);
  for (const box of boxes) {
    assert.equal(box.props.type, 'checkbox');
    assert.equal(box.props.checked, false);
  }
});

test('legacy single-string value is normalized (backward compatibility)', () => {
  const { root } = renderGoalStep({ value: 'strength' });
  const boxes = checkboxes(root);
  assert.equal(boxes[0].props.checked, true); // strength
  assert.equal(boxes[1].props.checked, false);
});

test('array value selects every matching checkbox', () => {
  const { root } = renderGoalStep({ value: ['strength', 'fat_loss'] });
  const boxes = checkboxes(root);
  assert.equal(boxes[0].props.checked, true); // strength
  assert.equal(boxes[1].props.checked, true); // fat_loss
  assert.equal(boxes[2].props.checked, false);
  assert.equal(boxes[3].props.checked, false);
});

test('toggling builds the canonical goal array and allows multiple goals', () => {
  const onChange = mock.fn();
  let value = [];
  const component = TestRenderer.create(<GoalStep value={value} onChange={onChange} />);

  // Controlled component: simulate the parent applying each onChange payload
  // by re-rendering with the reported value before the next toggle.
  const toggle = (index) => {
    const inputs = component.root.findAllByType('input');
    act(() => inputs[index].props.onChange());
    value = onChange.mock.calls[onChange.mock.calls.length - 1].arguments[0];
    act(() => component.update(<GoalStep value={value} onChange={onChange} />));
  };

  toggle(0); // Strength
  assert.deepEqual(value, ['strength']);
  toggle(1); // Fat Loss → two goals
  assert.deepEqual(value, ['strength', 'fat_loss']);

  const updated = component.root.findAllByType('input');
  assert.equal(updated[0].props.checked, true); // strength
  assert.equal(updated[1].props.checked, true); // fat_loss
  assert.equal(updated[2].props.checked, false);

  toggle(0); // un-check Strength — the remaining goal stays selected
  assert.deepEqual(value, ['fat_loss']);
});

test('renders the validation error via role=alert when provided', () => {
  const { root } = renderGoalStep({ value: [], error: 'Please select at least one goal.' });
  const alert = root.findByProps({ role: 'alert' });
  assert.equal(alert.props.children, 'Please select at least one goal.');
});
