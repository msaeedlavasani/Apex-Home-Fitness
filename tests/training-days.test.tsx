import assert from 'node:assert/strict';
import test, {mock} from 'node:test';
import React from 'react';
import TestRenderer, {act} from 'react-test-renderer';

import TrainingDaysStep from '../src/components/quiz/steps/TrainingDaysStep';
import {translate} from '../src/components/quiz/i18n';

test('renders the complete 2–6 weekly frequency range as one radiogroup', () => {
  const component = TestRenderer.create(<TrainingDaysStep value={null} error={undefined} onChange={() => {}} />);
  const group = component.root.findByProps({role: 'radiogroup'});
  const buttons = group.findAllByType('button');
  assert.equal(buttons.length, 5);
  assert.deepEqual(buttons.map((button) => button.props.children[0].props.children), [
    '2 days per week', '3 days per week', '4 days per week', '5 days per week', '6 days per week',
  ]);
});

test('selecting a frequency emits the numeric value and exposes pressed state', () => {
  const onChange = mock.fn();
  const component = TestRenderer.create(<TrainingDaysStep value={3} error={undefined} onChange={onChange} />);
  const buttons = component.root.findAllByType('button');
  assert.equal(buttons[1].props['aria-pressed'], true);
  act(() => buttons[3].props.onClick());
  assert.equal(onChange.mock.calls[0].arguments[0], 5);
});

test('frequency labels and validation error are localized', () => {
  const t = (key: string, params?: Record<string, string | number>) => translate(key, params, 'fa');
  const component = TestRenderer.create(<TrainingDaysStep value={2} onChange={() => {}} t={t} error="انتخاب لازم است" />);
  assert.match(component.root.findByProps({role: 'radiogroup'}).props['aria-label'], /چند روز/);
  assert.equal(component.root.findByProps({role: 'alert'}).props.children, 'انتخاب لازم است');
});
