/**
 * Wall-clock timer primitives for the workout engine.
 *
 * A countdown must reflect *real* elapsed time, not "how many times a 1s
 * setInterval callback happened to fire". Browsers throttle timers in
 * background tabs, stop them entirely on iOS/mobile Safari, and freeze them
 * while the device sleeps — a naive interval-based counter drifts the moment
 * the tab loses visibility.
 *
 * The solution used by `useWorkoutEngine`:
 *   - one baseline timestamp (epoch ms) marks the last time elapsed seconds
 *     were accounted for;
 *   - `account()` computes `floor((now - baseline) / 1000)` and advances the
 *     baseline, preserving the sub-second remainder;
 *   - `account()` is called from the 1s interval **and** from page-lifecycle
 *     handlers (`visibilitychange`, `pagehide`, `pageshow`, `focus`), so a
 *     backgrounded tab catches up exactly (90s away ⇒ exactly 90s added) and
 *     nothing is double-counted.
 *
 * Everything here is pure and framework-agnostic — the engine keeps a
 * `WallClockAccumulator` in a ref and the unit tests drive it with a fake
 * clock.
 */

/**
 * Whole seconds that elapsed between `baseMs` and `nowMs`, floored.
 * Returns 0 when `baseMs` is null or the clock moved backwards.
 */
export function secondsBetween(baseMs: number | null, nowMs: number): number {
  if (baseMs == null) return 0;
  return Math.max(0, Math.floor((nowMs - baseMs) / 1000));
}

/**
 * The new baseline that carries the sub-second remainder forward so
 * accumulated seconds stay exact across many irregular calls.
 *
 * Example: baseline = t0, now = t0 + 4500ms → `secondsBetween` = 4 and the
 * returned baseline is t0 + 4000; a later call at t0 + 8500ms counts 4 more
 * seconds (8 total over 8.5 real seconds), not 3.
 *
 * If the clock moved backwards (NTP correction, manual change) the baseline
 * snaps to `nowMs` so the next `account()` restarts cleanly.
 */
export function advanceBaseline(baseMs: number, nowMs: number): number {
  const elapsed = nowMs - baseMs;
  if (elapsed <= 0) return nowMs;
  return nowMs - (elapsed % 1000);
}

export interface WallClockAccumulatorOptions {
  /** Time source; injectable for tests. Defaults to `Date.now`. */
  now?: () => number;
}

/**
 * Accumulates whole elapsed seconds between calls. Every call is idempotent
 * relative to the current baseline, so call it as often as you like (1s
 * interval, visibilitychange, focus, pageshow…) without drift or
 * double-counting. While paused, no time is counted at all.
 */
export class WallClockAccumulator {
  private baseline: number | null = null;
  private readonly now: () => number;

  constructor(options: WallClockAccumulatorOptions = {}) {
    this.now = options.now ?? (() => Date.now());
  }

  /** Whether the accumulator is currently counting. */
  get isRunning(): boolean {
    return this.baseline != null;
  }

  /** Start counting from `nowMs` (defaults to the injected clock). */
  start(nowMs?: number): void {
    this.baseline = nowMs ?? this.now();
  }

  /** Stop counting. Paused time is never counted. */
  pause(): void {
    this.baseline = null;
  }

  /**
   * Returns the whole seconds elapsed since the previous `account()` (or
   * `start()`), then moves the baseline forward preserving the remainder.
   * Returns 0 while paused.
   */
  account(nowMs?: number): number {
    const now = nowMs ?? this.now();
    if (this.baseline == null) return 0;
    const delta = secondsBetween(this.baseline, now);
    this.baseline = advanceBaseline(this.baseline, now);
    return delta;
  }
}
