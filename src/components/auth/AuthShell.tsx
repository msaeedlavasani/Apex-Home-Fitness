'use client';

import type {ReactNode} from 'react';
import Link from 'next/link';
import {useLocale, useTranslations} from 'next-intl';
import {ChevronLeft, Dumbbell} from 'lucide-react';

/**
 * AuthShell — standalone pre-auth layout shared by the login and verify
 * screens. Deliberately does NOT use AppShell: auth pages render before a
 * session exists, so they get a minimal centered card with the Apex brand
 * mark, a localized back-to-start link and the form content. RTL flows from
 * the root layout's `dir` attribute automatically.
 */
export function AuthShell({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
}) {
  const t = useTranslations('Auth');
  const locale = useLocale();

  return (
    <div className="flex min-h-dvh flex-col bg-apex-surface text-apex-text-primary">
      <header
        className="mx-auto flex w-full max-w-md items-center gap-2 px-4 pt-6 sm:max-w-lg"
        style={{paddingTop: 'calc(env(safe-area-inset-top) + 1.5rem)'}}
      >
        <Link
          href={`/${locale}/quiz`}
          className="inline-flex min-h-11 items-center gap-1 rounded-lg px-2 text-sm font-medium text-apex-primary transition-colors hover:bg-apex-primary-soft focus:outline-none focus-visible:ring-2 focus-visible:ring-apex-focus-ring"
        >
          <ChevronLeft className="h-4 w-4 rtl:rotate-180" aria-hidden="true" />
          {t('backToStart')}
        </Link>
      </header>

      <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-4 py-8 sm:max-w-lg">
        <div className="flex flex-col items-center text-center">
          <span
            aria-hidden="true"
            className="flex h-14 w-14 items-center justify-center rounded-2xl text-apex-on-primary shadow-apple-glow"
            style={{background: 'var(--apex-gradient-brand)'}}
          >
            <Dumbbell className="h-7 w-7" />
          </span>
          <h1 className="mt-5 text-2xl font-bold tracking-tight sm:text-3xl">
            {title}
          </h1>
          <p className="mt-2 text-[15px] leading-relaxed text-apex-text-secondary">
            {subtitle}
          </p>
        </div>

        <div className="mt-8 rounded-3xl border border-apex-border bg-apex-card p-6 shadow-sm sm:p-8">
          {children}
        </div>
      </main>

      <footer className="pb-6 text-center text-xs text-apex-text-tertiary">
        {t('privacyNote')}
      </footer>
    </div>
  );
}
