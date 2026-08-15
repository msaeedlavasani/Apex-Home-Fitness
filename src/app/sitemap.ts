import type {MetadataRoute} from 'next';

/**
 * Production origin used when `NEXT_PUBLIC_SITE_URL` is not configured.
 * Keep in sync with the value set in production env (see .env.example).
 */
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://apexfit.app';

/** Locales emitted by `src/i18n/routing.ts`. */
const LOCALES = ['en', 'fa'] as const;

/**
 * Public, indexable routes (relative to the locale segment).
 *
 * Home is `/${locale}` — the same URL the root layout emits as canonical and
 * hreflang for each locale. Authenticated app screens (dashboard, profile,
 * history, analytics) are intentionally excluded: they are personal,
 * post-login areas and are also disallowed in public/robots.txt.
 *
 * NOTE: a home page (`src/app/[locale]/page.tsx`) is still expected to be
 * added — the sitemap entries below assume it renders at `/${locale}`.
 */
const PUBLIC_ROUTES = ['', '/quiz', '/library', '/challenges'] as const;

/**
 * Dynamically generated sitemap (`/sitemap.xml`).
 *
 * Emits one entry per public route × locale, with per-entry hreflang
 * alternates so crawlers resolve the bilingual URL set in a single file.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();

  return LOCALES.flatMap((locale) =>
    PUBLIC_ROUTES.map((route) => {
      const isHome = route === '';
      return {
        url: `${SITE_URL}/${locale}${route}`,
        lastModified,
        changeFrequency: isHome ? 'weekly' : 'monthly',
        priority: isHome ? 1 : 0.8,
        alternates: {
          languages: {
            en: `${SITE_URL}/en${route}`,
            fa: `${SITE_URL}/fa${route}`,
            'x-default': `${SITE_URL}/en${route}`,
          },
        },
      };
    }),
  );
}
