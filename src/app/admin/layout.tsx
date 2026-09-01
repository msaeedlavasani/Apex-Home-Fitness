import type {Metadata, Viewport} from 'next';
import localFont from 'next/font/local';
import '../globals.css';
import {ThemeProvider, ThemeScript} from '@/components/providers/ThemeProvider';

/**
 * Admin root layout (ADMIN-DS-01 foundation).
 *
 * Dark mode: ThemeScript applies the persisted/system theme class to <html>
 * BEFORE hydration (no FOUC) and ThemeProvider manages it afterwards,
 * mirroring the consumer app's theme architecture. All admin markup is
 * token-based, so every existing surface flips to dark automatically.
 * Default theme is light to preserve the current admin look.
 *
 * Fonts: the same self-hosted Inter / Roboto / Vazirmatn variables used by
 * the consumer layout are linked here so admin typography resolves the real
 * webfonts (same-origin, CSP-compliant) instead of system fallbacks.
 *
 * Metadata/icons: admin routes get their own title template and the Apex
 * brand icons (public/icons) instead of the Next.js default favicon.
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

export const metadata: Metadata = {
  title: {
    default: 'Administration console',
    template: '%s | Apex Home Fit Admin',
  },
  icons: {
    icon: [
      {url: '/icons/icon-192x192.png', sizes: '192x192', type: 'image/png'},
      {url: '/icons/icon-512x512.png', sizes: '512x512', type: 'image/png'},
    ],
    apple: [{url: '/icons/apple-touch-icon.png', sizes: '180x180', type: 'image/png'}],
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#FF4500',
};

export default function AdminRootLayout({children}: {children: React.ReactNode}) {
  return (
    <html lang="en" dir="ltr" suppressHydrationWarning>
      <head>
        <ThemeScript defaultTheme="light" />
      </head>
      <body
        className={`${inter.variable} ${roboto.variable} ${vazirmatn.variable} bg-apex-surface text-apex-text-primary`}
      >
        <ThemeProvider defaultTheme="light">{children}</ThemeProvider>
      </body>
    </html>
  );
}