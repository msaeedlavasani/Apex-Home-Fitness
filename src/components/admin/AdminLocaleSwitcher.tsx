'use client';

import {useLocale, useTranslations} from 'next-intl';
import {useRouter} from 'next/navigation';

import {ADMIN_LOCALES, ADMIN_LOCALE_COOKIE, type AdminLocale} from '@/lib/admin/locale';

/**
 * Admin console EN ⇄ FA locale switcher (ADMIN-DS-05).
 *
 * Persists the choice via the `admin-locale` cookie (read server-side, so
 * every RSC render — layout, pages, boundaries, metadata — is correct and
 * works without JavaScript), then refreshes the server tree so `<html
 * lang/dir>` and all translations re-render. Mirrors the public
 * `LanguageSwitcher` a11y pattern (radio group, ≥44px touch targets,
 * design-system focus ring) with apex tokens.
 */
export function AdminLocaleSwitcher({className = ''}: {className?: string}) {
  const locale = useLocale() as AdminLocale;
  const t = useTranslations('admin.common');
  const router = useRouter();

  function switchTo(next: AdminLocale) {
    if (next === locale) return;
    document.cookie = `${ADMIN_LOCALE_COOKIE}=${next}; path=/; max-age=31536000; samesite=lax`;
    router.refresh();
  }

  return (
    <div
      role="radiogroup"
      aria-label={t('language')}
      className={[
        'inline-flex shrink-0 items-center rounded-full border border-apex-border bg-apex-surface p-0.5 shadow-sm',
        className,
      ].join(' ')}
    >
      {ADMIN_LOCALES.map((code) => {
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