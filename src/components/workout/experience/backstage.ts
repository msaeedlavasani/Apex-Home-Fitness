/**
 * Backstage environment registry (WP-04) — presentation-layer configuration.
 *
 * The Backstage is the OWNER-APPROVED visual environment behind the Workout
 * V2 experience (steering delta 2026-09-15: "Backstage dark/light mobile ×
 * desktop" four-reference family). It is the ENVIRONMENT ONLY — never UI:
 * the approved references carry no application UI, no workout state, no
 * timer/progress/controls, no text and no branding, and this registry ships
 * nothing but pointing URLs.
 *
 * All dynamic/product UI lives in the application layer above it
 * (`ExperienceShell` → module stages), which is what keeps FA/EN, RTL,
 * responsive behavior, accessibility and future modules possible.
 *
 * Asset convention (repository-native): static files under `public/`,
 * served by root path — no bundler import, no `next/image`, per
 * `docs/ASSETS.md`. Theme variants are purpose-built (NOT brightness/overlay
 * derivations of each other), per the steering delta. Density targets are a
 * responsive composition family (crop/positioning/focal point), NOT four
 * rigid pixel-perfect screens.
 *
 * NOTE: the reference family is being canonicalized through the repository
 * governance path separately; this registry records its approved provenance
 * without claiming canonicalization beyond the current branch.
 */

export type BackstageThemeVariant = 'dark' | 'light';
export type BackstageDensity = 'mobile' | 'desktop';

export interface BackstageAsset {
  /** Root path under `public/` (repository-native static asset serving). */
  readonly src: string;
  /** Intrinsic size of the shipped file (informational; object-cover crops). */
  readonly width: number;
  readonly height: number;
}

/** Purpose-built environment per theme × density; one shared visual family. */
export const BACKSTAGE_ASSETS: Readonly<
  Record<BackstageThemeVariant, Record<BackstageDensity, BackstageAsset>>
> = {
  dark: {
    mobile: {src: '/backstage/workout/backstage-dark-mobile.webp', width: 909, height: 1731},
    desktop: {src: '/backstage/workout/backstage-dark-desktop.webp', width: 1672, height: 941},
  },
  light: {
    mobile: {src: '/backstage/workout/backstage-light-mobile.webp', width: 909, height: 1731},
    desktop: {src: '/backstage/workout/backstage-light-desktop.webp', width: 1672, height: 941},
  },
};

/** Central negative space is always preserved; UI readability wins over props. */
export const BACKSTAGE_FOCUS_GRADIENT: Record<BackstageThemeVariant, string> = {
  dark: 'radial-gradient(ellipse 70% 55% at 50% 52%, rgb(0 0 0 / 0.30) 0%, rgb(0 0 0 / 0.12) 55%, transparent 78%)',
  light: 'radial-gradient(ellipse 70% 55% at 50% 52%, rgb(255 255 255 / 0.42) 0%, rgb(255 255 255 / 0.18) 55%, transparent 78%)',
};

/**
 * Media query (breakpoint boundary of the density family) evaluated by the
 * shell's `matchMedia` when available. The mobile reference is the default
 * composition; desktop engages where there is room for the wider framing.
 */
export const BACKSTAGE_DENSITY_QUERY = '(min-width: 768px)';
