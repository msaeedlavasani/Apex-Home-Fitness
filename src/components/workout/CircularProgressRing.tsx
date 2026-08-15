'use client';

import { useId, type ReactNode } from 'react';
import { cn } from '@/lib/cn';
import {
  APPLE_EASE,
  RING_ANIMATION_MS,
  RING_TRACK_COLOR,
  WORKOUT_TONES,
  type WorkoutTone,
} from './workoutTokens';

export interface CircularProgressRingProps {
  /**
   * Completion ratio, 0..1. Values outside the range are clamped.
   * For countdown phases pass `1 - remaining/total` so the ring fills up
   * as the phase elapses.
   */
  progress: number;
  /** Outer diameter in px. Default 264 — hero-scale for workout screens. */
  size?: number;
  /** Arc thickness in px. Default 14. */
  strokeWidth?: number;
  /** Semantic color tone. Default `'work'` (coral = action). */
  tone?: WorkoutTone;
  /**
   * Gentle breathing scale animation. Intended for rest phases
   * (`tone="rest"`) to draw the eye while recovering. Disabled under
   * `prefers-reduced-motion` via the global base layer.
   */
  pulse?: boolean;
  /** Smoothly animate progress changes (stroke-dashoffset). Default true. */
  animated?: boolean;
  /** Accessible label for the progressbar. */
  ariaLabel?: string;
  /** Extra classes on the wrapper. */
  className?: string;
  /** Center content (e.g. a CountdownTimer). */
  children?: ReactNode;
}

/**
 * CircularProgressRing
 * --------------------
 * Large, animated SVG progress ring, color-coded by workout state
 * (DESIGN_SYSTEM.md §5):
 *
 *   - `work`  (coral `--apex-state-start`) — exercising / action
 *   - `rest`  (amber `--apex-state-rest`) — resting / recovery
 *   - `success` (green) — set / workout complete
 *   - `alert`  (red) — warning / expiry
 *   - `neutral` (gray `--apex-state-idle`) — waiting / paused
 *
 * Colors resolve to Apex design tokens (`var(--apex-*)`), so the ring
 * tracks Light/Dark automatically on iOS, Android (TWA) and Web. The SVG
 * is RTL-safe (SVG coordinates ignore `dir`), and the wrapper uses an
 * aspect-ratio box so the ring — and its centered children — scale down
 * proportionally on narrow screens.
 */
export function CircularProgressRing({
  progress,
  size = 264,
  strokeWidth = 14,
  tone = 'work',
  pulse = false,
  animated = true,
  ariaLabel,
  className,
  children,
}: CircularProgressRingProps) {
  const gradientId = useId();

  const clamped = Math.min(1, Math.max(0, progress));
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference * (1 - clamped);
  const center = size / 2;
  const tokens = WORKOUT_TONES[tone];

  return (
    <div
      role="progressbar"
      aria-valuenow={Math.round(clamped * 100)}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={ariaLabel}
      className={cn(
        'relative inline-flex items-center justify-center',
        pulse && 'animate-workout-pulse',
        className
      )}
      style={{ width: size, maxWidth: '100%', aspectRatio: '1 / 1' }}
    >
      <svg
        width="100%"
        height="100%"
        viewBox={`0 0 ${size} ${size}`}
        className="block h-full w-full"
        aria-hidden="true"
      >
        <defs>
          <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={tokens.color} />
            <stop offset="100%" stopColor={tokens.colorEnd} />
          </linearGradient>
        </defs>

        {/* Track — neutral fill, light/dark aware */}
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke={RING_TRACK_COLOR}
          strokeWidth={strokeWidth}
        />

        {/* Progress arc — gradient stroke + soft glow, animated */}
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke={`url(#${gradientId})`}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
          transform={`rotate(-90 ${center} ${center})`}
          style={{
            filter: `drop-shadow(0 0 ${Math.max(10, strokeWidth)}px ${tokens.glow})`,
            transition: animated
              ? `stroke-dashoffset ${RING_ANIMATION_MS}ms ${APPLE_EASE}, stroke 400ms ease`
              : undefined,
          }}
        />
      </svg>

      {children ? (
        <div className="absolute inset-0 flex items-center justify-center">{children}</div>
      ) : null}
    </div>
  );
}

export default CircularProgressRing;
