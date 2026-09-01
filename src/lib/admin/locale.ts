/**
 * Admin console locale contract (ADMIN-DS-05).
 *
 * The admin console lives OUTSIDE the public `[locale]` routing segment
 * (middleware matcher intentionally excludes `/admin`), so its locale is
 * resolved and persisted independently of the URL — via the `admin-locale`
 * cookie. The cookie is read server-side (SSR-correct, no client-only
 * storage) by `getAdminLocaleFromRequest` and written by the client
 * `AdminLocaleSwitcher`; `<html lang/dir>` then drive RTL layout and the
 * shared typography contract (fa → Vazirmatn, en → Inter) through the
 * existing `html[dir='rtl']` rule in globals.css.
 *
 * Kept free of React/next-intl imports so it is trivially unit-testable.
 * Must stay in sync with `src/i18n/routing.ts` locales.
 */
export const ADMIN_LOCALES = ['en', 'fa'] as const;

export type AdminLocale = (typeof ADMIN_LOCALES)[number];

/** Cookie carrying the persisted admin locale (server + client contract). */
export const ADMIN_LOCALE_COOKIE = 'admin-locale';

export function isAdminLocale(value: string | undefined | null): value is AdminLocale {
  return value != null && (ADMIN_LOCALES as readonly string[]).includes(value);
}

/**
 * Resolve a raw cookie value to a supported admin locale. Unknown/absent
 * values fall back to `en` — preserving the pre-DS-05 default surface.
 */
export function resolveAdminLocale(raw: string | undefined | null): AdminLocale {
  return isAdminLocale(raw) ? raw : 'en';
}

/**
 * Document direction for an admin locale. `fa` flips the document to RTL,
 * which (a) mirrors layout via logical CSS utilities and (b) switches the
 * primary UI font to Vazirmatn through the shared typography architecture.
 */
export function adminContentDir(locale: AdminLocale): 'ltr' | 'rtl' {
  return locale === 'fa' ? 'rtl' : 'ltr';
}