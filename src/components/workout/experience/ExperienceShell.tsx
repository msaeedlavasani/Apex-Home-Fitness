'use client';

import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {cn} from '@/lib/cn';
import {useTranslations} from 'next-intl';
import {BrandIcon} from '@/components/layout/BrandIcon';
import {useTheme} from '@/components/providers/ThemeProvider';
import {useWorkoutSession} from '@/components/workout/useWorkoutSession';
import {PREPARING_DURATION_SECONDS} from '@/lib/workout/orchestration';
import type {SessionExercise} from '@/lib/workout/sessionContracts';
import {
  deriveExerciseDetails,
  exerciseDetailFields,
} from '@/lib/workout/experience/exerciseDetails';import {createWorkoutMusic,
  type WorkoutMusicController,
} from '@/lib/workout/experience/sessionMusic';
import {
  disposeMentorPreparation,
  prepareMentorAsset,
} from './mentor/mentorPreparation';
import {deriveReadinessTips} from './readiness';
import {BackstageBackdrop} from './BackstageBackdrop';
import {ExerciseDetailsSheet} from './ExerciseDetailsSheet';
import {StartStage} from './StartStage';
import {PreparingStage} from './PreparingStage';
import {IntroStage} from './IntroStage';
import {WorkSetStage} from './WorkSetStage';
import {
  WorkoutV2ExitControl,
  WorkoutV2LanguageControl,
  WorkoutV2ThemeControl,
} from './ShellControls';

/**
 * ExperienceShell (WP-04) — the full-surface V2 experience shell,
 * conformed to the OWNER VISUAL CORRECTION (WORKOUT-V2-IMPL-01: the four
 * Start/Preparing Dark references are the geometry authority).
 *
 * TOP SHELL (correction §5): [Brand] …… [Language] | [Theme] | [Exit] —
 * three compact 44px circular controls of one design family in the trailing
 * corner (visually secondary, never dominant; no giant navigation capsule).
 * Direction mirrors logically under RTL. The controls are the two-state
 * owner overrides (§4.1 Language FA⇄EN single-tap, §4.2 Theme Dark⇄Light,
 * SYSTEM never offered on this surface) and the restored Exit (§4.3) with
 * REAL navigation semantics through the existing product routing — see
 * `ShellControls.tsx`.
 *
 * COMPOSITION LAW (§9): 100vw/100dvh surface, safe areas, mobile gutter 16px
 * / sm+ 24px, ONE central composition axis — the shell centers content, so
 * hero and CTA resolve to the viewport center; asymmetric Backstage objects
 * never shift UI. The top bar and the details sheet are overlays, not
 * primary layout.
 *
 * OWNERSHIP (plan §3/§11): this shell is a CONSUMER of the orchestration
 * view-model. It dispatches start/pause/resume through the adapter and
 * renders stage components — it NEVER sequences. PREPARING presentation is
 * fully text-rendered (non-animation-only, spec §5.8).
 *
 * MUSIC (§28–§33): the session-layer music controller is created ONCE per
 * session (lazy, ref-stable) and survives countdown ticks, theme switches,
 * stage transitions and More open/close. Playback starts only through the
 * Start Workout user gesture (autoplay policy respected, §30); rejections
 * are handled and never reported as playing.
 *
 * MORE (§34–§40): opens the real Exercise Details surface. Opening reuses
 * the EXISTING pause authority so the PREPARING countdown cannot finish
 * silently while the user reads (§39); closing resumes the preserved
 * remaining time — no reset, no second timer.
 *
 * THEME (§8 + correction §17): Dark/Light differ ONLY via canonical tokens
 * + the purpose-built Backstage asset + the environment-focus treatment —
 * never geometry (THEME_VARIANT = TRANSFORMATION, NOT REGENERATION).
 *
 * PREPARING depth (correction §14): a mild veil recedes the environment so
 * the foreground UI becomes primary — no blur, no modal backdrop, UI stays
 * sharp. Reduced motion: the veil is an opacity transition carrying no
 * information; stage swaps use the CSS-gated `animate-phase-enter`.
 *
 * SHELL CONTROL CONTRAST (owner polish delta §B): the compact shell controls
 * are a low-contrast overlay over the bright Backstage on DESKTOP LIGHT —
 * the brand wordmark and `CONTROL_BASE` surface/border tokens are too faint
 * there. The shared shell therefore carries a `data-workout-theme` attribute
 * and two DESKTOP-ONLY scrim utilities (a localized top veil + a strengthened
 * control surface token) that activate only on `sm:`+ screens in the LIGHT
 * theme: geometry, radii, touch targets and positions are untouched, Mobile
 * Light and Dark themes are unaffected, and START/PREPARING/INTRO share ONE
 * treatment (never state-specific copies).
 */

export interface ExperienceShellProps {
  /** The workout plan for this session (prescription-resolved inside the adapter). */
  exercises: readonly SessionExercise[];
  /** Localized workout name for the START hero (route-adapter supplied). */
  sessionTitle?: string;
  /** Fired when START commits (after the orchestration transition succeeds). */
  onSessionStarted?: () => void;
  /** Extra classes on the shell surface. */
  className?: string;
}

export function ExperienceShell({
  exercises,
  sessionTitle,
  onSessionStarted,
  className,
}: ExperienceShellProps) {
  const t = useTranslations('WorkoutV2');
  const {resolvedTheme} = useTheme();
  const theme = resolvedTheme === 'dark' ? 'dark' : 'light';

  const {viewModel, startSession, pause, resume} = useWorkoutSession(exercises, {
    onEffect: useMemo(() => {
      const handler = (effect: {kind: string}) => {
        if (effect.kind === 'SESSION_STARTED') onSessionStarted?.();
      };
      return handler;
    }, [onSessionStarted]),
  });

  // Resolved session facts for the PREPARING context block (§18: displayed
  // counts represent ACTUAL resolved data — derived from the same plan the
  // adapter resolves, never a hardcoded fixture).
  const sessionFacts = useMemo(() => {
    const setCount = exercises.reduce((sum, exercise) => sum + Math.max(1, Math.floor(exercise.sets ?? 1)), 0);
    return {exercises: exercises.length, sets: setCount};
  }, [exercises]);

  // Prescription context for the restored pill (correction §11): derived
  // from the RESOLVED exercise — the canonical plan contract carries no
  // equipment field, so a resolved exercise IS bodyweight by data. The
  // localized label comes from the message layer; the CONDITION is real
  // resolved data. Omitted (never faked) when no exercise is resolved.
  const prescriptionContext = useMemo(() => {
    if (!viewModel.activeExercise) return null;
    return t('preparing.bodyweight');
  }, [viewModel.activeExercise, t]);

  // Readiness guidance — two generic tips + the prescription-derived third
  // row (correction §13: THREE items for the bodyweight fixture, driven by
  // the resolved prescription, never a hardcoded count).
  const tips = useMemo(
    () =>
      deriveReadinessTips(
        {
          clearSpaceTitle: t('readiness.clearSpaceTitle'),
          clearSpaceDetail: t('readiness.clearSpaceDetail'),
          goodPostureTitle: t('readiness.goodPostureTitle'),
          goodPostureDetail: t('readiness.goodPostureDetail'),
          noEquipmentTitle: t('readiness.noEquipmentTitle'),
          noEquipmentDetail: t('readiness.noEquipmentDetail'),
        },
        viewModel.activeExercise,
      ),
    [t, viewModel.activeExercise],
  );

  // ---- Music (session-owned, single instance, §28–§33) -------------------
  const musicRef = useRef<WorkoutMusicController | null>(null);
  const [musicPlaying, setMusicPlaying] = useState(false);
  const getMusic = useCallback((): WorkoutMusicController => {
    if (!musicRef.current) musicRef.current = createWorkoutMusic();
    return musicRef.current;
  }, []);
  useEffect(() => {
    // Session teardown only — release the single audio instance.
    return () => {
      musicRef.current?.dispose();
      musicRef.current = null;
    };
  }, []);

  // Mentor PREPARE ONCE → REUSE (mentorPreparation.ts): PREPARING is the
  // preparation window — start the single fetch/parse of the canonical
  // Mentor GLB as soon as the countdown begins (fire-and-forget: the
  // PREPARING UI/countdown is never blocked). INTRO's stage later ACQUIRES
  // the same in-flight/settled preparation (no second request, no reparse).
  // Resources are released at session teardown if INTRO never consumed them.
  const mentorPreloadStartedRef = useRef(false);
  useEffect(() => {
    if (viewModel.lifecycle === 'PREPARING' && !mentorPreloadStartedRef.current) {
      mentorPreloadStartedRef.current = true;
      void prepareMentorAsset().catch(() => undefined);
    }
  }, [viewModel.lifecycle]);
  useEffect(() => {
    return () => disposeMentorPreparation();
  }, []);

  const handleStart = useCallback(() => {
    // START dispatch (§25) — the session's first, gesture-backed user
    // interaction: the approved playback unlock for the music controller.
    startSession();
    // §30: the Start Workout gesture is the valid playback interaction.
    void getMusic()
      .play()
      .then((state) => setMusicPlaying(state === 'PLAYING'))
      .catch(() => setMusicPlaying(false));
  }, [startSession, getMusic]);

  const handleToggleMusic = useCallback(() => {
    const music = getMusic();
    const next = music.getState() === 'PLAYING' ? music.mute() : music.unmute();
    void next.then((state) => setMusicPlaying(state === 'PLAYING'));
  }, [getMusic]);

  // ---- More → Exercise Details (§34–§40) ---------------------------------
  const [detailsOpen, setDetailsOpen] = useState(false);
  const detailsOpenRef = useRef(false);
  const detailsPausedRef = useRef(false);
  const lifecycleRef = useRef(viewModel.lifecycle);
  lifecycleRef.current = viewModel.lifecycle;
  const shellRef = useRef<HTMLElement>(null);

  const openDetails = useCallback(() => {
    if (detailsOpenRef.current) return;
    detailsOpenRef.current = true;
    setDetailsOpen(true);
    // §39: reuse the EXISTING pause authority — countdown may not finish
    // silently while details are read. Only pause what we will resume.
    if (lifecycleRef.current === 'PREPARING') {
      detailsPausedRef.current = true;
      pause();
    }
  }, [pause]);

  const closeDetails = useCallback(() => {
    if (!detailsOpenRef.current) return;
    detailsOpenRef.current = false;
    setDetailsOpen(false);
    if (detailsPausedRef.current) {
      detailsPausedRef.current = false;
      resume(); // authority no-ops unless PAUSED; remaining time preserved
    }
    // §38: focus returns to the triggering control after close.
    requestAnimationFrame(() => {
      shellRef.current?.querySelector<HTMLButtonElement>('[data-workout-v2-more]')?.focus();
    });
  }, [resume]);

  const activeModule = viewModel.activeModule;
  const motionClass = 'animate-phase-enter'; // CSS gates it under reduced motion.
  const stageKey = `${viewModel.lifecycle}-${activeModule ?? 'none'}`;
  const preparing = activeModule === 'PREPARING';

  // PREPARING depth treatment (correction §14): a MILD veil recedes the
  // environment — the UI stays sharp, no blur, no modal surface. This is
  // the START↔PREPARING focus delta the references show.
  const veilStyle = useMemo(
    () =>
      theme === 'dark'
        ? {background: 'rgb(0 0 0 / 0.38)'}
        : {background: 'rgb(255 255 255 / 0.2)'},
    [theme],
  );

  const detailsModel = useMemo(
    () => (viewModel.activeExercise ? deriveExerciseDetails(viewModel.activeExercise) : null),
    [viewModel.activeExercise],
  );

  return (
    <section
      ref={shellRef}
      data-workout-v2-shell=""
      aria-label={t('shellLabel')}
      className={cn(
        'relative isolate flex h-[100dvh] w-full flex-col overflow-hidden bg-[color:var(--app-background)]',
        className,
      )}
    >
      <BackstageBackdrop theme={theme} />
      {/* PREPARING depth veil (correction §14) — environment recedes mildly,
          UI stays sharp. No blur anywhere; nothing informational moves. */}
      <div
        aria-hidden="true"
        style={veilStyle}
        className={cn(
          'pointer-events-none absolute inset-0 z-[5] transition-opacity duration-500',
          preparing ? 'opacity-100' : 'opacity-0',
        )}
      />

      {/* TOP SHELL (correction §5): [Brand] …… [Language] | [Theme] | [Exit] —
          compact corner controls, one design family, no dominating capsule.
          RTL mirrors naturally through flexbox row direction.
          `data-workout-theme` scopes the desktop-light scrim CSS (delta §B):
          a sm:-only top veil restores text/icon contrast on the bright
          Backstage; geometry/touch targets are untouched. */}
      <header
        data-workout-theme={theme}
        className="absolute inset-x-0 top-0 z-20 flex items-center justify-between gap-3 px-4 pt-[max(0.75rem,env(safe-area-inset-top))] sm:px-6"
      >
        <BrandIcon size="h-9 w-9" iconClass="h-5 w-5" wordmark />
        <div
          data-workout-v2-top-controls=""
          className="flex items-center gap-2"
        >
          <WorkoutV2LanguageControl />
          <span aria-hidden="true" className="h-6 w-px bg-[color:var(--apex-border)]" />
          <WorkoutV2ThemeControl />
          <span aria-hidden="true" className="h-6 w-px bg-[color:var(--apex-border)]" />
          <WorkoutV2ExitControl />
        </div>
      </header>

      {/* STAGE — consumer of the orchestration view-model; central axis. */}
      <div
        key={stageKey}
        className={cn(
          'relative z-10 flex min-h-0 flex-1 flex-col pt-[max(4.5rem,calc(env(safe-area-inset-top)+4rem))]',
          motionClass,
        )}
      >
        {activeModule === 'START' && (
          <StartStage
            viewModel={viewModel}
            eyebrow={t('start.eyebrow')}
            headline={t('start.headline')}
            supporting={t('start.supporting')}
            ctaLabel={t('start.cta')}
            onStart={handleStart}
          />
        )}
        {preparing && (
          <PreparingStage
            viewModel={viewModel}
            workoutContext={t('preparing.workoutContext')}
            sessionStructure={t('preparing.sessionStructure', sessionFacts)}
            label={t('preparing.label')}
            firstUp={t('preparing.firstUp')}
            readinessMessage={t('preparing.readinessMessage')}
            readinessGuidance={t('preparing.readinessGuidance')}
            announcement={t('preparing.announcement', {seconds: viewModel.preparingSecondsRemaining ?? 0})}
            secondsUnit={t('preparing.secondsUnit')}
            countdownTotalSeconds={PREPARING_DURATION_SECONDS}
            musicOnLabel={t('actions.musicOnShort')}
            musicOffLabel={t('actions.musicOffShort')}
            moreLabel={t('actions.more')}
            prescriptionContext={prescriptionContext}
            tips={tips}
            onToggleMusic={handleToggleMusic}
            musicPlaying={musicPlaying}
            onMore={openDetails}
          />
        )}
        {activeModule === 'EXERCISE_INTRO' && (
          <IntroStage
            viewModel={viewModel}
            firstExerciseLabel={t('intro.firstExercise')}
            equipment={t('preparing.bodyweight')}
            cues={t.raw('intro.cues') as readonly string[]}
            mentorUnavailableLabel={t('intro.mentorUnavailable')}
            mentorLoadingLabel={t('intro.mentorLoading')}
            mentorAriaLabel={t('intro.mentorAria')}
          />
        )}
        {activeModule === 'WORK_SET' && <WorkSetStage viewModel={viewModel} />}
        {activeModule === null && (
          <div role="status" className="flex flex-1 items-center justify-center px-4 text-center">
            <p className="text-sm text-[color:var(--apex-text-secondary)]">{t('sessionLive')}</p>
          </div>
        )}
      </div>

      {/* MORE → Exercise Details (§34–§40): real surface, real data. */}
      {detailsOpen && detailsModel != null && (
        <ExerciseDetailsSheet
          title={t('exerciseDetails.title')}
          closeLabel={t('exerciseDetails.close')}
          fields={exerciseDetailFields(detailsModel).map((field) => ({
            label: t(`exerciseDetails.fields.${field.key}`),
            value:
              field.key === 'mode' && detailsModel.mode != null
                ? t(`exerciseDetails.mode.${detailsModel.mode}`)
                : field.value,
          }))}
          onClose={closeDetails}
        />
      )}
    </section>
  );
}

export default ExperienceShell;
