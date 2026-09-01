'use client';

import {Monitor, Moon, Sun} from 'lucide-react';
import {useTranslations} from 'next-intl';

import {THEMES, useTheme, type Theme} from '@/components/providers/ThemeProvider';

const ICONS: Record<Theme, typeof Sun> = {
  light: Sun,
  dark: Moon,
  system: Monitor,
};

/**
 * Admin console Light/Dark theme switcher (ADMIN-THEME-SWITCH-01).
 *
 * Reuses the SHARED theme architecture — the same `ThemeProvider` /
 * `ThemeScript` the consumer app uses (persisted `theme` localStorage key,
 * system-preference detection, no-FOUC hydration). No parallel admin theme
 * system: selection is applied to the same `<html class="dark">` /
 * `color-scheme` mechanism via the shared tokens in globals.css.
 *
 * Mirrors the AdminLocaleSwitcher a11y pattern (radiogroup, aria-checked,
 * ≥44px touch targets, design-system focus ring) and the public Profile
 * theme segmented control (light / dark / system).
 */
export function AdminThemeSwitcher({className = ''}: {className?: string}) {
  const {theme, setTheme} = useTheme();
  const t = useTranslations('admin.common');

  return (
    <div
      role="radiogroup"
      aria-label={t('theme')}
      className={[
        'inline-flex shrink-0 items-center rounded-full border border-apex-border bg-apex-surface p-0.5 shadow-sm',
        className,
      ].join(' ')}
    >
      {THEMES.map((value) => {
        const active = value === theme;
        const Icon = ICONS[value];
        const name = t(`theme${value.charAt(0).toUpperCase()}${value.slice(1)}`);
        return (
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={active}
            aria-label={active ? name : t(`switchTo${value.charAt(0).toUpperCase()}${value.slice(1)}`)}
            title={name}
            // The active checked state mirrors the persisted theme: SSR
            // renders it from the `admin-theme` cookie, and the one edge
            // case where a public-app localStorage theme differs from the
            // cookie on a first admin visit is attribute-divergence only,
            // so hydration is instructed to keep the server markup.
            suppressHydrationWarning
            onClick={() => setTheme(value)}
            className={[
              'flex h-11 min-w-11 items-center justify-center rounded-full px-3 text-[13px] font-semibold transition-colors touch-manipulation',
              'focus:outline-none focus-visible:ring-2 focus-visible:ring-apex-focus-ring',
              active
                ? 'bg-apex-primary text-apex-on-primary shadow-sm'
                : 'text-apex-text-secondary hover:bg-apex-fill hover:text-apex-text-primary',
            ].join(' ')}
          >
            <Icon className="h-[18px] w-[18px]" aria-hidden="true" />
          </button>
        );
      })}
    </div>
  );
}
