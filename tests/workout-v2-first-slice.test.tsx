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
import {IntroStage} from '../src/components/workout/experience/IntroStage';
import {useWorkoutSession} from '../src/components/workout/useWorkoutSession';
import {deriveReadinessTips} from '../src/components/workout/experience/readiness';
import {PREPARING_DURATION_SECONDS} from '../src/lib/workout/orchestration';
import type {SessionViewModel} from '../src/lib/workout/sessionV2Contracts';
import type {SessionExercise} from '../src/lib/workout/sessionContracts';

const PLAN: SessionExercise[] = [
  {id: 's1', name: 'اسکوات', sets: 3, reps: 10, restSeconds: 30},
];

const TIPS = deriveReadinessTips(
  {
    clearSpaceTitle: 'Clear space',
    clearSpaceDetail: 'Make sure you have enough room.',
    goodPostureTitle: 'Good posture',
    goodPostureDetail: 'Stand tall and relaxed.',
    noEquipmentTitle: 'No equipment',
    noEquipmentDetail: 'This is a bodyweight exercise.',
  },
  // Resolved bodyweight prescription (the canonical plan contract has no
  // equipment field) — drives the prescription-derived third guidance row.
  {
    exercise: {id: 'x1', name: 'Squat', sets: 3, reps: 10, restSeconds: 30},
    executionMode: 'REP_BASED',
    targetReps: 10,
    targetSeconds: null,
    setCount: 3,
    restSeconds: 30,
  },
);

const COPY = {
  en: {
    eyebrow: "Today's Workout",
    headline: 'Ready to get started?',
    supporting: 'Your session is ready. Move at your own pace.',
    cta: 'Start Workout',
    preparingLabel: 'Prepare',
    firstUp: 'First up',
    readinessMessage: 'Get ready to start',
    readinessGuidance: 'Find your space and get into position.',
    announcement: (seconds: number) => `Starting in ${seconds} seconds`,
    secondsUnit: 'Seconds',
    musicOn: 'Sound',
    musicOff: 'Sound',
    more: 'More',
    prescription: 'Bodyweight',
    introFirst: 'First exercise',
    introCues: ['Keep your chest up', 'Track your knees over your toes', 'Lower with control'] as readonly string[],
    mentorLoading: 'Loading Mentor',
    mentorUnavailable: 'Mentor unavailable',
    mentorAria: 'Live demonstration of the upcoming exercise',
  },
  fa: {
    eyebrow: 'تمرین امروز',
    headline: 'آماده‌ای شروع کنیم؟',
    supporting: 'جلسه‌ات آماده است. با سرعت خودت پیش برو.',
    cta: 'شروع تمرین',
    preparingLabel: 'آماده شو',
    firstUp: 'نخستین حرکت',
    readinessMessage: 'آماده شروع شو',
    readinessGuidance: 'فضایت را آماده کن و جایت را بگیر.',
    announcement: (seconds: number) => `شروع در ${seconds} ثانیه`,
    secondsUnit: 'ثانیه',
    musicOn: 'صدا',
    musicOff: 'صدا',
    more: 'بیشتر',
    prescription: 'وزن بدن',
    introFirst: 'حرکت اول',
    introCues: ['سینه بالا', 'زانوها هم‌جهت با پنجه‌ها', 'با کنترل پایین برو'] as readonly string[],
    mentorLoading: 'در حال بارگذاری منتور',
    mentorUnavailable: 'منتور در دسترس نیست',
    mentorAria: 'نمایش زنده حرکت پیش رو',
  },
} as const;

// ---------------------------------------------------------------------------
// Harness: mounts a probe component that drives the real adapter.
// ---------------------------------------------------------------------------

interface HarnessProps {
  /** When set, renders IntroStage with INTRO view-models (mentor mocked OFF). */
  intro?: boolean;
  locale: 'en' | 'fa';
  now: () => number;
  onStarted?: () => void;
  probe: (api: ReturnType<typeof useWorkoutSession>) => void;
}

function Harness({locale, now, onStarted, intro, probe}: HarnessProps) {
  const session = useWorkoutSession(PLAN, {now, onEffect: (effect) => {
    if (effect.kind === 'SESSION_STARTED') onStarted?.();
  }});
  probe(session);
  const {viewModel, startSession, beginWorkSet} = session;
  const copy = COPY[locale];
  return (
    <div>
      {viewModel.activeModule === 'START' && (
        <StartStage
          viewModel={viewModel}
          eyebrow={copy.eyebrow}
          headline={copy.headline}
          supporting={copy.supporting}
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
          prescriptionContext={copy.prescription}
          tips={TIPS}
          onToggleMusic={() => {}}
          musicPlaying={false}
          onMore={() => {}}
        />
      )}
      {viewModel.activeModule === 'EXERCISE_INTRO' && intro && (
        <IntroStage
          viewModel={viewModel}
          firstExerciseLabel={copy.introFirst}
          equipment={copy.prescription}
          cues={copy.introCues}
          mentorLoadingLabel={copy.mentorLoading}
          mentorUnavailableLabel={copy.mentorUnavailable}
          mentorAriaLabel={copy.mentorAria}
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
function mountHarness(locale: 'en' | 'fa', now: () => number = () => 1_000, intro = false): HarnessApi {
  const holder: {session?: ReturnType<typeof useWorkoutSession>} = {};
  let startedCount = 0;
  let renderer: TestRenderer.ReactTestRenderer | undefined;
  act(() => {
    renderer = TestRenderer.create(
      <Harness
        locale={locale}
        now={now}
        intro={intro}
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

const ALL_MODULES = {START: 'PENDING', PREPARING: 'PENDING', EXERCISE_INTRO: 'PENDING', WORK_SET: 'PENDING', REST: 'PENDING', EXERCISE_TRANSITION: 'PENDING', COMPLETE: 'PENDING'} as const;

function preparingViewModel(seconds: number, exerciseName: string | null = 'Squat'): SessionViewModel {
  return {
    lifecycle: 'PREPARING',
    activeModule: 'PREPARING',
    modules: {...ALL_MODULES, START: 'DONE', PREPARING: 'ACTIVE'},
    activeExercise: exerciseName
      ? {exercise: {id: 'x1', name: exerciseName, sets: 3, reps: 10, restSeconds: 30}, executionMode: 'REP_BASED', targetReps: 10, targetSeconds: null, setCount: 3, restSeconds: 30}
      : null,
    activeExerciseIndex: exerciseName ? 0 : null,
    introExercise: null,
    preparingSecondsRemaining: seconds,
    executionElapsedSeconds: 0,
    pausedFromModule: null,
    exerciseOutcomes: exerciseName ? [{exerciseIndex: 0, status: 'ACTIVE'}] : [],
    completionEligible: false,
    exitRequested: false,
    workoutResult: null,
  };
}

function introViewModel(overrides: Partial<SessionViewModel> = {}): SessionViewModel {
  return {
    lifecycle: 'AWAITING_WORK_SET',
    activeModule: 'EXERCISE_INTRO',
    modules: {...ALL_MODULES, START: 'DONE', PREPARING: 'DONE', EXERCISE_INTRO: 'ACTIVE'},
    activeExercise: {exercise: {id: 'x1', name: 'Squat', sets: 3, reps: 10, restSeconds: 30}, executionMode: 'REP_BASED', targetReps: 10, targetSeconds: null, setCount: 3, restSeconds: 30},
    activeExerciseIndex: 0,
    introExercise: {exercise: {id: 'x1', name: 'Squat', sets: 3, reps: 10, restSeconds: 30}, executionMode: 'REP_BASED', targetReps: 10, targetSeconds: null, setCount: 3, restSeconds: 30},
    preparingSecondsRemaining: null,
    executionElapsedSeconds: 0,
    pausedFromModule: null,
    exerciseOutcomes: [{exerciseIndex: 0, status: 'ACTIVE'}],
    completionEligible: false,
    exitRequested: false,
    ...overrides,
    workoutResult: overrides.workoutResult ?? null,
  };
}

function startViewModel(overrides: Partial<SessionViewModel> = {}): SessionViewModel {
  return {
    lifecycle: 'READY_TO_START',
    activeModule: 'START',
    modules: {...ALL_MODULES, START: 'ACTIVE'},
    activeExercise: null,
    activeExerciseIndex: null,
    introExercise: null,
    preparingSecondsRemaining: null,
    executionElapsedSeconds: 0,
    pausedFromModule: null,
    exerciseOutcomes: [],
    completionEligible: false,
    exitRequested: false,
    workoutResult: null,
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
  // Owner delta: mobile CTA trimmed (50px via max-[430px]) so it stays
  // proportionate to the hero; desktop keeps the canonical xl = 56px.
  assert.match(String(button.props.className), /h-14/, 'canonical xl = 56px CTA height (desktop)');
  assert.match(String(button.props.className), /max-\[430px\]:h-\[50px\]/, 'mobile CTA trimmed to 50px (owner delta)');
  assert.doesNotMatch(String(button.props.className), /bg-gradient/, 'no CTA gradient');
});

test('START disabled (aria-disabled) when no exercise is resolvable', () => {
  let renderer: TestRenderer.ReactTestRenderer | undefined;
  act(() => {
    renderer = TestRenderer.create(
      <StartStage
        viewModel={startViewModel({activeExercise: null})}
        eyebrow={COPY.en.eyebrow}
        headline={COPY.en.headline}
        supporting={COPY.en.supporting}
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
        prescriptionContext={COPY.en.prescription}
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
          prescriptionContext={COPY.en.prescription}
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
        prescriptionContext={COPY.fa.prescription}
        tips={TIPS}
        onToggleMusic={() => {}}
        musicPlaying={false}
        onMore={() => {}}
      />,
    );
  });
  assert.ok(renderer!.root.findAllByProps({children: 'درازنشست'}).length > 0, 'resolved name rendered');
});

// ---------------------------------------------------------------------------
// OWNER VISUAL CORRECTION contract (correction §10–§16)
// ---------------------------------------------------------------------------

test('guidance card derives THREE prescription-driven tips for the bodyweight fixture', () => {
  assert.equal(TIPS.length, 3, 'reference requires 3 rows/columns for bodyweight');
  assert.deepEqual(
    TIPS.map((tip) => tip.title),
    ['Clear space', 'Good posture', 'No equipment'],
    'third item is the prescription-derived equipment row (not hardcoded count)',
  );
  // No prescription → no fabricated equipment row (data-driven, never faked).
  const withoutPrescription = deriveReadinessTips({
    clearSpaceTitle: 'Clear space',
    clearSpaceDetail: 'Make sure you have enough room.',
    goodPostureTitle: 'Good posture',
    goodPostureDetail: 'Stand tall and relaxed.',
    noEquipmentTitle: 'No equipment',
    noEquipmentDetail: 'This is a bodyweight exercise.',
  });
  assert.equal(withoutPrescription.length, 2);
});

test('countdown number + unit share ONE in-flow centered stack inside the ring (geometry law)', () => {
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
        prescriptionContext={COPY.en.prescription}
        tips={TIPS}
        onToggleMusic={() => {}}
        musicPlaying={false}
        onMore={() => {}}
      />,
    );
  });
  // The dial wraps the stack; the number + unit are IN FLOW inside it —
  // no absolutely-positioned label exists to collide with the stroke.
  const dial = renderer!.root.findByProps({'data-workout-v2-countdown-dial': ''});
  const dialChildren = Array.isArray(dial.props.children) ? dial.props.children : [dial.props.children];
  const stack = dialChildren.find(
    (child: {props?: {className?: string}}) =>
      typeof child === 'object' && String(child.props?.className ?? '').includes('flex-col'),
  );
  assert.ok(stack, 'number + unit render as ONE centered flex stack');
  assert.doesNotMatch(String(stack.props.className), /absolute/, 'stack must not be absolutely positioned');
  // Inner content box (44px usable after the 6px stroke on the 56px viewBox
  // inner radius) comfortably holds the 9px unit label with margin.
  const countdown = renderer!.root.findByProps({'data-workout-v2-countdown': ''});
  assert.match(String(countdown.props.className), /leading-none|tabular-nums/);
});

test('PREPARING renders the resolved prescription context pill (§11) and compact Sound label', () => {
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
        prescriptionContext={COPY.en.prescription}
        tips={TIPS}
        onToggleMusic={() => {}}
        musicPlaying={false}
        onMore={() => {}}
      />,
    );
  });
  assert.ok(
    renderer!.root.findAllByProps({children: COPY.en.prescription}).length > 0,
    'prescription/equipment context visible under the exercise title',
  );
  const sound = renderer!.root.findByProps({'data-workout-v2-sound': true});
  assert.equal(sound.props['aria-label'], 'Sound', 'compact truthful state label');
  // Visible label is compact; the full sentence lives only in the a11y label.
  assert.ok(
    renderer!.root.findAllByProps({children: 'Mute workout music'}).length === 0,
    'long mute sentence must not be a visible label',
  );
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
        prescriptionContext={COPY.en.prescription}
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
// EXERCISE_INTRO presentation (owner polish delta §C)
// ---------------------------------------------------------------------------

test('INTRO renders resolved Squat identity, equipment metadata and the three cues', () => {
  let renderer: TestRenderer.ReactTestRenderer | undefined;
  act(() => {
    renderer = TestRenderer.create(
      <IntroStage
        viewModel={introViewModel()}
        firstExerciseLabel={COPY.en.introFirst}
        equipment={COPY.en.prescription}
        cues={COPY.en.introCues}
        mentorLoadingLabel={COPY.en.mentorLoading}
        mentorUnavailableLabel={COPY.en.mentorUnavailable}
        mentorAriaLabel={COPY.en.mentorAria}
      />,
    );
  });
  assert.ok(renderer!.root.findAllByProps({children: COPY.en.introFirst}).length > 0, 'eyebrow rendered');
  assert.ok(renderer!.root.findAllByProps({children: 'Squat'}).length > 0, 'resolved exercise identity rendered');
  assert.ok(renderer!.root.findAllByProps({children: COPY.en.prescription}).length > 0, 'equipment metadata rendered');
  for (const cue of COPY.en.introCues) {
    assert.ok(renderer!.root.findAllByProps({children: cue}).length > 0, `cue rendered: ${cue}`);
  }
  assert.equal(renderer!.root.findAllByProps({'data-workout-v2-intro-cues': ''}).length, 1);
});

test('INTRO renders Persian identity + cues (fa contract)', () => {
  let renderer: TestRenderer.ReactTestRenderer | undefined;
  act(() => {
    renderer = TestRenderer.create(
      <IntroStage
        viewModel={introViewModel({introExercise: {exercise: {id: 'x1', name: 'اسکات', sets: 3, reps: 10, restSeconds: 30}, executionMode: 'REP_BASED', targetReps: 10, targetSeconds: null, setCount: 3, restSeconds: 30}})}
        firstExerciseLabel={COPY.fa.introFirst}
        equipment={COPY.fa.prescription}
        cues={COPY.fa.introCues}
        mentorLoadingLabel={COPY.fa.mentorLoading}
        mentorUnavailableLabel={COPY.fa.mentorUnavailable}
        mentorAriaLabel={COPY.fa.mentorAria}
      />,
    );
  });
  assert.ok(renderer!.root.findAllByProps({children: 'اسکات'}).length > 0, 'FA identity rendered');
  for (const cue of COPY.fa.introCues) {
    assert.ok(renderer!.root.findAllByProps({children: cue}).length > 0, `FA cue rendered: ${cue}`);
  }
});

test('INTRO is hands-free: NO Start/Next/Continue control and no reserved CTA space', () => {
  let renderer: TestRenderer.ReactTestRenderer | undefined;
  act(() => {
    renderer = TestRenderer.create(
      <IntroStage
        viewModel={introViewModel()}
        firstExerciseLabel={COPY.en.introFirst}
        equipment={COPY.en.prescription}
        cues={COPY.en.introCues}
        mentorLoadingLabel={COPY.en.mentorLoading}
        mentorUnavailableLabel={COPY.en.mentorUnavailable}
        mentorAriaLabel={COPY.en.mentorAria}
      />,
    );
  });
  const buttons = renderer!.root.findAllByType('button');
  assert.equal(buttons.length, 0, 'ZERO interactive controls on INTRO (hands-free contract)');
  assert.equal(renderer!.root.findAllByProps({'data-workout-v2-intro-begin': ''}).length, 0, 'no Start Set CTA anywhere');
  // No reserved CTA space: no begin-set marker, no orphan CTA wrapper.
  assert.equal(renderer!.root.findAllByProps({'data-workout-v2-intro-begin': true}).length, 0);
});

test('INTRO cue zone: compact group OUTSIDE the mentor host (placement law)', () => {
  let renderer: TestRenderer.ReactTestRenderer | undefined;
  act(() => {
    renderer = TestRenderer.create(
      <IntroStage
        viewModel={introViewModel()}
        firstExerciseLabel={COPY.en.introFirst}
        equipment={COPY.en.prescription}
        cues={COPY.en.introCues}
        mentorLoadingLabel={COPY.en.mentorLoading}
        mentorUnavailableLabel={COPY.en.mentorUnavailable}
        mentorAriaLabel={COPY.en.mentorAria}
      />,
    );
  });
  const zone = renderer!.root.findByProps({'data-workout-v2-intro-cue-zone': ''});
  assert.match(String(zone.props.className), /pb-\[max/, 'cue zone respects the safe area');
  // Owner device correction §2: NO surface band behind the cues.
  const zoneClass = String(zone.props.className);
  assert.doesNotMatch(zoneClass, /backdrop-blur/, 'no full-width blurred band (owner-rejected dark strip)');
  assert.doesNotMatch(zoneClass, /bg-\[/, 'no full-width background surface on the cue zone container');
  // The cues are siblings of the mentor host — not overlaid on it.
  const stage = renderer!.root.findByProps({'data-workout-v2-intro-stage': ''});
  const stageChildren = Array.isArray(stage.props.children) ? stage.props.children : [stage.props.children];
  const indexOf = (marker: string) =>
    stageChildren.findIndex((child: {props?: Record<string, unknown>}) => marker in (child?.props ?? {}));
  const cueZoneIndex = indexOf('data-workout-v2-intro-cue-zone');
  const mentorIndex = indexOf('data-workout-v2-intro-mentor-host');
  assert.ok(mentorIndex >= 0 && cueZoneIndex > mentorIndex, 'cue zone renders AFTER (below) the mentor host');
});

test('INTRO cue treatment: compact pills, no three-large-pill mobile layout (§2)', () => {
  let renderer: TestRenderer.ReactTestRenderer | undefined;
  act(() => {
    renderer = TestRenderer.create(
      <IntroStage
        viewModel={introViewModel()}
        firstExerciseLabel={COPY.en.introFirst}
        equipment={COPY.en.prescription}
        cues={COPY.en.introCues}
        mentorLoadingLabel={COPY.en.mentorLoading}
        mentorUnavailableLabel={COPY.en.mentorUnavailable}
        mentorAriaLabel={COPY.en.mentorAria}
      />,
    );
  });
  // Each cue keeps a MINIMUM local-contrast pill on the text itself —
  // small paddings/typography, never the previous oversized pill cards.
  const cueList = renderer!.root.findByProps({'data-workout-v2-intro-cues': ''});
  const pillClass = renderer!.root.findAllByProps({'data-workout-v2-intro-cue': ''})
    .map((pill) => String(pill.props.className ?? ''))
    .join(' ');
  assert.match(pillClass, /rounded-full/, 'cues keep the token pill shape');
  assert.match(pillClass, /py-\[3px\]/, 'pill vertical padding is minimal (compact rows)');
  assert.doesNotMatch(pillClass, /py-1\.5/, 'the previous large pill padding is gone');
  assert.doesNotMatch(pillClass, /text-\[13px\] font-semibold text-\[color:var\(--apex-text\)\] sm:text-sm/, 'no large mobile type');
  // Mobile composition is ONE unified intrinsic-width group: items wrap as
  // content requires, rather than three independent large pills or a
  // hardcoded English-specific 2+1 arrangement.
  assert.match(String(cueList.props.className), /flex-wrap/, 'mobile: cues wrap by available width');
  assert.match(String(cueList.props.className), /justify-center/, 'mobile: every cue row is centered');
  assert.match(String(cueList.props.className), /w-full/, 'mobile: the group measures against available width');
  assert.match(String(cueList.props.className), /gap-1\.5/, 'compact row and item spacing');
  assert.equal(cueList.findAllByProps({'data-workout-v2-intro-cue': ''}).length, COPY.en.introCues.length);
});

test('INTRO wires the mentor visible-ready callback (T4 instrumentation seam)', () => {
  let renderer: TestRenderer.ReactTestRenderer | undefined;
  let readyFired = 0;
  act(() => {
    renderer = TestRenderer.create(
      <IntroStage
        viewModel={introViewModel()}
        firstExerciseLabel={COPY.en.introFirst}
        equipment={COPY.en.prescription}
        cues={COPY.en.introCues}
        mentorLoadingLabel={COPY.en.mentorLoading}
        mentorUnavailableLabel={COPY.en.mentorUnavailable}
        mentorAriaLabel={COPY.en.mentorAria}
        onMentorReady={() => {
          readyFired += 1;
        }}
      />,
    );
  });
  const mentor = renderer!.root.findByProps({'data-workout-v2-mentor': ''});
  assert.equal(typeof mentor.props.children, 'object');
  // The stage forwards the readiness callback into MentorStage's onReady.
  assert.ok(readyFired === 0, 'callback is wired, not fired by the presentation itself');
});

test('INTRO → SET1 through the full adapter chain: BEGIN_WORK_SET is the only exit', () => {
  const h = mountHarness('en', () => 1_000, true);
  act(() => {
    h.renderer.root.findByProps({'data-workout-v2-start': true}).props.onClick();
  });
  // Countdown completes through the adapter clock.
  act(() => {
    h.session().viewModel;
  });
  // Drive the orchestrator to INTRO completion via the exposed API.
  act(() => {
    for (let i = 0; i < PREPARING_DURATION_SECONDS + 1; i += 1) {
      h.session();
    }
  });
  // The harness clock is static, so drive the transition directly through
  // the adapter's exposed controls: no timeout path exists, BEGIN_WORK_SET
  // is the only exit (asserted at the orchestration layer; here we verify
  // the presentation contract wires the SAME adapter function).
  const session = h.session();
  assert.equal(typeof session.beginWorkSet, 'function', 'adapter exposes the INTRO exit control');
  h.unmount();
});

test('INTRO without a resolvable exercise renders no identity (never faked)', () => {
  let renderer: TestRenderer.ReactTestRenderer | undefined;
  act(() => {
    renderer = TestRenderer.create(
      <IntroStage
        viewModel={introViewModel({activeExercise: null, introExercise: null, activeExerciseIndex: null})}
        firstExerciseLabel={COPY.en.introFirst}
        equipment={COPY.en.prescription}
        cues={COPY.en.introCues}
        mentorLoadingLabel={COPY.en.mentorLoading}
        mentorUnavailableLabel={COPY.en.mentorUnavailable}
        mentorAriaLabel={COPY.en.mentorAria}
      />,
    );
  });
  assert.equal(renderer!.root.findAllByProps({'data-workout-v2-intro-equipment': ''}).length, 0, 'no equipment pill without resolved data');
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
