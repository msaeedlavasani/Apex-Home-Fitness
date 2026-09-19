'use client';

import React from 'react';
import {MoreHorizontal, Volume2, VolumeX} from 'lucide-react';
import type {SessionViewModel} from '@/lib/workout/sessionV2Contracts';
import type {ReadinessTip} from './readiness';

/**
 * PreparingStage — the PREPARING product state presentation (PREPARING Dark
 * Mobile + Desktop references = geometry authority; WORKOUT-V2-IMPL-01
 * OWNER VISUAL CORRECTION §9–§16).
 *
 * OWNER CORRECTIONS vs the previous slice:
 *   - Exercise title: responsive + width-constrained (max-w, controlled
 *     line-height) so long real names ("Push-Up Progression") wrap and fit
 *     without dominating the screen (§10).
 *   - Prescription/equipment pill RESTORED under the title (§11): rendered
 *     from the RESOLVED prescription context supplied by the shell — real
 *     data, never a hardcoded BODYWEIGHT.
 *   - Countdown geometry fixed (§12): the number and the unit live in ONE
 *     in-flow centered flex stack inside the SVG ring — no absolutely
 *     positioned label that can collide with or escape the stroke. Both
 *     bounding boxes are inside the inner ring by construction.
 *   - Guidance card: THREE data-driven rows (mobile, stacked) / columns
 *     (desktop, `sm:flex-row` with separators) from `deriveReadinessTips`
 *     — content never deleted to fit (§13).
 *   - Sound/More: compact single-line controls (icon + short label inline)
 *     per the reference bottom hierarchy (§16) — real functions unchanged.
 *
 * Countdown remains REAL: orchestration-owned remaining seconds drive the
 * number AND the dial arc (remaining/total computed per render — no fake
 * progress, no second timer). One polite sr-only live region. Reduced
 * motion: `motion-reduce:transition-none` on the arc; the number is text.
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
  /** Localized prescription/equipment context for the resolved exercise (e.g. "BODYWEIGHT"). */
  prescriptionContext: string | null;
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
const DIAL_STROKE = 6;
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
  prescriptionContext,
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
      {/* Readiness column — workout context → PREPARE → First up → exercise →
          prescription pill → countdown → message → guidance (§9 hierarchy,
          reference order, nothing removed for fit). */}
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
          className="mt-4 text-sm font-bold uppercase tracking-[0.3em] text-apex-primary rtl:normal-case rtl:tracking-normal sm:mt-5"
        >
          {label}
        </p>
        <p className="mt-1.5 text-lg text-[color:var(--apex-text-secondary)] sm:text-2xl">{firstUp}</p>
        {/* Exercise title — width-constrained + responsive so long real names
            wrap instead of dominating the screen (correction §10). */}
        <h2
          data-workout-v2-preparing-exercise=""
          className="mt-0.5 max-w-[12ch] text-3xl font-extrabold leading-[1.12] text-[color:var(--apex-text)] sm:max-w-xl sm:text-5xl sm:leading-tight"
        >
          {viewModel.activeExercise?.exercise.name ?? ''}
        </h2>

        {/* Prescription/equipment context pill — RESTORED (correction §11):
            rendered ONLY from the resolved prescription context the shell
            supplies; omitted (never faked) when the data is absent. */}
        {prescriptionContext != null && (
          <p
            data-workout-v2-prescription-pill=""
            className="mt-2 rounded-full border border-apex-primary/60 px-4 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-apex-primary rtl:normal-case rtl:tracking-normal sm:text-xs"
          >
            {prescriptionContext}
          </p>
        )}

        {/* REAL countdown dial (§19 + geometry correction §12): the number
            and unit are ONE centered in-flow flex stack inside the ring —
            both stay inside the inner circle by construction (no absolute
            positioning, no collision, no escape below the stroke). */}
        <div
          data-workout-v2-countdown-dial=""
          className="relative mt-4 inline-flex h-[112px] w-[112px] items-center justify-center sm:mt-6 sm:h-[132px] sm:w-[132px]"
        >
          <svg
            className="absolute inset-0 -rotate-90"
            viewBox="0 0 112 112"
            role="img"
            aria-hidden="true"
            focusable="false"
          >
            <circle cx="56" cy="56" r={DIAL_RADIUS} fill="none" strokeWidth={DIAL_STROKE} className="stroke-[color:var(--apex-fill)]" />
            <circle
              data-workout-v2-countdown-arc=""
              cx="56"
              cy="56"
              r={DIAL_RADIUS}
              fill="none"
              strokeWidth={DIAL_STROKE}
              strokeLinecap="round"
              className="stroke-apex-primary transition-[stroke-dashoffset] duration-1000 ease-linear motion-reduce:transition-none"
              strokeDasharray={DIAL_CIRCUMFERENCE}
              strokeDashoffset={DIAL_CIRCUMFERENCE - arc}
            />
          </svg>
          {/* Inner stack: viewBox inner radius is 46 − 3 (half stroke) = 43,
              so the usable inner box is ~60px (mobile) / ~72px (sm+ after
              scale) — the number + unit fit inside it with margin. */}
          <span className="flex flex-col items-center justify-center leading-none">
            <span
              data-workout-v2-countdown=""
              className="block text-4xl font-black tabular-nums text-[color:var(--apex-text)] sm:text-5xl"
            >
              <span key={seconds} className="animate-phase-enter">
                {seconds}
              </span>
            </span>
            {/* No truncate cap: a CSS width cap was clipping "SECONDS" to
                "SECON…" on desktop (countdown geometry §12). Measured bbox:
                unit corners ≈46px < inner radius ≈50.7px (sm) / 39.7 < 43
                (base) — fully inside the inner circle, nowrap prevents wrap. */}
            <span className="mt-1 block whitespace-nowrap text-[9px] font-bold uppercase tracking-[0.2em] text-[color:var(--apex-text-secondary)] rtl:normal-case rtl:tracking-normal sm:text-[10px]">
              {secondsUnit}
            </span>
          </span>
        </div>
        {/* The single polite live region (§42). */}
        <p role="status" aria-live="polite" aria-atomic="true" className="sr-only">
          <span key={seconds}>{announcement}</span>
        </p>

        <p className="mt-4 text-xl font-bold text-[color:var(--apex-text)] sm:mt-6 sm:text-3xl">{readinessMessage}</p>
        <p className="mt-1 max-w-xs text-sm text-[color:var(--apex-text-secondary)] sm:max-w-md sm:text-base">
          {readinessGuidance}
        </p>

        {/* Readiness guidance — ONE data-driven glass surface: stacked rows
            on mobile, three balanced columns on sm+ (correction §13). */}
        {tips.length > 0 && (
          <div
            data-workout-v2-readiness-card=""
            className="glass mt-4 w-full max-w-sm rounded-2xl p-2 sm:mt-6 sm:max-w-2xl sm:p-3"
          >
            <ul className="flex flex-col sm:flex-row sm:items-stretch sm:divide-x sm:divide-[color:var(--apex-border)] rtl:sm:divide-x-reverse">
              {tips.map((tip) => (
                <li
                  key={tip.title}
                  data-workout-v2-readiness-item=""
                  className="flex flex-1 items-center gap-3 px-3 py-2 text-start sm:min-w-0"
                >
                  <span
                    aria-hidden="true"
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[color:var(--apex-fill)] text-[color:var(--apex-text)] sm:h-11 sm:w-11"
                  >
                    <tip.Icon className="h-4 w-4 sm:h-5 sm:w-5" />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-sm font-bold text-[color:var(--apex-text)]">{tip.title}</span>
                    <span className="block text-xs leading-snug text-[color:var(--apex-text-secondary)]">{tip.detail}</span>
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Secondary controls — Sound bottom-left, More bottom-right, compact
          single-line family (correction §16). Real functions only. */}
      <div className="flex w-full items-center justify-between px-4 pb-[max(1rem,calc(env(safe-area-inset-bottom)+0.5rem))] sm:px-10 sm:pb-6">
        <button
          type="button"
          data-workout-v2-sound={true}
          onClick={onToggleMusic}
          aria-label={musicPlaying ? musicOnLabel : musicOffLabel}
          aria-pressed={musicPlaying}
          className="inline-flex min-h-11 touch-manipulation items-center gap-2 rounded-full px-3 text-[color:var(--apex-text)] transition-opacity focus:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--apex-focus-ring)] active:opacity-80"
        >
          {musicPlaying ? (
            <Volume2 className="h-5 w-5" aria-hidden="true" />
          ) : (
            <VolumeX className="h-5 w-5" aria-hidden="true" />
          )}
          <span className="text-sm font-semibold">{musicPlaying ? musicOnLabel : musicOffLabel}</span>
        </button>
        <button
          type="button"
          data-workout-v2-more={true}
          onClick={onMore}
          aria-label={moreLabel}
          className="inline-flex min-h-11 touch-manipulation items-center gap-2 rounded-full px-3 text-[color:var(--apex-text)] transition-opacity focus:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--apex-focus-ring)] active:opacity-80"
        >
          <MoreHorizontal className="h-5 w-5" aria-hidden="true" />
          <span className="text-sm font-semibold">{moreLabel}</span>
        </button>
      </div>
    </div>
  );
}

export default PreparingStage;
