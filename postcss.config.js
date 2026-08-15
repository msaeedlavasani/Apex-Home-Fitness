/**
 * Root PostCSS config — REQUIRED by Next.js.
 *
 * Next.js only auto-loads `postcss.config.js` from the project root. When it
 * is missing, Next falls back to its built-in default (postcss-flexbugs-fixes
 * + postcss-preset-env), which does NOT include Tailwind — so the `@tailwind`
 * directives in src/app/globals.css are never compiled and every page renders
 * as raw, unstyled HTML.
 *
 * The Tailwind config itself lives in `infra/config/tailwind.config.js`
 * (moved there in commit 7d3aeb1). This file is the bridge that runs the
 * Tailwind PostCSS plugin and points it at that config. Content globs inside
 * the Tailwind config resolve against process.cwd() (the project root when
 * `next dev`/`next build` runs from here), so they are correct as-is.
 */
module.exports = {
  plugins: {
    tailwindcss: { config: './infra/config/tailwind.config.js' },
  },
};
