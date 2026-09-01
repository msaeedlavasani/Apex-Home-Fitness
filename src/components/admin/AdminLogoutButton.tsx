'use client';

import {useState} from 'react';
import {useTranslations} from 'next-intl';

import {Button} from '@/components/ui/platform';

export function AdminLogoutButton() {
  const [busy, setBusy] = useState(false);
  const t = useTranslations('admin.common');

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
      {t('signOut')}
    </Button>
  );
}