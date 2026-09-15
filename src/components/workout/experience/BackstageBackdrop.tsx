'use client';

import React from 'react';
import {useEffect, useState} from 'react';
import {cn} from '@/lib/cn';
import {useReducedMotion} from '@/hooks/useReducedMotion';
import {
  BACKSTAGE_ASSETS,
  BACKSTAGE_DENSITY_QUERY,
  BACKSTAGE_FOCUS_GRADIENT,
  type BackstageDensity,
  type BackstageThemeVariant,
} from './backstage';

/**
 * BackstageBackdrop (WP-04) — the environment layer of the experience shell.
 *
 * Renders the approved Backstage reference for the active theme × density as
 * a full-bleed, absolutely-positioned background. It OWNS NOTHING: no session
 * state, no sequencing, no controls, no text — the shell's content layers
 * render above it. An optional gradient focuses the central negative space
 * for UI readability (readability always wins over incidental background
 * props, per the steering delta).
 *
 * Breakpoint family behavior: the mobile reference is the base composition
 * (mobile-first); the desktop reference engages via `matchMedia` after mount
 * (no SSR hydration mismatch — first render is deterministic per Design
 * Brain §3.2). `object-cover` crops without distortion; no stretching.
 *
 * Reduced motion: the backdrop is static by construction (a single still
 * image, no animation) — nothing to reduce; the flag is asserted by tests
 * via the CSS media query and the shell's motion classes, not here.
 *
 * SSR: images render with `loading="eager"` + `fetchPriority="high"` (the
 * START surface is the entry viewport) and `decoding="async"`.
 */

export interface BackstageBackdropProps {
  /** `dark` | `light` — resolved by the shell from the app theme. */
  theme: BackstageThemeVariant;
  /** Accessible description (decorative by default — pass alt when meaningful). */
  alt?: string;
  className?: string;
}

export function BackstageBackdrop({theme, alt = '', className}: BackstageBackdropProps) {
  const [density, setDensity] = useState<BackstageDensity>('mobile');
  const [densityResolved, setDensityResolved] = useState(false);
  // Theme/density are client-only facts (no SSR source in the consumer app;
  // ThemeScript paints the correct page background pre-hydration). The image
  // mounts after hydration so SSR/first-render stay deterministic and the
  // correct purpose-built asset appears without a wrong-theme flash.
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return;
    const mql = window.matchMedia(BACKSTAGE_DENSITY_QUERY);
    const apply = () => setDensity(mql.matches ? 'desktop' : 'mobile');
    apply();
    setDensityResolved(true);
    if (typeof mql.addEventListener === 'function') {
      mql.addEventListener('change', apply);
      return () => mql.removeEventListener('change', apply);
    }
    mql.addListener(apply);
    return () => mql.removeListener(apply);
  }, []);

  const asset = BACKSTAGE_ASSETS[theme][densityResolved ? density : 'mobile'];

  return (
    <div
      data-workout-v2-backstage=""
      aria-hidden={alt === '' ? true : undefined}
      className={cn('pointer-events-none absolute inset-0 overflow-hidden', className)}
    >
      {/* Static still image: no animation exists to reduce (reduced-motion safe). */}
      {mounted && (
        <img
          src={asset.src}
          alt={alt}
          width={asset.width}
          height={asset.height}
          loading="eager"
          fetchPriority="high"
          decoding="async"
          draggable={false}
          className="absolute inset-0 h-full w-full object-cover"
        />
      )}
      {/* Central negative-space focus — subtle; readability over props. */}
      <div aria-hidden="true" className="absolute inset-0" style={{background: BACKSTAGE_FOCUS_GRADIENT[theme]}} />
    </div>
  );
}

export default BackstageBackdrop;
