import {cookies} from 'next/headers';

import {ADMIN_THEME_COOKIE, isTheme} from '@/lib/admin/theme';

/**
 * Resolves the persisted admin theme from the `admin-theme` cookie
 * (server-side, so every RSC render — layout, pages, boundaries, metadata —
 * is consistent with what the client will hydrate; mirrors
 * `getAdminLocaleFromRequest`). Returns 'light' when unset (the pre-DS-01
 * admin default).
 */
export async function getAdminThemeFromRequest(): Promise<'light' | 'dark' | 'system'> {
  const store = await cookies();
  const raw = store.get(ADMIN_THEME_COOKIE)?.value;
  return isTheme(raw) ? raw : 'light';
}