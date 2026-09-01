import {listAdminAccounts, listAdminSessions} from '@/lib/admin/console';
import {requireAdmin} from '@/lib/admin/auth';
import {
  AdminPageSection,
  AdminSectionHeader,
  AdminTable,
  AdminEmptyState,
} from '@/components/admin/AdminPrimitives';
import {formatAdminDate} from '@/lib/admin/format';

export const dynamic = 'force-dynamic';

export default async function AdminSessionsPage() {
  await requireAdmin();
  const [accounts, sessions] = await Promise.all([listAdminAccounts(), listAdminSessions(100)]);

  return (
    <section className="space-y-8">
      <AdminPageSection>
        <AdminSectionHeader
          title="Admin accounts"
          description="Administrator identities. Password hashes are never exposed."
          count={accounts.length}
        />

        <AdminTable
          caption="Administrator accounts"
          minWidth={560}
          columns={[
            {label: 'Email'},
            {label: 'Role'},
            {label: 'Enabled'},
            {label: 'Last login'},
            {label: 'Created'},
          ]}
        >
          {accounts.map((account) => (
            <tr key={account.id}>
              <td className="py-3 pr-4 text-apex-text-primary">{account.email}</td>
              <td className="py-3 pr-4 text-apex-text-secondary">{account.role}</td>
              <td className="py-3 pr-4 text-apex-text-secondary">{account.enabled ? 'yes' : 'no'}</td>
              <td className="py-3 pr-4 text-apex-text-secondary">
                {account.lastLoginAt ? formatAdminDate(account.lastLoginAt) : '—'}
              </td>
              <td className="py-3 pr-4 text-apex-text-secondary">{formatAdminDate(account.createdAt)}</td>
            </tr>
          ))}
        </AdminTable>
      </AdminPageSection>

      <AdminPageSection>
        <AdminSectionHeader
          title="Admin sessions"
          description="Session lifecycle. Session tokens are stored only as digests and are never exposed."
          count={sessions.length}
        />

        <AdminTable
          caption="Administrator sessions"
          minWidth={640}
          columns={[
            {label: 'Admin'},
            {label: 'Status'},
            {label: 'Created'},
            {label: 'Expires'},
          ]}
        >
          {sessions.map((session) => (
            <tr key={session.id}>
              <td className="py-3 pr-4 text-apex-text-primary">{session.email}</td>
              <td className="py-3 pr-4 text-apex-text-secondary">
                {session.active ? 'active' : session.expired ? 'expired' : 'revoked'}
              </td>
              <td className="py-3 pr-4 text-apex-text-secondary">{formatAdminDate(session.createdAt)}</td>
              <td className="py-3 pr-4 text-apex-text-secondary">{formatAdminDate(session.expiresAt)}</td>
            </tr>
          ))}
        </AdminTable>
      </AdminPageSection>
    </section>
  );
}