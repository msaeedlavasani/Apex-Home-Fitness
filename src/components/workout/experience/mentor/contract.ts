/**
 * Mentor presentation contract — the experience-layer slice of the existing
 * approved Mentor capability (owner polish delta §C).
 *
 * The GLB asset, rig, bone map and framing model are the APPROVED Mentor
 * capability from `prototype/workout-layout-blueprint` (plan.md §9:
 * REUSABLE_IMPLEMENTATION_EVIDENCE — selectively re-expressed, never a V2
 * baseline). This module re-expresses ONLY the presentation-side constants
 * the INTRO stage needs; tracking overlays (bone projections, skeleton,
 * camera correction) stay in the prototype branch — they are later-slice
 * capabilities and are deliberately NOT imported here.
 *
 * No new character, no rerig, no GLB modification, no new exercise
 * animation: the stage plays the embedded squat clip exactly as the
 * prototype presented it.
 *
 * PURE: constants + types only — no React, no I/O.
 */

/** Self-hosted Mentor asset (FR-12: product media is self-hosted; no CDN). */
export const MENTOR_URL = '/workout-assets/AHF_Mentor_Squat.glb';

/** Mentor stage presentation status (safe loading/failure surface). */
export type MentorStageStatus = 'loading' | 'ready' | 'failed';

export interface MentorStageStrings {
  /** sr-only/live label describing the demonstration. */
  readonly ariaLabel: string;
  /** Loading placeholder label. */
  readonly loading: string;
  /** Failure placeholder label (usable degraded mode — spec plan §28). */
  readonly unavailable: string;
}
