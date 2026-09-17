'use client';

import React from 'react';
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
 * CUE ZONE LAW (correction delta §3): the cue pills keep their approved
 * mobile treatment (individually readable rounded surfaces with check
 * indicators) but render inside an EXPLICIT responsive cue zone anchored to
 * the bottom of the stage — a quiet surface band that never overlays the
 * Mentor's body/legs, never attaches to the mat, stays readable over
 * variable photographic backgrounds (its own local surface + theme tokens),
 * respects the safe areas, and never pushes the Mentor out of position.
 * Desktop and Mobile share ONE semantic list; only arrangement/spacing are
 * responsive (`flex-col` mobile → `flex-row` desktop). Light and Dark both
 * retain reliable contrast via tokens.
 *
 * MENTOR: the single approved capability (same GLB, same lifecycle) remains
 * visually central; the stage reserves the header strip and the bottom cue
 * zone so responsive framing can center the demonstration between them.
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
}

export function IntroStage({
  viewModel,
  firstExerciseLabel,
  equipment,
  cues,
  mentorLoadingLabel,
  mentorUnavailableLabel,
  mentorAriaLabel,
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
      <div className="flex flex-col items-center px-4 pt-1 text-center sm:px-6 sm:pt-2">
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
          className="mt-0.5 max-w-[12ch] text-3xl font-extrabold leading-[1.12] text-[color:var(--apex-text)] sm:max-w-xl sm:text-5xl sm:leading-tight"
        >
          {exercise?.exercise.name ?? ''}
        </h2>
        {/* Equipment/prescription metadata — the resolved bodyweight
            condition; omitted (never faked) when no exercise resolves. */}
        {equipment != null && exercise != null && (
          <p
            data-workout-v2-intro-equipment=""
            className="mt-1.5 rounded-full border border-apex-primary/60 px-4 py-0.5 text-[11px] font-bold uppercase tracking-[0.18em] text-apex-primary rtl:normal-case rtl:tracking-normal sm:mt-2 sm:text-xs"
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
          onReady={() => undefined}
          onFailed={() => undefined}
        />
      </div>

      {/* EXPLICIT CUE ZONE (correction delta §3): one quiet surface band
          anchored to the bottom of the stage — never over the Mentor body/
          mat, readable over any background, safe-area aware. ONE semantic
          list for both platforms; arrangement is responsive only. */}
      {cues.length > 0 && (
        <div
          data-workout-v2-intro-cue-zone=""
          className="bg-[color:color-mix(in_srgb,var(--apex-surface)_72%,transparent)] pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-2 backdrop-blur-md sm:pb-4 sm:pt-3"
        >
          <ul
            data-workout-v2-intro-cues=""
            className="mx-auto flex w-full max-w-md flex-col items-center gap-1.5 px-4 sm:max-w-3xl sm:flex-row sm:justify-center sm:gap-3 sm:px-6"
          >
            {cues.map((cue) => (
              <li
                key={cue}
                className="flex items-center gap-2 rounded-full border border-[color:var(--apex-border)] bg-[color:var(--apex-surface)]/80 px-3.5 py-1.5"
              >
                <Check aria-hidden="true" className="h-4 w-4 shrink-0 text-apex-primary" />
                <span className="whitespace-nowrap text-[13px] font-semibold text-[color:var(--apex-text)] sm:text-sm">
                  {cue}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

export default IntroStage;
