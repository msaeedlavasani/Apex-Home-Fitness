'use client';

import React from 'react';
import {Moon, Sun, X} from 'lucide-react';
import {useLocale, useTranslations} from 'next-intl';
import {usePathname, useRouter} from '@/i18n/navigation';
import {otherLocale} from '@/components/layout/language';
import {useTheme} from '@/components/providers/ThemeProvider';

/**
 * Workout V2 SHELL CONTROLS (WORKOUT-V2-IMPL-01 owner correction) — the
 * compact top-right control family from the authoritative references:
 *
 *   [Language] | [Theme] | [Exit]
 *
 * OWNER OVERRIDES (correction contract §4/§5) — these supersede the previous
 * shell decisions where they conflict:
 *   - Language is TWO-STATE only (FA ⇄ EN): ONE direct tap swaps the locale
 *     through the application's existing next-intl routing (real switch, no
 *     dropdown, no radio capsule). The visible label is the TARGET locale
 *     ("فا" on EN, "EN" on FA) so the action is readable at a glance.
 *   - Theme is TWO-STATE only (Dark ⇄ Light): the Workout V2 surface exposes
 *     the light/dark subset of the canonical ThemeProvider — SYSTEM is never
 *     offered here. Persistence flows through the existing provider storage
 *     (no second theme system). The icon shows the ACTIVE theme truthfully.
 *   - Exit dispatches the orchestration-owned EXIT_WORKOUT intent. The later
 *     WP-12 result/Exit boundary owns confirmation and return navigation;
 *     this control never routes around orchestration.
 *
 * Compact family: 44px circular buttons (≥ canonical touch target), shared
 * surface/border tokens, one design family — never dominant over content.
 * Each control carries `data-slot="workout-v2-control"` so the shared shell
 * can apply the desktop-light contrast scrim (owner polish delta §B) without
 * geometry changes. Isolated to the V2 experience surface; the site-wide
 * LanguageSwitcher/ThemeToggle used by the rest of the app are untouched.
 */

const CONTROL_BASE =
  'inline-flex min-h-11 min-w-11 touch-manipulation items-center justify-center rounded-full ' +
  'border border-[color:var(--apex-border)] bg-[color:var(--apex-surface)]/70 shadow-sm ' +
  'text-[color:var(--apex-text)] transition-colors hover:bg-[color:var(--apex-fill)] ' +
  'focus:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--apex-focus-ring)]';

/** Two-state language control — one tap: EN ⇄ FA (real locale switch). */
export function WorkoutV2LanguageControl() {
  const locale = useLocale();
  const t = useTranslations('Language');
  const pathname = usePathname();
  const router = useRouter();

  const target = otherLocale(locale);
  return (
    <button
      type="button"
      data-workout-v2-language={true}
      data-slot="workout-v2-control"
      onClick={() => router.push(pathname, {locale: target})}
      aria-label={target === 'en' ? t('switchToEn') : t('switchToFa')}
      title={target === 'en' ? t('switchToEn') : t('switchToFa')}
      className={CONTROL_BASE}
    >
      <span className="text-[13px] font-bold tracking-wide" dir="ltr">
        {target === 'en' ? t('en') : t('fa')}
      </span>
    </button>
  );
}

/** Two-state theme control — one tap: Dark ⇄ Light (canonical persistence). */
export function WorkoutV2ThemeControl() {
  const {resolvedTheme, setTheme} = useTheme();
  const t = useTranslations('Profile.preferences.themeOptions');
  // Truthful icon: the ACTIVE theme. The label/title is the ACTION (the
  // target theme) — the same convention as the site's ThemeToggle: tapping
  // always performs exactly what the accessible name announces.
  const dark = resolvedTheme === 'dark';
  const label = t(dark ? 'light' : 'dark');
  return (
    <button
      type="button"
      data-workout-v2-theme={true}
      data-slot="workout-v2-control"
      onClick={() => setTheme(dark ? 'light' : 'dark')}
      aria-label={label}
      title={label}
      className={CONTROL_BASE}
    >
      {dark ? (
        <Moon className="h-5 w-5" aria-hidden="true" />
      ) : (
        <Sun className="h-5 w-5" aria-hidden="true" />
      )}
    </button>
  );
}

/**
 * Exit control — dispatches the orchestration-owned exit intent. Navigation
 * and any confirmation belong to the later session-result boundary; this
 * control never routes around the session authority.
 */
export function WorkoutV2ExitControl({onExit}: {onExit: () => void}) {
  const t = useTranslations('WorkoutV2.actions');
  return (
    <button
      type="button"
      data-workout-v2-exit={true}
      data-slot="workout-v2-control"
      onClick={onExit}
      aria-label={t('exit')}
      title={t('exit')}
      className={CONTROL_BASE}
    >
      <X className="h-5 w-5" aria-hidden="true" />
    </button>
  );
}
