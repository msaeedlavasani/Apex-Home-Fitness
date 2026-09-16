'use client';

import React from 'react';
import {Check} from 'lucide-react';
import {Button} from '@/components/ui/platform';
import type {SessionViewModel} from '@/lib/workout/sessionV2Contracts';
import {MentorStage} from './mentor/MentorStage';

/**
 * IntroStage — the EXERCISE_INTRO product state presentation (owner polish
 * delta §C) on the frozen Workout Experience visual system.
 *
 * PURPOSE (delta §C): INTRO is the user's FIRST direct introduction to the
 * upcoming exercise — movement understanding/demonstration, NOT another
 * PREPARING screen (PREPARING owns physical readiness/space/posture). It
 * answers: what exercise am I doing, what does the movement look like,
 * what are the essential cues, how do I continue into the actual set.
 *
 * INFORMATION HIERARCHY (delta §C): eyebrow (حرکت اول / FIRST EXERCISE) →
 * exercise identity (from the RESOLVED prescription — never a hardcoded
 * string) → equipment metadata (وزن بدن / Bodyweight — from the resolved
 * bodyweight condition) → Mentor demonstration (visually central, the
 * existing approved capability) → concise coaching cues → Start Set 1 CTA.
 * NO instructional paragraphs; later-slice controls (Skip Exercise/Skip
 * Set/reorder/Extend-Reduce Rest) are deliberately absent.
 *
 * VOICE (delta §C): Mentor voice-over is a FUTURE requirement — no TTS, no
 * placeholder narration, INTRO works fully without it. The component
 * contract keeps a clean seam (the stage owns the demonstration; a future
 * coach-audio controller can subscribe to the same mount/unmount lifecycle)
 * without implementing anything now.
 *
 * PROGRESSION: the single primary CTA dispatches BEGIN_WORK_SET through the
 * orchestration adapter (INTRO → WORK_SET boundary, deterministic and
 * testable). There is NO timeout auto-completion — the user controls when
 * they are ready. The CTA is disabled until the Mentor is ready so the
 * user never starts a set they have not been shown (loading still leaves
 * the full surface usable; failure leaves it usable with the degraded
 * status text — starting the set never depends on WebGL succeeding).
 *
 * CROSS-SCREEN CONSISTENCY: same shell, same tokens, same control family
 * (44px touch targets, canonical Button), Light/Dark identical geometry,
 * RTL mirrors via logical layout only. Music/audio untouched (session-owned
 * singleton continues; INTRO renders no audio controls).
 */

export interface IntroStageProps {
  viewModel: SessionViewModel;
  /** Localized eyebrow (حرکت اول / FIRST EXERCISE). */
  firstExerciseLabel: string;
  /** Localized equipment/prescription metadata (وزن بدن / Bodyweight). */
  equipment: string | null;
  /** Localized coaching cues (concise list — no paragraphs). */
  cues: readonly string[];
  /** Localized primary CTA (شروع ست اول / Start Set 1). */
  beginSetLabel: string;
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
  /** Dispatches BEGIN_WORK_SET through the orchestration adapter. */
  onBeginWorkSet: () => void;
}

export function IntroStage({
  viewModel,
  firstExerciseLabel,
  equipment,
  cues,
  beginSetLabel,
  mentorLoadingLabel,
  mentorUnavailableLabel,
  mentorAriaLabel,
  onBeginWorkSet,
}: IntroStageProps) {
  // The demonstration is INTRO's content; the primary action stays honest
  // until the Mentor is actually presenting (real readiness, not a timer).
  const [mentorReady, setMentorReady] = React.useState(false);
  const exercise = viewModel.introExercise ?? viewModel.activeExercise;
  const beginSetable = mentorReady && exercise != null;
  // While paused the demonstration freezes with the session (same authority).
  const paused = viewModel.lifecycle === 'PAUSED';

  return (
    <div data-workout-v2-intro-stage="" className="flex h-full w-full flex-col">
      {/* ONE centered composition — mobile primary; desktop centers the
          same hierarchy with the Mentor visually central (§C hierarchy). */}
      <div className="flex flex-1 flex-col items-center justify-center px-4 text-center sm:px-6">
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
            className="mt-2 rounded-full border border-apex-primary/60 px-4 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-apex-primary rtl:normal-case rtl:tracking-normal sm:text-xs"
          >
            {equipment}
          </p>
        )}

        {/* Mentor demonstration — the existing approved capability,
            visually central (delta §C). Loading/failure keep the surface
            usable (degraded status text; no broken canvas, no crash). */}
        <div className="mt-2 grid w-full max-w-3xl flex-1 grid-rows-[minmax(0,1fr)_auto] items-center sm:mt-3">
          <MentorStage
            paused={paused}
            strings={{
              ariaLabel: mentorAriaLabel,
              loading: mentorLoadingLabel,
              unavailable: mentorUnavailableLabel,
            }}
            onReady={() => setMentorReady(true)}
            onFailed={() => undefined}
          />
          {/* Coaching cues — concise essential list, one row per cue on
              mobile; a single balanced row on desktop. Real list semantics
              (readable by AT, no dead chips). Cues render whenever the
              contract supplies them — they are INTRO's content, independent
              of the Mentor load outcome. */}
          {cues.length > 0 && (
            <ul
              data-workout-v2-intro-cues=""
              className="mx-auto mb-1 mt-2 flex w-full max-w-md flex-col items-center gap-1.5 sm:max-w-3xl sm:flex-row sm:justify-center sm:gap-3"
            >
              {cues.map((cue) => (
                <li
                  key={cue}
                  className="flex items-center gap-2 rounded-full bg-[color:var(--apex-fill)] px-3.5 py-1.5"
                >
                  <Check aria-hidden="true" className="h-4 w-4 shrink-0 text-apex-primary" />
                  <span className="whitespace-nowrap text-[13px] font-semibold text-[color:var(--apex-text)] sm:text-sm">
                    {cue}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Primary progression — the ONLY action on INTRO (delta §C: no
            skip/reorder/extend controls). Begins SET1 through the single
            orchestration authority; disabled until the Mentor presents. */}
        <div className="w-full max-w-md sm:w-auto">
          <Button
            type="button"
            data-workout-v2-intro-begin=""
            variant="filled"
            tone="primary"
            size="xl"
            disabled={!beginSetable}
            aria-disabled={!beginSetable}
            onClick={onBeginWorkSet}
            className="max-[430px]:h-[50px] max-[430px]:px-6 max-[430px]:text-[15px] w-full sm:w-auto sm:min-w-[340px]"
          >
            {beginSetLabel}
          </Button>
        </div>
      </div>
      {/* Safe-area footer — same flow treatment as the other stages. */}
      <div
        aria-hidden="true"
        className="h-[max(1rem,env(safe-area-inset-bottom))] md:h-10"
      />
    </div>
  );
}

export default IntroStage;
