/**
 * Social components — public barrel.
 *
 * - `SocialShare`   — platform-aware "share your workout result" sheet
 *   (native Web Share API + clipboard fallback, bilingual preview).
 * - `ChallengesFeed`— the community challenges feed shell (filter tabs,
 *   challenge cards, join toggles) used by the /challenges route.
 *
 * Both are client-side, built on the Cross-Platform UI Kit and the Apex
 * design tokens (Light/Dark, RTL, iOS/Android/Web aware).
 */
export { SocialShare } from './SocialShare';
export type { SocialShareProps, WorkoutShareResult, ShareMethod } from './SocialShare';
export { ChallengesFeed } from './ChallengesFeed';
