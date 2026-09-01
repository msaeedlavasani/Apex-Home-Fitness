import Link from 'next/link';
import {getTranslations} from 'next-intl/server';

import {getAdminLocaleFromRequest} from '@/lib/admin/requestLocale';

/**
 * Admin-specific 404 (ADMIN-DS-04, localized in ADMIN-DS-05). Covers
 * unknown /admin/* addresses without leaking the generic Next.js not-found
 * onto the admin brand. Renders inside the admin root layout (which owns
 * `html lang/dir` + the NextIntlClientProvider), so it follows the active
 * admin locale.
 */
export default async function AdminNotFound() {
  const locale = await getAdminLocaleFromRequest();
  const t = await getTranslations({locale, namespace: 'admin.common'});

  return (
    <main className="flex min-h-dvh items-center justify-center bg-apex-surface px-4 py-10">
      <section className="w-full max-w-md rounded-3xl border border-apex-border bg-apex-card p-7 text-center shadow-apple-lg">
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-apex-primary-text">{t('appName')}</p>
        <h1 className="mt-3 text-3xl font-bold">{t('notFoundTitle')}</h1>
        <p className="mt-2 text-sm text-apex-text-secondary">{t('notFoundBody')}</p>
        <Link
          href="/admin/dashboard"
          className="mt-6 inline-flex min-h-11 items-center justify-center rounded-xl bg-apex-primary px-5 text-sm font-semibold text-apex-on-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--apex-focus-ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[color:var(--app-background)]"
        >
          {t('backToOverview')}
        </Link>
      </section>
    </main>
  );
}