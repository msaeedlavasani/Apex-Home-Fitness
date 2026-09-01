import {getTranslations} from 'next-intl/server';

import {listAdminAccounts, listAdminSessions} from '@/lib/admin/console';
import {requireAdmin} from '@/lib/admin/auth';
import {getAdminLocaleFromRequest} from '@/lib/admin/requestLocale';
import {
  AdminPageSection,
  AdminSectionHeader,
  AdminTable,
} from '@/components/admin/AdminPrimitives';
import {formatAdminDate} from '@/lib/admin/format';

export const dynamic = 'force-dynamic';

export default async function AdminSessionsPage() {
  await requireAdmin();
  const locale = await getAdminLocaleFromRequest();
  const t = await getTranslations({locale, namespace: 'admin.sessions'});
  const [accounts, sessions] = await Promise.all([listAdminAccounts(), listAdminSessions(100)]);

  return (
    <section className="space-y-8">
      <AdminPageSection>
        <AdminSectionHeader
          title={t('accountsTitle')}
          description={t('accountsDescription')}
          count={accounts.length}
        />

        <AdminTable
          caption={t('accountsCaption')}
          minWidth={560}
          columns={[
            {label: t('email')},
            {label: t('role')},
            {label: t('enabled')},
            {label: t('lastLogin')},
            {label: t('created')},
          ]}
        >
          {accounts.map((account) => (
            <tr key={account.id}>
              <td className="py-3 pe-4 text-apex-text-primary">{account.email}</td>
              <td className="py-3 pe-4 text-apex-text-secondary">{account.role}</td>
              <td className="py-3 pe-4 text-apex-text-secondary">{account.enabled ? t('yes') : t('no')}</td>
              <td className="py-3 pe-4 text-apex-text-secondary">
                {account.lastLoginAt ? formatAdminDate(account.lastLoginAt, locale) : '—'}
              </td>
              <td className="py-3 pe-4 text-apex-text-secondary">{formatAdminDate(account.createdAt, locale)}</td>
            </tr>
          ))}
        </AdminTable>
      </AdminPageSection>

      <AdminPageSection>
        <AdminSectionHeader
          title={t('sessionsTitle')}
          description={t('sessionsDescription')}
          count={sessions.length}
        />

        <AdminTable
          caption={t('sessionsCaption')}
          minWidth={640}
          columns={[
            {label: t('admin')},
            {label: t('status')},
            {label: t('created')},
            {label: t('expires')},
          ]}
        >
          {sessions.map((session) => (
            <tr key={session.id}>
              <td className="py-3 pe-4 text-apex-text-primary">{session.email}</td>
              <td className="py-3 pe-4 text-apex-text-secondary">
                {session.active ? t('active') : session.expired ? t('expired') : t('revoked')}
              </td>
              <td className="py-3 pe-4 text-apex-text-secondary">{formatAdminDate(session.createdAt, locale)}</td>
              <td className="py-3 pe-4 text-apex-text-secondary">{formatAdminDate(session.expiresAt, locale)}</td>
            </tr>
          ))}
        </AdminTable>
      </AdminPageSection>
    </section>
  );
}