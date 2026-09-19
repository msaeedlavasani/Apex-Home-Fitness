import assert from 'node:assert/strict';
import test from 'node:test';
import React from 'react';
import TestRenderer, {act} from 'react-test-renderer';
import {RestStage} from '../src/components/workout/experience/RestStage';
import {WorkSetStage} from '../src/components/workout/experience/WorkSetStage';
import type {SessionViewModel} from '../src/lib/workout/sessionV2Contracts';

const modules = {START: 'DONE', PREPARING: 'DONE', EXERCISE_INTRO: 'DONE', WORK_SET: 'ACTIVE', SET_RESULT: 'PENDING', REST: 'PENDING'} as const;

function viewModel(locale: 'en' | 'fa', activeModule: 'WORK_SET' | 'SET_RESULT' | 'REST'): SessionViewModel {
  const fa = locale === 'fa';
  return {
    lifecycle: activeModule === 'REST' ? 'RESTING' : activeModule === 'SET_RESULT' ? 'SET_RESULT' : 'RUNNING',
    activeModule,
    modules,
    activeExercise: {exercise: {id: 'x', name: fa ? 'اسکات' : 'Squat', sets: 2, reps: 3, restSeconds: 10}, executionMode: 'REP_BASED', targetReps: 3, targetSeconds: null, setCount: 2, restSeconds: 10},
    activeExerciseIndex: 0,
    introExercise: null,
    preparingSecondsRemaining: null,
    executionElapsedSeconds: 0,
    pausedFromModule: null,
    currentSetNumber: 1,
    completedSetCount: activeModule === 'SET_RESULT' ? 1 : 0,
    totalSetCount: 2,
    setProgress: {status: activeModule === 'SET_RESULT' ? 'COMPLETE' : 'ACTIVE', executionMode: 'REP_BASED', setNumber: 1, setCount: 2, completedReps: activeModule === 'SET_RESULT' ? 3 : 1, targetReps: 3, elapsedSeconds: 0, targetSeconds: null, remainingSeconds: null},
    setResult: activeModule === 'SET_RESULT' ? {exerciseIndex: 0, setNumber: 1, setCount: 2, executionMode: 'REP_BASED', completedReps: 3, targetReps: 3, elapsedSeconds: 0, targetSeconds: null, isFinalSet: false, isFinalExercise: true, elapsedInResultSeconds: 0} : null,
    restState: activeModule === 'REST' ? {status: 'ACTIVE', kind: 'BETWEEN_SETS', elapsedSeconds: 0, totalSeconds: 10, remainingSeconds: 10} : null,
  };
}

test('SET and SET_RESULT render localized REP_BASED progress and callback affordance', () => {
  for (const locale of ['en', 'fa'] as const) {
    let recorded = 0;
    let renderer: TestRenderer.ReactTestRenderer | undefined;
    act(() => {
      renderer = TestRenderer.create(<WorkSetStage viewModel={viewModel(locale, 'WORK_SET')} recordRep={() => { recorded += 1; }} setLabel={locale === 'fa' ? 'ست' : 'Set'} recordRepLabel={locale === 'fa' ? 'ثبت تکرار' : 'Record rep'} repsLabel={locale === 'fa' ? 'تکرار' : 'reps'} />);
    });
    const button = renderer!.root.findByProps({'data-workout-v2-record-rep': ''});
    act(() => button.props.onClick());
    assert.equal(recorded, 1);
    assert.ok(renderer!.root.findByProps({'data-workout-v2-set-progress': ''}));
    act(() => renderer!.unmount());
  }
});

test('REST renders typed boundary in both locales and dispatches only SKIP REST', () => {
  for (const locale of ['en', 'fa'] as const) {
    let skipped = 0;
    let renderer: TestRenderer.ReactTestRenderer | undefined;
    act(() => {
      renderer = TestRenderer.create(<RestStage viewModel={viewModel(locale, 'REST')} onSkipRest={() => { skipped += 1; }} restLabel={locale === 'fa' ? 'استراحت' : 'Rest'} betweenSetsLabel={locale === 'fa' ? 'پیش از ست بعدی' : 'Before the next set'} skipRestLabel={locale === 'fa' ? 'رد کردن استراحت' : 'Skip rest'} />);
    });
    assert.equal(renderer!.root.findByProps({'data-workout-v2-rest-countdown': ''}).props.children, 10);
    act(() => renderer!.root.findByProps({'data-workout-v2-skip-rest': ''}).props.onClick());
    assert.equal(skipped, 1);
    act(() => renderer!.unmount());
  }
});
