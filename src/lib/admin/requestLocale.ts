import {cookies} from 'next/headers';

import {ADMIN_LOCALE_COOKIE, resolveAdminLocale, type AdminLocale} from './locale';

/**
 * Server-side admin locale resolution (ADMIN-DS-05).
 *
 * Reads the `admin-locale` cookie from the request. Server-only (uses
 * `next/headers`); call it from Server Components / Route Handlers that
 * render admin chrome, then pass the result explicitly to next-intl
 * (`getTranslations({locale, namespace})` / `getMessages({locale})`) —
 * admin routes are outside the `[locale]` segment, so next-intl's default
 * request config would otherwise always resolve to the default locale.
 */
export async function getAdminLocaleFromRequest(): Promise<AdminLocale> {
  const store = await cookies();
  return resolveAdminLocale(store.get(ADMIN_LOCALE_COOKIE)?.value);
}