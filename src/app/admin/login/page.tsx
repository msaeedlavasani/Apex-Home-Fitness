'use client';

import {FormEvent, useState} from 'react';
import {Button, TextField} from '@/components/ui/platform';

export default function AdminLoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

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
        setError('Unable to sign in. Check your credentials and try again.');
        return;
      }
      window.location.assign('/admin/dashboard');
    } catch {
      setError('Unable to sign in. Check your credentials and try again.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="flex min-h-dvh items-center justify-center bg-apex-surface px-4 py-10">
      <section className="w-full max-w-md rounded-3xl border border-apex-border bg-apex-card p-7 shadow-apple-lg">
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-apex-primary-text">Apex Home Fit</p>
        <h1 className="mt-3 text-3xl font-bold">Administrator sign in</h1>
        <p className="mt-2 text-sm text-apex-text-secondary">This is a private administrator access path.</p>
        <form className="mt-8 space-y-5" onSubmit={submit}>
          <TextField
            label="Email"
            id="admin-email"
            name="email"
            type="email"
            autoComplete="username"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
          <TextField
            label="Password"
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
            Sign in
          </Button>
        </form>
      </section>
    </main>
  );
}