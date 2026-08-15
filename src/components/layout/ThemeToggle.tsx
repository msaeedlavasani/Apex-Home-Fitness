'use client';

import {Monitor, Moon, Sun} from 'lucide-react';
import {useTranslations} from 'next-intl';
import {useTheme, type Theme} from '@/components/providers/ThemeProvider';

const ORDER: Theme[] = ['light', 'dark', 'system'];

const ICONS: Record<Theme, typeof Sun> = {
  light: Sun,
  dark: Moon,
  system: Monitor,
};

/**
 * In-chrome appearance shortcut — cycles light → dark → system and mirrors
 * the *selected* theme with a matching icon. The full segmented control
 * lives in the Profile screen; this toggle appears in the Android AppBar
 * and the web sidebar / mobile top bar (the iOS tab bar intentionally stays
 * clean — iOS apps surface appearance in Settings).
 */
export function ThemeToggle({className = ''}: {className?: string}) {
  const {theme, setTheme} = useTheme();
  const t = useTranslations('Profile.preferences.themeOptions');
  const next = ORDER[(ORDER.indexOf(theme) + 1) % ORDER.length];
  const Icon = ICONS[theme];
  const label = t(next);

  return (
    <button
      type="button"
      onClick={() => setTheme(next)}
      aria-label={label}
      title={label}
      className={[
        'shrink-0 transition-colors touch-manipulation',
        'focus:outline-none focus-visible:ring-2 focus-visible:ring-apex-focus-ring',
        className,
      ].join(' ')}
    >
      <Icon className="h-5 w-5" aria-hidden="true" />
    </button>
  );
}
