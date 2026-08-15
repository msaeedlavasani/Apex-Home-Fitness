'use client';

import { useEffect } from 'react';

/**
 * MonitoringProvider
 * ------------------
 * Client component that boots the error-tracking pipeline in the browser:
 *   - initializes the tracker (Sentry SDK when a DSN is configured and
 *     installed, otherwise the console reporter),
 *   - installs global `window.onerror` / `unhandledrejection` handlers so
 *     uncaught errors and rejected promises are captured.
 *
 * Mount it once in the root layout (next to <PWALoader />). It renders
 * nothing and is safe on every navigation and in every locale.
 */
export default function MonitoringProvider() {
  useEffect(() => {
    let cancelled = false;

    const boot = async () => {
      const { initErrorTracking, installGlobalErrorHandlers } = await import(
        '@/lib/errorTracking'
      );
      if (cancelled) return;
      await initErrorTracking();
      installGlobalErrorHandlers();
    };

    void boot();

    return () => {
      cancelled = true;
    };
  }, []);

  return null;
}
