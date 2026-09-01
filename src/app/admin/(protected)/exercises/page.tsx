import {listExercises} from '@/lib/admin/console';
import {requireAdmin} from '@/lib/admin/auth';
import {
  AdminPageSection,
  AdminSectionHeader,
  AdminTable,
  AdminEmptyState,
} from '@/components/admin/AdminPrimitives';

export const dynamic = 'force-dynamic';

export default async function AdminExercisesPage() {
  await requireAdmin();
  const exercises = await listExercises(400);

  return (
    <AdminPageSection>
      <AdminSectionHeader
        title="Exercises"
        description="Exercise catalog (source-controlled + generated). Read-only."
        count={exercises.length}
      />

      <AdminTable
        caption="Exercise catalog"
        minWidth={640}
        columns={[
          {label: 'Name'},
          {label: 'Slug'},
          {label: 'Category'},
          {label: 'Difficulty'},
          {label: 'Programs', align: 'right'},
          {label: 'Sessions', align: 'right'},
        ]}
      >
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
      </AdminTable>

      {exercises.length === 0 ? <AdminEmptyState message="No exercises yet." className="mt-4" /> : null}
    </AdminPageSection>
  );
}