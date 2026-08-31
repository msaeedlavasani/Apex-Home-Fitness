import {listExercises} from '@/lib/admin/console';
import {requireAdmin} from '@/lib/admin/auth';

export const dynamic = 'force-dynamic';

export default async function AdminExercisesPage() {
  await requireAdmin();
  const exercises = await listExercises(400);

  return (
    <section className="rounded-3xl border border-apex-border bg-apex-card p-6 shadow-apple-sm">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold">Exercises</h2>
          <p className="mt-1 text-sm text-apex-text-secondary">
            Exercise catalog (source-controlled + generated). Read-only.
          </p>
        </div>
        <span className="rounded-full bg-apex-primary-soft px-3 py-1 text-xs font-semibold text-apex-primary-text">
          {exercises.length}
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="mt-4 w-full min-w-[640px] text-left text-sm">
          <thead>
            <tr className="border-b border-apex-border text-xs uppercase tracking-wide text-apex-text-secondary">
              <th className="py-2 pr-4">Name</th>
              <th className="py-2 pr-4">Slug</th>
              <th className="py-2 pr-4">Category</th>
              <th className="py-2 pr-4">Difficulty</th>
              <th className="py-2 pr-4 text-right">Programs</th>
              <th className="py-2 pr-4 text-right">Sessions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-apex-border">
            {exercises.map((exercise) => (
              <tr key={exercise.id}>
                <td className="max-w-[260px] truncate py-3 pr-4 text-apex-text-primary">{exercise.name}</td>
                <td className="max-w-[160px] truncate py-3 pr-4 text-apex-text-secondary">{exercise.slug ?? '—'}</td>
                <td className="py-3 pr-4 text-apex-text-secondary">{exercise.category}</td>
                <td className="py-3 pr-4 text-apex-text-secondary">{exercise.difficulty}</td>
                <td className="py-3 pr-4 text-right text-apex-text-secondary">{exercise.programs}</td>
                <td className="py-3 pr-4 text-right text-apex-text-secondary">{exercise.sessions}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {exercises.length === 0 ? <p className="mt-4 text-sm text-apex-text-secondary">No exercises yet.</p> : null}
    </section>
  );
}