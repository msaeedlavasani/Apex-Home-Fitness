'use client';

import React from 'react';
import {MoreHorizontal, Volume2, VolumeX} from 'lucide-react';
import type {SessionViewModel} from '@/lib/workout/sessionV2Contracts';
import type {ReadinessTip} from './readiness';

/**
 * PreparingStage — the PREPARING product state presentation (delta §17–§21,
 * PREPARING Dark references = visual + geometry authority).
 *
 * PREPARING IS NOT A LOADING SCREEN (§17): an Exercise Readiness state —
 * workout context (resolved counts) → PREPARE → First up → resolved
 * exercise name → real 5→1 countdown → readiness message → readiness
 * guidance card → functional secondary controls (Sound bottom-left, More
 * bottom-right per the frozen reference).
 *
 * Countdown (§19): orchestration-owned remaining seconds drive BOTH the
 * number and the dial arc (progress = remaining/total — real resolved data,
 * computed per render from authoritative state, never an animated
 * percentage, never a fake progress bar; the number itself is the primary
 * information and the arc adds the reference's at-a-glance shape). One
 * polite sr-only live region announces the localized sentence (§42: no
 * duplicate live regions). Reduced motion: no animation carries meaning —
 * the arc is recomputed per second, the number is text (spec §5.8).
 *
 * Guidance card (§21): canonical `.glass` surface recipe, data-driven tips
 * (equipment tip renders ONLY when the resolved prescription carries no
 * equipment concept — the canonical contract has no equipment field, so the
 * reference's "No equipment" chip is fixture evidence, not data; see
 * `readiness.ts`). No neon, no rings-with-glow, no UI blur — UI stays
 * sharp; the environment recedes via the shell's restrained veil (§21).
 *
 * Presentation-only: no timer, no sequencing — pause/resume/music/more all
 * dispatch real functions owned by the shell/orchestration (§23/§24).
 */

export interface PreparingStageProps {
  viewModel: SessionViewModel;
  /** Localized workout context line, e.g. "Today's Workout". */
  workoutContext: string;
  /** Localized session structure line from RESOLVED data, e.g. "1 Exercise · 3 Sets". */
  sessionStructure: string;
  /** Localized module kicker ("Prepare"). */
  label: string;
  /** Localized "First up". */
  firstUp: string;
  /** Localized readiness message, e.g. "Get ready to start". */
  readinessMessage: string;
  /** Localized readiness guidance, e.g. "Find your space and get into position.". */
  readinessGuidance: string;
  /** Localized live announcement, e.g. "Starting in {seconds} seconds". */
  announcement: string;
  /** Localized countdown unit ("SECONDS"). */
  secondsUnit: string;
  /** Total PREPARING duration (orchestration-owned; the arc denominator — real data, not magic). */
  countdownTotalSeconds: number;
  /** Localized music-on (currently audible) control label, e.g. "Mute workout music". */
  musicOnLabel: string;
  /** Localized music-off control label, e.g. "Play workout music". */
  musicOffLabel: string;
  /** Localized More label ("More"). */
  moreLabel: string;
  /** Data-driven readiness tips for the resolved exercise (may be empty). */
  tips: readonly ReadinessTip[];
  /** Toggles REAL music playback (controller-backed; never icon-only). */
  onToggleMusic: () => void;
  /** Whether music is ACTUALLY playing right now (real audio state). */
  musicPlaying: boolean;
  /** Opens the Exercise Details surface (real function, §34). */
  onMore: () => void;
}

const DIAL_RADIUS = 46;
const DIAL_CIRCUMFERENCE = 2 * Math.PI * DIAL_RADIUS;

export function PreparingStage({
  viewModel,
  workoutContext,
  sessionStructure,
  label,
  firstUp,
  readinessMessage,
  readinessGuidance,
  announcement,
  secondsUnit,
  countdownTotalSeconds,
  musicOnLabel,
  musicOffLabel,
  moreLabel,
  tips,
  onToggleMusic,
  musicPlaying,
  onMore,
}: PreparingStageProps) {
  const seconds = viewModel.preparingSecondsRemaining ?? 0;
  // Dial arc from AUTHORED state: remaining/total of the orchestration
  // countdown — real data per render, no animation, no fake progress (§19).
  const total = Math.max(1, countdownTotalSeconds);
  const remainingRatio = Math.min(1, Math.max(0, seconds) / total);
  const arc = DIAL_CIRCUMFERENCE * remainingRatio;

  return (
    <div data-workout-v2-preparing-stage="" className="flex h-full w-full flex-col">
      {/* Readiness column — workout context → PREPARE → exercise → countdown →
          message → guidance (§18 hierarchy). */}
      <div className="flex flex-1 flex-col items-center justify-center px-4 text-center sm:px-6">
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[color:var(--apex-text-secondary)] rtl:normal-case rtl:tracking-normal sm:text-sm">
          {workoutContext}
        </p>
        <p
          data-workout-v2-session-structure=""
          className="mt-1 text-xs text-[color:var(--apex-text-secondary)] rtl:tracking-normal sm:text-sm"
        >
          {sessionStructure}
        </p>

        <p
          data-workout-v2-preparing-label=""
          className="mt-6 text-sm font-bold uppercase tracking-[0.3em] text-apex-primary rtl:normal-case rtl:tracking-normal"
        >
          {label}
        </p>
        <p className="mt-2 text-xl text-[color:var(--apex-text-secondary)] sm:text-2xl">{firstUp}</p>
        <h2
          data-workout-v2-preparing-exercise=""
          className="mt-1 text-4xl font-extrabold text-[color:var(--apex-text)] sm:text-5xl"
        >
          {viewModel.activeExercise?.exercise.name ?? ''}
        </h2>

        {/* REAL countdown dial (§19): number = authoritative remaining seconds;
            arc = remaining/total computed per render (no animation). */}
        <div className="relative mt-6 inline-flex h-[132px] w-[132px] items-center justify-center sm:h-[152px] sm:w-[152px]">
          <svg
            className="absolute inset-0 -rotate-90"
            viewBox="0 0 132 132"
            role="img"
            aria-hidden="true"
            focusable="false"
          >
            <circle cx="66" cy="66" r={DIAL_RADIUS} fill="none" strokeWidth="6" className="stroke-[color:var(--apex-fill)]" />
            <circle
              data-workout-v2-countdown-arc=""
              cx="66"
              cy="66"
              r={DIAL_RADIUS}
              fill="none"
              strokeWidth="6"
              strokeLinecap="round"
              className="stroke-apex-primary transition-[stroke-dashoffset] duration-1000 ease-linear motion-reduce:transition-none"
              strokeDasharray={DIAL_CIRCUMFERENCE}
              strokeDashoffset={DIAL_CIRCUMFERENCE - arc}
            />
          </svg>
          <span
            data-workout-v2-countdown=""
            className="block text-6xl font-black leading-none tabular-nums text-[color:var(--apex-text)]"
          >
            <span key={seconds} className="animate-phase-enter">
              {seconds}
            </span>
          </span>
          <span className="absolute bottom-[18%] text-[10px] font-bold uppercase tracking-[0.25em] text-[color:var(--apex-text-secondary)] rtl:normal-case rtl:tracking-normal">
            {secondsUnit}
          </span>
        </div>
        {/* The single polite live region (§42). */}
        <p role="status" aria-live="polite" aria-atomic="true" className="sr-only">
          <span key={seconds}>{announcement}</span>
        </p>

        <p className="mt-6 text-2xl font-bold text-[color:var(--apex-text)] sm:text-3xl">{readinessMessage}</p>
        <p className="mt-1 max-w-sm text-sm text-[color:var(--apex-text-secondary)] sm:text-base">
          {readinessGuidance}
        </p>

        {/* Readiness guidance — canonical glass card, data-driven (§18/§21). */}
        {tips.length > 0 && (
          <div
            data-workout-v2-readiness-card=""
            className="glass mt-6 w-full max-w-sm rounded-2xl p-2 sm:max-w-2xl sm:p-3"
          >
            <ul className="flex flex-col sm:flex-row sm:items-stretch sm:divide-x sm:divide-[color:var(--apex-border)] rtl:sm:divide-x-reverse">
              {tips.map((tip) => (
                <li key={tip.title} className="flex flex-1 items-center gap-3 px-3 py-2 text-start">
                  <span
                    aria-hidden="true"
                    className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[color:var(--apex-fill)] text-[color:var(--apex-text)]"
                  >
                    <tip.Icon className="h-5 w-5" />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-sm font-bold text-[color:var(--apex-text)]">{tip.title}</span>
                    <span className="block text-xs text-[color:var(--apex-text-secondary)]">{tip.detail}</span>
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Secondary controls — Sound bottom-left, More bottom-right (frozen
          reference). Real functions only (§23/§24). */}
      <div className="flex w-full items-center justify-between px-4 pb-[max(1.25rem,calc(env(safe-area-inset-bottom)+0.75rem))] sm:px-10 sm:pb-6">
        <button
          type="button"
          data-workout-v2-sound={true}
          onClick={onToggleMusic}
          aria-label={musicPlaying ? musicOnLabel : musicOffLabel}
          aria-pressed={musicPlaying}
          className="inline-flex min-h-11 touch-manipulation flex-col items-center gap-1 rounded-2xl px-4 text-[color:var(--apex-text)] transition-opacity focus:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--apex-focus-ring)] active:opacity-80"
        >
          {musicPlaying ? (
            <Volume2 className="h-6 w-6" aria-hidden="true" />
          ) : (
            <VolumeX className="h-6 w-6" aria-hidden="true" />
          )}
          <span className="text-xs font-semibold">{musicPlaying ? musicOnLabel : musicOffLabel}</span>
        </button>
        <button
          type="button"
          data-workout-v2-more={true}
          onClick={onMore}
          aria-label={moreLabel}
          className="inline-flex min-h-11 touch-manipulation flex-col items-center gap-1 rounded-2xl px-4 text-[color:var(--apex-text)] transition-opacity focus:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--apex-focus-ring)] active:opacity-80"
        >
          <MoreHorizontal className="h-6 w-6" aria-hidden="true" />
          <span className="text-xs font-semibold">{moreLabel}</span>
        </button>
      </div>
    </div>
  );
}

export default PreparingStage;
