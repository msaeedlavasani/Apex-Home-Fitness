import {listPrograms} from '@/lib/admin/console';
import {requireAdmin} from '@/lib/admin/auth';
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
  const programs = await listPrograms(100);

  return (
    <AdminPageSection>
      <AdminSectionHeader
        title="Workout plans / programs"
        description="Generated and persisted training plans. Read-only."
        count={programs.length}
      />

      <AdminTable
        caption="Workout plans and programs"
        minWidth={720}
        columns={[
          {label: 'Name'},
          {label: 'Owner'},
          {label: 'Level'},
          {label: 'Weeks', align: 'right'},
          {label: '/week', align: 'right'},
          {label: 'Exercises', align: 'right'},
          {label: 'Workouts', align: 'right'},
          {label: 'Created'},
        ]}
      >
        {programs.map((program) => (
          <tr key={program.id}>
            <td className="max-w-[260px] truncate py-3 pr-4 text-apex-text-primary">{program.name}</td>
            <td className="py-3 pr-4 text-apex-text-secondary">{program.ownerEmail ?? '—'}</td>
            <td className="py-3 pr-4 text-apex-text-secondary">{program.level}</td>
            <td className="py-3 pr-4 text-right text-apex-text-secondary">{program.durationWeeks}</td>
            <td className="py-3 pr-4 text-right text-apex-text-secondary">{program.sessionsPerWeek ?? '—'}</td>
            <td className="py-3 pr-4 text-right text-apex-text-secondary">{program.exercises}</td>
            <td className="py-3 pr-4 text-right text-apex-text-secondary">{program.workoutSessions}</td>
            <td className="py-3 pr-4 text-apex-text-secondary">{formatAdminDate(program.createdAt)}</td>
          </tr>
        ))}
      </AdminTable>

      {programs.length === 0 ? <AdminEmptyState message="No programs yet." className="mt-4" /> : null}
    </AdminPageSection>
  );
}