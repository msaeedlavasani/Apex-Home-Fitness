import {getTranslations} from 'next-intl/server';

import {getAdminLocaleFromRequest} from '@/lib/admin/requestLocale';
import {AdminPageSection} from '@/components/admin/AdminPrimitives';

/**
 * Admin console loading boundary (ADMIN-DS-04, localized in ADMIN-DS-05).
 * Server component; shown while a protected console route's data is being
 * fetched. Tokens-only, so the skeleton follows the active theme (incl.
 * dark mode) and the active locale's direction (logical utilities).
 */
export default async function AdminConsoleLoading() {
  const locale = await getAdminLocaleFromRequest();
  const t = await getTranslations({locale, namespace: 'admin.common'});

  return (
    <section className="space-y-8" aria-busy="true" aria-label={t('loadingLabel')}>
      <AdminPageSection>
        <div className="h-5 w-40 animate-pulse rounded bg-apex-fill" />
        <div className="mt-6 space-y-3">
          <div className="h-4 w-full animate-pulse rounded bg-apex-fill" />
          <div className="h-4 w-4/5 animate-pulse rounded bg-apex-fill" />
          <div className="h-4 w-3/5 animate-pulse rounded bg-apex-fill" />
        </div>
      </AdminPageSection>
      <AdminPageSection>
        <div className="h-5 w-48 animate-pulse rounded bg-apex-fill" />
        <div className="mt-6 space-y-3">
          <div className="h-4 w-full animate-pulse rounded bg-apex-fill" />
          <div className="h-4 w-2/3 animate-pulse rounded bg-apex-fill" />
        </div>
      </AdminPageSection>
    </section>
  );
}