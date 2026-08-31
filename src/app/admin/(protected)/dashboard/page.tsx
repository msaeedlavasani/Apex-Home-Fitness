import {requireAdmin} from '@/lib/admin/auth';
import {AdminLogoutButton} from '@/components/admin/AdminLogoutButton';

export const dynamic = 'force-dynamic';

export default async function AdminDashboardPage() {
  const admin = await requireAdmin();
  return (
    <main className="min-h-dvh bg-apex-surface px-5 py-10 sm:px-8">
      <div className="mx-auto max-w-4xl">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-apex-primary-text">Apex Home Fit Admin</p>
            <h1 className="mt-2 text-3xl font-bold">Administrator dashboard</h1>
            <p className="mt-2 text-sm text-apex-text-secondary">Signed in as {admin.email}</p>
          </div>
          <AdminLogoutButton />
        </header>
        <section className="mt-8 rounded-3xl border border-apex-border bg-apex-card p-6 shadow-apple-lg">
          <h2 className="text-lg font-semibold">Admin Auth V1</h2>
          <p className="mt-2 text-sm leading-6 text-apex-text-secondary">Server-side authorization is active for this protected surface. Administrative capabilities will be added only through separately authorized tasks.</p>
        </section>
      </div>
    </main>
  );
}
