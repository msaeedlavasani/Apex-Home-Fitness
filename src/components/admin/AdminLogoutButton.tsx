'use client';

import {useState} from 'react';
import {Button} from '@/components/ui/platform';

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
    <Button type="button" variant="outlined" size="md" onClick={logout} loading={busy}>
      Sign out
    </Button>
  );
}
