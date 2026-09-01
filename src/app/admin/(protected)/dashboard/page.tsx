import {getTranslations} from 'next-intl/server';

import {getOverview} from '@/lib/admin/console';
import {requireAdmin} from '@/lib/admin/auth';
import {getAdminLocaleFromRequest} from '@/lib/admin/requestLocale';
import {AdminPageSection, AdminStat, AdminEmptyState} from '@/components/admin/AdminPrimitives';
import {formatAdminDate} from '@/lib/admin/format';

export const dynamic = 'force-dynamic';

export default async function AdminOverviewPage() {
  await requireAdmin();
  const locale = await getAdminLocaleFromRequest();
  const t = await getTranslations({locale, namespace: 'admin.dashboard'});
  const overview = await getOverview();

  return (
    <section className="space-y-8">
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        <AdminStat label={t('users')} value={overview.users} />
        <AdminStat label={t('programs')} value={overview.programs} />
        <AdminStat label={t('exercises')} value={overview.exercises} />
        <AdminStat label={t('workouts')} value={overview.workoutSessions} />
        <AdminStat label={t('completed')} value={overview.completedWorkouts} />
        <AdminStat label={t('quiz')} value={overview.quizResponses} />
        <AdminStat label={t('adminAccounts')} value={overview.adminAccounts} />
        <AdminStat label={t('sessions')} value={overview.activeAdminSessions} />
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <AdminPageSection>
          <h2 className="text-lg font-semibold">{t('recentUsers')}</h2>
          <ul className="mt-4 divide-y divide-apex-border">
            {overview.recentUsers.length === 0 ? (
              <li>
                <AdminEmptyState message={t('noUsers')} className="py-2" />
              </li>
            ) : (
              overview.recentUsers.map((user) => (
                <li key={user.id} className="flex items-center justify-between gap-3 py-2 text-sm">
                  <span className="text-apex-text-primary">{user.email}</span>
                  <span className="shrink-0 text-apex-text-secondary">{formatAdminDate(user.createdAt, locale)}</span>
                </li>
              ))
            )}
          </ul>
        </AdminPageSection>

        <AdminPageSection>
          <h2 className="text-lg font-semibold">{t('recentPrograms')}</h2>
          <ul className="mt-4 divide-y divide-apex-border">
            {overview.recentPrograms.length === 0 ? (
              <li>
                <AdminEmptyState message={t('noPrograms')} className="py-2" />
              </li>
            ) : (
              overview.recentPrograms.map((program) => (
                <li key={program.id} className="flex items-center justify-between gap-3 py-2 text-sm">
                  <span className="truncate text-apex-text-primary">{program.name}</span>
                  <span className="shrink-0 text-apex-text-secondary">
                    {program.level} · {formatAdminDate(program.createdAt, locale)}
                  </span>
                </li>
              ))
            )}
          </ul>
        </AdminPageSection>
      </div>
    </section>
  );
}