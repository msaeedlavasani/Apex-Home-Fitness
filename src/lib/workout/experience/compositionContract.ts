/**
 * Workout V2 composition contract (MENTOR_STAGE_ANCHOR_AND_ADAPTIVE_COMPOSITION).
 *
 * The Mentor stage is a reserved zone. Header and secondary presentation seek
 * their own zones and may adapt within them; they are not allowed to become
 * flex-flow siblings that resize or translate the Mentor zone at runtime.
 */
export const WORKOUT_COMPOSITION_CONTRACT_VERSION = 1 as const;

export const WORKOUT_COMPOSITION_ZONES = {
  shell: 'GLOBAL_SESSION_SHELL',
  mentor: 'PROTECTED_MENTOR_STAGE',
  safeArea: 'VIEWPORT_SAFE_AREA',
  secondary: 'ADAPTIVE_SECONDARY_UI',
} as const;

export const WORKOUT_COMPOSITION_DEGRADATION_ORDER = [
  'REFLOW_SECONDARY',
  'COMPACT_SECONDARY',
  'USE_AVAILABLE_COMPOSITION_ZONE',
  'COLLAPSE_NONESSENTIAL',
  'CONTROLLED_SCROLL_OR_OVERLAY',
] as const;
