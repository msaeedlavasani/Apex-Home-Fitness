import type {WorkoutPrototypeState} from './workoutState';

export type PrototypeFlowSegment = {
  state: WorkoutPrototypeState;
  durationMs: number;
};

export const PROTOTYPE_FLOW_SEGMENTS: readonly PrototypeFlowSegment[] = [
  {state: 'PREPARE', durationMs: 3_000},
  {state: 'EXERCISE_INTRO', durationMs: 2_000},
  {state: 'WORK_NORMAL', durationMs: 8_000},
  {state: 'WORK_POSITIVE', durationMs: 2_000},
  {state: 'WORK_NORMAL', durationMs: 5_000},
  {state: 'WORK_CORRECTION', durationMs: 3_000},
  {state: 'WORK_NORMAL', durationMs: 5_000},
  {state: 'TRACKING_LOST', durationMs: 3_000},
  {state: 'WORK_NORMAL', durationMs: 5_000},
  {state: 'REST_QUIET', durationMs: 25_000},
  {state: 'REST_NEXT_PREVIEW', durationMs: 5_000},
  {state: 'TRANSITION_COUNTDOWN', durationMs: 3_000},
  {state: 'WORK_NORMAL', durationMs: 2_000},
] as const;

export const REST_START_MS = 36_000;
export const REST_PREVIEW_START_MS = 61_000;
export const COUNTDOWN_START_MS = 66_000;
export const FLOW_FINAL_WORK_NORMAL_MS = 71_000;

export function getPrototypeFlowState(elapsedMs: number): WorkoutPrototypeState {
  let segmentStartMs = 0;

  for (const segment of PROTOTYPE_FLOW_SEGMENTS) {
    const segmentEndMs = segmentStartMs + segment.durationMs;
    if (elapsedMs < segmentEndMs) return segment.state;
    segmentStartMs = segmentEndMs;
  }

  return 'WORK_NORMAL';
}

export function getRestRemainingSeconds(elapsedMs: number): number {
  return Math.max(0, Math.ceil((REST_START_MS + 30_000 - elapsedMs) / 1_000));
}

export function getCountdownValue(elapsedMs: number): number {
  return Math.max(1, 3 - Math.floor((elapsedMs - COUNTDOWN_START_MS) / 1_000));
}
