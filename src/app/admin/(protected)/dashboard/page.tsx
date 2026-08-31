import {getOverview} from '@/lib/admin/console';
import {requireAdmin} from '@/lib/admin/auth';

export const dynamic = 'force-dynamic';

function date(value: Date): string {
  return value.toLocaleDateString('en-GB', {day: 'numeric', month: 'short', year: 'numeric'});
}

function Stat({label, value}: {label: string; value: number | string}) {
  return (
    <div className="rounded-2xl border border-apex-border bg-apex-card p-5 shadow-apple-sm">
      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-apex-text-secondary">{label}</p>
      <p className="mt-2 text-3xl font-bold text-apex-text-primary">{value}</p>
    </div>
  );
}

export default async function AdminOverviewPage() {
  await requireAdmin();
  const overview = await getOverview();

  return (
    <section className="space-y-8">
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        <Stat label="Users" value={overview.users} />
        <Stat label="Programs" value={overview.programs} />
        <Stat label="Exercises" value={overview.exercises} />
        <Stat label="Workouts" value={overview.workoutSessions} />
        <Stat label="Completed" value={overview.completedWorkouts} />
        <Stat label="Quiz responses" value={overview.quizResponses} />
        <Stat label="Admin accounts" value={overview.adminAccounts} />
        <Stat label="Active sessions" value={overview.activeAdminSessions} />
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <section className="rounded-3xl border border-apex-border bg-apex-card p-6 shadow-apple-sm">
          <h2 className="text-lg font-semibold">Recent users</h2>
          <ul className="mt-4 divide-y divide-apex-border">
            {overview.recentUsers.length === 0 ? (
              <li className="py-2 text-sm text-apex-text-secondary">No users yet.</li>
            ) : (
              overview.recentUsers.map((user) => (
                <li key={user.id} className="flex items-center justify-between gap-3 py-2 text-sm">
                  <span className="text-apex-text-primary">{user.email}</span>
                  <span className="shrink-0 text-apex-text-secondary">{date(user.createdAt)}</span>
                </li>
              ))
            )}
          </ul>
        </section>

        <section className="rounded-3xl border border-apex-border bg-apex-card p-6 shadow-apple-sm">
          <h2 className="text-lg font-semibold">Recent programs</h2>
          <ul className="mt-4 divide-y divide-apex-border">
            {overview.recentPrograms.length === 0 ? (
              <li className="py-2 text-sm text-apex-text-secondary">No programs yet.</li>
            ) : (
              overview.recentPrograms.map((program) => (
                <li key={program.id} className="flex items-center justify-between gap-3 py-2 text-sm">
                  <span className="truncate text-apex-text-primary">{program.name}</span>
                  <span className="shrink-0 text-apex-text-secondary">
                    {program.level} · {date(program.createdAt)}
                  </span>
                </li>
              ))
            )}
          </ul>
        </section>
      </div>
    </section>
  );
}