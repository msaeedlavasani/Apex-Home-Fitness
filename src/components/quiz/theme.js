/**
 * Theme persistence + immediate-apply helpers for the onboarding quiz.
 *
 * IMPORTANT — this module mirrors the exact contract implemented by the
 * app-wide `src/components/providers/ThemeProvider.tsx`:
 *
 *   - storage key:  'theme'        (localStorage)
 *   - values:       'light' | 'dark' | 'system'
 *   - applied to:   <html>  — toggles the `dark` class and sets
 *                   `style.colorScheme` (see `globals.css` `.dark body`
 *                   and Tailwind `darkMode: 'class'`).
 *
 * Both paths (the React provider and this standalone fallback) write the
 * same key and toggle the same class, so they never fight each other.
 *
 * The quiz step prefers the provider's `useTheme()`/`setTheme()` (keeps
 * app state in sync) and falls back to `applyThemeDirect()` here when the
 * quiz is rendered outside <ThemeProvider> (e.g. the standalone example).
 */

export const THEME_STORAGE_KEY = 'theme';

/** All supported values. Note: the user-facing label is "Auto (System)" but
 *  the stored/applied value is 'system' (matches ThemeProvider). */
export const THEME_OPTIONS = ['light', 'dark', 'system'];

const VALID_THEMES = new Set(THEME_OPTIONS);

/** Keep a reference so we can unsubscribe the system-preference listener. */
let systemListener = null;

/**
 * @param {unknown} value
 * @returns {value is 'light' | 'dark' | 'system'}
 */
export function isValidTheme(value) {
  return typeof value === 'string' && VALID_THEMES.has(value);
}

/**
 * Read the persisted theme preference (SSR-safe: returns null on the server
 * or when localStorage is unavailable).
 *
 * @returns {'light' | 'dark' | 'system' | null}
 */
export function getStoredTheme() {
  if (typeof window === 'undefined') return null;
  try {
    const stored = window.localStorage.getItem(THEME_STORAGE_KEY);
    return isValidTheme(stored) ? stored : null;
  } catch {
    // localStorage unavailable (private mode / blocked) — ignore
    return null;
  }
}

/**
 * Resolve a preference to the concrete theme ('light' | 'dark').
 * 'system' resolves against the OS `prefers-color-scheme` media query.
 *
 * @param {'light' | 'dark' | 'system'} preference
 * @returns {'light' | 'dark'}
 */
export function resolveTheme(preference) {
  if (preference === 'light' || preference === 'dark') return preference;
  if (typeof window === 'undefined' || !window.matchMedia) return 'light';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function applyResolved(resolved) {
  const root = document.documentElement;
  root.classList.toggle('dark', resolved === 'dark');
  root.style.colorScheme = resolved;
}

function watchSystemChanges() {
  if (systemListener) return; // already subscribed
  if (typeof window === 'undefined' || !window.matchMedia) return;

  const mq = window.matchMedia('(prefers-color-scheme: dark)');
  systemListener = (event) => {
    // Re-apply whenever the OS theme changes while in 'system' mode.
    applyResolved(event.matches ? 'dark' : 'light');
  };
  mq.addEventListener('change', systemListener);
}

function stopWatchingSystemChanges() {
  if (!systemListener) return;
  if (typeof window !== 'undefined' && window.matchMedia) {
    window
      .matchMedia('(prefers-color-scheme: dark)')
      .removeEventListener('change', systemListener);
  }
  systemListener = null;
}

/**
 * Persist + apply a theme preference immediately (standalone fallback).
 *
 * Mirrors what `<ThemeProvider>.setTheme()` does so both paths behave
 * identically: writes localStorage 'theme', toggles `.dark` on <html>,
 * sets `color-scheme`, and follows OS changes while in 'system' mode.
 *
 * @param {'light' | 'dark' | 'system'} preference
 * @param {{ persist?: boolean }} [options] — pass { persist: false } to
 *        apply without writing to localStorage.
 */
export function applyThemeDirect(preference, { persist = true } = {}) {
  if (!isValidTheme(preference)) return;
  if (persist) {
    try {
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(THEME_STORAGE_KEY, preference);
      }
    } catch {
      // Ignore persistence failures; theme still applies for this session.
    }
  }
  if (typeof document === 'undefined') return;

  applyResolved(resolveTheme(preference));

  if (preference === 'system') {
    watchSystemChanges();
  } else {
    stopWatchingSystemChanges();
  }
}

/**
 * Apply the persisted theme (or the OS preference when nothing is stored)
 * WITHOUT persisting anything. Useful for initializing standalone usages
 * of the quiz; the app-wide ThemeProvider/ThemeScript already covers the
 * full app, so this is only needed when rendering the quiz by itself.
 */
export function initThemeFallback() {
  const stored = getStoredTheme();
  if (stored) {
    applyThemeDirect(stored, { persist: false });
  } else {
    applyThemeDirect('system', { persist: false });
  }
}
