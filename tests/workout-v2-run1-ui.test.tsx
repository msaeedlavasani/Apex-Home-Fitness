import assert from 'node:assert/strict';
import test from 'node:test';
import React from 'react';
import TestRenderer, {act} from 'react-test-renderer';
import {RestStage} from '../src/components/workout/experience/RestStage';
import {WorkSetStage} from '../src/components/workout/experience/WorkSetStage';
import {SessionControlSurface} from '../src/components/workout/experience/SessionControlSurface';
import {SessionOutcomeSummary} from '../src/components/workout/experience/SessionOutcomeSummary';
import {WorkoutResultStage} from '../src/components/workout/experience/WorkoutResultStage';
import {ExitConfirmation} from '../src/components/workout/experience/ExitConfirmation';
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
    exerciseOutcomes: [{exerciseIndex: 0, status: 'ACTIVE'}],
    completionEligible: false,
    exitRequested: false,
    workoutResult: null,
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

test('WP-08 SET controls dispatch restart without owning orchestration state', () => {
  let restarted = 0;
  let renderer: TestRenderer.ReactTestRenderer | undefined;
  act(() => {
    renderer = TestRenderer.create(
      <WorkSetStage
        viewModel={viewModel('en', 'SET_RESULT')}
        restartCurrentSet={() => { restarted += 1; }}
        restartSetLabel="Restart set"
      />,
    );
  });
  act(() => renderer!.root.findByProps({'data-workout-v2-restart-set': ''}).props.onClick());
  assert.equal(restarted, 1);
  act(() => renderer!.unmount());
});

test('WP-08 pause/resume and outcome surfaces consume canonical view-model state', () => {
  let paused = 0;
  let resumed = 0;
  let renderer: TestRenderer.ReactTestRenderer | undefined;
  act(() => {
    renderer = TestRenderer.create(
      <SessionControlSurface
        viewModel={viewModel('en', 'WORK_SET')}
        onPause={() => { paused += 1; }}
        onResume={() => { resumed += 1; }}
        pauseLabel="Pause"
        resumeLabel="Resume"
      />,
    );
  });
  act(() => renderer!.root.findByProps({'data-workout-v2-session-control': 'pause'}).props.onClick());
  assert.equal(paused, 1);
  act(() => renderer!.unmount());

  const pausedView = {...viewModel('en', 'WORK_SET'), lifecycle: 'PAUSED' as const};
  act(() => {
    renderer = TestRenderer.create(
      <SessionControlSurface
        viewModel={pausedView}
        onPause={() => { paused += 1; }}
        onResume={() => { resumed += 1; }}
        pauseLabel="Pause"
        resumeLabel="Resume"
      />,
    );
  });
  act(() => renderer!.root.findByProps({'data-workout-v2-session-control': 'resume'}).props.onClick());
  assert.equal(resumed, 1);
  act(() => renderer!.unmount());

  act(() => {
    renderer = TestRenderer.create(
      <SessionOutcomeSummary
        viewModel={{
          ...viewModel('en', 'WORK_SET'),
          exerciseOutcomes: [
            {exerciseIndex: 0, status: 'COMPLETED'},
            {exerciseIndex: 1, status: 'OUTSTANDING_DEFERRED'},
            {exerciseIndex: 2, status: 'SKIPPED_FOR_SESSION'},
          ],
        }}
        completedLabel="Completed"
        deferredLabel="Deferred"
        skippedLabel="Skipped"
      />,
    );
  });
  assert.equal(renderer!.root.findByProps({'data-workout-v2-outcome': 'completed'}).props.children[2], 1);
  assert.equal(renderer!.root.findByProps({'data-workout-v2-outcome': 'deferred'}).props.children[2], 1);
  assert.equal(renderer!.root.findByProps({'data-workout-v2-outcome': 'skipped'}).props.children[2], 1);
  act(() => renderer!.unmount());
});

test('WP-12 renders semantic result and confirms exit through callbacks', () => {
  let exit = 0;
  let cancel = 0;
  let confirm = 0;
  let renderer: TestRenderer.ReactTestRenderer | undefined;
  const resultView = {...viewModel('en', 'WORK_SET'), activeModule: 'WORKOUT_RESULT' as const, lifecycle: 'WORKOUT_RESULT' as const, workoutResult: {
    totalExercises: 2,
    completedExercises: 1,
    skippedExercises: 1,
    completedSets: 3,
    totalSets: 4,
    completionKind: 'COMPLETED_PARTIALLY' as const,
  }};
  act(() => {
    renderer = TestRenderer.create(
      <WorkoutResultStage
        viewModel={resultView}
        title="Workout complete"
        subtitle="Done"
        completedSetsLabel="Sets"
        exercisesLabel="Exercises"
        skippedLabel="Skipped"
        exitLabel="Return"
        onExit={() => { exit += 1; }}
      />,
    );
  });
  assert.equal(renderer!.root.findByProps({'data-workout-v2-result-sets': ''}).props.children[4], 4);
  act(() => renderer!.root.findByProps({'data-workout-v2-result-exit': ''}).props.onClick());
  assert.equal(exit, 1);
  act(() => renderer!.unmount());

  act(() => {
    renderer = TestRenderer.create(
      <SessionControlSurface
        viewModel={resultView}
        onPause={() => undefined}
        onResume={() => undefined}
        pauseLabel="Pause"
        resumeLabel="Resume"
      />,
    );
  });
  assert.equal(renderer!.root.findAllByProps({'data-workout-v2-session-controls': ''}).length, 0, 'result has no active Pause surface');
  act(() => renderer!.unmount());

  act(() => {
    renderer = TestRenderer.create(
      <SessionOutcomeSummary
        viewModel={resultView}
        completedLabel="Completed"
        deferredLabel="Deferred"
        skippedLabel="Skipped"
      />,
    );
  });
  assert.equal(renderer!.root.findAllByProps({'data-workout-v2-outcomes': ''}).length, 0, 'result does not expose implementation-facing live counts');
  act(() => renderer!.unmount());

  act(() => {
    renderer = TestRenderer.create(
      <ExitConfirmation
        title="Leave?"
        description="The session will end."
        cancelLabel="Keep working"
        confirmLabel="Leave"
        onCancel={() => { cancel += 1; }}
        onConfirm={() => { confirm += 1; }}
      />,
    );
  });
  const buttons = renderer!.root.findAllByType('button');
  act(() => buttons[0]!.props.onClick());
  act(() => buttons[1]!.props.onClick());
  assert.equal(cancel, 1);
  assert.equal(confirm, 1);
  act(() => renderer!.unmount());
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
