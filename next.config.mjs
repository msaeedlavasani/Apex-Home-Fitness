import createNextIntlPlugin from 'next-intl/plugin';

// Wire next-intl's App Router request config (src/i18n.ts) into the build.
// Required by next-intl >= 3 for the app router; without this file no page renders.
const withNextIntl = createNextIntlPlugin('./src/i18n.ts');

/** @type {import('next').NextConfig} */
const nextConfig = {};

export default withNextIntl(nextConfig);
