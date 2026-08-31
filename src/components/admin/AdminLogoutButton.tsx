'use client';

import {useState} from 'react';

export function AdminLogoutButton() {
  const [busy, setBusy] = useState(false);

  async function logout() {
    if (busy) return;
    setBusy(true);
    try {
      await fetch('/api/admin/logout', {method: 'POST'});
    } finally {
      window.location.assign('/admin/login');
    }
  }

  return (
    <button type="button" onClick={logout} disabled={busy} className="min-h-11 rounded-xl border border-apex-border bg-apex-card px-4 py-2 text-sm font-semibold hover:bg-apex-primary-soft disabled:opacity-60">
      {busy ? 'Signing out…' : 'Sign out'}
    </button>
  );
}
