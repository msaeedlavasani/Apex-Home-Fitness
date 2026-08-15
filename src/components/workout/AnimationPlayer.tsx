'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Lottie, { type LottieRefCurrentProps } from 'lottie-react';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { startFpsMonitor, type FpsSample } from '@/lib/animationFps';

export type AnimationType = 'lottie' | 'video';

export interface AnimationPlayerProps {
  /**
   * URL or path to the animation asset.
   * - Lottie: `.json` (e.g. `/animations/push-up.json`)
   * - Video: `.mp4` / `.webm` / `.ogg` / `.ogv` / `.mov` / `.m4v` (e.g. `/videos/squat.mp4`)
   */
  src: string;
  /** Whether to loop the animation/video. Defaults to `true`. */
  loop?: boolean;
  /** Whether to autoplay on mount. Defaults to `true`. */
  autoplay?: boolean;
  /**
   * Force a renderer. When omitted, the renderer is inferred from the file
   * extension (`.json` → Lottie, everything else → video).
   */
  type?: AnimationType;
  /** CSS class applied to the media element (Lottie container or <video>). */
  className?: string;
  /** Inline styles applied to the media element. */
  style?: React.CSSProperties;
  /** Poster image shown until a video starts playing (video only). */
  poster?: string;
  /** Show native video controls (video only). Defaults to `false`. */
  controls?: boolean;
  /**
   * Mute the video. Defaults to `true` — muted autoplay is required by most
   * browsers' autoplay policies and suits in-workout demonstration clips.
   */
  muted?: boolean;
  /** Accessible label describing the animation. */
  ariaLabel?: string;
  /** Called when the asset fails to load or decode. */
  onError?: () => void;
  /**
   * Static image shown instead of the animation when motion is reduced
   * (`prefers-reduced-motion: reduce`) or after a sustained FPS drop on
   * a low-end device. When omitted, a plain placeholder keeps the layout
   * slot (no fetch, no renderer — zero cost).
   */
  fallbackSrc?: string;
  /**
   * Honor `prefers-reduced-motion` by skipping the animation entirely and
   * rendering the static fallback. Defaults to `true` (accessibility first).
   */
  respectReducedMotion?: boolean;
  /**
   * Watch real rendered FPS while the Lottie animation plays and swap to
   * the static fallback on sustained drops (< 45fps for 2s). Defaults to
   * `true`. This is the "lightweight fallback" for complex animations on
   * mid-range hardware — see scripts/audit-lottie-fps.mjs for the audit.
   */
  fpsMonitorEnabled?: boolean;
  /** Fired when the FPS monitor swaps to the static fallback. */
  onFpsDrop?: (sample: FpsSample) => void;
}

const VIDEO_EXTENSIONS = new Set(['mp4', 'webm', 'ogg', 'ogv', 'mov', 'm4v']);

/** Extracts the lowercase file extension from a URL/path, ignoring query/hash. */
export function getFileExtension(src: string): string {
  const clean = src.split(/[?#]/)[0] ?? '';
  const match = /\.([a-z0-9]+)$/i.exec(clean);
  return match ? match[1].toLowerCase() : '';
}

/** True when the asset is a Lottie JSON file. */
export function isLottieSource(src: string): boolean {
  return getFileExtension(src) === 'json';
}

/**
 * Infers the renderer from the file extension.
 * `.json` → Lottie; known video extensions → video;
 * anything unknown falls back to video with a console warning.
 */
export function inferAnimationType(src: string): AnimationType {
  const ext = getFileExtension(src);

  if (isLottieSource(src)) {
    return 'lottie';
  }

  if (VIDEO_EXTENSIONS.has(ext)) {
    return 'video';
  }

  console.warn(
    `[AnimationPlayer] Unrecognized file extension "${ext ? `.${ext}` : src}" for "${src}" — falling back to <video>. Pass an explicit \`type\` prop to override.`
  );

  return 'video';
}

/**
 * StaticFallback — zero-cost stand-in for the animation.
 * Renders a poster image when `src` is provided, otherwise an empty
 * `role="img"` slot that preserves the layout while consuming no CPU/GPU.
 */
function StaticFallback({
  src,
  className,
  style,
  ariaLabel,
}: {
  src?: string;
  className?: string;
  style?: React.CSSProperties;
  ariaLabel?: string;
}) {
  if (src) {
    return (
      <img
        src={src}
        alt={ariaLabel ?? ''}
        className={className}
        style={{ width: '100%', height: '100%', objectFit: 'contain', ...style }}
        draggable={false}
      />
    );
  }
  return (
    <div
      className={className}
      style={style}
      role="img"
      aria-label={ariaLabel}
    />
  );
}

interface LottieAnimationProps {
  src: string;
  loop: boolean;
  autoplay: boolean;
  className?: string;
  style?: React.CSSProperties;
  ariaLabel?: string;
  onError?: () => void;
  fallbackSrc?: string;
  fpsMonitorEnabled?: boolean;
  onFpsDrop?: (sample: FpsSample) => void;
}

/**
 * Lottie branch with performance safeguards:
 *
 *   1. **Reduced motion** — never fetches or mounts the Lottie renderer;
 *      renders the static fallback instead (zero CPU/GPU, no network).
 *   2. **Visibility pause** — an IntersectionObserver pauses playback
 *      while the animation is off-screen (scrolled out / hidden), so a
 *      looping exercise animation never burns frames it can't be seen.
 *   3. **FPS monitor** — while playing, real rendered FPS is sampled. A
 *      *sustained* drop below 45fps for 2s swaps the animation for the
 *      static fallback (lightweight fallback for complex JSON on
 *      low-end hardware) and fires `onFpsDrop`.
 */
function LottieAnimation({
  src,
  loop,
  autoplay,
  className,
  style,
  ariaLabel,
  onError,
  fallbackSrc,
  fpsMonitorEnabled = true,
  onFpsDrop,
}: LottieAnimationProps) {
  // Keep the latest callbacks without re-running effects.
  const onErrorRef = useRef(onError);
  useEffect(() => {
    onErrorRef.current = onError;
  });
  const onFpsDropRef = useRef(onFpsDrop);
  useEffect(() => {
    onFpsDropRef.current = onFpsDrop;
  });

  const reducedMotion = useReducedMotion();

  const [animationData, setAnimationData] = useState<unknown>(null);
  const [failed, setFailed] = useState(false);
  /** True after a sustained FPS drop — the animation is swapped for the fallback. */
  const [degraded, setDegraded] = useState(false);
  /** Whether the container is currently in the viewport. */
  const [visible, setVisible] = useState(true);

  const containerRef = useRef<HTMLDivElement | null>(null);
  const lottieRef = useRef<LottieRefCurrentProps | null>(null);

  // Reduced motion: skip the fetch entirely — the fallback is instant.
  const skipAnimation = reducedMotion || degraded || failed;

  // ---- Asset fetch (only when the animation will actually run) ----
  useEffect(() => {
    if (reducedMotion || degraded) {
      setAnimationData(null);
      setFailed(false);
      return;
    }

    let cancelled = false;
    setAnimationData(null);
    setFailed(false);

    fetch(src)
      .then((res) => {
        if (!res.ok) {
          throw new Error(`HTTP ${res.status} while loading ${src}`);
        }
        return res.json();
      })
      .then((data) => {
        if (!cancelled) {
          setAnimationData(data);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setFailed(true);
          onErrorRef.current?.();
        }
      });

    return () => {
      cancelled = true;
    };
  }, [src, reducedMotion, degraded]);

  // ---- Visibility pause (IntersectionObserver) ----
  useEffect(() => {
    const node = containerRef.current;
    if (!node || typeof IntersectionObserver === 'undefined') return;

    const observer = new IntersectionObserver(
      (entries) => {
        setVisible(entries[0]?.isIntersecting ?? true);
      },
      { threshold: 0.05 }
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  // ---- Keep playback in sync with visibility ----
  useEffect(() => {
    const anim = lottieRef.current?.animationItem;
    if (!anim || !animationData) return;
    if (!visible) {
      anim.pause();
    } else if (autoplay) {
      anim.play();
    }
  }, [visible, animationData, autoplay]);

  // ---- FPS monitor: swap to the static fallback on sustained drops ----
  useEffect(() => {
    if (!fpsMonitorEnabled || !animationData || skipAnimation || !visible) return;
    if (reducedMotion) return;

    const stop = startFpsMonitor({
      lowFpsThreshold: 45,
      sustainedMs: 2000,
      onDrop: (sample) => {
        setDegraded(true);
        onFpsDropRef.current?.(sample);
      },
    });

    return stop;
  }, [fpsMonitorEnabled, animationData, visible, skipAnimation, reducedMotion]);

  // Layout slot is always preserved (loading / failure / reduced motion).
  if (!animationData || skipAnimation) {
    return (
      <StaticFallback
        src={skipAnimation ? fallbackSrc : undefined}
        className={className}
        style={style}
        ariaLabel={failed ? undefined : ariaLabel}
      />
    );
  }

  const assetsPath = src.slice(0, src.lastIndexOf('/') + 1);

  return (
    <div ref={containerRef} className={className} style={style}>
      <Lottie
        key={src}
        lottieRef={lottieRef}
        animationData={animationData}
        assetsPath={assetsPath}
        loop={loop}
        autoplay={autoplay}
        style={{ width: '100%', height: '100%' }}
        rendererSettings={{
          // Match the default <video> behavior: contain, centered.
          preserveAspectRatio: 'xMidYMid meet',
        }}
        aria-label={ariaLabel}
      />
    </div>
  );
}

/**
 * AnimationPlayer — renders a looping workout animation inside the Workout Player.
 *
 * Intelligently switches the renderer based on the file extension:
 *   - `.json` → Lottie (lottie-react)
 *   - `.mp4` / `.webm` / `.ogg` / `.ogv` / `.mov` / `.m4v` → native <video>
 *
 * Performance & accessibility:
 *   - Honors `prefers-reduced-motion` (static fallback, no renderer mount).
 *   - Pauses Lottie playback while off-screen (IntersectionObserver).
 *   - Monitors real FPS and swaps complex Lottie JSON to a lightweight
 *     static fallback on sustained drops below 45fps.
 *   - Both branches loop, autoplay and are keyed by `src`, so switching
 *     exercises remounts the media element cleanly.
 *
 * @example
 *   <AnimationPlayer src="/animations/push-up.json" />
 *   <AnimationPlayer src="/videos/squat.mp4" poster="/posters/squat.jpg" />
 *
 *   // Static poster for reduced-motion users / low-end devices:
 *   <AnimationPlayer src="/animations/push-up.json" fallbackSrc="/posters/push-up.jpg" />
 *
 *   // Inside WorkoutPlayer (per-exercise asset):
 *   {currentExercise.animationSrc && (
 *     <AnimationPlayer src={currentExercise.animationSrc} className="h-64" />
 *   )}
 */
export default function AnimationPlayer({
  src,
  loop = true,
  autoplay = true,
  type,
  className,
  style,
  poster,
  controls = false,
  muted = true,
  ariaLabel,
  onError,
  fallbackSrc,
  respectReducedMotion = true,
  fpsMonitorEnabled = true,
  onFpsDrop,
}: AnimationPlayerProps) {
  const reducedMotion = useReducedMotion();
  const renderer = useMemo<AnimationType>(
    () => type ?? inferAnimationType(src),
    [src, type]
  );

  if (!src) {
    return null;
  }

  if (renderer === 'lottie') {
    // Reduced motion: never mount the Lottie renderer at all.
    if (respectReducedMotion && reducedMotion) {
      return (
        <StaticFallback
          src={fallbackSrc}
          className={className}
          style={style}
          ariaLabel={ariaLabel}
        />
      );
    }

    return (
      <LottieAnimation
        src={src}
        loop={loop}
        autoplay={autoplay}
        className={className}
        style={style}
        ariaLabel={ariaLabel}
        onError={onError}
        fallbackSrc={fallbackSrc}
        fpsMonitorEnabled={fpsMonitorEnabled}
        onFpsDrop={onFpsDrop}
      />
    );
  }

  return (
    <video
      key={src}
      className={className}
      style={{
        width: '100%',
        height: '100%',
        objectFit: 'contain',
        ...style,
      }}
      src={src}
      poster={poster}
      loop={loop}
      autoPlay={autoplay}
      muted={muted}
      playsInline
      controls={controls}
      preload="auto"
      aria-label={ariaLabel}
      onError={onError}
    />
  );
}
