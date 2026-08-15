'use client';

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { detectPlatform, platformToCss, type Platform } from '../lib/platform';

const STORAGE_KEY = 'ui-platform';

export interface PlatformContextValue {
  /** Active platform — a manual override wins over UA detection. */
  platform: Platform;
  /** Switch platform at runtime (persisted to localStorage). */
  setPlatform: (platform: Platform) => void;
  /** Platform detected from the UA on mount (never overridden). */
  detectedPlatform: Platform;
  isIOS: boolean;
  isAndroid: boolean;
  isWeb: boolean;
}

const PlatformContext = createContext<PlatformContextValue | undefined>(undefined);

export interface PlatformProviderProps {
  children: ReactNode;
  /** Bootstrap platform; defaults to `web` until detection runs on mount. */
  defaultPlatform?: Platform;
  /** Disable UA detection (useful for tests / previews / design docs). */
  detectOnMount?: boolean;
  /** localStorage key used to persist a manual override. */
  storageKey?: string;
}

/**
 * PlatformProvider
 * ----------------
 * Detects iOS / Android / Web once on mount, exposes it through
 * `usePlatform()`, and mirrors it onto `<html data-platform="ios|material">`
 * so the neutral CSS tokens (`.glass`, `.card-surface`, `.surface-1..5`)
 * render the correct platform look.
 *
 * A manual `setPlatform()` override is persisted and takes precedence over
 * detection — great for in-app "preview as iOS / Android / Web" toggles.
 *
 * SSR note: during the first (server) render the provider reports
 * `defaultPlatform` ('web'), then hydrates to the detected platform — the
 * same pattern as ThemeProvider.
 */
export function PlatformProvider({
  children,
  defaultPlatform = 'web',
  detectOnMount = true,
  storageKey = STORAGE_KEY,
}: PlatformProviderProps) {
  const [detectedPlatform, setDetectedPlatform] = useState<Platform>(defaultPlatform);
  const [platform, setPlatformState] = useState<Platform>(defaultPlatform);

  // Detect once on mount (client only).
  useEffect(() => {
    if (!detectOnMount) return;
    const detected = detectPlatform(navigator.userAgent, navigator.maxTouchPoints);
    setDetectedPlatform(detected);

    let stored: Platform | null = null;
    try {
      const raw = window.localStorage.getItem(storageKey);
      if (raw === 'ios' || raw === 'android' || raw === 'web') stored = raw;
    } catch {
      // localStorage unavailable — fall through to the detected platform
    }
    setPlatformState(stored ?? detected);
  }, [detectOnMount, storageKey]);

  // Mirror the platform onto <html data-platform="…"> for the CSS layer.
  useEffect(() => {
    document.documentElement.dataset.platform = platformToCss(platform);
  }, [platform]);

  const value = useMemo<PlatformContextValue>(
    () => ({
      platform,
      setPlatform: (next: Platform) => {
        setPlatformState(next);
        try {
          window.localStorage.setItem(storageKey, next);
        } catch {
          // ignore persistence failures; theme still applies this session
        }
      },
      detectedPlatform,
      isIOS: platform === 'ios',
      isAndroid: platform === 'android',
      isWeb: platform === 'web',
    }),
    [platform, detectedPlatform, storageKey]
  );

  return <PlatformContext.Provider value={value}>{children}</PlatformContext.Provider>;
}

const NOOP = () => {};

/**
 * usePlatform
 * -----------
 * Read the active platform. Works without a <PlatformProvider> too: in that
 * case the platform is detected from the UA on mount (SSR-safe default: web),
 * so every component in the kit can be dropped into any page standalone.
 */
export function usePlatform(): PlatformContextValue {
  const ctx = useContext(PlatformContext);
  const [fallback, setFallback] = useState<Platform>('web');

  useEffect(() => {
    if (!ctx) {
      setFallback(detectPlatform(navigator.userAgent, navigator.maxTouchPoints));
    }
  }, [ctx]);

  if (ctx) return ctx;

  return {
    platform: fallback,
    setPlatform: NOOP,
    detectedPlatform: fallback,
    isIOS: fallback === 'ios',
    isAndroid: fallback === 'android',
    isWeb: fallback === 'web',
  };
}
