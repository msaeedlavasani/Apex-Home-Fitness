import createNextIntlPlugin from 'next-intl/plugin';

// Wire next-intl's App Router request config (src/i18n.ts) into the build.
// Required by next-intl >= 3 for the app router; without this file no page renders.
const withNextIntl = createNextIntlPlugin('./src/i18n.ts');

// `'unsafe-eval'` is a dev-only requirement (webpack HMR source maps) and
// must not ship in production responses.
const scriptSrc = [
  "'self'",
  "'unsafe-inline'",
  ...(process.env.NODE_ENV === 'production' ? [] : ["'unsafe-eval'"]),
].join(' ');

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Remove the default `X-Powered-By: Next.js` response header (info leak).
  poweredByHeader: false,

  /**
   * Security headers applied to every response.
   *
   * CSP notes:
   *  - `script-src 'unsafe-inline'`: required because Next.js 14 App Router
   *    injects inline bootstrap scripts (e.g. ThemeScript in
   *    `src/app/[locale]/layout.tsx` and the hydration payload). A nonce- or
   *    hash-based CSP is the recommended hardening follow-up (see audit report).
   *  - `script-src 'unsafe-eval'`: only needed in `next dev` (webpack HMR
   *    source maps). Dropped automatically from the production CSP (see
   *    `scriptSrc` below) — the prod build runs without eval.
   *  - `connect-src`: Supabase URLs come from env vars
   *    (`NEXT_PUBLIC_SUPABASE_URL`, any project subdomain) — the wildcard
   *    covers all project refs; `wss://` covers Supabase Realtime.
   *    `https://*.ingest.sentry.io` allows the Sentry SDK (when a DSN is
   *    configured, see src/lib/errorTracking.ts) to ship error events.
   *    First-party analytics ingestion (/api/analytics/events) is covered
   *    by `'self'`.
   *  - `img-src https://*.supabase.co`: for Supabase Storage images if used.
   *  - `img-src https://commondatastorage.googleapis.com`: video POSTER
   *    images for the Exercise Library demo catalog (served from the Google
   *    public demo bucket). Posters are <img> loads, so they are governed
   *    by `img-src` (NOT `media-src`); without this origin they are blocked
   *    by CSP and never display.
   *  - `media-src 'self' blob: https:`: video playback. `blob:` is REQUIRED
   *    by hls.js (it attaches MediaSource through `blob:` object URLs); the
   *    `https:` source covers CDN-hosted exercise videos (e.g. the demo
   *    streams in the Exercise Library and Supabase Storage / any future
   *    media CDN). Media elements cannot execute scripts, so the broad
   *    `https:` source carries minimal risk.
   *  - `connect-src … https://*.mux.dev`: the Exercise Library demo HLS
   *    stream (hls.js fetches the `.m3u8` manifest + segments via XHR).
   *  - No external fonts/CDNs/analytics are used by the client, so no other
   *    origins are allowlisted.
   *  - `frame-ancestors 'none'` (modern browsers) + `X-Frame-Options: DENY`
   *    (legacy browsers) together prevent clickjacking/embedding.
   */
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              `script-src ${scriptSrc}`,
              "style-src 'self' 'unsafe-inline'",
              "img-src 'self' data: blob: https://*.supabase.co https://commondatastorage.googleapis.com",
              "font-src 'self' data:",
              "media-src 'self' blob: https:",
              "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://*.ingest.sentry.io https://*.mux.dev",
              "worker-src 'self' blob:",
              "object-src 'none'",
              "base-uri 'self'",
              "form-action 'self'",
              "frame-ancestors 'none'",
            ].join('; '),
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'Permissions-Policy',
            value:
              'camera=(), microphone=(), geolocation=(), payment=(), usb=(), ' +
              'accelerometer=(), gyroscope=(), magnetometer=(), ambient-light-sensor=(), ' +
              'autoplay=(self), fullscreen=(self)',
          },
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'on',
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload',
          },
        ],
      },
      {
        // Android App Links / TWA verification file — must be served as
        // application/json and must NOT be blocked by any policy.
        source: '/.well-known/assetlinks.json',
        headers: [
          { key: 'Content-Type', value: 'application/json' },
          { key: 'Cache-Control', value: 'public, max-age=3600' },
          { key: 'Access-Control-Allow-Origin', value: '*' },
        ],
      },
      {
        // Web app manifest — serve with the manifest MIME type so PWA
        // installability checks and Bubblewrap (TWA packaging) accept it.
        source: '/manifest.json',
        headers: [
          { key: 'Content-Type', value: 'application/manifest+json' },
          { key: 'Cache-Control', value: 'public, max-age=3600' },
        ],
      },
      {
        // PWA icons (public/icons/*) — immutable by convention: icon content
        // never changes in place; a new design ships under a new filename and
        // the manifest is updated (see docs/ASSETS.md). Long caching lets the
        // service worker and install flows reuse them without revalidation.
        source: '/icons/:path*',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
        ],
      },
      {
        // Static offline fallback page — short cache so a fresh copy of the
        // fallback reaches clients quickly after deploys; the service worker
        // precaches it at install time regardless of HTTP cache state.
        source: '/offline.html',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=300' },
        ],
      },
    ];
  },
  // Self-hosted deployment: emit the minimal standalone server (.next/standalone)
  // so the Docker image only ships what `node server.js` needs (see Dockerfile).
  output: 'standalone',
};

export default withNextIntl(nextConfig);
