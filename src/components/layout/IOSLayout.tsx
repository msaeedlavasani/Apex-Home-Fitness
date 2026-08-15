'use client';

import Link from 'next/link';
import {useLocale, useTranslations} from 'next-intl';
import {ChevronLeft} from 'lucide-react';
import {
  APP_NAV,
  sectionPath,
  useActiveSection,
  type LayoutChromeProps,
  type NavItem,
} from './nav';

/**
 * IOSLayout — Apple HIG navigation shell.
 *
 *  - Large-title header (34pt, tight tracking, SF-style) with optional
 *    eyebrow (overline) and subtitle — the classic iOS large-title pattern.
 *  - iOS-style back button (chevron + "Back") above the title when
 *    `backHref` is provided (pushed screens).
 *  - Frosted-glass bottom tab bar (glass-strong) with tinted active icon —
 *    the iOS tab bar idiom — fully safe-area aware (notch / home indicator).
 *
 * Branding: active states use the shared Apex primary (warm coral/orange)
 * so the app stays on-brand while the chrome reads as native iOS. All
 * colors flip automatically with the `apple-*` light/dark tokens.
 */
export function IOSLayout({title, subtitle, overline, backHref, children}: LayoutChromeProps) {
  const locale = useLocale();
  const t = useTranslations('Nav');
  const active = useActiveSection();

  return (
    <div className="min-h-dvh bg-apex-surface text-apex-text-primary">
      {/* Scrollable content — the large title lives here (iOS pattern) */}
      <main className="mx-auto w-full max-w-3xl px-4 pb-[calc(env(safe-area-inset-bottom)+5.75rem)] pt-[max(1.25rem,env(safe-area-inset-top))] sm:px-6">
        {backHref ? (
          <Link
            href={backHref}
            className="-ms-2 inline-flex items-center gap-0.5 rounded-lg px-2 py-1.5 text-[17px] text-apex-primary transition-colors hover:bg-apex-primary-soft focus:outline-none focus-visible:ring-2 focus-visible:ring-apex-focus-ring"
          >
            <ChevronLeft className="h-5 w-5 rtl:rotate-180" aria-hidden="true" />
            {t('back')}
          </Link>
        ) : null}

        {overline ? (
          <p className="mt-4 text-[13px] font-semibold uppercase tracking-wide text-apex-primary">
            {overline}
          </p>
        ) : null}

        {title ? (
          <h1 className="mt-1 text-[32px] font-bold leading-tight tracking-tight sm:text-[34px]">
            {title}
          </h1>
        ) : null}

        {subtitle ? (
          <p className="mt-1.5 text-[15px] text-apex-text-secondary">{subtitle}</p>
        ) : null}

        <div className="mt-6">{children}</div>
      </main>

      {/* Bottom tab bar — frosted glass, safe-area aware */}
      <nav
        aria-label={t('navLabel')}
        className="glass-strong fixed inset-x-0 bottom-0 z-50 border-t border-[color:color-mix(in_srgb,var(--apex-border)_60%,transparent)]"
        style={{paddingBottom: 'env(safe-area-inset-bottom)'}}
      >
        <div className="mx-auto grid w-full max-w-3xl grid-cols-4">
          {APP_NAV.map((item) => (
            <TabBarItem key={item.section} item={item} active={item.section === active} />
          ))}
        </div>
      </nav>
    </div>
  );
}

function TabBarItem({item, active}: {item: NavItem; active: boolean}) {
  const locale = useLocale();
  const t = useTranslations('Nav');
  const Icon = item.icon;
  return (
    <Link
      href={sectionPath(item.section, locale)}
      aria-current={active ? 'page' : undefined}
      className={[
        'flex flex-col items-center gap-1 pb-1.5 pt-2.5 transition-colors touch-manipulation',
        'focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-apex-focus-ring',
        active ? 'text-apex-primary' : 'text-apex-text-tertiary',
      ].join(' ')}
    >
      <Icon
        className="h-[26px] w-[26px]"
        strokeWidth={active ? 2.4 : 1.7}
        aria-hidden="true"
      />
      <span className="text-[10px] font-medium leading-none">{t(item.messageKey)}</span>
    </Link>
  );
}
