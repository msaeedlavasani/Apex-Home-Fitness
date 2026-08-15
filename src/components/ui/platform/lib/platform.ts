/**
 * Platform detection & shared types for the Apex platform UI kit.
 *
 * The kit ships three render targets:
 *   - `ios`     → Apple HIG (SF Pro, system colors, glassmorphism, 44 pt targets)
 *   - `android` → Material 3 (Roboto, M3 roles, elevation + state layers, 48 dp)
 *   - `web`     → Custom responsive (brand coral accents, hover states, fluid widths)
 */

export type Platform = 'ios' | 'android' | 'web';

/** Values the CSS layer (`globals.css`) understands via `data-platform`. */
export type CssPlatform = 'ios' | 'material';

export const PLATFORMS: Platform[] = ['ios', 'android', 'web'];

/**
 * Detect the runtime platform from a user agent string + touch capability.
 * - iPadOS 13+ reports a macOS UA; `maxTouchPoints > 1` disambiguates.
 * - Everything else (desktop browsers, unknown UAs) resolves to `web`.
 */
export function detectPlatform(userAgent?: string, maxTouchPoints = 0): Platform {
  if (!userAgent) return 'web';
  const ua = userAgent.toLowerCase();
  if (/android/.test(ua)) return 'android';
  if (/iphone|ipad|ipod/.test(ua)) return 'ios';
  if (/macintosh|mac os x/.test(ua) && maxTouchPoints > 1) return 'ios';
  return 'web';
}

/** Map a React-kit platform to the CSS `data-platform` attribute value. */
export function platformToCss(platform: Platform): CssPlatform {
  return platform === 'android' ? 'material' : 'ios';
}

export default detectPlatform;
