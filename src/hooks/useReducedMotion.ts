'use client';

import { useEffect, useState } from 'react';

/**
 * useReducedMotion
 * ----------------
 * SSR-safe hook that reports whether the user prefers reduced motion
 * (`prefers-reduced-motion: reduce`).
 *
 * **Framer Motion compatibility.** This hook is API-compatible with
 * `framer-motion`'s `useReducedMotion()`:
 *   - returns a `boolean` (`true` = reduce motion)
 *   - updates live if the OS preference changes while the app is open
 *   - is safe on the server (returns `false` during SSR so the first
 *     client render matches, then re-evaluates in an effect)
 *
 * If the app later adopts `framer-motion`, swap the import to
 * `import { useReducedMotion } from 'framer-motion'` — every call site
 * stays unchanged. The same logic also powers `MotionConfig
 * reducedMotion="user"` once motion components are introduced.
 */
const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)';

/** One-shot, synchronous check. Safe on the server (returns false). */
export function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return false;
  }
  return window.matchMedia(REDUCED_MOTION_QUERY).matches;
}

export function useReducedMotion(): boolean {
  // SSR and the first client render both report `false`, so hydration
  // never mismatches. The effect below corrects the value on mount.
  const [reduced, setReduced] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      return;
    }

    const mql = window.matchMedia(REDUCED_MOTION_QUERY);
    setReduced(mql.matches);

    const onChange = (event: MediaQueryListEvent) => setReduced(event.matches);

    if (typeof mql.addEventListener === 'function') {
      mql.addEventListener('change', onChange);
      return () => mql.removeEventListener('change', onChange);
    }

    // Legacy fallback (Safari < 14).
    mql.addListener(onChange);
    return () => mql.removeListener(onChange);
  }, []);

  return hydrated ? reduced : false;
}

export default useReducedMotion;
