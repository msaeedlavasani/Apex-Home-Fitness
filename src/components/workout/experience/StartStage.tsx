'use client';

import React from 'react';
import {Button} from '@/components/ui/platform';
import type {SessionViewModel} from '@/lib/workout/sessionV2Contracts';

/**
 * StartStage — the START module presentation, WORKOUT-V2-IMPL-01 OWNER
 * VISUAL CORRECTION (Start Dark Mobile + Desktop references = geometry
 * authority; correction contract §6–§8) + the START/PREPARING POLISH delta.
 *
 * HERO CONTENT LAW (owner polish delta §A): START is the ENTRY state into
 * the workout experience — the hero answers "What am I about to do?" at the
 * SESSION level and must NOT display the workout/exercise identity as its
 * primary headline. Exercise/workout identity belongs later in the
 * progression (PREPARING/INTRO). The shell therefore supplies session-level
 * copy (`headline` + `supporting`), never the resolved workout name; the
 * underlying resolver/prescription data model is untouched.
 *
 * OWNER CORRECTIONS (visual geometry, unchanged by the content delta):
 *   - ONE hero composition: eyebrow → headline → supporting → accent → CTA
 *     as a single centered flex column. The CTA belongs to the hero flow —
 *     it is NEVER fixed/absolute bottom-anchored at any breakpoint (§6.2).
 *   - MOBILE (Start dark mobile.png, ≤430px): the hero copy group rides
 *     HIGH (upper-middle) as one coherent composition; the CTA sits low
 *     over the mat. Expressed with flexible spacers in ONE flex column
 *     (top flex-[3] : bottom flex-[2] around the copy block; a slim
 *     flexible gap between accent and CTA) — real in-flow layout, no
 *     absolute positioning, no detached viewport footer, hierarchy order
 *     unchanged. The bottom spacer keeps a safe-area aware minimum so the
 *     CTA never collides with the home indicator. Mobile CTA uses a 50px
 *     trim so it stays proportionate to the hero; desktop keeps `xl`
 *     (56px) per the approved desktop geometry. Supporting-copy contrast:
 *     `--apex-text` (full-strength theme token) on mobile only — no opaque
 *     card, no geometry change, identical in light and dark.
 *   - DESKTOP (Start dark desktop.png): spacers collapse (md:) and the
 *     whole stack is optically centered with the CTA directly under the
 *     copy — the reference's single hero block (§6.2). DESKTOP GEOMETRY
 *     IS UNCHANGED by the mobile calibration. The shorter session headline
 *     may wrap differently than the old workout title — spacing rebalances
 *     naturally (delta §A: no artificial multi-line height is preserved).
 *   - Responsive typography discipline: mobile headline is capped
 *     (text-4xl, scaling to 6xl/7xl on wider screens) with controlled
 *     max-width (`max-w-[14ch]` mobile / `max-w-2xl` desktop) so text wraps
 *     naturally — never one oversized wide line, never nowrap, no hardcoded
 *     breaks. Width never forces a break inside a Persian word (breaks land
 *     on spaces, not the ZWNJ).
 *   - Persian receives the same disciplined width treatment (RTL verified
 *     by E2E); tracking on the eyebrow stays EN-only (rtl:neutralized).
 *
 * CTA: canonical Design System Button — variant `filled`, tone `primary`;
 * mobile trimmed (h-[50px], ≥ touch target), desktop `xl` (h-14 = 56px)
 * per the approved desktop reference. Flat (no gradient), no icon, one
 * native `<button type="button">` dispatching START once through the
 * orchestration authority. Startup reliability behavior is unchanged.
 *
 * Reduced motion: only the kit's canonical press/hover feedback transitions.
 */

export interface StartStageProps {
  viewModel: SessionViewModel;
  /** Localized session eyebrow (e.g. "Today's Workout"). */
  eyebrow: string;
  /** Localized session-level hero headline (no exercise/workout identity — delta §A). */
  headline: string;
  /** Localized session-level supporting sentence under the headline. */
  supporting: string;
  /** Localized primary CTA label ("Start Workout"). */
  ctaLabel: string;
  /** Dispatches the START_SESSION orchestration action. */
  onStart: () => void;
}

export function StartStage({viewModel, eyebrow, headline, supporting, ctaLabel, onStart}: StartStageProps) {
  const startable = viewModel.lifecycle === 'READY_TO_START' && viewModel.activeExercise != null;

  return (
    <div data-workout-v2-start-stage="" className="relative flex h-full w-full flex-col">
      {/* ONE hero column — mobile (≤430px): the copy block is the single
          flexible child; it opens at a fixed optical offset (28vh ≈ the
          reference's eyebrow line) and an internal flexible gap pushes the
          CTA down to the reference's low position (~82% top, over the mat)
          with a 12vh bottom inset for the mat/home-indicator zone. vh units
          keep the composition proportional across 844/932. Desktop (md:)
          restores the approved a9e625d geometry exactly: no offsets, block
          centers with flex-1, CTA directly under the copy (§6.2). The
          session-level headline is shorter than the old workout title; the
          flexible spacing absorbs the height change naturally (delta §A). */}
      <div
        className="flex flex-1 flex-col items-center px-4 pt-[28vh] pb-[12vh] text-center sm:px-6 md:justify-center md:pt-0 md:pb-10"
      >
        <p
          data-workout-v2-start-eyebrow=""
          className="text-xs font-semibold uppercase tracking-[0.35em] text-[color:var(--apex-text-secondary)] rtl:normal-case rtl:tracking-normal sm:text-sm"
        >
          {eyebrow}
        </p>
        {/* Session-level headline (delta §A: no workout/exercise identity on
            START). Controlled width → natural wrapping; the reference's
            two-line hero shape emerges from width + scale. */}
        <h1
          data-workout-v2-start-title=""
          className="mt-4 max-w-[14ch] text-4xl font-extrabold leading-[1.08] text-[color:var(--apex-text)] sm:max-w-2xl sm:text-6xl md:mt-5 md:text-7xl"
        >
          {headline}
        </h1>
        {/* Mobile supporting contrast: full-strength `--apex-text` (theme
            token, no card/opaque surface) so the supporting sentence stays
            readable against the bright equipment band; desktop keeps the
            softer secondary token. Geometry identical in light and dark. */}
        <p className="mt-4 max-w-xs text-sm leading-relaxed text-[color:var(--apex-text)] max-[430px]:text-[13px] sm:mt-5 sm:max-w-sm sm:text-lg sm:text-[color:var(--apex-text-secondary)]">
          {supporting}
        </p>
        <span aria-hidden="true" className="mt-6 h-[3px] w-10 rounded-full bg-apex-primary sm:mt-7" />
        {/* CTA — directly associated with the hero stack (correction §6.2:
            no fixed/absolute bottom anchoring at any breakpoint). Mobile:
            flexible gap + trimmed height so the CTA stays proportionate to
            the hero (owner delta); desktop: `xl` directly under the copy. */}
        {/* Flexible accent→CTA gap: absorbs the block's free space on
            mobile so the CTA rides low (reference ~82%) while the copy
            group stays high and clear of the bright floor band. */}
        <div aria-hidden="true" className="min-h-8 flex-1 md:hidden" />
        <div className="w-full max-w-md sm:mt-9 sm:w-auto sm:max-w-none">
          <Button
            type="button"
            data-workout-v2-start={true}
            variant="filled"
            tone="primary"
            size="xl"
            disabled={!startable}
            aria-disabled={!startable}
            onClick={onStart}
            className="max-[430px]:h-[50px] max-[430px]:px-6 max-[430px]:text-[15px] w-full sm:w-auto sm:min-w-[340px]"
          >
            {ctaLabel}
          </Button>
        </div>
      </div>
      {/* Mobile: static safe-area-only footer (the 12vh inset lives inside
          the copy block); desktop: fixed optical lift of the centered
          stack. In flow at every breakpoint (§6.1). */}
      <div
        aria-hidden="true"
        className="h-[max(1rem,env(safe-area-inset-bottom))] md:h-16"
      />
    </div>
  );
}

export default StartStage;
