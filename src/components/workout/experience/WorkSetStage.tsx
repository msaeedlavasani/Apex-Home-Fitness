'use client';

import type {SessionViewModel} from '@/lib/workout/sessionV2Contracts';

/**
 * WorkSetStage — the SET1 ENTRY BOUNDARY placeholder (owner polish delta
 * §C: "Do not build SET1 UI in this Delta").
 *
 * The INTRO delta's only WORK_SET responsibility is the SAFE RECEIVING END
 * of the `BEGIN_WORK_SET` transition: when orchestration activates
 * `WORK_SET`, presentation renders a stable, real-data status surface —
 * never a fake set player, never fake counters, never dead set controls.
 * Set execution (REP_BASED/TIME_BASED progress, completion, REST) is the
 * next authorized slice and is deliberately NOT implemented here.
 */
export function WorkSetStage({viewModel}: {viewModel: SessionViewModel}) {
  const exercise = viewModel.activeExercise;
  return (
    <div
      data-workout-v2-workset-stage=""
      className="flex h-full w-full flex-col items-center justify-center px-4 text-center"
    >
      {/* Real session facts only: the resolved exercise identity and the
          orchestration state that INTRO handed over. */}
      <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[color:var(--apex-text-secondary)] rtl:normal-case rtl:tracking-normal">
        {exercise?.exercise.name ?? ''}
      </p>
      <p role="status" className="mt-3 text-sm text-[color:var(--apex-text-secondary)]">
        SET 1
      </p>
    </div>
  );
}

export default WorkSetStage;
