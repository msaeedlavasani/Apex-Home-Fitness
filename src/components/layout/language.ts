/**
 * Locale contract for the global EN ⇄ FA language switcher.
 *
 * Must stay in sync with `src/i18n/routing.ts` (locales: ['en', 'fa']) and
 * the `Language.*` message keys in src/messages/{en,fa}.json. Kept free of
 * React/next-intl imports so it is trivially unit-testable.
 */
export const APP_LOCALES = ['en', 'fa'] as const;

export type AppLocale = (typeof APP_LOCALES)[number];

/** The counterpart locale for the EN ⇄ FA switcher (en → fa, fa → en). */
export function otherLocale(locale: string): AppLocale {
  return locale === 'en' ? 'fa' : 'en';
}
