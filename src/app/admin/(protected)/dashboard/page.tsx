import {getOverview} from '@/lib/admin/console';
import {requireAdmin} from '@/lib/admin/auth';
import {AdminPageSection, AdminStat, AdminEmptyState} from '@/components/admin/AdminPrimitives';
import {formatAdminDate} from '@/lib/admin/format';

export const dynamic = 'force-dynamic';

export default async function AdminOverviewPage() {
  await requireAdmin();
  const overview = await getOverview();

  return (
    <section className="space-y-8">
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        <AdminStat label="Users" value={overview.users} />
        <AdminStat label="Programs" value={overview.programs} />
        <AdminStat label="Exercises" value={overview.exercises} />
        <AdminStat label="Workouts" value={overview.workoutSessions} />
        <AdminStat label="Completed" value={overview.completedWorkouts} />
        <AdminStat label="Quiz responses" value={overview.quizResponses} />
        <AdminStat label="Admin accounts" value={overview.adminAccounts} />
        <AdminStat label="Active sessions" value={overview.activeAdminSessions} />
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <AdminPageSection>
          <h2 className="text-lg font-semibold">Recent users</h2>
          <ul className="mt-4 divide-y divide-apex-border">
            {overview.recentUsers.length === 0 ? (
              <li>
                <AdminEmptyState message="No users yet." className="py-2" />
              </li>
            ) : (
              overview.recentUsers.map((user) => (
                <li key={user.id} className="flex items-center justify-between gap-3 py-2 text-sm">
                  <span className="text-apex-text-primary">{user.email}</span>
                  <span className="shrink-0 text-apex-text-secondary">{formatAdminDate(user.createdAt)}</span>
                </li>
              ))
            )}
          </ul>
        </AdminPageSection>

        <AdminPageSection>
          <h2 className="text-lg font-semibold">Recent programs</h2>
          <ul className="mt-4 divide-y divide-apex-border">
            {overview.recentPrograms.length === 0 ? (
              <li>
                <AdminEmptyState message="No programs yet." className="py-2" />
              </li>
            ) : (
              overview.recentPrograms.map((program) => (
                <li key={program.id} className="flex items-center justify-between gap-3 py-2 text-sm">
                  <span className="truncate text-apex-text-primary">{program.name}</span>
                  <span className="shrink-0 text-apex-text-secondary">
                    {program.level} · {formatAdminDate(program.createdAt)}
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