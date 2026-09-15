'use client';

import React from 'react';
import {Button} from '@/components/ui/platform';
import type {SessionViewModel} from '@/lib/workout/sessionV2Contracts';

/**
 * StartStage — the START module presentation, FROZEN COMPOSITION (delta §9 +
 * the frozen START visual reference family).
 *
 * Geometry law (§9): the hero and CTA share ONE central composition axis
 * (`START_AXIS_X = 50vw` — the shell centers the column, so the hero and CTA
 * centers resolve to the viewport center; asymmetric Backstage objects never
 * shift application UI). No absolute positioning for primary layout — the
 * mobile CTA is bottom-anchored through the flex column itself; no
 * consumer stat pills, no decorative footer, no CTA gradient, no Play/Arrow
 * icon on the CTA (§9), no baked logo (the brand mark is real application
 * chrome in the shell's top bar, §6).
 *
 * Reference-family details: eyebrow is letterspaced uppercase in EN; the
 * uppercase/tracking treatment is explicitly neutralized in RTL/FA (§41/§22
 * — no inappropriate tracking in Persian). The small coral divider under the
 * copy is part of the frozen composition (both themes, same geometry).
 *
 * CTA: canonical Design System Button — variant `filled`, tone `primary`,
 * size `xl` (h-14 = 56px mobile, §9/§14), full-width mobile / contained
 * centered on sm+ (reference family). Startup reliability (§25, spec §14/§15):
 * one native `<button type="button">`, single activation dispatches START once
 * through the orchestration authority (idempotency guard lives in the
 * authority); touch works natively. E2E-asserted.
 *
 * Reduced motion: only the kit's canonical press/hover feedback transitions —
 * nothing informational moves.
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
    <div data-workout-v2-start-stage="" className="flex h-full w-full flex-col">
      {/* HERO — workout context → title → copy → coral divider (§9). */}
      <div className="flex flex-1 flex-col items-center justify-center px-4 text-center sm:px-6">
        <p
          data-workout-v2-start-eyebrow=""
          className="text-xs font-semibold uppercase tracking-[0.35em] text-[color:var(--apex-text-secondary)] rtl:normal-case rtl:tracking-normal sm:text-sm"
        >
          {eyebrow}
        </p>
        <h1
          data-workout-v2-start-title=""
          className="mt-4 max-w-xl text-4xl font-extrabold leading-[1.05] text-[color:var(--apex-text)] sm:text-6xl"
        >
          {title}
        </h1>
        <p className="mt-4 max-w-sm text-base text-[color:var(--apex-text-secondary)] sm:text-lg">
          {copy}
        </p>
        <span aria-hidden="true" className="mt-6 h-[3px] w-10 rounded-full bg-apex-primary" />
      </div>

      {/* ACTION — canonical xl CTA: full-width bottom-anchored mobile,
          contained centered sm+ (frozen reference family). Visible in the
          initial compact portrait viewport — no scroll (§9). */}
      <div className="flex w-full justify-center px-4 pb-[max(1.75rem,calc(env(safe-area-inset-bottom)+1rem))] sm:px-6 sm:pb-10">
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
  );
}

export default StartStage;
