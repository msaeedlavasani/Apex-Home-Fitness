import {listOperations} from '@/lib/admin/console';
import {requireAdmin} from '@/lib/admin/auth';
import {
  AdminPageSection,
  AdminSectionHeader,
  AdminTable,
  AdminEmptyState,
} from '@/components/admin/AdminPrimitives';
import {formatAdminDate} from '@/lib/admin/format';

export const dynamic = 'force-dynamic';

export default async function AdminOperationsPage() {
  await requireAdmin();
  const operations = await listOperations(100);

  return (
    <AdminPageSection>
      <AdminSectionHeader
        title="Operations"
        description="Program-generation idempotency ledger. Read-only; payloads and hashes are not exposed."
        count={operations.length}
      />

      <AdminTable
        caption="Program-generation operations"
        minWidth={760}
        columns={[
          {label: 'User'},
          {label: 'Key'},
          {label: 'Status'},
          {label: 'Program', align: 'right'},
          {label: 'Created'},
          {label: 'Updated'},
        ]}
      >
        {operations.map((op) => (
          <tr key={op.id}>
            <td className="max-w-[220px] truncate py-3 pr-4 text-apex-text-primary">
              {op.userEmail ?? op.userId}
            </td>
            <td className="max-w-[180px] truncate py-3 pr-4 text-apex-text-secondary">{op.idempotencyKey}</td>
            <td className="py-3 pr-4 text-apex-text-secondary">{op.status}</td>
            <td className="py-3 pr-4 text-right text-apex-text-secondary">{op.hasProgram ? 'yes' : '—'}</td>
            <td className="py-3 pr-4 text-apex-text-secondary">{formatAdminDate(op.createdAt)}</td>
            <td className="py-3 pr-4 text-apex-text-secondary">{formatAdminDate(op.updatedAt)}</td>
          </tr>
        ))}
      </AdminTable>

      {operations.length === 0 ? <AdminEmptyState message="No operations yet." className="mt-4" /> : null}
    </AdminPageSection>
  );
}