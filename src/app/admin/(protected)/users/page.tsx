import {listUsers} from '@/lib/admin/console';
import {requireAdmin} from '@/lib/admin/auth';
import {
  AdminPageSection,
  AdminSectionHeader,
  AdminTable,
  AdminEmptyState,
} from '@/components/admin/AdminPrimitives';
import {formatAdminDate} from '@/lib/admin/format';

export const dynamic = 'force-dynamic';

export default async function AdminUsersPage() {
  await requireAdmin();
  const users = await listUsers(100);

  return (
    <AdminPageSection>
      <AdminSectionHeader
        title="Users"
        description="Read-only roster. Credentials are never exposed."
        count={users.length}
      />

      <AdminTable
        caption="Registered users"
        minWidth={760}
        columns={[
          {label: 'Email'},
          {label: 'Phone'},
          {label: 'Level'},
          {label: 'XP', align: 'right'},
          {label: 'Level', align: 'right'},
          {label: 'Workouts', align: 'right'},
          {label: 'Joined'},
        ]}
      >
        {users.map((user) => (
          <tr key={user.id}>
            <td className="py-3 pr-4 text-apex-text-primary">{user.email}</td>
            <td className="py-3 pr-4 text-apex-text-secondary">{user.phone ?? '—'}</td>
            <td className="py-3 pr-4 text-apex-text-secondary">{user.fitnessLevel ?? '—'}</td>
            <td className="py-3 pr-4 text-right text-apex-text-secondary">{user.xp}</td>
            <td className="py-3 pr-4 text-right text-apex-text-secondary">{user.level}</td>
            <td className="py-3 pr-4 text-right text-apex-text-secondary">{user.workoutSessions}</td>
            <td className="py-3 pr-4 text-apex-text-secondary">{formatAdminDate(user.createdAt)}</td>
          </tr>
        ))}
      </AdminTable>

      {users.length === 0 ? <AdminEmptyState message="No users yet." className="mt-4" /> : null}
    </AdminPageSection>
  );
}