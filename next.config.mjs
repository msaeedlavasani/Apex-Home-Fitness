import createNextIntlPlugin from 'next-intl/plugin';

// Wire next-intl's App Router request config (src/i18n.ts) into the build.
// Required by next-intl >= 3 for the app router; without this file no page renders.
const withNextIntl = createNextIntlPlugin('./src/i18n.ts');

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
   *    source maps). It can be dropped in production if you verify the prod
   *    build runs without it.
   *  - `connect-src`: Supabase URLs come from env vars
   *    (`NEXT_PUBLIC_SUPABASE_URL`, any project subdomain) — the wildcard
   *    covers all project refs; `wss://` covers Supabase Realtime.
   *  - `img-src https://*.supabase.co`: for Supabase Storage images if used.
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
              "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
              "style-src 'self' 'unsafe-inline'",
              "img-src 'self' data: blob: https://*.supabase.co",
              "font-src 'self' data:",
              "connect-src 'self' https://*.supabase.co wss://*.supabase.co",
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
    ];
  },
};

export default withNextIntl(nextConfig);
