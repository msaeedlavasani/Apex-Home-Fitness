'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';

export type Theme = 'light' | 'dark' | 'system';
export type ResolvedTheme = 'light' | 'dark';

export const THEMES: Theme[] = ['light', 'dark', 'system'];
export const DEFAULT_STORAGE_KEY = 'theme';

interface ThemeProviderProps {
  children: ReactNode;
  /** Theme to use when nothing is persisted. Defaults to 'system'. */
  defaultTheme?: Theme;
  /** localStorage key used to persist the selection. Defaults to 'theme'. */
  storageKey?: string;
  /**
   * Optional cookie name mirrored on every change (path=/, samesite=lax,
   * 1-year max-age). Lets a server component render the SAME theme state
   * the client will hydrate — eliminating hydration mismatches and theme
   * flash on SSR surfaces (used by the admin console; the consumer app
   * does not opt in).
   */
  cookieKey?: string;
}

interface ThemeContextValue {
  /** The user-selected theme ('light' | 'dark' | 'system'). */
  theme: Theme;
  /** Set the active theme. */
  setTheme: (theme: Theme) => void;
  /** The concrete theme currently applied to <html> ('light' | 'dark'). */
  resolvedTheme: ResolvedTheme;
  /** The OS-level preference. Meaningful when theme === 'system'. */
  systemTheme: ResolvedTheme | undefined;
  /** All supported theme values: ['light', 'dark', 'system']. */
  themes: Theme[];
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

function getSystemTheme(): ResolvedTheme {
  if (typeof window === 'undefined' || !window.matchMedia) return 'light';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function getStoredTheme(storageKey: string): Theme | undefined {
  try {
    const stored = window.localStorage.getItem(storageKey);
    if (stored === 'light' || stored === 'dark' || stored === 'system') {
      return stored;
    }
  } catch {
    // localStorage unavailable (private mode / blocked) — fall through
  }
  return undefined;
}

/**
 * Toggles Tailwind's `dark:` variant class on the <html> element and keeps
 * `color-scheme` in sync so native controls (scrollbars, form fields)
 * follow the active theme.
 */
function applyTheme(resolved: ResolvedTheme) {
  const root = document.documentElement;
  root.classList.toggle('dark', resolved === 'dark');
  root.style.colorScheme = resolved;
}

/**
 * Inline script that applies the theme class to <html> BEFORE React hydrates,
 * preventing a flash of the wrong theme (FOUC). Render it inside <head>
 * of the root layout.
 */
export function ThemeScript({
  storageKey = DEFAULT_STORAGE_KEY,
  defaultTheme = 'system',
}: {
  storageKey?: string;
  defaultTheme?: Theme;
}) {
  const script = [
    '(function () {',
    '  try {',
    '    var key = ' + JSON.stringify(storageKey) + ';',
    '    var fallback = ' + JSON.stringify(defaultTheme) + ';',
    '    var stored = null;',
    '    try { stored = window.localStorage.getItem(key); } catch (e) {}',
    '    var theme = stored === "light" || stored === "dark" || stored === "system" ? stored : fallback;',
    '    var dark = window.matchMedia("(prefers-color-scheme: dark)").matches;',
    '    var resolved = theme === "system" ? (dark ? "dark" : "light") : theme;',
    '    var el = document.documentElement;',
    '    if (resolved === "dark") { el.classList.add("dark"); } else { el.classList.remove("dark"); }',
    '    el.style.colorScheme = resolved;',
    '  } catch (e) {}',
    '})();',
  ].join('\n');

  return <script dangerouslySetInnerHTML={{ __html: script }} />;
}

export function ThemeProvider({
  children,
  defaultTheme = 'system',
  storageKey = DEFAULT_STORAGE_KEY,
  cookieKey,
}: ThemeProviderProps) {
  // Match the pre-hydration ThemeScript so React does not briefly render the
  // default light state over a persisted dark page and then flip it back.
  const [theme, setThemeState] = useState<Theme>(() => {
    if (typeof window === 'undefined') return defaultTheme;
    return (
      getStoredTheme(storageKey) ??
      (document.documentElement.classList.contains('dark') ? 'dark' : defaultTheme)
    );
  });
  const [resolvedTheme, setResolvedTheme] = useState<ResolvedTheme>(() => {
    if (typeof window === 'undefined') return 'light';
    if (document.documentElement.classList.contains('dark')) return 'dark';
    return getSystemTheme();
  });
  const [systemTheme, setSystemTheme] = useState<ResolvedTheme>(() => getSystemTheme());

  const didHydrateRef = useRef(false);
  const isFirstPersistRef = useRef(true);

  // Hydrate once, on mount (client only): read localStorage + system pref.
  useEffect(() => {
    if (didHydrateRef.current) return;
    didHydrateRef.current = true;

    const stored = getStoredTheme(storageKey) ?? defaultTheme;
    const sys = getSystemTheme();
    const resolved = stored === 'system' ? sys : stored;

    setSystemTheme(sys);
    setThemeState(stored);
    setResolvedTheme(resolved);
    applyTheme(resolved);
  }, [storageKey, defaultTheme]);

  // Apply the class + persist whenever the theme (or system pref) changes.
  useEffect(() => {
    if (isFirstPersistRef.current) {
      // Skip the very first run — hydration effect handles the initial apply.
      isFirstPersistRef.current = false;
      return;
    }

    const resolved = theme === 'system' ? systemTheme : theme;
    setResolvedTheme(resolved);
    applyTheme(resolved);

    try {
      window.localStorage.setItem(storageKey, theme);
    } catch {
      // Ignore persistence failures; theme still applies for this session.
    }

    if (cookieKey) {
      try {
        document.cookie = `${cookieKey}=${theme}; path=/; max-age=31536000; samesite=lax`;
      } catch {
        // Cookie unavailable — SSR-consistency degrades to localStorage only.
      }
    }
  }, [theme, systemTheme, storageKey, cookieKey]);

  // Follow OS-level changes when in 'system' mode.
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;

    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = (event: MediaQueryListEvent) => {
      const sys: ResolvedTheme = event.matches ? 'dark' : 'light';
      setSystemTheme(sys);
      if (theme === 'system') {
        setResolvedTheme(sys);
        applyTheme(sys);
      }
    };

    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, [theme]);

  const setTheme = useCallback((next: Theme) => {
    setThemeState(next);
  }, []);

  const value = useMemo<ThemeContextValue>(
    () => ({
      theme,
      setTheme,
      resolvedTheme,
      systemTheme,
      themes: THEMES,
    }),
    [theme, setTheme, resolvedTheme, systemTheme],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error('useTheme must be used within a <ThemeProvider>');
  }
  return ctx;
}
