'use client';

import React, {useLayoutEffect, useRef, useState} from 'react';
import {Check} from 'lucide-react';
import type {SessionViewModel} from '@/lib/workout/sessionV2Contracts';
import {MentorStage} from './mentor/MentorStage';

/**
 * IntroStage — the EXERCISE_INTRO product state presentation (owner polish
 * delta §C + INTRO VISUAL/RUNTIME CORRECTION delta) on the frozen Workout
 * Experience visual system.
 *
 * PURPOSE: INTRO is the user's first direct introduction to the upcoming
 * exercise — movement understanding/demonstration, NOT another PREPARING
 * screen. It answers: what exercise am I doing, what does the movement look
 * like, what are the essential cues.
 *
 * HANDS-FREE PROGRESSION LAW (correction delta §4): INTRO is part of the
 * hands-free Workout Experience — there is NO "Start Set 1" (or any
 * Start/Next/Continue) control, and NO reserved CTA layout space. The
 * automatic handoff contract terminates at the INTRO boundary for now: the
 * orchestration still owns the `BEGIN_WORK_SET` typed boundary (tests +
 * adapter unchanged), but presentation never dispatches it. The SET slice
 * will attach its own auto-handoff to that boundary later.
 *
 * CUE ZONE LAW (owner device correction §2 — cue presentation): the cues
 * are a COMPACT, visually-integrated coaching group — NOT a surface band.
 * The previous implementation wrapped the cues in a full-width blurred
 * `--apex-surface` band (the owner-rejected dark bottom strip) with three
 * large standalone pill cards stacked on mobile (dominating the bottom
 * third). The corrected treatment:
 *
 *   - NO container band at all — cues float directly over the Backstage;
 *   - readability comes ONLY from a minimum local contrast treatment per
 *     cue (token-driven text surface + border on the text pill itself);
 *   - DESKTOP: one horizontal row of compact pills near the bottom safe
 *     area;
 *   - MOBILE: one compact unified cue group with intrinsic wrapping — cues
 *     share rows when their measured content fits and wrap centered when it
 *     does not (the rejected three-large-pill layout is gone);
 *   - same semantic list for both platforms; only arrangement is
 *     responsive; safe areas + no overflow respected; no new controls.
 *
 * MENTOR: the single approved capability (same GLB, same lifecycle) remains
 * visually central; the stage reserves the header strip and the compact cue
 * group so responsive framing can center the demonstration between them.
 *
 * VOICE: Mentor voice-over is a FUTURE requirement — no TTS, no narration
 * architecture; INTRO works fully without it.
 */

export interface IntroStageProps {
  viewModel: SessionViewModel;
  /** Localized eyebrow (حرکت اول / FIRST EXERCISE). */
  firstExerciseLabel: string;
  /** Localized equipment/prescription metadata (وزن بدن / Bodyweight). */
  equipment: string | null;
  /** Localized coaching cues (concise list — no paragraphs). */
  cues: readonly string[];
  /** Localized Mentor loading label. */
  mentorLoadingLabel: string;
  /** Localized Mentor unavailable label (degraded mode). */
  mentorUnavailableLabel: string;
  /**
   * Localized sr-only label describing the demonstration ("Live session —
   * the movement demonstration"). Pure presentation metadata; no
   * voice-over (Mentor voice is a future requirement, delta §C).
   */
  mentorAriaLabel: string;
  /** Fires when the demonstration reaches visible-ready (final framing applied). */
  onMentorReady?: () => void;
}

interface CueItemProps {
  cue: string;
  index: number;
  visualOrder: number | undefined;
}

function CueItem({cue, index, visualOrder}: CueItemProps) {
  return (
    <li
      data-workout-v2-intro-cue=""
      data-cue-index={index}
      style={visualOrder == null ? undefined : {order: visualOrder}}
      className="flex shrink-0 items-center gap-1.5 rounded-full border border-[color:var(--apex-border)] bg-[color:color-mix(in_srgb,var(--apex-surface)_88%,transparent)] px-2.5 py-[3px]"
    >
      <Check aria-hidden="true" className="h-3.5 w-3.5 shrink-0 text-apex-primary" />
      <span className="whitespace-nowrap text-xs font-semibold text-[color:var(--apex-text)] sm:text-[13px]">
        {cue}
      </span>
    </li>
  );
}

/**
 * Intrinsic cue wrapping — the row grouping is derived from measured item
 * widths and the available list width. The shortest items are packed first,
 * while each row retains the source order of the items it contains. This
 * lets a long cue naturally occupy its own centered row without encoding cue
 * indices or English copy in the presentation.
 */
function CueList({cues}: {cues: readonly string[]}) {
  const listRef = useRef<HTMLUListElement>(null);
  const [visualOrder, setVisualOrder] = useState<number[] | null>(null);

  useLayoutEffect(() => {
    const list = listRef.current;
    if (!list) return;

    const measure = () => {
      const items = Array.from(list.children) as HTMLElement[];
      const availableWidth = list.clientWidth;
      if (availableWidth <= 0 || items.length < 2) return;

      const gap = Number.parseFloat(getComputedStyle(list).columnGap) || 0;
      const widths = items.map((item) => item.getBoundingClientRect().width);
      const rankedIndexes = widths
        .map((width, index) => ({width, index}))
        .sort((left, right) => left.width - right.width || left.index - right.index)
        .map(({index}) => index);
      const rows: Array<{indexes: number[]; width: number}> = [];

      for (const index of rankedIndexes) {
        const width = widths[index]!;
        const row = rows.find((candidate) => candidate.width + gap + width <= availableWidth);
        if (row) {
          row.indexes.push(index);
          row.width += gap + width;
        } else {
          rows.push({indexes: [index], width});
        }
      }

      const nextOrder = rows.flatMap((row) => row.indexes.sort((left, right) => left - right));
      setVisualOrder(nextOrder);
    };

    measure();
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(measure);
    observer?.observe(list);
    return () => observer?.disconnect();
  }, [cues]);

  return (
    <ul
      ref={listRef}
      data-workout-v2-intro-cues=""
      className="flex w-full flex-wrap items-center justify-center gap-1.5 sm:w-fit sm:flex-nowrap sm:gap-2"
    >
      {cues.map((cue, index) => (
        <CueItem
          key={cue}
          cue={cue}
          index={index}
          visualOrder={visualOrder == null ? undefined : visualOrder.indexOf(index)}
        />
      ))}
    </ul>
  );
}

export function IntroStage({
  viewModel,
  firstExerciseLabel,
  equipment,
  cues,
  mentorLoadingLabel,
  mentorUnavailableLabel,
  mentorAriaLabel,
  onMentorReady,
}: IntroStageProps) {
  // The demonstration is INTRO's content. Mentor readiness no longer gates
  // any control (there are none) — it only drives the loading/degraded text.
  const exercise = viewModel.introExercise ?? viewModel.activeExercise;
  // While paused the demonstration freezes with the session (same authority).
  const paused = viewModel.lifecycle === 'PAUSED';

  return (
    <div data-workout-v2-intro-stage="" className="flex h-full w-full flex-col">
      {/* Header strip — eyebrow → identity → equipment. Fixed-height top
          zone so the Mentor's responsive framing can clear it entirely. */}
      <div className="flex flex-col items-center px-4 pt-1 text-center sm:px-6 sm:pt-0">
        <p
          data-workout-v2-intro-eyebrow=""
          className="text-xs font-semibold uppercase tracking-[0.3em] text-[color:var(--apex-text-secondary)] rtl:normal-case rtl:tracking-normal sm:text-sm"
        >
          {firstExerciseLabel}
        </p>
        {/* Exercise identity — RESOLVED prescription data (never a display
            string in code); width-constrained like PREPARING's title. */}
        <h2
          data-workout-v2-intro-exercise=""
          className="mt-0.5 max-w-[12ch] text-3xl font-extrabold leading-[1.12] text-[color:var(--apex-text)] sm:mt-0 sm:max-w-xl sm:text-5xl sm:leading-tight"
        >
          {exercise?.exercise.name ?? ''}
        </h2>
        {/* Equipment/prescription metadata — the resolved bodyweight
            condition; omitted (never faked) when no exercise resolves. */}
        {equipment != null && exercise != null && (
          <p
            data-workout-v2-intro-equipment=""
            className="mt-1.5 rounded-full border border-apex-primary/60 px-4 py-0.5 text-[11px] font-bold uppercase tracking-[0.18em] text-apex-primary rtl:normal-case rtl:tracking-normal sm:mt-1.5 sm:text-xs"
          >
            {equipment}
          </p>
        )}
      </div>

      {/* Mentor demonstration — fills the space BETWEEN the header strip
          and the cue zone: the responsive framing keeps the full body
          grounded and clear of both. One lifecycle, one asset. */}
      <div data-workout-v2-intro-mentor-host="" className="relative min-h-0 flex-1">
        <MentorStage
          paused={paused}
          strings={{
            ariaLabel: mentorAriaLabel,
            loading: mentorLoadingLabel,
            unavailable: mentorUnavailableLabel,
          }}
          onReady={onMentorReady}
          onFailed={() => undefined}
        />
      </div>

      {/* COMPACT CUE GROUP (owner device correction §2): no band, no
          container surface — the cues sit directly on the Backstage with a
          minimum local-contrast pill on the text itself. Desktop: one
          horizontal row; Mobile: one unified compact group with concise
          rows (never the three-large-pill layout). Safe-area aware,
          overflow-safe, visually secondary to the Mentor. */}
      {cues.length > 0 && (
        <div
          data-workout-v2-intro-cue-zone=""
          className="w-full px-4 pb-[max(0.625rem,env(safe-area-inset-bottom))] pt-1.5 sm:px-6 sm:pb-2.5 sm:pt-2"
        >
          <div className="mx-auto flex w-full max-w-full justify-center">
            <CueList cues={cues} />
          </div>
        </div>
      )}
    </div>
  );
}

export default IntroStage;
