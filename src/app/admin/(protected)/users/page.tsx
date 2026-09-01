import {getTranslations} from 'next-intl/server';

import {listUsers} from '@/lib/admin/console';
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

export default async function AdminUsersPage() {
  await requireAdmin();
  const locale = await getAdminLocaleFromRequest();
  const t = await getTranslations({locale, namespace: 'admin.users'});
  const users = await listUsers(100);

  return (
    <AdminPageSection>
      <AdminSectionHeader
        title={t('title')}
        description={t('description')}
        count={users.length}
      />

      <AdminTable
        caption={t('caption')}
        minWidth={760}
        columns={[
          {label: t('email')},
          {label: t('phone')},
          {label: t('level')},
          {label: t('xp'), align: 'right'},
          {label: t('level'), align: 'right'},
          {label: t('workouts'), align: 'right'},
          {label: t('joined')},
        ]}
      >
        {users.map((user) => (
          <tr key={user.id}>
            <td className="py-3 pe-4 text-apex-text-primary">{user.email}</td>
            <td className="py-3 pe-4 text-apex-text-secondary">{user.phone ?? '—'}</td>
            <td className="py-3 pe-4 text-apex-text-secondary">{user.fitnessLevel ?? '—'}</td>
            <td className="py-3 pe-4 text-end text-apex-text-secondary">{user.xp}</td>
            <td className="py-3 pe-4 text-end text-apex-text-secondary">{user.level}</td>
            <td className="py-3 pe-4 text-end text-apex-text-secondary">{user.workoutSessions}</td>
            <td className="py-3 pe-4 text-apex-text-secondary">{formatAdminDate(user.createdAt, locale)}</td>
          </tr>
        ))}
      </AdminTable>

      {users.length === 0 ? <AdminEmptyState message={t('empty')} className="mt-4" /> : null}
    </AdminPageSection>
  );
}