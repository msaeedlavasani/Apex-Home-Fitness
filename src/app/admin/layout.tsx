import type {Metadata, Viewport} from 'next';
import localFont from 'next/font/local';
import {NextIntlClientProvider} from 'next-intl';
import {getMessages, getTranslations} from 'next-intl/server';

import '../globals.css';
import {ThemeProvider, ThemeScript} from '@/components/providers/ThemeProvider';
import {adminContentDir} from '@/lib/admin/locale';
import {getAdminLocaleFromRequest} from '@/lib/admin/requestLocale';
import {getAdminThemeFromRequest} from '@/lib/admin/requestTheme';
import {ADMIN_THEME_COOKIE} from '@/lib/admin/theme';

/**
 * Admin root layout (ADMIN-DS-01 foundation + ADMIN-DS-05 i18n/RTL).
 *
 * Locale: resolved from the persisted `admin-locale` cookie (admin routes
 * are outside the public `[locale]` segment — the middleware matcher
 * excludes `/admin`), defaulting to `en` exactly as before DS-05. The
 * locale drives `<html lang>` + `dir`, the NextIntlClientProvider messages,
 * and localized metadata. `dir=rtl` flips the layout through logical CSS
 * utilities and switches the primary UI font to Vazirmatn via the shared
 * `html[dir='rtl']` rule in globals.css (typography contract).
 *
 * Dark mode: ThemeScript applies the persisted/system theme class to <html>
 * BEFORE hydration (no FOUC) and ThemeProvider manages it afterwards,
 * mirroring the consumer app's theme architecture. The `admin-theme`
 * cookie (mirrored by the shared provider via `cookieKey`) lets the SERVER
 * render the same theme state the client will hydrate — no hydration
 * mismatch, no theme flash — exactly like the `admin-locale` cookie. No
 * cookie → light (the pre-DS-01 admin default).
 *
 * Fonts: the same self-hosted Inter / Roboto / Vazirmatn variables used by
 * the consumer layout are linked here so admin typography resolves the real
 * webfonts (same-origin, CSP-compliant) instead of system fallbacks.
 *
 * Metadata/icons: localized admin titles (per locale) and the Apex brand
 * icons (public/icons) instead of the Next.js default favicon.
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

const vazirmatn = localFont({
  src: '../fonts/Vazirmatn-Variable.woff2',
  variable: '--font-vazirmatn',
  display: 'swap',
  weight: '100 900',
});

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getAdminLocaleFromRequest();
  const t = await getTranslations({locale, namespace: 'admin.metadata'});
  return {
    title: {
      default: t('title'),
      template: t('template'),
    },
    icons: {
      icon: [
        {url: '/icons/icon-192x192.png', sizes: '192x192', type: 'image/png'},
        {url: '/icons/icon-512x512.png', sizes: '512x512', type: 'image/png'},
      ],
      apple: [{url: '/icons/apple-touch-icon.png', sizes: '180x180', type: 'image/png'}],
    },
  };
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#FF4500',
};

export default async function AdminRootLayout({children}: {children: React.ReactNode}) {
  const locale = await getAdminLocaleFromRequest();
  const theme = await getAdminThemeFromRequest();
  // Admin routes never see a `[locale]` segment, so next-intl's request
  // config always resolves to the default locale — pass the cookie locale
  // explicitly so server components and the client provider agree.
  const messages = await getMessages({locale});

  return (
    <html lang={locale} dir={adminContentDir(locale)} suppressHydrationWarning>
      <head>
        <ThemeScript defaultTheme={theme} />
      </head>
      <body
        className={`${inter.variable} ${roboto.variable} ${vazirmatn.variable} bg-apex-surface text-apex-text-primary`}
      >
        <ThemeProvider defaultTheme={theme} cookieKey={ADMIN_THEME_COOKIE}>
          <NextIntlClientProvider locale={locale} messages={messages}>
            {children}
          </NextIntlClientProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}