import {getTranslations} from 'next-intl/server';

import {listPrograms} from '@/lib/admin/console';
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

export default async function AdminProgramsPage() {
  await requireAdmin();
  const locale = await getAdminLocaleFromRequest();
  const t = await getTranslations({locale, namespace: 'admin.programs'});
  const programs = await listPrograms(100);

  return (
    <AdminPageSection>
      <AdminSectionHeader
        title={t('title')}
        description={t('description')}
        count={programs.length}
      />

      <AdminTable
        caption={t('caption')}
        minWidth={720}
        columns={[
          {label: t('name')},
          {label: t('owner')},
          {label: t('level')},
          {label: t('weeks'), align: 'right'},
          {label: t('perWeek'), align: 'right'},
          {label: t('exercises'), align: 'right'},
          {label: t('workouts'), align: 'right'},
          {label: t('created')},
        ]}
      >
        {programs.map((program) => (
          <tr key={program.id}>
            <td className="max-w-[260px] truncate py-3 pe-4 text-apex-text-primary">{program.name}</td>
            <td className="py-3 pe-4 text-apex-text-secondary">{program.ownerEmail ?? '—'}</td>
            <td className="py-3 pe-4 text-apex-text-secondary">{program.level}</td>
            <td className="py-3 pe-4 text-end text-apex-text-secondary">{program.durationWeeks}</td>
            <td className="py-3 pe-4 text-end text-apex-text-secondary">{program.sessionsPerWeek ?? '—'}</td>
            <td className="py-3 pe-4 text-end text-apex-text-secondary">{program.exercises}</td>
            <td className="py-3 pe-4 text-end text-apex-text-secondary">{program.workoutSessions}</td>
            <td className="py-3 pe-4 text-apex-text-secondary">{formatAdminDate(program.createdAt, locale)}</td>
          </tr>
        ))}
      </AdminTable>

      {programs.length === 0 ? <AdminEmptyState message={t('empty')} className="mt-4" /> : null}
    </AdminPageSection>
  );
}