import type {Metadata, Viewport} from 'next';
import {headers} from 'next/headers';
import localFont from 'next/font/local';
import {NextIntlClientProvider} from 'next-intl';
import {getMessages, getTranslations} from 'next-intl/server';
import {notFound} from 'next/navigation';
// Note: The next-intl docs assume `@/` points to the project root.
// If your project's `@` alias points to `src/` instead, use a relative import:
// import {routing} from '../../../i18n/routing';
import {routing} from '@/i18n/routing';
import {ThemeProvider, ThemeScript} from '@/components/providers/ThemeProvider';
import {PlatformProvider} from '@/components/ui/platform/context/PlatformProvider';
import {detectPlatform} from '@/components/ui/platform/lib/platform';
import PWALoader from '@/components/PWALoader';
import MonitoringProvider from '@/components/providers/MonitoringProvider';
import {MuiProvider} from '@/components/providers/MuiProvider';
import '../globals.css';

/**
 * Multi-platform typography linking.
 * - SF Pro is an Apple system font and cannot be self-hosted; the font
 *   stacks in tailwind.config.js keep it first so Apple devices render
 *   the real SF Pro.
 * - Inter (closest cross-platform match) and Roboto (Android/M3) are
 *   SELF-HOSTED via next/font/local (woff2 files in src/app/fonts/,
 *   sourced from the @fontsource packages at build time). Serving them
 *   from the same origin satisfies CSP `font-src 'self' data:` and makes
 *   production builds fully offline/network-independent (no fetch to the
 *   Google Fonts CDN during `next build` — required for Docker and
 *   restricted-network servers).
 * - Vazirmatn (Persian) is fully self-hosted: the woff2 variable font
 *   lives in src/app/fonts/ (SIL OFL 1.1, see OFL.txt) and is served via
 *   next/font/local from the same origin — no external font requests,
 *   works offline through the service worker's same-origin cache, and
 *   satisfies the CSP `font-src 'self' data:` policy. globals.css applies
 *   it to all RTL/Persian content (`html[dir='rtl'] body`).
 */
const inter = localFont({
  src: '../fonts/Inter-Variable.woff2',
  variable: '--font-inter',
  display: 'swap',
  weight: '100 900',
});

const roboto = localFont({
  src: [
    {path: '../fonts/Roboto-400.woff2', weight: '400', style: 'normal'},
    {path: '../fonts/Roboto-500.woff2', weight: '500', style: 'normal'},
    {path: '../fonts/Roboto-700.woff2', weight: '700', style: 'normal'},
  ],
  variable: '--font-roboto',
  display: 'swap',
});

/**
 * Vazirmatn — variable font (wght 100–900), self-hosted locally.
 * Loaded unconditionally (one ~111 KB woff2 covering the whole weight
 * range) so Persian text always resolves to the real webfont instead of
 * a system fallback, on every platform (iOS / Android / web).
 */
const vazirmatn = localFont({
  src: '../fonts/Vazirmatn-Variable.woff2',
  variable: '--font-vazirmatn',
  display: 'swap',
  weight: '100 900',
});

export function generateStaticParams() {
  return routing.locales.map((locale) => ({locale}));
}

/**
 * `viewport-fit=cover` is REQUIRED for `env(safe-area-inset-*)` to return
 * non-zero values on notched / rounded-corner devices (iPhone, iPad Pro,
 * Android). Without it, safe-area utilities degrade to 0 and content can
 * slide under the notch or the home indicator.
 */
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  // Renders <meta name="theme-color" content="#4F46E5"> — matches the
  // manifest theme_color so the browser UI (address bar, status bar) blends
  // with the app in both PWA and installed contexts.
  themeColor: '#4F46E5',
};

export async function generateMetadata({
  params
}: {
  params: Promise<{locale: string}>;
}): Promise<Metadata> {
  const {locale} = await params;
  const t = await getTranslations({locale, namespace: 'Metadata'});

  const title = t('title');
  const description = t('description');
  const ogLocale = locale === 'fa' ? 'fa_IR' : 'en_US';

  // Absolute URL base for canonical/OG/social URLs (set NEXT_PUBLIC_SITE_URL
  // in production; omitted locally so relative URLs are used).
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;
  const absUrl = (path: string) =>
    siteUrl ? new URL(path, siteUrl).toString() : path;
  const canonical = absUrl(`/${locale}`);
  // OG/social image — the 512×512 app icon (swap for a 1200×630 OG banner
  // once a dedicated social image asset exists).
  const ogImage = absUrl('/icons/icon-512x512.png');

  return {
    metadataBase: new URL(siteUrl ?? 'https://apexfit.app'),

    // Bilingual title & description — resolved per-locale at request time.
    // `template` appends the localized site name to child pages' titles
    // (e.g. "Settings | Apex Home Fitness").
    title: {
      default: title,
      template: `%s | ${title}`,
    },
    description,

    // PWA: link the web app manifest (public/manifest.json).
    manifest: '/manifest.json',

    // Favicon / touch icon links (assets live in public/icons/).
    icons: {
      icon: [
        {url: '/icons/icon-192x192.png', sizes: '192x192', type: 'image/png'},
        {url: '/icons/icon-384x384.png', sizes: '384x384', type: 'image/png'},
        {url: '/icons/icon-512x512.png', sizes: '512x512', type: 'image/png'},
      ],
      apple: [
        {url: '/icons/apple-touch-icon.png', sizes: '180x180', type: 'image/png'},
      ],
    },

    // iOS PWA behavior: standalone display + icon title.
    appleWebApp: {
      capable: true,
      title,
      statusBarStyle: 'default',
    },

    // Bilingual SEO: absolute canonical + hreflang alternates for each locale.
    alternates: {
      canonical,
      languages: {
        en: absUrl('/en'),
        fa: absUrl('/fa'),
        'x-default': absUrl('/en'),
      },
    },

    openGraph: {
      type: 'website',
      locale: ogLocale,
      url: canonical,
      siteName: 'Apex Home Fitness',
      title,
      description,
      images: [
        {
          url: ogImage,
          width: 512,
          height: 512,
          alt: title,
        },
      ],
    },

    // Twitter summary card mirrors the OpenGraph values above.
    twitter: {
      card: 'summary',
      title,
      description,
      images: [ogImage],
    },

    robots: {
      index: true,
      follow: true,
    },
  };
}

export default async function LocaleLayout({
  children,
  params
}: {
  children: React.ReactNode;
  params: Promise<{locale: string}>;
}) {
  const {locale} = await params;

  // Ensure that the incoming `locale` is valid
  if (!routing.locales.includes(locale as any)) {
    notFound();
  }

  // Enable RTL for Persian ('fa'); LTR for English ('en')
  const dir = locale === 'fa' ? 'rtl' : 'ltr';

  // Resolve the requesting device's platform (iOS / Android / web) from the
  // User-Agent so the layout shell (AppShell) renders the matching native
  // chrome on the very first paint — no flash, no layout shift. The
  // PlatformProvider re-detects on mount (touch capability, manual override)
  // and mirrors it onto <html data-platform="ios|material">.
  const userAgent = (await headers()).get('user-agent');
  const messages = await getMessages();

  // --- Schema.org structured data (JSON-LD, bilingual) ---------------------
  // WebSite + Organization graph rendered on every page. `inLanguage`, name
  // and description follow the active locale; `alternateName` carries the
  // other locale's brand name so both languages resolve to one entity.
  // The fallback origin is used only when NEXT_PUBLIC_SITE_URL is unset
  // (local development).
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;
  const origin = siteUrl ?? 'https://apexfit.app';
  const seoT = await getTranslations({locale, namespace: 'Metadata'});
  const seoTitle = seoT('title');
  const seoDescription = seoT('description');
  const alternateName =
    locale === 'fa' ? 'Apex Home Fitness' : 'اپکس فیتنس خانگی';

  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'WebSite',
        '@id': `${origin}/#website`,
        url: origin,
        name: seoTitle,
        alternateName,
        description: seoDescription,
        inLanguage: locale,
        publisher: {'@id': `${origin}/#organization`},
      },
      {
        '@type': 'Organization',
        '@id': `${origin}/#organization`,
        name: 'Apex Home Fitness',
        url: origin,
        logo: {
          '@type': 'ImageObject',
          url: `${origin}/icons/icon-512x512.png`,
          width: 512,
          height: 512,
        },
        contactPoint: {
          '@type': 'ContactPoint',
          email: 'support@apexfit.app',
          contactType: 'customer support',
          availableLanguage: ['en', 'fa'],
        },
      },
    ],
  };

  // Escape `<` so translated strings can never break out of the script tag.
  const jsonLdHtml = JSON.stringify(jsonLd).replace(/</g, '\\u003c');

  return (
    // data-platform="ios" is the default platform for the multi-platform
    // design system; PlatformProvider flips it to "material" at runtime when
    // the Android layout is active (see globals.css platform-switch tokens).
    <html lang={locale} dir={dir} data-platform="ios" suppressHydrationWarning>
      <head>
        {/* Applies the persisted/system theme class to <html> before hydration (prevents FOUC) */}
        <ThemeScript />
        {/* Schema.org structured data (WebSite + Organization, bilingual). */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{__html: jsonLdHtml}}
        />
      </head>
      <body className={`${inter.variable} ${roboto.variable} ${vazirmatn.variable}`}>
        <ThemeProvider>
          <PlatformProvider defaultPlatform={userAgent ? detectPlatform(userAgent) : 'web'}>
            <MuiProvider>
              <NextIntlClientProvider messages={messages}>{children}</NextIntlClientProvider>
            </MuiProvider>
          </PlatformProvider>
        </ThemeProvider>
        {/* Registers /service-worker.js for offline + installability (production only). */}
        <PWALoader />
        {/* Boots client-side error tracking (Sentry/console) + global error handlers. */}
        <MonitoringProvider />
      </body>
    </html>
  );
}
