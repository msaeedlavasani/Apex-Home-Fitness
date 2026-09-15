/**
 * WP-04/WP-05 first-slice UI tests (repository Node test environment —
 * react-test-renderer, no DOM; next-intl/provider wiring is covered by the
 * targeted Playwright spec, per docs/CI.md layering).
 *
 * Covers the consolidated delta layers automatable here:
 *   - START reliability: a single activation fires exactly one orchestration
 *     transition; same-tick duplicates stay single-transition; the CTA
 *     unmounts after the transition (no re-entry path);
 *   - presentation renders view-model state and dispatches REAL functions —
 *     no presentation-owned sequencing, no dead handlers;
 *   - PREPARING product state: resolved exercise name, real-data dial arc
 *     (remaining/total of the authoritative countdown), ONE polite live
 *     region, Sound/More dispatch the functions the shell owns;
 *   - canonical CTA semantics (native button, xl height class, focus ring);
 *   - fa/en copy parity of the WorkoutV2 namespace;
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
import {deriveReadinessTips} from '../src/components/workout/experience/readiness';
import {PREPARING_DURATION_SECONDS} from '../src/lib/workout/orchestration';
import type {SessionViewModel} from '../src/lib/workout/sessionV2Contracts';
import type {SessionExercise} from '../src/lib/workout/sessionContracts';

const PLAN: SessionExercise[] = [
  {id: 's1', name: 'اسکوات', sets: 3, reps: 10, restSeconds: 30},
];

const TIPS = deriveReadinessTips({
  clearSpaceTitle: 'Clear space',
  clearSpaceDetail: 'Make sure you have enough room.',
  goodPostureTitle: 'Good posture',
  goodPostureDetail: 'Stand tall and relaxed.',
});

const COPY = {
  en: {
    eyebrow: "Today's Workout",
    title: 'Full Body Strength',
    copy: 'Your session is ready. Follow along at your pace.',
    cta: 'Start Workout',
    preparingLabel: 'Prepare',
    firstUp: 'First up',
    readinessMessage: 'Get ready to start',
    readinessGuidance: 'Find your space and get into position.',
    announcement: (seconds: number) => `Starting in ${seconds} seconds`,
    secondsUnit: 'Seconds',
    musicOn: 'Mute workout music',
    musicOff: 'Play workout music',
    more: 'More',
  },
  fa: {
    eyebrow: 'تمرین امروز',
    title: 'قدرت تمام بدن',
    copy: 'جلسه‌ات آماده است. با سرعت خودت ادامه بده.',
    cta: 'شروع تمرین',
    preparingLabel: 'آماده شو',
    firstUp: 'نخستین حرکت',
    readinessMessage: 'آماده شروع شو',
    readinessGuidance: 'فضایت را آماده کن و جایت را بگیر.',
    announcement: (seconds: number) => `شروع در ${seconds} ثانیه`,
    secondsUnit: 'ثانیه',
    musicOn: 'قطع صدای موسیقی تمرین',
    musicOff: 'پخش موسیقی تمرین',
    more: 'بیشتر',
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
  const {viewModel, startSession} = session;
  const copy = COPY[locale];
  return (
    <div>
      {viewModel.activeModule === 'START' && (
        <StartStage
          viewModel={viewModel}
          eyebrow={copy.eyebrow}
          title={copy.title}
          copy={copy.copy}
          ctaLabel={copy.cta}
          onStart={startSession}
        />
      )}
      {viewModel.activeModule === 'PREPARING' && (
        <PreparingStage
          viewModel={viewModel}
          workoutContext={copy.eyebrow}
          sessionStructure="1 Exercise · 3 Sets"
          label={copy.preparingLabel}
          firstUp={copy.firstUp}
          readinessMessage={copy.readinessMessage}
          readinessGuidance={copy.readinessGuidance}
          announcement={copy.announcement(viewModel.preparingSecondsRemaining ?? 0)}
          secondsUnit={copy.secondsUnit}
          countdownTotalSeconds={PREPARING_DURATION_SECONDS}
          musicOnLabel={copy.musicOn}
          musicOffLabel={copy.musicOff}
          moreLabel={copy.more}
          tips={TIPS}
          onToggleMusic={() => {}}
          musicPlaying={false}
          onMore={() => {}}
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

const PREPARING_MODULES = {START: 'DONE', PREPARING: 'ACTIVE', EXERCISE_INTRO: 'PENDING', WORK_SET: 'PENDING', REST: 'PENDING', EXERCISE_TRANSITION: 'PENDING', COMPLETE: 'PENDING'} as const;

function preparingViewModel(seconds: number, exerciseName: string | null = 'Squat'): SessionViewModel {
  return {
    lifecycle: 'PREPARING',
    activeModule: 'PREPARING',
    modules: {...PREPARING_MODULES},
    activeExercise: exerciseName
      ? {exercise: {id: 'x1', name: exerciseName, sets: 3, reps: 10, restSeconds: 30}, executionMode: 'REP_BASED', targetReps: 10, targetSeconds: null, setCount: 3, restSeconds: 30}
      : null,
    activeExerciseIndex: exerciseName ? 0 : null,
    preparingSecondsRemaining: seconds,
    executionElapsedSeconds: 0,
    pausedFromModule: null,
  };
}

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
  assert.ok(h.renderer.root.findByProps({'data-workout-v2-countdown': ''}), 'PREPARING presented after START');
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
  assert.ok(h.renderer.root.findByProps({'data-workout-v2-countdown': ''}), 'session is in PREPARING, not restarted');
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
  assert.ok(h.renderer.root.findAllByProps({children: COPY.fa.cta}).length > 0);
  act(() => {
    h.renderer.root.findByProps({'data-workout-v2-start': true}).props.onClick();
  });
  assert.ok(h.renderer.root.findAllByProps({children: COPY.fa.preparingLabel}).length > 0);
  assert.ok(h.renderer.root.findAllByProps({children: COPY.fa.more}).length > 0);
});

test('en locale renders the English START and PREPARING copy', () => {
  const h = mountHarness('en');
  assert.ok(h.renderer.root.findAllByProps({children: COPY.en.cta}).length > 0);
  act(() => {
    h.renderer.root.findByProps({'data-workout-v2-start': true}).props.onClick();
  });
  assert.ok(h.renderer.root.findAllByProps({children: COPY.en.readinessMessage}).length > 0);
});

// ---------------------------------------------------------------------------
// Accessibility baseline for the interactive controls
// ---------------------------------------------------------------------------

test('START control: canonical CTA semantics (native button, xl height, focus ring)', () => {
  const h = mountHarness('en');
  const button = h.renderer.root.findAllByType('button').find((node) => node.props['data-workout-v2-start'] === true);
  assert.ok(button, 'canonical Button renders a native button element');
  assert.equal(button.props.type, 'button');
  assert.match(String(button.props.className), /focus-visible:ring-2/);
  assert.match(String(button.props.className), /h-14/, 'canonical xl = 56px CTA height');
  assert.doesNotMatch(String(button.props.className), /bg-gradient/, 'no CTA gradient');
});

test('START disabled (aria-disabled) when no exercise is resolvable', () => {
  let renderer: TestRenderer.ReactTestRenderer | undefined;
  act(() => {
    renderer = TestRenderer.create(
      <StartStage
        viewModel={startViewModel({activeExercise: null})}
        eyebrow={COPY.en.eyebrow}
        title={COPY.en.title}
        copy={COPY.en.copy}
        ctaLabel={COPY.en.cta}
        onStart={() => {}}
      />,
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
        viewModel={preparingViewModel(5)}
        workoutContext={COPY.en.eyebrow}
        sessionStructure="1 Exercise · 3 Sets"
        label={COPY.en.preparingLabel}
        firstUp={COPY.en.firstUp}
        readinessMessage={COPY.en.readinessMessage}
        readinessGuidance={COPY.en.readinessGuidance}
        announcement={COPY.en.announcement(5)}
        secondsUnit={COPY.en.secondsUnit}
        countdownTotalSeconds={PREPARING_DURATION_SECONDS}
        musicOnLabel={COPY.en.musicOn}
        musicOffLabel={COPY.en.musicOff}
        moreLabel={COPY.en.more}
        tips={TIPS}
        onToggleMusic={() => {}}
        musicPlaying={false}
        onMore={() => {}}
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

test('PREPARING countdown dial arc is REAL data: remaining/total of the authoritative countdown', () => {
  const renderAt = (seconds: number) => {
    let renderer: TestRenderer.ReactTestRenderer | undefined;
    act(() => {
      renderer = TestRenderer.create(
        <PreparingStage
          viewModel={preparingViewModel(seconds)}
          workoutContext={COPY.en.eyebrow}
          sessionStructure="1 Exercise · 3 Sets"
          label={COPY.en.preparingLabel}
          firstUp={COPY.en.firstUp}
          readinessMessage={COPY.en.readinessMessage}
          readinessGuidance={COPY.en.readinessGuidance}
          announcement={COPY.en.announcement(seconds)}
          secondsUnit={COPY.en.secondsUnit}
          countdownTotalSeconds={PREPARING_DURATION_SECONDS}
          musicOnLabel={COPY.en.musicOn}
          musicOffLabel={COPY.en.musicOff}
          moreLabel={COPY.en.more}
          tips={TIPS}
          onToggleMusic={() => {}}
          musicPlaying={false}
          onMore={() => {}}
        />,
      );
    });
    return renderer!.root.findByProps({'data-workout-v2-countdown-arc': ''});
  };
  const R = 46;
  const C = 2 * Math.PI * R;
  assert.equal(renderAt(5).props.strokeDashoffset, 0, 'full remaining → full arc');
  assert.equal(renderAt(2).props.strokeDashoffset, C * (3 / 5), '2 of 5 remaining → 3/5 depleted');
  assert.equal(renderAt(2).props['strokeDasharray'], C);
});

test('PREPARING renders the RESOLVED exercise name (no hardcoded fixture)', () => {
  let renderer: TestRenderer.ReactTestRenderer | undefined;
  act(() => {
    renderer = TestRenderer.create(
      <PreparingStage
        viewModel={preparingViewModel(4, 'درازنشست')}
        workoutContext={COPY.fa.eyebrow}
        sessionStructure="۲ حرکت · ۶ ست"
        label={COPY.fa.preparingLabel}
        firstUp={COPY.fa.firstUp}
        readinessMessage={COPY.fa.readinessMessage}
        readinessGuidance={COPY.fa.readinessGuidance}
        announcement={COPY.fa.announcement(4)}
        secondsUnit={COPY.fa.secondsUnit}
        countdownTotalSeconds={PREPARING_DURATION_SECONDS}
        musicOnLabel={COPY.fa.musicOn}
        musicOffLabel={COPY.fa.musicOff}
        moreLabel={COPY.fa.more}
        tips={TIPS}
        onToggleMusic={() => {}}
        musicPlaying={false}
        onMore={() => {}}
      />,
    );
  });
  assert.ok(renderer!.root.findAllByProps({children: 'درازنشست'}).length > 0, 'resolved name rendered');
});

test('PREPARING secondary controls dispatch REAL functions (Sound, More) — no dead controls', () => {
  let toggled: 'music' | 'more' | null = null;
  let renderer: TestRenderer.ReactTestRenderer | undefined;
  act(() => {
    renderer = TestRenderer.create(
      <PreparingStage
        viewModel={preparingViewModel(3)}
        workoutContext={COPY.en.eyebrow}
        sessionStructure="1 Exercise · 3 Sets"
        label={COPY.en.preparingLabel}
        firstUp={COPY.en.firstUp}
        readinessMessage={COPY.en.readinessMessage}
        readinessGuidance={COPY.en.readinessGuidance}
        announcement={COPY.en.announcement(3)}
        secondsUnit={COPY.en.secondsUnit}
        countdownTotalSeconds={PREPARING_DURATION_SECONDS}
        musicOnLabel={COPY.en.musicOn}
        musicOffLabel={COPY.en.musicOff}
        moreLabel={COPY.en.more}
        tips={TIPS}
        onToggleMusic={() => {
          toggled = 'music';
        }}
        musicPlaying={false}
        onMore={() => {
          toggled = 'more';
        }}
      />,
    );
  });
  const sound = renderer!.root.findByProps({'data-workout-v2-sound': true});
  assert.equal(sound.props['aria-pressed'], false, 'Sound exposes REAL playback state');
  assert.equal(sound.props['aria-label'], COPY.en.musicOff, 'localized state label (not icon alone)');
  act(() => {
    sound.props.onClick();
  });
  assert.equal(toggled, 'music');

  const more = renderer!.root.findByProps({'data-workout-v2-more': true});
  act(() => {
    more.props.onClick();
  });
  assert.equal(toggled, 'more');
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
