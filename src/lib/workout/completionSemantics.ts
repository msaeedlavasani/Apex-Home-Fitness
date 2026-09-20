import type {WorkoutCompletionKind} from '@/lib/outcomes';
import type {WorkoutResultSummary} from './sessionV2Contracts';

/** The all-skipped result is terminal session state, not completion credit. */
export function completionKindForPersistence(summary: WorkoutResultSummary): WorkoutCompletionKind {
  if (
    summary.totalExercises > 0 &&
    summary.skippedExercises === summary.totalExercises &&
    summary.completedExercises === 0 &&
    summary.completedSets === 0
  ) return 'ENDED_WITHOUT_COMPLETION';
  return summary.completionKind;
}

export function receivesCompletionCredit(kind: WorkoutCompletionKind): boolean {
  return kind !== 'ENDED_WITHOUT_COMPLETION';
}
