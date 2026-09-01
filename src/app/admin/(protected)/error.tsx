'use client';

import {useEffect} from 'react';
import {useTranslations} from 'next-intl';
import {Button} from '@/components/ui/platform';
import {AdminPageSection} from '@/components/admin/AdminPrimitives';

/**
 * Admin console error boundary (ADMIN-DS-04, localized in ADMIN-DS-05).
 * Client component per the Next.js error.tsx contract; offers a bounded
 * retry (reset) and never exposes raw error internals to the user.
 * Renders inside the admin root layout's NextIntlClientProvider, so it
 * follows the active admin locale.
 */
export default function AdminConsoleError({
  error,
  reset,
}: {
  error: Error & {digest?: string};
  reset: () => void;
}) {
  const t = useTranslations('admin.common');

  useEffect(() => {
    console.error('Admin console error', error);
  }, [error]);

  return (
    <AdminPageSection>
      <h2 className="text-lg font-semibold">{t('errorTitle')}</h2>
      <p className="mt-1 text-sm text-apex-text-secondary">{t('errorBody')}</p>
      <div className="mt-6">
        <Button variant="filled" size="md" onClick={reset}>
          {t('retry')}
        </Button>
      </div>
    </AdminPageSection>
  );
}