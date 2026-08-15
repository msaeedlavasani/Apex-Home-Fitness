import type {Metadata, Viewport} from 'next';
import {NextIntlClientProvider} from 'next-intl';
import {getTranslations} from 'next-intl/server';
import {notFound} from 'next/navigation';
// Note: The next-intl docs assume `@/` points to the project root.
// If your project's `@` alias points to `src/` instead, use a relative import:
// import {routing} from '../../../i18n/routing';
import {routing} from '@/i18n/routing';
import {ThemeProvider, ThemeScript} from '@/components/providers/ThemeProvider';
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
};

export async function generateMetadata({
  params
}: {
  params: Promise<{locale: string}>;
}): Promise<Metadata> {
  const {locale} = await params;
  const t = await getTranslations({locale, namespace: 'Metadata'});
  return {
    title: t('title')
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
      </body>
    </html>
  );
}
