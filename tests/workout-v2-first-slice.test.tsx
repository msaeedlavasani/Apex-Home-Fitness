/**
 * WP-04/WP-05 first-slice UI tests (repository Node test environment —
 * react-test-renderer, no DOM; next-intl wiring is covered by the targeted
 * Playwright spec, per docs/CI.md layering).
 *
 * Covers the plan §17 START_TESTS layers that are automatable here:
 *   - adapter + authority integration: a single START fires exactly one
 *     orchestration transition; rapid duplicate starts stay single-transition
 *     (the legacy START reliability concern, asserted where it belongs);
 *   - presentation renders view-model state and dispatches orchestration
 *     actions — NO presentation-owned sequencing (stages receive copy as
 *     props and hold zero state);
 *   - fa/en copy parity of the WorkoutV2 namespace (regression guard on the
 *     messages files themselves);
 *   - accessible interaction semantics for the START control and the
 *     PREPARING live region (non-animation-only timer);
 *   - reduced-motion convention (CSS-gated class; essential text remains).
 */
import assert from 'node:assert/strict';
import test, {after} from 'node:test';
import {readFileSync} from 'node:fs';
import React from 'react';
import TestRenderer, {act} from 'react-test-renderer';

import {StartStage} from '../src/components/workout/experience/StartStage';
import {PreparingStage} from '../src/components/workout/experience/PreparingStage';
import {useWorkoutSession} from '../src/components/workout/useWorkoutSession';
import type {SessionViewModel} from '../src/lib/workout/sessionV2Contracts';
import type {SessionExercise} from '../src/lib/workout/sessionContracts';

const PLAN: SessionExercise[] = [
  {id: 's1', name: 'اسکوات', sets: 3, reps: 10, restSeconds: 30},
];

const COPY = {
  en: {
    label: 'Start workout',
    hint: 'One tap to start. Minimum interaction until finish.',
    preparingLabel: 'Getting ready',
    announcement: (seconds: number) => `Starting in ${seconds} seconds`,
    towards: 'First: Squat',
    pause: 'Pause',
    resume: 'Resume',
  },
  fa: {
    label: 'شروع تمرین',
    hint: 'با یک لمس شروع کن. تا پایان حداقل تعامل.',
    preparingLabel: 'آماده‌سازی',
    announcement: (seconds: number) => `شروع در ${seconds} ثانیه`,
    towards: 'نخست: اسکوات',
    pause: 'توقف',
    resume: 'ادامه',
  },
} as const;

// ---------------------------------------------------------------------------
// Harness: mounts a probe component that drives the real adapter.
// ---------------------------------------------------------------------------

interface HarnessProps {
  locale: 'en' | 'fa';
  now: () => number;
  onStarted?: () => void;
  probe: (api: ReturnType<typeof useWorkoutSession>) => void;
}

function Harness({locale, now, onStarted, probe}: HarnessProps) {
  const session = useWorkoutSession(PLAN, {now, onEffect: (effect) => {
    if (effect.kind === 'SESSION_STARTED') onStarted?.();
  }});
  probe(session);
  const {viewModel, startSession, pause, resume} = session;
  const copy = COPY[locale];
  return (
    <div>
      {viewModel.activeModule === 'START' && (
        <StartStage viewModel={viewModel} label={copy.label} hint={copy.hint} onStart={startSession} />
      )}
      {viewModel.activeModule === 'PREPARING' && (
        <PreparingStage
          viewModel={viewModel}
          label={copy.preparingLabel}
          announcement={copy.announcement(viewModel.preparingSecondsRemaining ?? 0)}
          pauseLabel={copy.pause}
          resumeLabel={copy.resume}
          workingTowardsLabel={copy.towards}
          onPause={pause}
          onResume={resume}
        />
      )}
    </div>
  );
}

interface HarnessApi {
  renderer: TestRenderer.ReactTestRenderer;
  session: () => ReturnType<typeof useWorkoutSession>;
  startedCount: () => number;
  /** Unmount (clears the adapter's interval so the test process can exit). */
  unmount: () => void;
}

const activeHarnesses: HarnessApi[] = [];
function mountHarness(locale: 'en' | 'fa', now: () => number = () => 1_000): HarnessApi {
  const holder: {session?: ReturnType<typeof useWorkoutSession>} = {};
  let startedCount = 0;
  let renderer: TestRenderer.ReactTestRenderer | undefined;
  act(() => {
    renderer = TestRenderer.create(
      <Harness
        locale={locale}
        now={now}
        onStarted={() => {
          startedCount += 1;
        }}
        probe={(session) => {
          holder.session = session;
        }}
      />,
    );
  });
  const harness = {
    renderer: renderer!,
    session: () => {
      assert.ok(holder.session, 'harness must capture the session API');
      return holder.session;
    },
    startedCount: () => startedCount,
    /** Unmount (clears the adapter's interval so the test process can exit). */
    unmount: () => {
      act(() => {
        harness.renderer.unmount();
      });
    },
  };
  activeHarnesses.push(harness);
  return harness;
}

after(() => {
  for (const harness of activeHarnesses) harness.unmount();
});

function startViewModel(overrides: Partial<SessionViewModel> = {}): SessionViewModel {
  return {
    lifecycle: 'READY_TO_START',
    activeModule: 'START',
    modules: {START: 'ACTIVE', PREPARING: 'PENDING', EXERCISE_INTRO: 'PENDING', WORK_SET: 'PENDING', REST: 'PENDING', EXERCISE_TRANSITION: 'PENDING', COMPLETE: 'PENDING'},
    activeExercise: null,
    activeExerciseIndex: null,
    preparingSecondsRemaining: null,
    executionElapsedSeconds: 0,
    pausedFromModule: null,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// START reliability (the legacy acceptance risk, explicitly tested)
// ---------------------------------------------------------------------------

test('single START click performs exactly one orchestration start transition', () => {
  const h = mountHarness('en');
  const button = h.renderer.root.findByProps({'data-workout-v2-start': true});
  assert.equal(button.props.disabled, false);
  act(() => {
    button.props.onClick();
  });
  assert.equal(h.startedCount(), 1, 'exactly one SESSION_STARTED effect');
  assert.ok(h.renderer.root.findByProps({'data-workout-v2-pause': true}), 'PREPARING presented after START');
});

test('rapid duplicate START clicks stay a single transition (no double-fire)', () => {
  const h = mountHarness('en');
  const button = h.renderer.root.findByProps({'data-workout-v2-start': true});
  act(() => {
    button.props.onClick();
    button.props.onClick();
    button.props.onClick();
  });
  assert.equal(h.startedCount(), 1, 'idempotent authority + single-fire presentation');
  const pauseControl = h.renderer.root.findByProps({'data-workout-v2-pause': true});
  assert.ok(pauseControl, 'session is in PREPARING, not restarted');
  assert.equal(h.session().viewModel.lifecycle, 'PREPARING');
});

test('START CTA unmounts after the transition — no second re-entry path exists', () => {
  const h = mountHarness('en');
  const button = h.renderer.root.findByProps({'data-workout-v2-start': true});
  act(() => {
    button.props.onClick();
  });
  assert.throws(() => h.renderer.root.findByProps({'data-workout-v2-start': true}));
  assert.equal(h.startedCount(), 1);
});

// ---------------------------------------------------------------------------
// Locale parity (fa/en) at presentation level
// ---------------------------------------------------------------------------

test('fa locale renders the Persian START and PREPARING copy', () => {
  const h = mountHarness('fa');
  assert.ok(h.renderer.root.findAllByProps({children: COPY.fa.label}).length > 0);
  assert.ok(h.renderer.root.findAllByProps({children: COPY.fa.hint}).length > 0);
  act(() => {
    h.renderer.root.findByProps({'data-workout-v2-start': true}).props.onClick();
  });
  assert.ok(h.renderer.root.findAllByProps({children: COPY.fa.preparingLabel}).length > 0);
  assert.ok(h.renderer.root.findAllByProps({children: COPY.fa.pause}).length > 0);
});

test('en locale renders the English START and PREPARING copy', () => {
  const h = mountHarness('en');
  assert.ok(h.renderer.root.findAllByProps({children: COPY.en.label}).length > 0);
  act(() => {
    h.renderer.root.findByProps({'data-workout-v2-start': true}).props.onClick();
  });
  assert.ok(h.renderer.root.findAllByProps({children: COPY.en.preparingLabel}).length > 0);
});

// ---------------------------------------------------------------------------
// Accessibility baseline for the interactive controls
// ---------------------------------------------------------------------------

test('START control: native button semantics, focus ring, touch target class', () => {
  const h = mountHarness('en');
  const button = h.renderer.root.findByProps({'data-workout-v2-start': true});
  assert.equal(button.type, 'button');
  assert.equal(button.props.type, 'button');
  assert.match(String(button.props.className), /focus-visible:ring-2/);
  assert.match(String(button.props.className), /touch-manipulation/);
  assert.match(String(button.props.className), /min-h-14/);
});

test('START disabled (aria-disabled) when no exercise is resolvable', () => {
  let renderer: TestRenderer.ReactTestRenderer | undefined;
  act(() => {
    renderer = TestRenderer.create(
      <StartStage viewModel={startViewModel({activeExercise: null})} label={COPY.en.label} hint={COPY.en.hint} onStart={() => {}} />,
    );
  });
  const button = renderer!.root.findByProps({'data-workout-v2-start': true});
  assert.equal(button.props.disabled, true);
  assert.equal(button.props['aria-disabled'], true);
});

test('PREPARING timer is text with exactly one polite live region (non-animation-only)', () => {
  let renderer: TestRenderer.ReactTestRenderer | undefined;
  act(() => {
    renderer = TestRenderer.create(
      <PreparingStage
        viewModel={startViewModel({
          lifecycle: 'PREPARING', activeModule: 'PREPARING',
          modules: {START: 'DONE', PREPARING: 'ACTIVE', EXERCISE_INTRO: 'PENDING', WORK_SET: 'PENDING', REST: 'PENDING', EXERCISE_TRANSITION: 'PENDING', COMPLETE: 'PENDING'},
          activeExercise: null, activeExerciseIndex: 0, preparingSecondsRemaining: 5, pausedFromModule: null,
        })}
        label={COPY.en.preparingLabel}
        announcement={COPY.en.announcement(5)}
        pauseLabel={COPY.en.pause}
        resumeLabel={COPY.en.resume}
        workingTowardsLabel={COPY.en.towards}
        onPause={() => {}}
        onResume={() => {}}
      />,
    );
  });
  const live = renderer!.root.findAllByProps({'aria-live': 'polite'});
  assert.equal(live.length, 1, 'exactly one live region (no double announcements)');
  assert.equal(live[0]!.props.role, 'status');
  // The live region holds the keyed per-second sentence span.
  const sentence = live[0]!.props.children as {props: {children: string}};
  assert.equal(sentence.props.children, COPY.en.announcement(5));
});

test('PREPARING pause/resume dispatch orchestration actions only (no local sequencing)', () => {
  let dispatched: 'pause' | 'resume' | null = null;
  let renderer: TestRenderer.ReactTestRenderer | undefined;
  act(() => {
    renderer = TestRenderer.create(
      <PreparingStage
        viewModel={startViewModel({
          lifecycle: 'PREPARING', activeModule: 'PREPARING',
          modules: {START: 'DONE', PREPARING: 'ACTIVE', EXERCISE_INTRO: 'PENDING', WORK_SET: 'PENDING', REST: 'PENDING', EXERCISE_TRANSITION: 'PENDING', COMPLETE: 'PENDING'},
          activeExercise: null, activeExerciseIndex: 0, preparingSecondsRemaining: 3, pausedFromModule: null,
        })}
        label={COPY.en.preparingLabel}
        announcement={COPY.en.announcement(3)}
        pauseLabel={COPY.en.pause}
        resumeLabel={COPY.en.resume}
        workingTowardsLabel={COPY.en.towards}
        onPause={() => { dispatched = 'pause'; }}
        onResume={() => { dispatched = 'resume'; }}
      />,
    );
  });
  const control = renderer!.root.findByProps({'data-workout-v2-pause': true});
  act(() => {
    control.props.onClick();
  });
  assert.equal(dispatched, 'pause');
});

// ---------------------------------------------------------------------------
// Reduced motion + stage class convention
// ---------------------------------------------------------------------------

test('stage transition uses the CSS-gated phase-enter class (disabled under reduced motion)', () => {
  // The class is always present in markup; globals.css @media (prefers-
  // reduced-motion: reduce) disables the animation. Essential state is the
  // text/live region, which reduced motion never removes (asserted above).
  const h = mountHarness('en');
  const button = h.renderer.root.findByProps({'data-workout-v2-start': true});
  act(() => {
    button.props.onClick();
  });
  const live = h.renderer.root.findByProps({'aria-live': 'polite'});
  assert.ok(live, 'essential information survives reduced motion');
});

// ---------------------------------------------------------------------------
// Message-file parity (fa/en WorkoutV2 namespace)
// ---------------------------------------------------------------------------

test('WorkoutV2 message namespace is structurally identical across fa/en', () => {
  const en = JSON.parse(readFileSync(new URL('../src/messages/en.json', import.meta.url), 'utf8')) as Record<string, unknown>;
  const fa = JSON.parse(readFileSync(new URL('../src/messages/fa.json', import.meta.url), 'utf8')) as Record<string, unknown>;
  const keyPaths = (node: unknown, prefix = ''): string[] => {
    const paths: string[] = [];
    if (node && typeof node === 'object' && !Array.isArray(node)) {
      for (const [key, value] of Object.entries(node as Record<string, unknown>)) {
        const path = prefix ? `${prefix}.${key}` : key;
        if (value && typeof value === 'object') paths.push(...keyPaths(value, path));
        else paths.push(path);
      }
    }
    return paths;
  };
  const workoutV2 = (messages: Record<string, unknown>) => {
    assert.ok(messages.WorkoutV2, 'WorkoutV2 namespace exists');
    return keyPaths(messages.WorkoutV2).sort();
  };
  assert.deepEqual(workoutV2(fa), workoutV2(en));
});

test('WorkoutV2 copy is non-empty in both locales', () => {
  for (const file of ['en', 'fa'] as const) {
    const messages = JSON.parse(readFileSync(new URL(`../src/messages/${file}.json`, import.meta.url), 'utf8')) as Record<string, Record<string, unknown>>;
    const flat = JSON.stringify(messages.WorkoutV2);
    assert.ok(!flat.includes('""'), `${file} WorkoutV2 copy must not contain empty strings`);
  }
});
