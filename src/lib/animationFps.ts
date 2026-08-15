/**
 * animationFps
 * ------------
 * Tiny dependency-free FPS monitor used to detect *sustained* frame-rate
 * drops while complex animations (Lottie, video, ring transitions) are
 * playing, so callers can downgrade to a lightweight fallback instead of
 * fighting a losing battle at 15fps.
 *
 * Design notes:
 *   - Measures the *actual* rAF cadence, i.e. the true frame rate the
 *     browser is able to composite — not the nominal animation `fr`.
 *   - Uses a rolling window average so a single GC hiccup doesn't trigger
 *     a false fallback; only *sustained* low FPS (default: < 45fps for
 *     2s) fires `onDrop`.
 *   - Frames with a gap > 500ms (tab hidden, long main-thread stalls)
 *     are discarded instead of counted as "low fps", so background tabs
 *     never trip the fallback.
 */
export interface FpsSample {
  /** Average frames-per-second over the last sample window. */
  fps: number;
  /** Frames rendered since the monitor started. */
  frames: number;
  /** Longest single frame gap (ms) in the current window — jank proxy. */
  worstFrameMs: number;
}

export interface FpsMonitorOptions {
  /** Nominal target. Default 60. */
  targetFps?: number;
  /** Average FPS below this counts as a "low" session. Default 45. */
  lowFpsThreshold?: number;
  /** How long FPS must stay low before `onDrop` fires. Default 2000ms. */
  sustainedMs?: number;
  /** Rolling window used to compute the average. Default 1000ms. */
  sampleWindowMs?: number;
  /** Called periodically (~4×/s) with the latest sample. */
  onSample?: (sample: FpsSample) => void;
  /** Called once when FPS is sustained below the threshold. */
  onDrop?: (sample: FpsSample) => void;
  /** Called once after a drop when FPS recovers above the threshold. */
  onRecover?: (sample: FpsSample) => void;
}

interface FrameStamp {
  t: number;
  delta: number;
}

/** Any gap bigger than this is a stall/background tab — not "low FPS". */
const MAX_FRAME_GAP_MS = 500;
const SAMPLE_INTERVAL_MS = 250;

export function startFpsMonitor(options: FpsMonitorOptions = {}): () => void {
  const {
    targetFps = 60,
    lowFpsThreshold = 45,
    sustainedMs = 2000,
    sampleWindowMs = 1000,
    onSample,
    onDrop,
    onRecover,
  } = options;

  let rafId = 0;
  let stopped = false;
  let frames = 0;
  let lastT = performance.now();
  let lastSampleT = lastT;
  let lowSince: number | null = null;
  let dropped = false;
  const window: FrameStamp[] = [];

  const tick = (now: number) => {
    if (stopped) return;

    const delta = now - lastT;
    lastT = now;

    // Skip stalls / hidden tabs so they don't masquerade as low FPS.
    if (delta <= MAX_FRAME_GAP_MS) {
      frames += 1;
      window.push({ t: now, delta });
    }

    // Prune the rolling window.
    const cutoff = now - sampleWindowMs;
    while (window.length > 0 && window[0].t < cutoff) window.shift();

    if (now - lastSampleT >= SAMPLE_INTERVAL_MS) {
      lastSampleT = now;

      const spanMs = window.length > 1 ? window[window.length - 1].t - window[0].t : delta;
      const fps = window.length > 1 && spanMs > 0 ? (window.length / spanMs) * 1000 : targetFps;
      const worstFrameMs = window.length > 0 ? Math.max(...window.map((f) => f.delta)) : delta;

      const sample: FpsSample = { fps, frames, worstFrameMs };
      onSample?.(sample);

      if (fps < lowFpsThreshold) {
        if (lowSince === null) lowSince = now;
        if (!dropped && now - lowSince >= sustainedMs) {
          dropped = true;
          onDrop?.(sample);
        }
      } else {
        if (dropped) {
          dropped = false;
          onRecover?.(sample);
        }
        lowSince = null;
      }
    }

    rafId = requestAnimationFrame(tick);
  };

  rafId = requestAnimationFrame(tick);

  return () => {
    stopped = true;
    cancelAnimationFrame(rafId);
  };
}

export default startFpsMonitor;
