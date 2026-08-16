'use client';

import Link from 'next/link';
import {useLocale, useTranslations} from 'next-intl';
import {ArrowLeft} from 'lucide-react';
import {
  APP_NAV,
  sectionPath,
  useActiveSection,
  type LayoutChromeProps,
  type NavItem,
} from './nav';
import {LanguageSwitcher} from './LanguageSwitcher';
import {ThemeToggle} from './ThemeToggle';

/**
 * AndroidLayout — Material 3 navigation shell.
 *
 *  - Standard top AppBar: 64dp, leading back arrow (when `backHref` is
 *    provided), title-large (22sp) headline, trailing appearance action.
 *  - Material 3 Navigation Bar: 80dp, surface-container background, active
 *    destination gets a pill indicator (secondary-container idiom, here
 *    mapped to the Apex brand tint) + emphasized label.
 *  - Safe-area aware (status bar inset on top, gesture bar at bottom).
 *
 * AppShell sets `<html data-platform="material">` for this layout, so the
 * design-system neutral surface tokens (glass / card-surface / elevation)
 * resolve to M3 elevations and the font stack flips to Roboto.
 *
 * Branding: active destination uses Apex tokens (apex-primary /
 * apex-primary-soft) — consistent with iOS/web, native M3 structure.
 */
export function AndroidLayout({title, subtitle, overline, backHref, children}: LayoutChromeProps) {
  const locale = useLocale();
  const t = useTranslations('Nav');
  const active = useActiveSection();

  return (
    <div className="min-h-dvh bg-apex-bg text-apex-text-primary">
      {/* Standard AppBar */}
      <header
        className="fixed inset-x-0 top-0 z-40 border-b border-[color:color-mix(in_srgb,var(--apex-border)_60%,transparent)] bg-[color:color-mix(in_srgb,var(--apex-surface)_95%,transparent)] backdrop-blur-md"
        style={{paddingTop: 'env(safe-area-inset-top)'}}
      >
        <div className="mx-auto flex h-16 w-full max-w-3xl items-center gap-1 px-2 sm:px-4">
          {backHref ? (
            <Link
              href={backHref}
              aria-label={t('back')}
              className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-apex-text-secondary transition-colors hover:bg-apex-fill focus:outline-none focus-visible:ring-2 focus-visible:ring-apex-focus-ring"
            >
              <ArrowLeft className="h-6 w-6 rtl:rotate-180" aria-hidden="true" />
            </Link>
          ) : null}

          <div className="min-w-0 flex-1 px-1">
            {overline ? (
              <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-apex-primary">
                {overline}
              </p>
            ) : null}
            {title ? (
              <h1 className="truncate text-[22px] font-medium leading-7 tracking-normal">{title}</h1>
            ) : null}
            {subtitle ? (
              <p className="truncate text-xs text-apex-text-secondary">{subtitle}</p>
            ) : null}
          </div>

          <div className="flex items-center gap-1">
            <LanguageSwitcher />
            <ThemeToggle className="flex h-12 w-12 items-center justify-center rounded-full text-apex-text-secondary transition-colors hover:bg-apex-fill" />
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="mx-auto w-full max-w-3xl px-4 pb-[calc(env(safe-area-inset-bottom)+6.5rem)] pt-[calc(env(safe-area-inset-top)+5.5rem)] sm:px-6">
        {children}
      </main>

      {/* Material 3 Navigation Bar */}
      <nav
        aria-label={t('navLabel')}
        className="fixed inset-x-0 bottom-0 z-40 border-t border-[color:color-mix(in_srgb,var(--apex-border)_60%,transparent)] bg-apex-surface"
        style={{paddingBottom: 'env(safe-area-inset-bottom)'}}
      >
        <div className="mx-auto grid w-full max-w-3xl grid-cols-4">
          {APP_NAV.map((item) => (
            <NavBarItem key={item.section} item={item} active={item.section === active} />
          ))}
        </div>
      </nav>
    </div>
  );
}

function NavBarItem({item, active}: {item: NavItem; active: boolean}) {
  const locale = useLocale();
  const t = useTranslations('Nav');
  const Icon = item.icon;
  return (
    <Link
      href={sectionPath(item.section, locale)}
      aria-current={active ? 'page' : undefined}
      className={[
        'flex min-h-20 flex-col items-center justify-center gap-0.5 px-2 pb-2 pt-1.5 transition-colors touch-manipulation',
        'focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-apex-focus-ring',
      ].join(' ')}
    >
      <span
        className={[
          'flex h-8 items-center justify-center rounded-full px-4 transition-colors',
          active ? 'bg-apex-primary-soft' : '',
        ].join(' ')}
      >
        <Icon
          className={[
            'h-6 w-6',
            active ? 'text-apex-primary' : 'text-apex-text-secondary',
          ].join(' ')}
          aria-hidden="true"
        />
      </span>
      <span
        className={[
          'text-xs leading-none',
          active ? 'font-medium text-apex-text-primary' : 'text-apex-text-secondary',
        ].join(' ')}
      >
        {t(item.messageKey)}
      </span>
    </Link>
  );
}
