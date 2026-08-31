'use client';

import {useEffect} from 'react';
import {Button} from '@/components/ui/platform';
import {AdminPageSection} from '@/components/admin/AdminPrimitives';

/**
 * Admin console error boundary (ADMIN-DS-04). Client component per the
 * Next.js error.tsx contract; offers a bounded retry (reset) and never
 * exposes raw error internals to the user.
 */
export default function AdminConsoleError({
  error,
  reset,
}: {
  error: Error & {digest?: string};
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Admin console error', error);
  }, [error]);

  return (
    <AdminPageSection>
      <h2 className="text-lg font-semibold">Something went wrong</h2>
      <p className="mt-1 text-sm text-apex-text-secondary">
        This console surface could not be loaded. Try again, or sign out and back in.
      </p>
      <div className="mt-6">
        <Button variant="filled" size="md" onClick={reset}>
          Try again
        </Button>
      </div>
    </AdminPageSection>
  );
}