/** @type {import('tailwindcss').Config} */
module.exports = {
  // Class-based dark mode: toggling `dark` on <html> enables `dark:` variants
  // (ThemeProvider in src/components/providers/ThemeProvider.tsx manages this).
  // `[data-theme="dark"]` is accepted as an alternative hook for platforms that
  // prefer an attribute-based switch.
  darkMode: ['class', '[data-theme="dark"]'],
  content: [
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  // Custom design-system classes defined in globals.css (@layer components /
  // @layer utilities) are JIT tree-shaken unless used in markup. Safelisting
  // them guarantees the glassmorphism/surface/elevation utilities always
  // ship in CSS.
  safelist: [
    'glass',
    'glass-strong',
    'glass-subtle',
    'card-surface',
    'list-row',
    'no-scrollbar',
    'surface-1',
    'surface-2',
    'surface-3',
    'surface-4',
    'surface-5',
  ],
  theme: {
    extend: {
      fontFamily: {
        // Multi-platform stack. On Apple devices the real SF Pro (system font,
        // first in the list) wins; everywhere else it falls back to the
        // self-hosted Inter / Roboto webfonts linked via next/font
        // (layout.tsx exposes them as --font-inter / --font-roboto).
        // Persian fallbacks (Vazirmatn / IRANSansX / Tahoma) keep RTL content
        // rendering correctly.
        sans: [
          '-apple-system',
          'BlinkMacSystemFont',
          '"SF Pro Display"',
          '"SF Pro Text"',
          '"SF Pro Rounded"',
          '"Helvetica Neue"',
          'var(--font-inter)',
          'var(--font-roboto)',
          'Segoe UI',
          'Roboto',
          'Arial',
          'Vazirmatn',
          'IRANSansX',
          'Tahoma',
          'sans-serif',
        ],
        // Rounded variant for playful/health elements (SF Pro Rounded).
        rounded: [
          '"SF Pro Rounded"',
          '-apple-system',
          'BlinkMacSystemFont',
          '"SF Pro Display"',
          '"SF Pro Text"',
          '"Helvetica Neue"',
          'var(--font-inter)',
          'var(--font-roboto)',
          'Segoe UI',
          'Roboto',
          'Arial',
          'Vazirmatn',
          'IRANSansX',
          'Tahoma',
          'sans-serif',
        ],
        // Material platform: Roboto first (Android/M3), Inter as the
        // cross-platform fallback, SF Pro as the Apple-system fallback.
        'material-sans': [
          'var(--font-roboto)',
          'Roboto',
          'var(--font-inter)',
          'Inter',
          '-apple-system',
          'BlinkMacSystemFont',
          '"SF Pro Display"',
          '"SF Pro Text"',
          '"Helvetica Neue"',
          'Segoe UI',
          'Arial',
          'Vazirmatn',
          'IRANSansX',
          'Tahoma',
          'sans-serif',
        ],
        mono: [
          '"SF Mono"',
          'ui-monospace',
          'SFMono-Regular',
          'Menlo',
          'Monaco',
          'Consolas',
          '"Liberation Mono"',
          '"Courier New"',
          'monospace',
        ],
      },
      colors: {
        // Apple system colors (HIG). Semantic tokens are resolved from CSS
        // custom properties defined in src/app/globals.css, so every `apple-*`
        // color automatically flips between light (:root) and dark (.dark).
        apple: {
          // Backgrounds
          background: 'var(--apple-background)',
          'background-secondary': 'var(--apple-background-secondary)',
          'background-tertiary': 'var(--apple-background-tertiary)',
          'grouped-background': 'var(--apple-grouped-background)',
          'grouped-background-secondary': 'var(--apple-grouped-background-secondary)',
          'grouped-background-tertiary': 'var(--apple-grouped-background-tertiary)',
          // Labels
          label: 'var(--apple-label)',
          'label-secondary': 'var(--apple-label-secondary)',
          'label-tertiary': 'var(--apple-label-tertiary)',
          'label-quaternary': 'var(--apple-label-quaternary)',
          // Fills
          fill: 'var(--apple-fill)',
          'fill-secondary': 'var(--apple-fill-secondary)',
          'fill-tertiary': 'var(--apple-fill-tertiary)',
          'fill-quaternary': 'var(--apple-fill-quaternary)',
          // Separators
          separator: 'var(--apple-separator)',
          'separator-opaque': 'var(--apple-separator-opaque)',
          // Accent colors
          red: 'var(--apple-red)',
          orange: 'var(--apple-orange)',
          yellow: 'var(--apple-yellow)',
          green: 'var(--apple-green)',
          mint: 'var(--apple-mint)',
          teal: 'var(--apple-teal)',
          cyan: 'var(--apple-cyan)',
          blue: 'var(--apple-blue)',
          indigo: 'var(--apple-indigo)',
          purple: 'var(--apple-purple)',
          pink: 'var(--apple-pink)',
          brown: 'var(--apple-brown)',
          // System grays
          gray: 'var(--apple-gray)',
          'gray-2': 'var(--apple-gray-2)',
          'gray-3': 'var(--apple-gray-3)',
          'gray-4': 'var(--apple-gray-4)',
          'gray-5': 'var(--apple-gray-5)',
          'gray-6': 'var(--apple-gray-6)',
        },
        // Material 3 color roles (dynamic color baseline). Every `material-*`
        // utility (e.g. bg-material-primary, text-material-on-surface,
        // bg-material-surface-container-low) resolves to a CSS custom property
        // defined in globals.css, flipping automatically between light and
        // dark — no static color values live in the config.
        material: {
          // Primary / secondary / tertiary role pairs
          primary: 'var(--material-primary)',
          'on-primary': 'var(--material-on-primary)',
          'primary-container': 'var(--material-primary-container)',
          'on-primary-container': 'var(--material-on-primary-container)',
          secondary: 'var(--material-secondary)',
          'on-secondary': 'var(--material-on-secondary)',
          'secondary-container': 'var(--material-secondary-container)',
          'on-secondary-container': 'var(--material-on-secondary-container)',
          tertiary: 'var(--material-tertiary)',
          'on-tertiary': 'var(--material-on-tertiary)',
          'tertiary-container': 'var(--material-tertiary-container)',
          'on-tertiary-container': 'var(--material-on-tertiary-container)',
          // Error
          error: 'var(--material-error)',
          'on-error': 'var(--material-on-error)',
          'error-container': 'var(--material-error-container)',
          'on-error-container': 'var(--material-on-error-container)',
          // Background / surface
          background: 'var(--material-background)',
          'on-background': 'var(--material-on-background)',
          surface: 'var(--material-surface)',
          'on-surface': 'var(--material-on-surface)',
          'surface-variant': 'var(--material-surface-variant)',
          'on-surface-variant': 'var(--material-on-surface-variant)',
          'surface-dim': 'var(--material-surface-dim)',
          'surface-bright': 'var(--material-surface-bright)',
          'surface-container-lowest': 'var(--material-surface-container-lowest)',
          'surface-container-low': 'var(--material-surface-container-low)',
          'surface-container': 'var(--material-surface-container)',
          'surface-container-high': 'var(--material-surface-container-high)',
          'surface-container-highest': 'var(--material-surface-container-highest)',
          // Outline / inverse
          outline: 'var(--material-outline)',
          'outline-variant': 'var(--material-outline-variant)',
          'inverse-surface': 'var(--material-inverse-surface)',
          'inverse-on-surface': 'var(--material-inverse-on-surface)',
          'inverse-primary': 'var(--material-inverse-primary)',
          // Misc M3 roles
          shadow: 'var(--material-shadow)',
          scrim: 'var(--material-scrim)',
          'surface-tint': 'var(--material-surface-tint)',
        },
        // Apex brand + workout state tokens (DESIGN_SYSTEM.md §2 / §5).
        // All resolve to CSS custom properties that flip with .dark, so
        // `bg-apex-state-start`, `text-apex-primary-text`, etc. are safe on
        // every platform and in both modes.
        apex: {
          primary: 'var(--apex-primary)',
          'primary-hover': 'var(--apex-primary-hover)',
          'primary-active': 'var(--apex-primary-active)',
          'on-primary': 'var(--apex-on-primary)',
          'primary-text': 'var(--apex-primary-text)',
          'primary-soft': 'var(--apex-primary-soft)',
          'primary-soft-strong': 'var(--apex-primary-soft-strong)',
          'primary-border': 'var(--apex-primary-border)',
          'focus-ring': 'var(--apex-focus-ring)',
          bg: 'var(--apex-bg)',
          surface: 'var(--apex-surface)',
          card: 'var(--apex-card)',
          // `--apex-text` is the canonical alias of `--apex-text-primary`
          // (globals.css), used by workout/social components. Exposing it here
          // makes `text-apex-text` a first-class utility like the CSS alias.
          text: 'var(--apex-text)',
          'text-primary': 'var(--apex-text-primary)',
          'text-secondary': 'var(--apex-text-secondary)',
          'text-tertiary': 'var(--apex-text-tertiary)',
          border: 'var(--apex-border)',
          fill: 'var(--apex-fill)',
          // Media layer (video chrome over content) — mode-independent.
          'media-overlay': 'var(--apex-media-overlay)',
          'media-scrim': 'var(--apex-media-scrim)',
          state: {
            idle: 'var(--apex-state-idle)',
            'idle-soft': 'var(--apex-state-idle-soft)',
            'idle-text': 'var(--apex-state-idle-text)',
            start: 'var(--apex-state-start)',
            'on-start': 'var(--apex-on-start)',
            'start-soft': 'var(--apex-state-start-soft)',
            'start-text': 'var(--apex-state-start-text)',
            rest: 'var(--apex-state-rest)',
            'on-rest': 'var(--apex-on-rest)',
            'rest-soft': 'var(--apex-state-rest-soft)',
            'rest-text': 'var(--apex-state-rest-text)',
            success: 'var(--apex-state-success)',
            'on-success': 'var(--apex-on-success)',
            'success-soft': 'var(--apex-state-success-soft)',
            'success-text': 'var(--apex-state-success-text)',
            alert: 'var(--apex-state-alert)',
            'on-alert': 'var(--apex-on-alert)',
            'alert-soft': 'var(--apex-state-alert-soft)',
            'alert-text': 'var(--apex-state-alert-text)',
          }
        },

      },
      borderRadius: {
        // Continuous corner scale for cards/panels (Apple HIG):
        // 8pt → 10pt → 12pt → 14pt → 16pt → 20pt → 24pt → 36pt
        // rounded-xl/2xl/3xl stay on the native Tailwind values (12/16/24pt);
        // the intermediate steps make the progression continuous.
        '1.5xl': '0.875rem', // 14pt — between rounded-xl and rounded-2xl
        '2.5xl': '1.25rem', // 20pt — between rounded-2xl and rounded-3xl
        '4xl': '2.25rem', // 36pt — sheets / large modals
      },
      boxShadow: {
        // Apple-style soft, layered shadows (light mode; dark uses CSS vars
        // defined in globals.css via .glass helpers).
        'apple-sm': '0 1px 2px rgba(0, 0, 0, 0.06), 0 1px 3px rgba(0, 0, 0, 0.04)',
        apple: '0 2px 8px rgba(0, 0, 0, 0.06), 0 8px 24px rgba(0, 0, 0, 0.06)',
        'apple-lg': '0 4px 12px rgba(0, 0, 0, 0.08), 0 16px 40px rgba(0, 0, 0, 0.10)',
        'apple-glow': '0 0 0 1px rgba(0, 0, 0, 0.02), 0 8px 24px rgba(0, 122, 255, 0.16)',
        // Material 3 elevation shadows (1–5). Resolved through CSS variables
        // (--elevation-1 … --elevation-5 in globals.css) so the values can be
        // tuned per platform / light-dark without touching markup. Usage:
        // `shadow-elevation-2`, `dark:shadow-elevation-4`, …
        'elevation-1': 'var(--elevation-1)',
        'elevation-2': 'var(--elevation-2)',
        'elevation-3': 'var(--elevation-3)',
        'elevation-4': 'var(--elevation-4)',
        'elevation-5': 'var(--elevation-5)',
      },
      backdropBlur: {
        xs: '2px',
      },
      transitionTimingFunction: {
        // Apple's standard ease curve
        'apple-ease': 'cubic-bezier(0.25, 0.1, 0.25, 1)',
        // Material 3 motion tokens (standard + emphasized)
        'material-standard': 'cubic-bezier(0.4, 0, 0.2, 1)',
        'material-emphasized': 'cubic-bezier(0.2, 0, 0, 1)',
      },
    },
  },
  plugins: [],
};
