export const WORKOUT_PROTOTYPE_STATES = [
  'START',
  'PREPARE',
  'EXERCISE_INTRO',
  'WORK_NORMAL',
  'WORK_POSITIVE',
  'WORK_CORRECTION',
  'ADAPTIVE_COMPARE',
  'TRACKING_LOST',
  'REST_QUIET',
  'REST_NEXT_PREVIEW',
  'TRANSITION_COUNTDOWN',
  'NEXT_EXERCISE',
  'PAUSED',
  'SECONDARY_CONTROLS',
  'COMPLETE',
] as const;

export type WorkoutPrototypeState = (typeof WORKOUT_PROTOTYPE_STATES)[number];

export type WorkoutSetNumber = 1 | 2 | 3;

export function getNextWorkoutSetNumber(currentSet: WorkoutSetNumber): WorkoutSetNumber {
  return currentSet === 3 ? 3 : (currentSet + 1) as WorkoutSetNumber;
}

export const RESUMABLE_WORKOUT_STATES = [
  'PREPARE',
  'WORK_NORMAL',
  'WORK_POSITIVE',
  'WORK_CORRECTION',
  'ADAPTIVE_COMPARE',
  'TRACKING_LOST',
  'REST_QUIET',
  'REST_NEXT_PREVIEW',
  'TRANSITION_COUNTDOWN',
  'NEXT_EXERCISE',
  'SECONDARY_CONTROLS',
] as const;

export type ResumableWorkoutState = (typeof RESUMABLE_WORKOUT_STATES)[number];

export interface WorkoutPrototypeStateConfig {
  trackingEnabled: boolean;
  skeletonVisible: boolean;
  mentorVisible: boolean;
  coachMessage: string;
}

const TRACKED_MENTOR_CONFIG: Omit<WorkoutPrototypeStateConfig, 'coachMessage'> = {
  trackingEnabled: true,
  skeletonVisible: true,
  mentorVisible: true,
};

const UNTRACKED_MENTOR_CONFIG: Omit<WorkoutPrototypeStateConfig, 'coachMessage'> = {
  trackingEnabled: false,
  skeletonVisible: false,
  mentorVisible: true,
};

const STATE_CONFIG: Record<WorkoutPrototypeState, WorkoutPrototypeStateConfig> = {
  START: {
    trackingEnabled: false,
    skeletonVisible: false,
    mentorVisible: false,
    coachMessage: 'Ready when you are.',
  },
  PREPARE: {
    trackingEnabled: false,
    skeletonVisible: false,
    mentorVisible: false,
    coachMessage: 'Get ready. Find your stance.',
  },
  EXERCISE_INTRO: {
    ...UNTRACKED_MENTOR_CONFIG,
    coachMessage: 'Chest tall. Drive through your heels.',
  },
  WORK_NORMAL: {
    ...TRACKED_MENTOR_CONFIG,
    coachMessage: 'Chest tall. Drive through your heels.',
  },
  WORK_POSITIVE: {
    ...TRACKED_MENTOR_CONFIG,
    coachMessage: 'Good rep. Keep that control.',
  },
  WORK_CORRECTION: {
    ...TRACKED_MENTOR_CONFIG,
    coachMessage: 'Keep your right knee aligned over your foot.',
  },
  ADAPTIVE_COMPARE: {
    ...TRACKED_MENTOR_CONFIG,
    coachMessage: 'Chest tall. Drive through your heels.',
  },
  TRACKING_LOST: {
    ...UNTRACKED_MENTOR_CONFIG,
    coachMessage: 'Step back into view to resume tracking.',
  },
  REST_QUIET: {
    trackingEnabled: false,
    skeletonVisible: false,
    mentorVisible: false,
    coachMessage: 'Recover. Next set starts soon.',
  },
  REST_NEXT_PREVIEW: {
    trackingEnabled: false,
    skeletonVisible: false,
    mentorVisible: false,
    coachMessage: 'Bodyweight Squat',
  },
  TRANSITION_COUNTDOWN: {
    ...UNTRACKED_MENTOR_CONFIG,
    coachMessage: 'Starting in 3',
  },
  NEXT_EXERCISE: {
    ...TRACKED_MENTOR_CONFIG,
    coachMessage: 'Chest tall. Drive through your heels.',
  },
  PAUSED: {
    ...UNTRACKED_MENTOR_CONFIG,
    coachMessage: 'Workout paused.',
  },
  SECONDARY_CONTROLS: {
    ...TRACKED_MENTOR_CONFIG,
    coachMessage: 'Chest tall. Drive through your heels.',
  },
  COMPLETE: {
    trackingEnabled: false,
    skeletonVisible: false,
    mentorVisible: false,
    coachMessage: 'Workout complete.',
  },
};

export function isWorkoutPrototypeState(value: string | null): value is WorkoutPrototypeState {
  return value !== null && (WORKOUT_PROTOTYPE_STATES as readonly string[]).includes(value);
}

export function parseWorkoutPrototypeState(value: string | null): WorkoutPrototypeState {
  if (value === 'REST') return 'REST_QUIET';
  return isWorkoutPrototypeState(value) ? value : 'WORK_NORMAL';
}

export function isResumableWorkoutState(value: WorkoutPrototypeState): value is ResumableWorkoutState {
  return (RESUMABLE_WORKOUT_STATES as readonly WorkoutPrototypeState[]).includes(value);
}

export function getWorkoutPrototypeStateConfig(state: WorkoutPrototypeState): WorkoutPrototypeStateConfig {
  return STATE_CONFIG[state];
}
