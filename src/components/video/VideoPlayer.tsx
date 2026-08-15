'use client';

/**
 * VideoPlayer — enhanced video player for the Apex Exercise Library.
 * ----------------------------------------------------------------
 * - HLS (`.m3u8`) via `hls.js` with fatal-error recovery (network retry /
 *   media recovery), falling back to Safari/iPadOS native HLS when
 *   `MediaSource` is unavailable.
 * - Standard progressive sources (`.mp4` / `.webm`) via the native <video>.
 * - High-visibility custom controls following the Apex Platform Design
 *   System (brand coral `apex-*` tokens, platform `Slider`, focus rings,
 *   glass overlays, Apple-ease motion):
 *     • play / pause           • seek (design-system Slider, RTL-aware)
 *     • mute / unmute          • fullscreen
 *     • offline download placeholder (streaming-only for now)
 * - Keyboard shortcuts: Space/K play·pause · M mute · F fullscreen ·
 *   ←/→ seek ±10 s · Home/End jump to start/end.
 * - Controls auto-hide after 3 s of playback; reappear on hover/tap/focus.
 *
 * @example
 *   <VideoPlayer
 *     src="https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8"
 *     poster="/posters/push-ups.jpg"
 *     title="Push-Up Progression"
 *   />
 */

import Hls from 'hls.js';
import {useTranslations} from 'next-intl';
import {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {
  AlertTriangle,
  Download,
  Loader2,
  Maximize,
  Minimize,
  Pause,
  Play,
  RotateCcw,
  Volume2,
  VolumeX,
} from 'lucide-react';
import {Button} from '@/components/ui/platform';
import {Slider} from '@/components/ui/platform';
import {cn} from '@/lib/cn';

export interface VideoPlayerProps {
  /**
   * Video URL. `.m3u8` (with optional query string) is treated as HLS and
   * played through hls.js (or native HLS on Safari). Anything else is
   * handed to the native <video> element.
   */
  src: string;
  /** Poster image shown until playback starts. */
  poster?: string;
  /** Accessible title for the player region (used as the aria-label). */
  title?: string;
  /** Attempt autoplay once the source is ready (muted autoplay is browser-safe). */
  autoPlay?: boolean;
  /** Start muted. Defaults to `false`. */
  muted?: boolean;
  /** Show the offline-download placeholder control. Defaults to `true`. */
  showDownload?: boolean;
  /**
   * Called with the video URL when the user taps the download control.
   * When omitted, an in-player placeholder explains that offline downloads
   * are coming soon (no file is actually saved).
   */
  onDownload?: (src: string) => void;
  /** Called when playback reaches the end of the video. */
  onEnded?: () => void;
  className?: string;
}

/** Seconds to jump when the arrow keys are used. */
const SEEK_STEP = 10;
/** Milliseconds before the controls fade out during playback. */
const CONTROLS_IDLE_MS = 3000;

/** Formats a duration in seconds as `m:ss` or `h:mm:ss`. */
function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return '0:00';
  const total = Math.floor(seconds);
  const s = total % 60;
  const m = Math.floor((total / 60) % 60);
  const h = Math.floor(total / 3600);
  const mm = h > 0 ? String(m).padStart(2, '0') : String(m);
  const ss = String(s).padStart(2, '0');
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}

/** Compact, high-contrast icon button for the control bar. */
function ControlButton({
  label,
  onClick,
  children,
  className,
}: {
  label: string;
  onClick: () => void;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={(event) => {
        event.stopPropagation();
        onClick();
      }}
      className={cn(
        'flex h-11 w-11 shrink-0 touch-manipulation items-center justify-center rounded-full',
        'bg-white/15 text-white backdrop-blur-md transition-all duration-150 ease-apple-ease',
        'hover:bg-white/30 active:scale-90',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/80 focus-visible:ring-offset-2 focus-visible:ring-offset-black',
        className
      )}
    >
      {children}
    </button>
  );
}

export function VideoPlayer({
  src,
  poster,
  title,
  autoPlay = false,
  muted = false,
  showDownload = true,
  onDownload,
  onEnded,
  className,
}: VideoPlayerProps) {
  const t = useTranslations('Library.player');

  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const hideTimerRef = useRef<number | null>(null);
  const downloadTimerRef = useRef<number | null>(null);
  const onEndedRef = useRef(onEnded);

  // Keep the latest onEnded callback without re-binding the video events.
  useEffect(() => {
    onEndedRef.current = onEnded;
  });

  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(Boolean(muted));
  const [buffering, setBuffering] = useState(false);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState(false);
  const [controlsVisible, setControlsVisible] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const [downloadState, setDownloadState] = useState<'idle' | 'pending' | 'unavailable'>('idle');

  /** True when the source is an HLS master/playlist. */
  const isHls = useMemo(() => /\.m3u8($|\?)/i.test(src), [src]);
  /** Safari / iPadOS can play HLS natively without MSE. */
  const nativeHls = useMemo(
    () => isHls && typeof window !== 'undefined' && !Hls.isSupported(),
    [isHls]
  );

  /* ------------------------------------------------------------------ *
   * Source wiring — hls.js for HLS, native <video> otherwise.
   * Re-runs when the src changes or the user hits Retry (reloadKey).
   * ------------------------------------------------------------------ */
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    let hls: Hls | null = null;
    let cancelled = false;

    setReady(false);
    setError(false);
    setPlaying(false);
    setCurrentTime(0);
    setDuration(0);

    if (isHls && Hls.isSupported()) {
      hls = new Hls({enableWorker: true, lowLatencyMode: false});
      hlsRef.current = hls;

      hls.loadSource(src);
      hls.attachMedia(video);

      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        if (!cancelled) setReady(true);
      });

      hls.on(Hls.Events.ERROR, (_event, data) => {
        if (cancelled || !data.fatal) return;
        if (data.type === Hls.ErrorTypes.NETWORK_ERROR) {
          // Transient network failure — transparently restart loading.
          hls?.startLoad();
        } else if (data.type === Hls.ErrorTypes.MEDIA_ERROR) {
          // Decode/append hiccup — try to recover without a reload.
          hls?.recoverMediaError();
        } else {
          setError(true);
          hls?.destroy();
          hlsRef.current = null;
        }
      });
    } else if (nativeHls) {
      // Native HLS path (Safari) — let the browser manage the playlist.
      video.src = src;
      setReady(true);
    } else {
      // Standard progressive source (.mp4 / .webm / …).
      video.src = src;
      setReady(true);
    }

    return () => {
      cancelled = true;
      hls?.destroy();
      hlsRef.current = null;
    };
  }, [src, isHls, nativeHls, reloadKey]);

  /* Sync the muted state onto the media element (incl. autoplay-safe). */
  useEffect(() => {
    const video = videoRef.current;
    if (video) video.muted = isMuted;
  }, [isMuted]);

  /* Media events → React state. */
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const onTimeUpdate = () => setCurrentTime(video.currentTime);
    const onDurationChange = () => setDuration(Number.isFinite(video.duration) ? video.duration : 0);
    const onPlay = () => setPlaying(true);
    const onPause = () => setPlaying(false);
    const onWaiting = () => setBuffering(true);
    const onPlaying = () => setBuffering(false);
    const onCanPlay = () => setBuffering(false);
    const onEnded = () => {
      setPlaying(false);
      onEndedRef.current?.();
    };
    const onError = () => {
      // Only surface the error when we were expecting a source to play.
      if (video.error) setError(true);
    };

    video.addEventListener('timeupdate', onTimeUpdate);
    video.addEventListener('durationchange', onDurationChange);
    video.addEventListener('play', onPlay);
    video.addEventListener('pause', onPause);
    video.addEventListener('waiting', onWaiting);
    video.addEventListener('playing', onPlaying);
    video.addEventListener('canplay', onCanPlay);
    video.addEventListener('ended', onEnded);
    video.addEventListener('error', onError);

    return () => {
      video.removeEventListener('timeupdate', onTimeUpdate);
      video.removeEventListener('durationchange', onDurationChange);
      video.removeEventListener('play', onPlay);
      video.removeEventListener('pause', onPause);
      video.removeEventListener('waiting', onWaiting);
      video.removeEventListener('playing', onPlaying);
      video.removeEventListener('canplay', onCanPlay);
      video.removeEventListener('ended', onEnded);
      video.removeEventListener('error', onError);
    };
  }, [reloadKey]);

  /* Fullscreen state tracking (iOS Safari has no fullscreenchange support). */
  useEffect(() => {
    const onChange = () => setIsFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener('fullscreenchange', onChange);
    return () => document.removeEventListener('fullscreenchange', onChange);
  }, []);

  /* Auto-dismiss the "coming soon" offline-download pill. */
  useEffect(() => {
    if (downloadState !== 'unavailable') return;
    const id = window.setTimeout(() => setDownloadState('idle'), 2600);
    return () => window.clearTimeout(id);
  }, [downloadState]);

  /* Cleanup timers on unmount. */
  useEffect(() => {
    return () => {
      if (hideTimerRef.current) window.clearTimeout(hideTimerRef.current);
      if (downloadTimerRef.current) window.clearTimeout(downloadTimerRef.current);
    };
  }, []);

  /* ------------------------------------------------------------------ *
   * Actions
   * ------------------------------------------------------------------ */
  const showControlsTemporarily = useCallback(() => {
    setControlsVisible(true);
    if (hideTimerRef.current) window.clearTimeout(hideTimerRef.current);
    hideTimerRef.current = window.setTimeout(() => {
      const video = videoRef.current;
      if (video && !video.paused && !video.seeking) setControlsVisible(false);
    }, CONTROLS_IDLE_MS);
  }, []);

  const togglePlay = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) {
      void video.play().catch(() => {
        // Autoplay was blocked — surface the big play button instead.
        setPlaying(false);
      });
    } else {
      video.pause();
    }
  }, []);

  const seekTo = useCallback((time: number) => {
    const video = videoRef.current;
    if (!video || !Number.isFinite(time)) return;
    video.currentTime = Math.min(Math.max(time, 0), video.duration || 0);
    setCurrentTime(video.currentTime);
  }, []);

  const toggleFullscreen = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    if (document.fullscreenElement) {
      void document.exitFullscreen().catch(() => {});
    } else {
      void el.requestFullscreen?.().catch(() => {});
    }
  }, []);

  const retry = useCallback(() => {
    setError(false);
    setReloadKey((key) => key + 1);
  }, []);

  /* Offline download — placeholder until real offline storage ships. */
  const handleDownload = useCallback(() => {
    if (onDownload) {
      onDownload(src);
      return;
    }
    setDownloadState('pending');
    if (downloadTimerRef.current) window.clearTimeout(downloadTimerRef.current);
    downloadTimerRef.current = window.setTimeout(() => setDownloadState('unavailable'), 900);
  }, [onDownload, src]);

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLDivElement>) => {
      const video = videoRef.current;
      if (!video) return;
      switch (event.key) {
        case ' ':
        case 'k':
          event.preventDefault();
          togglePlay();
          break;
        case 'm':
          event.preventDefault();
          setIsMuted((value) => !value);
          break;
        case 'f':
          event.preventDefault();
          toggleFullscreen();
          break;
        case 'ArrowRight':
          event.preventDefault();
          seekTo(video.currentTime + SEEK_STEP);
          break;
        case 'ArrowLeft':
          event.preventDefault();
          seekTo(video.currentTime - SEEK_STEP);
          break;
        case 'Home':
          event.preventDefault();
          seekTo(0);
          break;
        case 'End':
          event.preventDefault();
          seekTo(video.duration || 0);
          break;
        default:
          return;
      }
      showControlsTemporarily();
    },
    [togglePlay, seekTo, toggleFullscreen, showControlsTemporarily]
  );

  const seekMax = duration > 0 ? duration : 1;

  return (
    <div
      ref={containerRef}
      role="group"
      aria-label={title ?? t('loading')}
      tabIndex={0}
      onKeyDown={handleKeyDown}
      onMouseMove={showControlsTemporarily}
      onMouseLeave={() => {
        if (playing) setControlsVisible(false);
      }}
      onClick={() => {
        if (!controlsVisible) showControlsTemporarily();
        else togglePlay();
      }}
      onDoubleClick={toggleFullscreen}
      className={cn(
        'relative aspect-video w-full select-none overflow-hidden bg-black outline-none',
        'focus-visible:ring-2 focus-visible:ring-[color:var(--apex-focus-ring)]',
        className
      )}
    >
      {/* Media element (keyed by reloadKey so Retry remounts it cleanly) */}
      <video
        key={reloadKey}
        ref={videoRef}
        poster={poster}
        playsInline
        preload="auto"
        className="h-full w-full object-contain"
      />

      {/* Buffering spinner */}
      {!error && buffering && (
        <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center">
          <Loader2 className="h-12 w-12 animate-spin text-white drop-shadow-lg" aria-hidden="true" />
          <span className="sr-only">{t('buffering')}</span>
        </div>
      )}

      {/* Big centre play affordance (high-visibility brand coral) */}
      {!error && !playing && ready && (
        <button
          type="button"
          aria-label={t('play')}
          onClick={(event) => {
            event.stopPropagation();
            togglePlay();
          }}
          className="absolute inset-0 z-10 flex items-center justify-center bg-black/10 transition-colors hover:bg-black/20"
        >
          <span className="flex h-20 w-20 items-center justify-center rounded-full bg-apex-primary text-apex-on-primary shadow-2xl ring-4 ring-white/30 transition-transform duration-150 ease-apple-ease hover:scale-105 active:scale-95">
            <Play className="h-9 w-9 translate-x-0.5 fill-current" aria-hidden="true" />
          </span>
        </button>
      )}

      {/* Fatal error state */}
      {error && (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-3 bg-black/85 p-6 text-center">
          <AlertTriangle className="h-10 w-10 text-apex-state-alert" aria-hidden="true" />
          <p className="text-sm font-semibold text-white">{t('error')}</p>
          <Button
            size="sm"
            variant="outlined"
            icon={<RotateCcw className="h-4 w-4" />}
            onClick={(event) => {
              event.stopPropagation();
              retry();
            }}
            className="text-white [&>span]:text-white"
          >
            {t('retry')}
          </Button>
        </div>
      )}

      {/* "Offline downloads coming soon" placeholder pill */}
      {downloadState === 'unavailable' && (
        <div className="pointer-events-none absolute inset-x-0 top-3 z-20 flex justify-center px-4">
          <div className="flex items-center gap-2 rounded-full bg-black/80 px-4 py-2 text-xs font-semibold text-white shadow-xl ring-1 ring-white/25 backdrop-blur">
            <Download className="h-4 w-4 text-apex-primary" aria-hidden="true" />
            {t('downloadSoon')}
          </div>
        </div>
      )}

      {/* Control bar — auto-hides while playing, reappears on hover/tap */}
      <div
        className={cn(
          'absolute inset-x-0 bottom-0 z-10 bg-gradient-to-t from-black/90 via-black/50 to-transparent',
          'px-3 pb-2 pt-12 transition-opacity duration-300 ease-apple-ease sm:px-4 sm:pb-3',
          controlsVisible ? 'opacity-100' : 'pointer-events-none opacity-0'
        )}
      >
        {/* Seek row */}
        <div className="flex items-center gap-3">
          <Slider
            value={Math.min(currentTime, seekMax)}
            min={0}
            max={seekMax}
            step={0.1}
            onChange={seekTo}
            disabled={!duration}
            aria-label={t('seek')}
            className="flex-1"
          />
          <span
            className="shrink-0 text-xs font-semibold tabular-nums text-white drop-shadow"
            aria-live="off"
          >
            {formatTime(currentTime)} / {formatTime(duration)}
          </span>
        </div>

        {/* Transport row */}
        <div className="mt-1 flex items-center gap-1.5">
          <ControlButton label={playing ? t('pause') : t('play')} onClick={togglePlay}>
            {playing ? (
              <Pause className="h-5 w-5 fill-current" aria-hidden="true" />
            ) : (
              <Play className="h-5 w-5 translate-x-px fill-current" aria-hidden="true" />
            )}
          </ControlButton>

          <ControlButton label={isMuted ? t('unmute') : t('mute')} onClick={() => setIsMuted((value) => !value)}>
            {isMuted ? (
              <VolumeX className="h-5 w-5" aria-hidden="true" />
            ) : (
              <Volume2 className="h-5 w-5" aria-hidden="true" />
            )}
          </ControlButton>

          <div className="flex-1" />

          {showDownload && (
            <Button
              size="sm"
              variant="tonal"
              icon={<Download className="h-4 w-4" />}
              loading={downloadState === 'pending'}
              onClick={(event) => {
                event.stopPropagation();
                handleDownload();
              }}
              className="bg-white/15 text-white backdrop-blur-md hover:bg-white/25"
              title={t('download')}
            >
              {t('download')}
            </Button>
          )}

          <ControlButton
            label={isFullscreen ? t('exitFullscreen') : t('fullscreen')}
            onClick={toggleFullscreen}
          >
            {isFullscreen ? (
              <Minimize className="h-5 w-5" aria-hidden="true" />
            ) : (
              <Maximize className="h-5 w-5" aria-hidden="true" />
            )}
          </ControlButton>
        </div>
      </div>
    </div>
  );
}

export default VideoPlayer;
