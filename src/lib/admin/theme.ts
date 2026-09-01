import type {Theme} from '@/components/providers/ThemeProvider';

/**
 * Admin theme persistence contract (ADMIN-THEME-SWITCH-01).
 *
 * The shared ThemeProvider persists the selection in `localStorage`
 * (`theme` key). The admin console additionally mirrors the selection in a
 * cookie so the SERVER can render the correct theme state (no hydration
 * mismatch, no theme flash): the root admin layout reads this cookie and
 * passes it as `defaultTheme` to both `ThemeScript` and `ThemeProvider`.
 *
 * Cookie is written client-side by the shared provider's persist effect
 * (opt-in via the `cookieKey` prop) using the same conventions as the
 * `admin-locale` cookie (path=/, samesite=lax, 1-year max-age).
 */
export const ADMIN_THEME_COOKIE = 'admin-theme';

export function isTheme(value: string | undefined | null): value is Theme {
  return value === 'light' || value === 'dark' || value === 'system';
}