import {listUsers} from '@/lib/admin/console';
import {requireAdmin} from '@/lib/admin/auth';

export const dynamic = 'force-dynamic';

function date(value: Date): string {
  return value.toLocaleDateString('en-GB', {day: 'numeric', month: 'short', year: 'numeric'});
}

export default async function AdminUsersPage() {
  await requireAdmin();
  const users = await listUsers(100);

  return (
    <section className="rounded-3xl border border-apex-border bg-apex-card p-6 shadow-apple-sm">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold">Users</h2>
          <p className="mt-1 text-sm text-apex-text-secondary">Read-only roster. Credentials are never exposed.</p>
        </div>
        <span className="rounded-full bg-apex-primary-soft px-3 py-1 text-xs font-semibold text-apex-primary-text">
          {users.length}
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="mt-4 w-full min-w-[760px] text-left text-sm">
          <thead>
            <tr className="border-b border-apex-border text-xs uppercase tracking-wide text-apex-text-secondary">
              <th className="py-2 pr-4">Email</th>
              <th className="py-2 pr-4">Phone</th>
              <th className="py-2 pr-4">Level</th>
              <th className="py-2 pr-4 text-right">XP</th>
              <th className="py-2 pr-4 text-right">Level</th>
              <th className="py-2 pr-4 text-right">Workouts</th>
              <th className="py-2 pr-4">Joined</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-apex-border">
            {users.map((user) => (
              <tr key={user.id}>
                <td className="py-3 pr-4 text-apex-text-primary">{user.email}</td>
                <td className="py-3 pr-4 text-apex-text-secondary">{user.phone ?? '—'}</td>
                <td className="py-3 pr-4 text-apex-text-secondary">{user.fitnessLevel ?? '—'}</td>
                <td className="py-3 pr-4 text-right text-apex-text-secondary">{user.xp}</td>
                <td className="py-3 pr-4 text-right text-apex-text-secondary">{user.level}</td>
                <td className="py-3 pr-4 text-right text-apex-text-secondary">{user.workoutSessions}</td>
                <td className="py-3 pr-4 text-apex-text-secondary">{date(user.createdAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {users.length === 0 ? <p className="mt-4 text-sm text-apex-text-secondary">No users yet.</p> : null}
    </section>
  );
}