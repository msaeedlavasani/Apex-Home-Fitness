'use client';

import {useLocale, useTranslations} from 'next-intl';
import {usePathname, useRouter} from '@/i18n/navigation';
import {APP_LOCALES, otherLocale, type AppLocale} from './language';

/**
 * Global language switcher (EN ⇄ FA) shown in the web sidebar footer, the
 * mobile top header bar and the Android AppBar — every surface that already
 * hosts the theme toggle.
 *
 * Behavior: switching preserves the current route path (locale-less via
 * next-intl shared-pathnames navigation), e.g. `/en/workout` → `/fa/workout`
 * and `/fa/quiz` → `/en/quiz`; deep/unknown routes simply swap the locale
 * segment and keep everything after it. Query strings are intentionally not
 * carried over (the auth `next` param stays locale-scoped).
 *
 * A11y: rendered as a radio group with labelled options; every option is a
 * native <button> with the design-system focus ring and a ≥ 44px touch
 * target (h-11) so it meets WCAG 2.5.5 on mobile.
 */
export function LanguageSwitcher({className = ''}: {className?: string}) {
  const locale = useLocale();
  const t = useTranslations('Language');
  const pathname = usePathname();
  const router = useRouter();

  const switchTo = (next: AppLocale) => {
    if (next === locale) return;
    router.push(pathname, {locale: next});
  };

  return (
    <div
      role="radiogroup"
      aria-label={t('label')}
      className={[
        'inline-flex shrink-0 items-center rounded-full border border-apex-border bg-apex-surface p-0.5 shadow-sm',
        className,
      ].join(' ')}
    >
      {APP_LOCALES.map((code) => {
        const active = code === locale;
        const name = code === 'en' ? t('enName') : t('faName');
        return (
          <button
            key={code}
            type="button"
            role="radio"
            aria-checked={active}
            aria-label={active ? name : t(code === 'en' ? 'switchToEn' : 'switchToFa')}
            onClick={() => switchTo(code)}
            className={[
              // h-11 keeps every option ≥ 44px tall (mobile touch target);
              // matches the adjacent ThemeToggle scale in all placements.
              'flex h-11 min-w-11 items-center justify-center rounded-full px-3 text-[13px] font-semibold transition-colors touch-manipulation',
              'focus:outline-none focus-visible:ring-2 focus-visible:ring-apex-focus-ring',
              active
                ? 'bg-apex-primary text-apex-on-primary shadow-sm'
                : 'text-apex-text-secondary hover:bg-apex-fill hover:text-apex-text-primary',
            ].join(' ')}
          >
            {t(code)}
          </button>
        );
      })}
    </div>
  );
}

// Re-exported for callers/tests that only need the locale contract.
export {otherLocale};
