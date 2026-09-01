import {getTranslations} from 'next-intl/server';

import {requireAdmin} from '@/lib/admin/auth';
import {getAdminLocaleFromRequest} from '@/lib/admin/requestLocale';
import {AdminLogoutButton} from '@/components/admin/AdminLogoutButton';
import {AdminLocaleSwitcher} from '@/components/admin/AdminLocaleSwitcher';
import {AdminThemeSwitcher} from '@/components/admin/AdminThemeSwitcher';
import {AdminNav} from '@/components/admin/AdminNav';

export default async function ProtectedAdminLayout({children}: {children: React.ReactNode}) {
  const admin = await requireAdmin();
  const locale = await getAdminLocaleFromRequest();
  const t = await getTranslations({locale, namespace: 'admin.common'});

  return (
    <main className="min-h-dvh bg-apex-surface px-5 py-8 sm:px-8">
      <div className="mx-auto max-w-6xl">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-apex-primary-text">{t('appName')}</p>
            <h1 className="mt-2 text-2xl font-bold">{t('consoleTitle')}</h1>
            <p className="mt-1 text-sm text-apex-text-secondary">{t('signedInAs', {email: admin.email})}</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <AdminLocaleSwitcher />
            <AdminThemeSwitcher />
            <AdminLogoutButton />
          </div>
        </header>
        <div className="mt-6">
          <AdminNav />
        </div>
        <div className="mt-8">{children}</div>
      </div>
    </main>
  );
}