/**
 * High-visibility workout components — public barrel.
 *
 * Built on the Apple HIG design tokens (src/app/globals.css) with shared
 * tone semantics defined in `workoutTokens.ts`. All components are
 * client-side, Light/Dark aware, RTL-safe and work on iOS, Android (TWA)
 * and responsive Web.
 */
export { CircularProgressRing } from './CircularProgressRing';
export type { CircularProgressRingProps } from './CircularProgressRing';
export { CountdownTimer } from './CountdownTimer';
export type { CountdownTimerProps, TimerSize } from './CountdownTimer';
export { RepSetCounter } from './RepSetCounter';
export type { RepSetCounterProps, CounterSize } from './RepSetCounter';
export { WORKOUT_TONES, RING_TRACK_COLOR, APPLE_EASE } from './workoutTokens';
export type { WorkoutTone, WorkoutToneTokens } from './workoutTokens';
