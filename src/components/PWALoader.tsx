'use client';

import {useEffect} from 'react';

/**
 * PWALoader
 * ---------
 * Client component that registers the PWA service worker (`/service-worker.js`)
 * so the app can be installed and work offline. Mount it once in the root
 * layout — it renders nothing and is safe on every navigation.
 *
 * The service worker is registered only in production builds to avoid stale
 * cache surprises during development (Next.js serves dynamic dev responses
 * that must not be precached).
 */
export default function PWALoader() {
  useEffect(() => {
    // Service workers require a secure context (https or localhost) and a
    // browser that supports the API — bail out early otherwise.
    if (typeof window === 'undefined') return;
    if (!('serviceWorker' in navigator)) return;

    if (process.env.NODE_ENV !== 'production') return;

    const register = async () => {
      try {
        const registration = await navigator.serviceWorker.register(
          '/service-worker.js',
          {scope: '/'}
        );
        console.info('[PWALoader] Service worker registered:', registration.scope);
      } catch (error) {
        // Registration must never crash the app — log and continue.
        console.warn('[PWALoader] Service worker registration failed:', error);
      }
    };

    // Wait for the window `load` event so the service worker doesn't compete
    // with the initial page resources for bandwidth.
    if (document.readyState === 'complete') {
      void register();
    } else {
      window.addEventListener('load', () => void register(), {once: true});
    }
  }, []);

  return null;
}
