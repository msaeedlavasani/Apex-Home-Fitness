/**
 * Workout Design Tokens
 * ---------------------
 * Single source of truth for the high-visibility workout components
 * (CircularProgressRing, CountdownTimer, RepSetCounter).
 *
 * Every color resolves to an Apex / Apple design token defined in
 * `src/app/globals.css` (see DESIGN_SYSTEM.md §2 & §5), so tones adapt to
 * Light / Dark mode and to all three platforms (iOS WebView, Android TWA,
 * responsive Web) with zero JS — the same token values map 1:1 to the
 * native iOS (SwiftUI) and Android (Compose) consumers.
 *
 * Tones are semantic workout states:
 *   - `work`     → `--apex-state-start` (coral) — action / exercising
 *   - `rest`     → `--apex-state-rest`   (amber) — recovery between sets
 *   - `success`  → `--apex-state-success` (green) — set / workout done
 *   - `alert`    → `--apex-state-alert`   (red)   — warning / expiry
 *   - `neutral`  → `--apex-state-idle`   (gray)   — waiting / paused
 */

export type WorkoutTone = 'work' | 'rest' | 'success' | 'alert' | 'neutral';

export interface WorkoutToneTokens {
  /** Primary accent (ring stroke). */
  color: string;
  /** Gradient end of the progress arc (same color = solid arc). */
  colorEnd: string;
  /**
   * Accessible text color for this tone. Derived from tokens via
   * `color-mix` toward `--apex-text`, so it always passes WCAG AA on the
   * current surface in both modes (design tokens may not contrast enough
   * as body/large text on neutral backgrounds).
   */
  text: string;
  /** Tinted chip / badge background for this tone. */
  soft: string;
  /** Translucent glow for ring drop-shadows (token-driven alpha). */
  glow: string;
}

/** Darken (light mode) / lighten (dark mode) a fill toward the label color. */
function accessibleText(fill: string, mix = '55%'): string {
  return `color-mix(in srgb, ${fill} ${mix}, var(--apex-text))`;
}

export const WORKOUT_TONES: Record<WorkoutTone, WorkoutToneTokens> = {
  work: {
    color: 'var(--apex-state-start)',
    colorEnd: 'var(--apex-state-rest)',
    text: 'var(--apex-primary-text)',
    soft: 'var(--apex-state-start-soft)',
    glow: 'color-mix(in srgb, var(--apex-state-start) var(--workout-ring-glow-opacity), transparent)',
  },
  rest: {
    color: 'var(--apex-state-rest)',
    colorEnd: 'var(--apex-state-rest)',
    text: accessibleText('var(--apex-state-rest)'),
    soft: 'var(--apex-state-rest-soft)',
    glow: 'color-mix(in srgb, var(--apex-state-rest) var(--workout-ring-glow-opacity), transparent)',
  },
  success: {
    color: 'var(--apex-state-success)',
    colorEnd: 'var(--apex-state-success)',
    text: accessibleText('var(--apex-state-success)', '60%'),
    soft: 'var(--apex-state-success-soft)',
    glow: 'color-mix(in srgb, var(--apex-state-success) var(--workout-ring-glow-opacity), transparent)',
  },
  alert: {
    color: 'var(--apex-state-alert)',
    colorEnd: 'var(--apex-state-alert)',
    text: 'var(--apex-state-alert-text)',
    soft: 'var(--apex-state-alert-soft)',
    glow: 'color-mix(in srgb, var(--apex-state-alert) var(--workout-ring-glow-opacity), transparent)',
  },
  neutral: {
    color: 'var(--apex-state-idle)',
    colorEnd: 'var(--apex-state-idle)',
    text: 'var(--apex-text)',
    soft: 'var(--apex-state-idle-soft)',
    glow: 'color-mix(in srgb, var(--apex-state-idle) var(--workout-ring-glow-opacity), transparent)',
  },
};

/** Ring background track — neutral in both modes (token in globals.css). */
export const RING_TRACK_COLOR = 'var(--workout-ring-track)';

/** Apple standard easing curve (matches `transitionTimingFunction.apple-ease`). */
export const APPLE_EASE = 'cubic-bezier(0.25, 0.1, 0.25, 1)';

/** Arc fill/refill animation duration (seconds). */
export const RING_ANIMATION_MS = 700;

export default WORKOUT_TONES;
