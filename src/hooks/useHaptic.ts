'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * useHaptic
 * ---------
 * A small React hook that wraps the Vibration API (`navigator.vibrate`) with
 * named, tactile patterns for workout events.
 *
 *   - `trigger(event)` emits the pattern for a workout event. It is a no-op
 *     when the browser has no Vibration API (e.g. iOS Safari) or when haptics
 *     are disabled, so it is always safe to call.
 *   - Convenience helpers (`start()`, `end()`, `countdown()`…) mirror the
 *     events consumed by `WorkoutPlayer`.
 *   - The `enabled` option (default `true`) doubles as a runtime switch:
 *     changing it after mount updates the internal state, and `setEnabled()`
 *     lets the UI toggle haptics live.
 *   - Any in-flight vibration pattern is cancelled when the hook unmounts.
 */

export type HapticEvent =
  | 'start' // Workout / set / rest period begins.
  | 'end' // A phase ends (generic).
  | 'restStart' // Rest period begins.
  | 'restEnd' // Rest period ends.
  | 'setComplete' // A working set is completed.
  | 'countdown' // Countdown tick (3…2).
  | 'countdownFinal' // Final "go" tick (1).
  | 'workoutComplete'; // Whole workout finished.

/**
 * Vibration patterns in milliseconds (alternating vibrate/pause, per the
 * Vibration API spec). A bare number is a single pulse of that length.
 */
const PATTERNS: Record<HapticEvent, number | number[]> = {
  start: [35, 60, 35],
  end: [25],
  restStart: [15, 40, 15],
  restEnd: [40, 50, 40],
  setComplete: [30, 40, 30],
  countdown: [12],
  countdownFinal: [50, 40, 50],
  workoutComplete: [70, 90, 70, 90, 140],
};

export interface UseHapticOptions {
  /** Master switch; when false no vibration is emitted. Defaults to `true`. */
  enabled?: boolean;
}

export interface UseHapticResult {
  /** Whether the current browser exposes `navigator.vibrate`. */
  supported: boolean;
  /** Current master switch state (mirrors the `enabled` option). */
  enabled: boolean;
  /** Toggle haptics at runtime. */
  setEnabled: (next: boolean) => void;
  /** Emit the vibration pattern for a workout event (no-op when disabled/unsupported). */
  trigger: (event: HapticEvent) => void;
  // ---- Convenience helpers ----
  start: () => void;
  end: () => void;
  restStart: () => void;
  restEnd: () => void;
  setComplete: () => void;
  /** `countdown(true)` emits the final "go" pattern. */
  countdown: (final?: boolean) => void;
  workoutComplete: () => void;
}

function canVibrate(): boolean {
  return typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function';
}

export function useHaptic(options: UseHapticOptions = {}): UseHapticResult {
  const initialEnabled = options.enabled ?? true;

  const [enabled, setEnabled] = useState(initialEnabled);
  // Recomputed on every render so it reflects the real environment after
  // hydration (the first render may run during SSR where navigator is absent).
  const supported = canVibrate();

  // Keep the latest value readable from the stable `trigger` callback.
  const enabledRef = useRef(enabled);
  useEffect(() => {
    enabledRef.current = enabled;
  }, [enabled]);

  // External control: when the consumer changes the `enabled` option (e.g.
  // a `soundEnabled`/`hapticsEnabled` prop), follow it.
  useEffect(() => {
    setEnabled(initialEnabled);
  }, [initialEnabled]);

  const trigger = useCallback((event: HapticEvent) => {
    if (!enabledRef.current) return;
    if (!canVibrate()) return;
    try {
      navigator.vibrate(PATTERNS[event]);
    } catch {
      // Some platforms throw for invalid patterns; never break the workout.
    }
  }, []);

  // Cancel any in-flight pattern when the hook unmounts.
  useEffect(() => {
    return () => {
      if (!canVibrate()) return;
      try {
        navigator.vibrate(0);
      } catch {
        // noop
      }
    };
  }, []);

  const start = useCallback(() => trigger('start'), [trigger]);
  const end = useCallback(() => trigger('end'), [trigger]);
  const restStart = useCallback(() => trigger('restStart'), [trigger]);
  const restEnd = useCallback(() => trigger('restEnd'), [trigger]);
  const setComplete = useCallback(() => trigger('setComplete'), [trigger]);
  const countdown = useCallback(
    (final = false) => trigger(final ? 'countdownFinal' : 'countdown'),
    [trigger]
  );
  const workoutComplete = useCallback(() => trigger('workoutComplete'), [trigger]);

  return {
    supported,
    enabled,
    setEnabled,
    trigger,
    start,
    end,
    restStart,
    restEnd,
    setComplete,
    countdown,
    workoutComplete,
  };
}

export default useHaptic;
