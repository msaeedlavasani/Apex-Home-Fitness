import {listPrograms} from '@/lib/admin/console';
import {requireAdmin} from '@/lib/admin/auth';

export const dynamic = 'force-dynamic';

function date(value: Date): string {
  return value.toLocaleDateString('en-GB', {day: 'numeric', month: 'short', year: 'numeric'});
}

export default async function AdminProgramsPage() {
  await requireAdmin();
  const programs = await listPrograms(100);

  return (
    <section className="rounded-3xl border border-apex-border bg-apex-card p-6 shadow-apple-sm">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold">Workout plans / programs</h2>
          <p className="mt-1 text-sm text-apex-text-secondary">
            Generated and persisted training plans. Read-only.
          </p>
        </div>
        <span className="rounded-full bg-apex-primary-soft px-3 py-1 text-xs font-semibold text-apex-primary-text">
          {programs.length}
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="mt-4 w-full min-w-[720px] text-left text-sm">
          <thead>
            <tr className="border-b border-apex-border text-xs uppercase tracking-wide text-apex-text-secondary">
              <th className="py-2 pr-4">Name</th>
              <th className="py-2 pr-4">Owner</th>
              <th className="py-2 pr-4">Level</th>
              <th className="py-2 pr-4 text-right">Weeks</th>
              <th className="py-2 pr-4 text-right">/week</th>
              <th className="py-2 pr-4 text-right">Exercises</th>
              <th className="py-2 pr-4 text-right">Workouts</th>
              <th className="py-2 pr-4">Created</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-apex-border">
            {programs.map((program) => (
              <tr key={program.id}>
                <td className="max-w-[260px] truncate py-3 pr-4 text-apex-text-primary">{program.name}</td>
                <td className="py-3 pr-4 text-apex-text-secondary">{program.ownerEmail ?? '—'}</td>
                <td className="py-3 pr-4 text-apex-text-secondary">{program.level}</td>
                <td className="py-3 pr-4 text-right text-apex-text-secondary">{program.durationWeeks}</td>
                <td className="py-3 pr-4 text-right text-apex-text-secondary">{program.sessionsPerWeek ?? '—'}</td>
                <td className="py-3 pr-4 text-right text-apex-text-secondary">{program.exercises}</td>
                <td className="py-3 pr-4 text-right text-apex-text-secondary">{program.workoutSessions}</td>
                <td className="py-3 pr-4 text-apex-text-secondary">{date(program.createdAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {programs.length === 0 ? <p className="mt-4 text-sm text-apex-text-secondary">No programs yet.</p> : null}
    </section>
  );
}