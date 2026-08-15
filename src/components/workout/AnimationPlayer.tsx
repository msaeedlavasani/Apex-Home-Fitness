'use client';

import {useEffect, useMemo, useRef, useState} from 'react';
import Lottie from 'lottie-react';

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

interface LottieAnimationProps {
  src: string;
  loop: boolean;
  autoplay: boolean;
  className?: string;
  style?: React.CSSProperties;
  ariaLabel?: string;
  onError?: () => void;
}

/**
 * Lottie branch: fetches the JSON and hands it to lottie-react via
 * `animationData` (lottie-react's `src` prop is silently ignored by
 * lottie-web, and `path` is not part of its public types). `assetsPath`
 * keeps relative image assets inside the JSON resolving next to the file.
 */
function LottieAnimation({src, loop, autoplay, className, style, ariaLabel, onError}: LottieAnimationProps) {
  // Keep the latest callback without re-running the fetch effect.
  const onErrorRef = useRef(onError);
  useEffect(() => {
    onErrorRef.current = onError;
  });

  const [animationData, setAnimationData] = useState<unknown>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
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
  }, [src]);

  // Keep the layout slot while loading / after a failure.
  if (!animationData) {
    return (
      <div
        className={className}
        style={style}
        role="img"
        aria-label={failed ? undefined : ariaLabel}
      />
    );
  }

  const assetsPath = src.slice(0, src.lastIndexOf('/') + 1);

  return (
    <Lottie
      key={src}
      animationData={animationData}
      assetsPath={assetsPath}
      loop={loop}
      autoplay={autoplay}
      className={className}
      style={style}
      aria-label={ariaLabel}
    />
  );
}

/**
 * AnimationPlayer — renders a looping workout animation inside the Workout Player.
 *
 * Intelligently switches the renderer based on the file extension:
 *   - `.json` → Lottie (lottie-react)
 *   - `.mp4` / `.webm` / `.ogg` / `.ogv` / `.mov` / `.m4v` → native <video>
 *
 * Both branches loop, autoplay and are keyed by `src`, so switching exercises
 * remounts the media element cleanly.
 *
 * @example
 *   <AnimationPlayer src="/animations/push-up.json" />
 *   <AnimationPlayer src="/videos/squat.mp4" poster="/posters/squat.jpg" />
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
}: AnimationPlayerProps) {
  const renderer = useMemo<AnimationType>(
    () => type ?? inferAnimationType(src),
    [src, type]
  );

  if (!src) {
    return null;
  }

  if (renderer === 'lottie') {
    return (
      <LottieAnimation
        src={src}
        loop={loop}
        autoplay={autoplay}
        className={className}
        style={style}
        ariaLabel={ariaLabel}
        onError={onError}
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
