'use client';

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type PointerEvent,
} from 'react';
import { cn } from '@/lib/cn';
import { usePlatform } from '../context/PlatformProvider';
import type { Platform } from '../lib/platform';

export interface SliderProps {
  /** Current value (controlled). */
  value: number;
  min?: number;
  max?: number;
  step?: number;
  onChange?: (value: number) => void;
  disabled?: boolean;
  /** Force a platform variant (defaults to the provider value). */
  platform?: Platform;
  'aria-label'?: string;
  className?: string;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function roundToStep(value: number, step: number, min: number): number {
  return Math.round((value - min) / step) * step + min;
}

/** Track / fill / thumb visuals per platform (thumb size used for centering). */
const TRACK_GEOMETRY: Record<Platform, { track: string; fill: string; thumb: string; thumbHalf: number }> = {
  ios: {
    track: 'absolute top-1/2 h-1 w-full -translate-y-1/2 rounded-full bg-apple-fill',
    fill: 'absolute top-1/2 start-0 h-1 -translate-y-1/2 rounded-full bg-apple-blue',
    thumb:
      'absolute top-1/2 h-7 w-7 -translate-y-1/2 rounded-full bg-white shadow-apple ring-1 ring-black/5 ' +
      'transition-transform duration-150 ease-apple-ease group-active:scale-110',
    thumbHalf: 14,
  },
  android: {
    track: 'absolute top-1/2 h-1 w-full -translate-y-1/2 rounded-full bg-material-surface-container-highest',
    fill: 'absolute top-1/2 start-0 h-1 -translate-y-1/2 rounded-full bg-material-primary',
    thumb:
      'absolute top-1/2 h-5 w-5 -translate-y-1/2 rounded-full bg-material-primary shadow-elevation-1 ' +
      'transition-transform duration-150 ease-material-emphasized group-active:scale-110',
    thumbHalf: 10,
  },
  web: {
    track: 'absolute top-1/2 h-1.5 w-full -translate-y-1/2 rounded-full bg-apex-fill',
    fill: 'absolute top-1/2 start-0 h-1.5 -translate-y-1/2 rounded-full bg-apex-primary',
    thumb:
      'absolute top-1/2 h-5 w-5 -translate-y-1/2 rounded-full bg-apex-primary shadow-md ' +
      'ring-4 ring-[color:var(--apex-focus-ring)]/30 transition-transform duration-150 ease-apple-ease ' +
      'hover:scale-110 group-active:scale-110',
    thumbHalf: 10,
  },
};

const SliderImpl = ({
  platform,
  value,
  min = 0,
  max = 100,
  step = 1,
  onChange,
  disabled,
  'aria-label': ariaLabel,
  className,
}: SliderProps & { platform: Platform }) => {
  const trackRef = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState(false);
  const safeMin = Math.min(min, max);
  const safeMax = Math.max(min, max);
  const pct = safeMax > safeMin ? ((clamp(value, safeMin, safeMax) - safeMin) / (safeMax - safeMin)) * 100 : 0;

  const valueFromClientX = useCallback(
    (clientX: number): number => {
      const el = trackRef.current;
      if (!el || safeMax <= safeMin) return safeMin;
      const rect = el.getBoundingClientRect();
      const rtl = getComputedStyle(el).direction === 'rtl';
      let rel = rect.width > 0 ? (clientX - rect.left) / rect.width : 0;
      if (rtl) rel = 1 - rel;
      const raw = safeMin + rel * (safeMax - safeMin);
      return clamp(Number(roundToStep(raw, step, safeMin).toFixed(4)), safeMin, safeMax);
    },
    [safeMin, safeMax, step]
  );

  const handlePointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (disabled) return;
    event.preventDefault();
    event.currentTarget.setPointerCapture?.(event.pointerId);
    setDragging(true);
    onChange?.(valueFromClientX(event.clientX));
  };

  const handlePointerMove = (event: PointerEvent<HTMLDivElement>) => {
    if (!dragging || disabled) return;
    onChange?.(valueFromClientX(event.clientX));
  };

  const endDrag = () => setDragging(false);

  // Safety net if pointer capture is unavailable (mouse leaves the element).
  useEffect(() => {
    if (!dragging) return;
    const up = () => setDragging(false);
    window.addEventListener('pointerup', up);
    window.addEventListener('pointercancel', up);
    return () => {
      window.removeEventListener('pointerup', up);
      window.removeEventListener('pointercancel', up);
    };
  }, [dragging]);

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (disabled) return;
    const rtl = trackRef.current ? getComputedStyle(trackRef.current).direction === 'rtl' : false;
    const sign = rtl ? -1 : 1;
    let delta = 0;
    if (event.key === 'ArrowUp' || event.key === 'ArrowRight') delta = step * sign;
    else if (event.key === 'ArrowDown' || event.key === 'ArrowLeft') delta = -step * sign;
    else if (event.key === 'Home') {
      event.preventDefault();
      onChange?.(safeMin);
      return;
    } else if (event.key === 'End') {
      event.preventDefault();
      onChange?.(safeMax);
      return;
    }
    if (delta !== 0) {
      event.preventDefault();
      onChange?.(clamp(Number(roundToStep(value + delta, step, safeMin).toFixed(4)), safeMin, safeMax));
    }
  };

  const geometry = TRACK_GEOMETRY[platform];

  return (
    <div className={cn('w-full select-none', disabled && 'opacity-40', className)}>
      <div
        ref={trackRef}
        role="slider"
        aria-label={ariaLabel}
        aria-valuemin={safeMin}
        aria-valuemax={safeMax}
        aria-valuenow={Number(value.toFixed(2))}
        aria-disabled={disabled || undefined}
        tabIndex={disabled ? -1 : 0}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        onKeyDown={handleKeyDown}
        className={cn(
          'group relative flex h-11 w-full cursor-pointer touch-none items-center rounded-full',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--apex-focus-ring)]',
          'focus-visible:ring-offset-2 focus-visible:ring-offset-[color:var(--app-background)]'
        )}
      >
        <span className={geometry.track} />
        <span className={geometry.fill} style={{ width: `${pct}%` }} />
        <span
          className={geometry.thumb}
          style={{ insetInlineStart: `calc(${pct}% - ${geometry.thumbHalf}px)` }}
        />
      </div>
    </div>
  );
};

/** Platform-aware slider — resolves the platform from <PlatformProvider>. */
export function Slider(props: SliderProps) {
  const { platform } = usePlatform();
  return <SliderImpl {...props} platform={props.platform ?? platform} />;
}

/** Apple HIG (iOS) slider — pinned (thin track, system blue, 28 px thumb). */
export function IosSlider(props: SliderProps) {
  return <SliderImpl {...props} platform="ios" />;
}

/** Material 3 (Android) slider — pinned (M3 track/thumb, elevation). */
export function AndroidSlider(props: SliderProps) {
  return <SliderImpl {...props} platform="android" />;
}

/** Custom responsive (Web) slider — pinned (brand accent, hover ring). */
export function WebSlider(props: SliderProps) {
  return <SliderImpl {...props} platform="web" />;
}

export default Slider;
