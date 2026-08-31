import {listAdminAccounts, listAdminSessions} from '@/lib/admin/console';
import {requireAdmin} from '@/lib/admin/auth';

export const dynamic = 'force-dynamic';

function date(value: Date): string {
  return value.toLocaleDateString('en-GB', {day: 'numeric', month: 'short', year: 'numeric'});
}

export default async function AdminSessionsPage() {
  await requireAdmin();
  const [accounts, sessions] = await Promise.all([listAdminAccounts(), listAdminSessions(100)]);

  return (
    <section className="space-y-8">
      <div className="rounded-3xl border border-apex-border bg-apex-card p-6 shadow-apple-sm">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold">Admin accounts</h2>
            <p className="mt-1 text-sm text-apex-text-secondary">
              Administrator identities. Password hashes are never exposed.
            </p>
          </div>
          <span className="rounded-full bg-apex-primary-soft px-3 py-1 text-xs font-semibold text-apex-primary-text">
            {accounts.length}
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="mt-4 w-full min-w-[560px] text-left text-sm">
            <thead>
              <tr className="border-b border-apex-border text-xs uppercase tracking-wide text-apex-text-secondary">
                <th className="py-2 pr-4">Email</th>
                <th className="py-2 pr-4">Role</th>
                <th className="py-2 pr-4">Enabled</th>
                <th className="py-2 pr-4">Last login</th>
                <th className="py-2 pr-4">Created</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-apex-border">
              {accounts.map((account) => (
                <tr key={account.id}>
                  <td className="py-3 pr-4 text-apex-text-primary">{account.email}</td>
                  <td className="py-3 pr-4 text-apex-text-secondary">{account.role}</td>
                  <td className="py-3 pr-4 text-apex-text-secondary">{account.enabled ? 'yes' : 'no'}</td>
                  <td className="py-3 pr-4 text-apex-text-secondary">
                    {account.lastLoginAt ? date(account.lastLoginAt) : '—'}
                  </td>
                  <td className="py-3 pr-4 text-apex-text-secondary">{date(account.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="rounded-3xl border border-apex-border bg-apex-card p-6 shadow-apple-sm">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold">Admin sessions</h2>
            <p className="mt-1 text-sm text-apex-text-secondary">
              Session lifecycle. Session tokens are stored only as digests and are never exposed.
            </p>
          </div>
          <span className="rounded-full bg-apex-primary-soft px-3 py-1 text-xs font-semibold text-apex-primary-text">
            {sessions.length}
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="mt-4 w-full min-w-[640px] text-left text-sm">
            <thead>
              <tr className="border-b border-apex-border text-xs uppercase tracking-wide text-apex-text-secondary">
                <th className="py-2 pr-4">Admin</th>
                <th className="py-2 pr-4">Status</th>
                <th className="py-2 pr-4">Created</th>
                <th className="py-2 pr-4">Expires</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-apex-border">
              {sessions.map((session) => (
                <tr key={session.id}>
                  <td className="py-3 pr-4 text-apex-text-primary">{session.email}</td>
                  <td className="py-3 pr-4 text-apex-text-secondary">
                    {session.active ? 'active' : session.expired ? 'expired' : 'revoked'}
                  </td>
                  <td className="py-3 pr-4 text-apex-text-secondary">{date(session.createdAt)}</td>
                  <td className="py-3 pr-4 text-apex-text-secondary">{date(session.expiresAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}