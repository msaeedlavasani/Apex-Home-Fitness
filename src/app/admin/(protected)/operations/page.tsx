import {getTranslations} from 'next-intl/server';

import {listOperations} from '@/lib/admin/console';
import {requireAdmin} from '@/lib/admin/auth';
import {getAdminLocaleFromRequest} from '@/lib/admin/requestLocale';
import {
  AdminPageSection,
  AdminSectionHeader,
  AdminTable,
  AdminEmptyState,
} from '@/components/admin/AdminPrimitives';
import {formatAdminDate} from '@/lib/admin/format';

export const dynamic = 'force-dynamic';

export default async function AdminOperationsPage() {
  await requireAdmin();
  const locale = await getAdminLocaleFromRequest();
  const t = await getTranslations({locale, namespace: 'admin.operations'});
  const operations = await listOperations(100);

  return (
    <AdminPageSection>
      <AdminSectionHeader
        title={t('title')}
        description={t('description')}
        count={operations.length}
      />

      <AdminTable
        caption={t('caption')}
        minWidth={760}
        columns={[
          {label: t('user')},
          {label: t('key')},
          {label: t('status')},
          {label: t('program'), align: 'right'},
          {label: t('created')},
          {label: t('updated')},
        ]}
      >
        {operations.map((op) => (
          <tr key={op.id}>
            <td className="max-w-[220px] truncate py-3 pe-4 text-apex-text-primary">
              {op.userEmail ?? op.userId}
            </td>
            <td className="max-w-[180px] truncate py-3 pe-4 text-apex-text-secondary">{op.idempotencyKey}</td>
            <td className="py-3 pe-4 text-apex-text-secondary">{op.status}</td>
            <td className="py-3 pe-4 text-end text-apex-text-secondary">{op.hasProgram ? t('yes') : '—'}</td>
            <td className="py-3 pe-4 text-apex-text-secondary">{formatAdminDate(op.createdAt, locale)}</td>
            <td className="py-3 pe-4 text-apex-text-secondary">{formatAdminDate(op.updatedAt, locale)}</td>
          </tr>
        ))}
      </AdminTable>

      {operations.length === 0 ? <AdminEmptyState message={t('empty')} className="mt-4" /> : null}
    </AdminPageSection>
  );
}