'use client';

import React from 'react';
import {Button} from '@/components/ui/platform';
import type {SessionViewModel} from '@/lib/workout/sessionV2Contracts';

/**
 * StartStage — the START module presentation, WORKOUT-V2-IMPL-01 OWNER
 * VISUAL CORRECTION (Start Dark Mobile + Desktop references = geometry
 * authority; correction contract §6–§8).
 *
 * OWNER CORRECTIONS vs the previous slice (superseding the old frozen
 * geometry where they conflict):
 *   - ONE hero composition: eyebrow → title → copy → accent → CTA as a
 *     single centered flex column. The CTA belongs to the hero flow — it is
 *     NEVER fixed/absolute bottom-anchored at any breakpoint (§6.2).
 *   - MOBILE (Start dark mobile.png): the reference places the CTA low in
 *     the composition, over the mat, while the copy sits above center.
 *     Expressed with TWO flexible spacers around the hero block in ONE
 *     flex column (top flex-[2] : bottom flex-[1]) — real in-flow layout,
 *     no absolute positioning, no detached viewport footer, hierarchy
 *     order unchanged (§6.1). The bottom spacer keeps a safe-area aware
 *     minimum so the CTA never collides with the home indicator.
 *   - DESKTOP (Start dark desktop.png): spacers collapse (md:) and the
 *     whole stack is optically centered with the CTA directly under the
 *     copy — the reference's single hero block (§6.2).
 *   - Responsive typography discipline: mobile title is capped (text-4xl,
 *     scaling to 6xl/7xl on wider screens), with controlled max-width
 *     (`max-w-[11ch]` mobile / `max-w-2xl` desktop) so long titles wrap
 *     naturally over 2 lines like the reference ("Full Body / Strength") —
 *     never one oversized wide line, never nowrap, no hardcoded breaks.
 *   - Persian receives the same disciplined width treatment (RTL verified
 *     by E2E); tracking on the eyebrow stays EN-only (rtl:neutralized).
 *
 * CTA: canonical Design System Button — variant `filled`, tone `primary`,
 * size `xl` (h-14 = 56px, ≥ touch target), flat (no gradient), no icon,
 * one native `<button type="button">` dispatching START once through the
 * orchestration authority. Startup reliability behavior is unchanged.
 *
 * Reduced motion: only the kit's canonical press/hover feedback transitions.
 */

export interface StartStageProps {
  viewModel: SessionViewModel;
  /** Localized eyebrow: workout context (e.g. "Today's Workout"). */
  eyebrow: string;
  /** Localized hero title — the resolved workout name. */
  title: string;
  /** Localized supporting copy under the title. */
  copy: string;
  /** Localized primary CTA label ("Start Workout"). */
  ctaLabel: string;
  /** Dispatches the START_SESSION orchestration action. */
  onStart: () => void;
}

export function StartStage({viewModel, eyebrow, title, copy, ctaLabel, onStart}: StartStageProps) {
  const startable = viewModel.lifecycle === 'READY_TO_START' && viewModel.activeExercise != null;

  return (
    <div data-workout-v2-start-stage="" className="relative flex h-full w-full flex-col">
      {/* ONE hero column — mobile distributes free space 2:1 around the hero
          block (CTA rides low over the mat, §6.1); desktop collapses the
          spacers and centers the stack (§6.2). */}
      <div aria-hidden="true" className="min-h-6 flex-[2] md:hidden" />
      <div className="flex flex-col items-center px-4 text-center sm:px-6 md:flex-1 md:justify-center md:pb-10">
        <p
          data-workout-v2-start-eyebrow=""
          className="text-xs font-semibold uppercase tracking-[0.35em] text-[color:var(--apex-text-secondary)] rtl:normal-case rtl:tracking-normal sm:text-sm"
        >
          {eyebrow}
        </p>
        {/* Controlled width → natural wrapping for long titles (EN + FA); the
            reference's two-line title shape emerges from width + scale. */}
        <h1
          data-workout-v2-start-title=""
          className="mt-4 max-w-[11ch] text-4xl font-extrabold leading-[1.08] text-[color:var(--apex-text)] sm:max-w-2xl sm:text-6xl md:mt-5 md:text-7xl"
        >
          {title}
        </h1>
        <p className="mt-4 max-w-xs text-sm leading-relaxed text-[color:var(--apex-text-secondary)] sm:mt-5 sm:max-w-sm sm:text-lg">
          {copy}
        </p>
        <span aria-hidden="true" className="mt-6 h-[3px] w-10 rounded-full bg-apex-primary sm:mt-7" />
        {/* CTA — directly associated with the hero stack (correction §6.2:
            no fixed/absolute bottom anchoring at any breakpoint). */}
        <div className="mt-8 w-full max-w-md sm:mt-9 sm:w-auto sm:max-w-none">
          <Button
            type="button"
            data-workout-v2-start={true}
            variant="filled"
            tone="primary"
            size="xl"
            disabled={!startable}
            aria-disabled={!startable}
            onClick={onStart}
            className="w-full sm:w-auto sm:min-w-[340px]"
          >
            {ctaLabel}
          </Button>
        </div>
      </div>
      {/* Mobile: flexible lower spacer (safe-area aware minimum) that keeps
          the CTA above the home indicator; desktop: fixed optical lift of
          the centered stack. In flow at every breakpoint (§6.1). */}
      <div
        aria-hidden="true"
        className="min-h-[max(1.5rem,calc(env(safe-area-inset-bottom)+0.75rem))] flex-1 md:h-16 md:min-h-0 md:flex-none"
      />
    </div>
  );
}

export default StartStage;
