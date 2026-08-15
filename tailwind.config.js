/** @type {import('tailwindcss').Config} */
module.exports = {
  // Class-based dark mode: toggling `dark` on <html> enables `dark:` variants
  // (ThemeProvider in src/components/providers/ThemeProvider.tsx manages this).
  darkMode: 'class',
  content: [
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  // Custom design-system classes defined in globals.css (@layer components /
  // @layer utilities) are JIT tree-shaken unless used in markup. Safelisting
  // them guarantees the glassmorphism/surface utilities always ship in CSS.
  safelist: [
    'glass',
    'glass-strong',
    'glass-subtle',
    'card-surface',
    'list-row',
    'no-scrollbar',
  ],
  theme: {
    extend: {
      fontFamily: {
        // Apple SF Pro-first system stack — resolves to the real SF Pro on
        // Apple devices, with Persian fallbacks (Vazirmatn / IRANSansX / Tahoma)
        // so RTL content keeps rendering correctly.
        sans: [
          '-apple-system',
          'BlinkMacSystemFont',
          '"SF Pro Display"',
          '"SF Pro Text"',
          '"SF Pro Rounded"',
          '"Helvetica Neue"',
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
          'Segoe UI',
          'Roboto',
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
      },
      backdropBlur: {
        xs: '2px',
      },
      transitionTimingFunction: {
        // Apple's standard ease curve
        'apple-ease': 'cubic-bezier(0.25, 0.1, 0.25, 1)',
      },
    },
  },
  plugins: [],
};
