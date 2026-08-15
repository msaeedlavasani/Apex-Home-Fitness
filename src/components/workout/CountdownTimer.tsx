'use client';

import { cn } from '@/lib/cn';
import { WORKOUT_TONES, type WorkoutTone } from './workoutTokens';

export type TimerSize = 'lg' | 'xl' | '2xl';

export interface CountdownTimerProps {
  /**
   * Seconds to display. For `mode="countdown"` pass the remaining time;
   * for `mode="countup"` pass the elapsed time. Negative values clamp to 0.
   */
  seconds: number;
  /**
   * `countdown` (default) — pulses when time runs low and turns red in the
   * final 3 seconds. `countup` — steady elapsed counter, no low-time cues.
   */
  mode?: 'countdown' | 'countup';
  /** Semantic tone driving the number color. Default `'work'`. */
  tone?: WorkoutTone;
  /** Display scale. Default `'xl'`. */
  size?: TimerSize;
  /**
   * `rounded` (default) — SF Pro Rounded, black weight, tight tracking:
   * the high-impact fitness look. `mono` — SF Mono, tabular by nature.
   */
  font?: 'rounded' | 'mono';
  /** Breathing pulse during the last `lowThreshold` seconds. Default true. */
  pulseOnLow?: boolean;
  /** Seconds threshold that triggers the low-time pulse. Default 10. */
  lowThreshold?: number;
  /** Accessible label for the timer region. */
  ariaLabel?: string;
  /** Extra classes on the root. */
  className?: string;
}

const SIZE_CLASSES: Record<TimerSize, string> = {
  lg: 'text-5xl sm:text-6xl',
  xl: 'text-6xl sm:text-7xl',
  '2xl': 'text-7xl sm:text-8xl',
};

const FONT_CLASSES = {
  rounded: 'font-rounded font-black tracking-tighter',
  mono: 'font-mono font-bold tracking-tight',
} as const;

/** `m:ss` — or `h:mm:ss` once the value reaches a full hour. */
function formatClock(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h > 0) {
    return `${h}:${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
  }
  return `${m}:${sec.toString().padStart(2, '0')}`;
}

/**
 * CountdownTimer
 * --------------
 * Bold, high-impact time display for workout screens. Huge tabular digits
 * (no layout shift while ticking), color-coded by tone:
 *
 *   - `work`  → green (action)
 *   - `rest`  → orange (recovery)
 *   - `neutral` → semantic label color
 *
 * In countdown mode the digits breathe during the final `lowThreshold`
 * seconds and shift to `--apple-red` for the last 3 — a high-visibility
 * "go now" cue that works with sound/haptics, not instead of them.
 * The number is wrapped in `dir="ltr"` so `mm:ss` stays stable inside RTL
 * (Persian) layouts, and `role="timer"` keeps screen readers in sync.
 */
export function CountdownTimer({
  seconds,
  mode = 'countdown',
  tone = 'work',
  size = 'xl',
  font = 'rounded',
  pulseOnLow = true,
  lowThreshold = 10,
  ariaLabel,
  className,
}: CountdownTimerProps) {
  const tokens = WORKOUT_TONES[tone];
  const clamped = Math.max(0, Math.floor(seconds));

  const isLow =
    mode === 'countdown' && pulseOnLow && clamped > 0 && clamped <= lowThreshold;
  const isCritical = mode === 'countdown' && clamped > 0 && clamped <= 3;

  const color = isCritical ? 'var(--apex-state-alert)' : tokens.text;

  return (
    <span
      role="timer"
      aria-label={ariaLabel}
      dir="ltr"
      className={cn(
        'inline-flex select-none leading-none tabular-nums',
        SIZE_CLASSES[size],
        FONT_CLASSES[font],
        isLow && 'animate-workout-pulse',
        className
      )}
      style={{ color }}
    >
      {formatClock(clamped)}
    </span>
  );
}

export default CountdownTimer;
