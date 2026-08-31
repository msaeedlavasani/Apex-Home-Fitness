import {listOperations} from '@/lib/admin/console';
import {requireAdmin} from '@/lib/admin/auth';

export const dynamic = 'force-dynamic';

function date(value: Date): string {
  return value.toLocaleDateString('en-GB', {day: 'numeric', month: 'short', year: 'numeric'});
}

export default async function AdminOperationsPage() {
  await requireAdmin();
  const operations = await listOperations(100);

  return (
    <section className="rounded-3xl border border-apex-border bg-apex-card p-6 shadow-apple-sm">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold">Operations</h2>
          <p className="mt-1 text-sm text-apex-text-secondary">
            Program-generation idempotency ledger. Read-only; payloads and hashes are not exposed.
          </p>
        </div>
        <span className="rounded-full bg-apex-primary-soft px-3 py-1 text-xs font-semibold text-apex-primary-text">
          {operations.length}
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="mt-4 w-full min-w-[760px] text-left text-sm">
          <thead>
            <tr className="border-b border-apex-border text-xs uppercase tracking-wide text-apex-text-secondary">
              <th className="py-2 pr-4">User</th>
              <th className="py-2 pr-4">Key</th>
              <th className="py-2 pr-4">Status</th>
              <th className="py-2 pr-4 text-right">Program</th>
              <th className="py-2 pr-4">Created</th>
              <th className="py-2 pr-4">Updated</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-apex-border">
            {operations.map((op) => (
              <tr key={op.id}>
                <td className="max-w-[220px] truncate py-3 pr-4 text-apex-text-primary">
                  {op.userEmail ?? op.userId}
                </td>
                <td className="max-w-[180px] truncate py-3 pr-4 text-apex-text-secondary">{op.idempotencyKey}</td>
                <td className="py-3 pr-4 text-apex-text-secondary">{op.status}</td>
                <td className="py-3 pr-4 text-right text-apex-text-secondary">{op.hasProgram ? 'yes' : '—'}</td>
                <td className="py-3 pr-4 text-apex-text-secondary">{date(op.createdAt)}</td>
                <td className="py-3 pr-4 text-apex-text-secondary">{date(op.updatedAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {operations.length === 0 ? <p className="mt-4 text-sm text-apex-text-secondary">No operations yet.</p> : null}
    </section>
  );
}