import {getTranslations} from 'next-intl/server';

import {listExercises} from '@/lib/admin/console';
import {requireAdmin} from '@/lib/admin/auth';
import {getAdminLocaleFromRequest} from '@/lib/admin/requestLocale';
import {
  AdminPageSection,
  AdminSectionHeader,
  AdminTable,
  AdminEmptyState,
} from '@/components/admin/AdminPrimitives';

export const dynamic = 'force-dynamic';

export default async function AdminExercisesPage() {
  await requireAdmin();
  const locale = await getAdminLocaleFromRequest();
  const t = await getTranslations({locale, namespace: 'admin.exercises'});
  const exercises = await listExercises(400);

  return (
    <AdminPageSection>
      <AdminSectionHeader
        title={t('title')}
        description={t('description')}
        count={exercises.length}
      />

      <AdminTable
        caption={t('caption')}
        minWidth={640}
        columns={[
          {label: t('name')},
          {label: t('slug')},
          {label: t('category')},
          {label: t('difficulty')},
          {label: t('programs'), align: 'right'},
          {label: t('sessions'), align: 'right'},
        ]}
      >
        {exercises.map((exercise) => (
          <tr key={exercise.id}>
            <td className="max-w-[260px] truncate py-3 pe-4 text-apex-text-primary">{exercise.name}</td>
            <td className="max-w-[160px] truncate py-3 pe-4 text-apex-text-secondary">{exercise.slug ?? '—'}</td>
            <td className="py-3 pe-4 text-apex-text-secondary">{exercise.category}</td>
            <td className="py-3 pe-4 text-apex-text-secondary">{exercise.difficulty}</td>
            <td className="py-3 pe-4 text-end text-apex-text-secondary">{exercise.programs}</td>
            <td className="py-3 pe-4 text-end text-apex-text-secondary">{exercise.sessions}</td>
          </tr>
        ))}
      </AdminTable>

      {exercises.length === 0 ? <AdminEmptyState message={t('empty')} className="mt-4" /> : null}
    </AdminPageSection>
  );
}