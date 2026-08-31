import {requireAdmin} from '@/lib/admin/auth';
import {AdminLogoutButton} from '@/components/admin/AdminLogoutButton';
import {AdminNav} from '@/components/admin/AdminNav';

export default async function ProtectedAdminLayout({children}: {children: React.ReactNode}) {
  const admin = await requireAdmin();
  return (
    <main className="min-h-dvh bg-apex-surface px-5 py-8 sm:px-8">
      <div className="mx-auto max-w-6xl">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-apex-primary-text">
              Apex Home Fit Admin
            </p>
            <h1 className="mt-2 text-2xl font-bold">Administration console</h1>
            <p className="mt-1 text-sm text-apex-text-secondary">Signed in as {admin.email}</p>
          </div>
          <AdminLogoutButton />
        </header>
        <div className="mt-6">
          <AdminNav />
        </div>
        <div className="mt-8">{children}</div>
      </div>
    </main>
  );
}