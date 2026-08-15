import type {Metadata, Viewport} from 'next';
import {NextIntlClientProvider} from 'next-intl';
import {getTranslations} from 'next-intl/server';
import {notFound} from 'next/navigation';
// Note: The next-intl docs assume `@/` points to the project root.
// If your project's `@` alias points to `src/` instead, use a relative import:
// import {routing} from '../../../i18n/routing';
import {routing} from '@/i18n/routing';
import {ThemeProvider, ThemeScript} from '@/components/providers/ThemeProvider';
import PWALoader from '@/components/PWALoader';
import '../globals.css';

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

  // Absolute URL base for OG/social images (set NEXT_PUBLIC_SITE_URL in
  // production; omitted locally so relative URLs are used).
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;

  return {
    ...(siteUrl ? {metadataBase: new URL(siteUrl)} : {}),

    // Bilingual title & description — resolved per-locale at request time.
    title,
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

    // Bilingual SEO: canonical + hreflang alternates for each locale root.
    alternates: {
      canonical: `/${locale}`,
      languages: {
        en: '/en',
        fa: '/fa',
        'x-default': '/en',
      },
    },

    openGraph: {
      type: 'website',
      locale: ogLocale,
      url: `/${locale}`,
      siteName: 'Apex Home Fitness',
      title,
      description,
      images: [
        {
          url: '/icons/icon-512x512.png',
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
      images: ['/icons/icon-512x512.png'],
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

  return (
    <html lang={locale} dir={dir} suppressHydrationWarning>
      <head>
        {/* Applies the persisted/system theme class to <html> before hydration (prevents FOUC) */}
        <ThemeScript />
      </head>
      <body>
        <ThemeProvider>
          <NextIntlClientProvider>{children}</NextIntlClientProvider>
        </ThemeProvider>
        {/* Registers /service-worker.js for offline + installability (production only). */}
        <PWALoader />
      </body>
    </html>
  );
}
