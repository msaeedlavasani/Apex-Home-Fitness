'use client';

import Link from 'next/link';
import {useLocale, useTranslations} from 'next-intl';
import {ChevronLeft, Dumbbell, Play} from 'lucide-react';
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
 * WebLayout — responsive, mobile-first web shell.
 *
 *  - Desktop (md+): fixed start-sidebar (256px) with the Apex gradient
 *    brand mark + wordmark, vertical nav with an active indicator bar,
 *    and a footer row (version + appearance toggle). Content is offset
 *    with `md:ps-64`.
 *  - Mobile (<md): sticky glass top bar (brand mark + appearance toggle)
 *    and a horizontally scrollable pill nav — the mobile-first top-nav.
 *
 * Sidebar order: Home, History, Analytics, Preferences, Profile — Profile is
 * deliberately the LAST entry (settings screens sit above it). The mobile
 * pill nav and the iOS/Android tab bars share the same `APP_NAV` list, so
 * Preferences is reachable on every platform.
 *
 * Uses `apple-*` semantic surfaces and the shared Apex brand tokens, so it
 * matches iOS/Android branding while feeling like a native web app. Logical
 * properties keep it RTL-aware; every color flips with the active theme.
 */

/** Desktop-sidebar order — Profile last, Preferences just above it. */
const sidebarOrder: NavItem[] = APP_NAV;
export function WebLayout({title, subtitle, overline, backHref, children}: LayoutChromeProps) {
  const locale = useLocale();
  const t = useTranslations('Nav');
  const tProfile = useTranslations('Profile');
  const active = useActiveSection();

  return (
    <div className="min-h-dvh bg-apex-surface text-apex-text-primary">
      {/* ── Desktop corner controls (language + theme) ────────
          The toggles live in the TOP corner of the site on desktop — the
          end corner opposite the sidebar: top-LEFT in the Persian (RTL)
          version, top-RIGHT in English (LTR). The mobile top bar keeps its
          own copies in the same header row. */}
      <div className="glass-strong fixed top-3 z-50 hidden items-center gap-1 rounded-full p-1 md:flex ltr:right-3 rtl:left-3">
        <LanguageSwitcher />
        <ThemeToggle className="flex h-11 w-11 items-center justify-center rounded-full text-apex-text-secondary transition-colors hover:bg-apex-fill" />
      </div>

      {/* ── Desktop sidebar ─────────────────────────────────── */}
      <aside className="fixed inset-y-0 start-0 z-40 hidden w-64 flex-col border-e border-apex-border bg-[color:color-mix(in_srgb,var(--apex-card)_85%,transparent)] backdrop-blur-md md:flex">
        <BrandLink href={`/${locale}/dashboard`} />
        <nav aria-label={t('navLabel')} className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
          {sidebarOrder.map((item) => (
            <SidebarItem key={item.section} item={item} active={item.section === active} />
          ))}
        </nav>
        {/* Primary action pinned to the bottom of the sidebar, above the
            version line. The version text is centered and never truncated. */}
        <div className="space-y-2.5 border-t border-apex-border p-3">
          <Link
            href={`/${locale}/workout`}
            className="flex min-h-11 w-full items-center justify-center gap-2 rounded-xl px-4 py-3 text-[15px] font-semibold text-apex-on-primary transition-colors hover:opacity-95 active:scale-[0.99] touch-manipulation focus:outline-none focus-visible:ring-2 focus-visible:ring-apex-focus-ring"
            style={{background: 'var(--apex-gradient-brand)'}}
          >
            <Play className="h-4 w-4 fill-current" aria-hidden="true" />
            {t('startWorkout')}
          </Link>
          <p className="px-2 text-center text-[11px] leading-relaxed text-apex-text-tertiary">
            {tProfile('footer')}
          </p>
        </div>
      </aside>

      {/* ── Mobile top bar + pill nav (mobile-first top-nav) ── */}
      <header
        className="glass-strong sticky top-0 z-40 border-b border-[color:color-mix(in_srgb,var(--apex-border)_70%,transparent)] md:hidden"
        style={{paddingTop: 'env(safe-area-inset-top)'}}
      >
        <div className="flex h-14 items-center justify-between px-4">
          <BrandLink href={`/${locale}/dashboard`} compact />
          <div className="flex items-center gap-2">
            <LanguageSwitcher />
            <ThemeToggle className="flex h-11 w-11 items-center justify-center rounded-full text-apex-text-secondary transition-colors hover:bg-apex-fill" />
          </div>
        </div>
        {/* Distinct label from the desktop sidebar nav — both copies exist in
            the DOM (responsive nav) and must stay unambiguous to assistive
            tech; only one is ever visible (sidebar: md+, top bar: <md). */}
        <nav
          aria-label={t('navLabelMobile')}
          className="no-scrollbar flex gap-1 overflow-x-auto px-2.5 pb-3"
        >
          {APP_NAV.map((item) => (
            <PillItem key={item.section} item={item} active={item.section === active} />
          ))}
        </nav>
      </header>

      {/* ── Content ─────────────────────────────────────────── */}
      <div className="md:ps-64">
        <main className="mx-auto w-full max-w-5xl px-4 pb-16 pt-6 sm:px-6 md:px-10 md:pb-24 md:pt-10">
          {backHref ? (
            <Link
              href={backHref}
              // min-h-11 (44px) keeps the Back control a comfortable touch
              // target on mobile (matches the iOS/Android back affordances).
              className="inline-flex min-h-11 items-center gap-1 rounded-lg px-2 text-sm font-medium text-apex-primary transition-colors hover:bg-apex-primary-soft focus:outline-none focus-visible:ring-2 focus-visible:ring-apex-focus-ring"
            >
              <ChevronLeft className="h-4 w-4 rtl:rotate-180" aria-hidden="true" />
              {t('back')}
            </Link>
          ) : null}

          {overline ? (
            <p className="mt-4 text-xs font-semibold uppercase tracking-[0.08em] text-apex-primary">
              {overline}
            </p>
          ) : null}

          {title ? (
            <h1 className="mt-1 text-3xl font-bold tracking-tight md:text-4xl">{title}</h1>
          ) : null}

          {subtitle ? (
            <p className="mt-1.5 text-[15px] text-apex-text-secondary md:text-base">{subtitle}</p>
          ) : null}

          <div className="mt-6 md:mt-8">{children}</div>
        </main>
      </div>
    </div>
  );
}

/** Apex brand mark — gradient logo (apex-gradient-brand) + wordmark. */
function BrandLink({href, compact = false}: {href: string; compact?: boolean}) {
  return (
    <Link
      href={href}
      className={[
        'flex items-center gap-2.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-apex-focus-ring',
        compact ? 'px-1 py-1' : 'px-5 py-5',
      ].join(' ')}
    >
      <span
        aria-hidden="true"
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-apex-on-primary shadow-apple-glow"
        style={{background: 'var(--apex-gradient-brand)'}}
      >
        <Dumbbell className="h-5 w-5" />
      </span>
      {!compact ? (
        <span className="text-[15px] font-bold tracking-tight">
          Apex <span className="text-apex-primary-text">Home Fitness</span>
        </span>
      ) : null}
    </Link>
  );
}

function SidebarItem({item, active}: {item: NavItem; active: boolean}) {
  const locale = useLocale();
  const t = useTranslations('Nav');
  const Icon = item.icon;
  return (
    <Link
      href={sectionPath(item.section, locale)}
      aria-current={active ? 'page' : undefined}
      className={[
        // py-3 keeps the row ≥ 48px (comfortable for touch laptops too).
        'relative flex items-center gap-3 rounded-xl px-3 py-3 text-[15px] font-medium transition-colors touch-manipulation',
        'focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-apex-focus-ring',
        active
          ? 'bg-apex-primary-soft text-apex-primary'
          : 'text-apex-text-secondary hover:bg-apex-fill hover:text-apex-text-primary',
      ].join(' ')}
    >
      {active ? (
        <span
          aria-hidden="true"
          className="absolute inset-y-2 start-0 w-1 rounded-full bg-apex-primary"
        />
      ) : null}
      <Icon className="h-5 w-5 shrink-0" aria-hidden="true" />
      <span className="truncate">{t(item.messageKey)}</span>
    </Link>
  );
}

function PillItem({item, active}: {item: NavItem; active: boolean}) {
  const locale = useLocale();
  const t = useTranslations('Nav');
  const Icon = item.icon;
  return (
    <Link
      href={sectionPath(item.section, locale)}
      aria-current={active ? 'page' : undefined}
      className={[
        // py-3 + min-h-11 ≈ 44px target; five pills may overflow narrow
        // viewports, so the nav owns horizontal scrolling (overflow-x-auto).
        'flex min-h-11 shrink-0 items-center gap-1.5 rounded-full px-2.5 py-3 text-[13px] font-medium leading-5 transition-colors touch-manipulation',
        'focus:outline-none focus-visible:ring-2 focus-visible:ring-apex-focus-ring',
        active
          ? 'bg-apex-primary-soft text-apex-primary'
          : 'text-apex-text-secondary hover:bg-apex-fill',
      ].join(' ')}
    >
      <Icon className="h-4 w-4" aria-hidden="true" />
      {t(item.messageKey)}
    </Link>
  );
}
