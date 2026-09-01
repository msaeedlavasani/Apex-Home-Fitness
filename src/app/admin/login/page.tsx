'use client';

import {FormEvent, useState} from 'react';
import {useTranslations} from 'next-intl';

import {Button, TextField} from '@/components/ui/platform';
import {AdminLocaleSwitcher} from '@/components/admin/AdminLocaleSwitcher';
import {AdminThemeSwitcher} from '@/components/admin/AdminThemeSwitcher';

export default function AdminLoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const t = useTranslations('admin.login');

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const response = await fetch('/api/admin/login', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({email, password}),
      });
      const body = (await response.json().catch(() => null)) as {ok?: boolean; error?: string} | null;
      if (!response.ok || !body?.ok) {
        setError(t('error'));
        return;
      }
      window.location.assign('/admin/dashboard');
    } catch {
      setError(t('error'));
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="relative flex min-h-dvh items-center justify-center bg-apex-surface px-4 py-10">
      <div className="absolute end-4 top-4 flex items-center gap-2">
        <AdminThemeSwitcher />
        <AdminLocaleSwitcher />
      </div>
      <section className="w-full max-w-md rounded-3xl border border-apex-border bg-apex-card p-7 shadow-apple-lg">
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-apex-primary-text">{t('eyebrow')}</p>
        <h1 className="mt-3 text-3xl font-bold">{t('title')}</h1>
        <p className="mt-2 text-sm text-apex-text-secondary">{t('description')}</p>
        <form className="mt-8 space-y-5" onSubmit={submit}>
          <TextField
            label={t('email')}
            id="admin-email"
            name="email"
            type="email"
            autoComplete="username"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
          <TextField
            label={t('password')}
            id="admin-password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
            error={error ?? undefined}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
          {error ? <p role="alert" className="text-sm font-medium text-apex-state-alert-text">{error}</p> : null}
          <Button type="submit" size="lg" fullWidth loading={busy}>
            {t('signIn')}
          </Button>
        </form>
      </section>
    </main>
  );
}