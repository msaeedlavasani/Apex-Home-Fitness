import {expect, test} from '@playwright/test';
import {useDashboardData} from './helpers/dashboardData';

/**
 * Offline / PWA coverage for Apex Home Fitness.
 *
 * Everything here is deterministic and has zero external dependencies:
 *
 * 1. Dev-mode hygiene — the app must NEVER register its service worker in
 *    development (PWALoader bails out, so the dev server's dynamic responses
 *    can never be poisoned by stale precached copies).
 * 2. Offline shell — the dashboard must be fully renderable from
 *    same-origin, cached assets only (a cache-replay simulation of the
 *    service worker's store). No external origin may be required to paint
 *    and hydrate the shell.
 * 3. Contract — the shipped `service-worker.js` and `manifest.json` expose
 *    the offline fallback machinery (network-first navigation with cache
 *    fallback, precache list, install icons).
 * 4. Resilience — registering the real worker never crashes the running
 *    app, even in dev where the shell is not precached (the install
 *    activates but the page only becomes controlled on the next load).
 */

test.describe('Offline / PWA', () => {
  test('the app never registers a service worker in development', async ({
    page,
  }) => {
    await page.goto('/en/dashboard');
    await expect(page.getByText('Your weekly training plan')).toBeVisible();

    // PWALoader only registers when NODE_ENV === 'production' — in dev the
    // page must be left completely unmanaged by any service worker so the
    // dev server's responses are never cached.
    const registration = await page.evaluate(async () => {
      if (!('serviceWorker' in navigator)) return 'unsupported';
      const reg = await navigator.serviceWorker.getRegistration();
      return reg ? (reg.active?.scriptURL ?? 'pending') : null;
    });

    expect(registration).toBeNull();
  });

  test('dashboard renders fully from cached same-origin assets (offline shell)', async ({
    page,
    context,
  }) => {
    type Entry = {status: number; headers: Record<string, string>; base64: string};
    // URL → response, acting as the service worker's Cache Storage.
    const cache = new Map<string, Entry>();
    let mode: 'record' | 'replay' = 'record';

    await context.route('**/*', async (route) => {
      const url = route.request().url();
      // Anything off-origin is unavailable — the shell must not need it.
      if (!url.startsWith('http://localhost:3000')) {
        await route.abort();
        return;
      }

      if (mode === 'record') {
        // Pass 1 (online): store every same-origin response…
        const response = await route.fetch();
        if (response.status() >= 200 && response.status() < 400) {
          const headers: Record<string, string> = {};
          for (const [key, value] of Object.entries(response.headers())) {
            if (
              ['content-encoding', 'content-length', 'transfer-encoding', 'connection'].includes(
                key.toLowerCase(),
              )
            ) {
              continue;
            }
            headers[key] = value;
          }
          const body = await response.body();
          cache.set(url, {
            status: response.status(),
            headers,
            base64: body.toString('base64'),
          });
        }
        await route.fulfill({response});
        return;
      }

      // Pass 2 (offline): ONLY cache hits may load; everything else fails.
      const hit = cache.get(url);
      if (!hit) {
        await route.abort('failed');
        return;
      }
      await route.fulfill({
        status: hit.status,
        headers: hit.headers,
        body: Buffer.from(hit.base64, 'base64'),
      });
    });

    // The calendar requires program data from auth-gated routes; inject the
    // deterministic fixture (page routes take precedence over the recorder's
    // context route, and stay active through the offline replay pass).
    await useDashboardData(page);

    // --- Pass 1 — online load; record the whole shell. ---
    await page.goto('/en/dashboard');
    await expect(page.getByText('Your weekly training plan')).toBeVisible();
    await expect(page.getByRole('region', {name: 'Weekly calendar'})).toBeVisible();
    // Give lazy chunks (e.g. the MonitoringProvider dynamic import) and
    // self-hosted fonts time to be fetched so they end up in the cache.
    await page.evaluate(() => (document as Document).fonts.ready);
    await page.waitForTimeout(1000);

    // --- Pass 2 — offline reload; only cached responses are served. ---
    mode = 'replay';
    await page.reload();

    await expect(page.locator('html')).toHaveAttribute('lang', 'en');
    await expect(page.getByText('Your weekly training plan')).toBeVisible();
    await expect(page.getByRole('region', {name: 'Weekly calendar'})).toBeVisible();

    // The shell must still be interactive (React hydrated from cached JS).
    const dayButtons = page
      .getByRole('region', {name: 'Weekly calendar'})
      .getByRole('button');
    await expect(dayButtons).toHaveCount(7);
    await dayButtons.first().click();
    await expect(dayButtons.first()).toHaveAttribute('aria-pressed', 'true');
  });

  test('service worker and manifest expose the offline fallback contract', async ({
    page,
  }) => {
    await page.goto('/en/dashboard');

    const sw = await page.evaluate(async () => {
      const res = await fetch('/service-worker.js');
      return {status: res.status, text: await res.text()};
    });
    expect(sw.status).toBe(200);
    // Versioned cache the install/activate lifecycle manages.
    expect(sw.text).toContain('next-pwa-cache-v3');
    // The app shell is precached on install (static fallback + PWA files).
    expect(sw.text).toContain("'/offline.html'");
    expect(sw.text).toContain("'/manifest.json'");
    // Never precache '/' — it 307-redirects to '/en', so cache.addAll()
    // rejects and the whole install fails (regression guard). Scoped to the
    // PRECACHE_URLS block: "/api/" elsewhere legitimately contains "'/'".
    const precache = sw.text.match(/PRECACHE_URLS\s*=\s*\[([\s\S]*?)\];/)?.[1] ?? '';
    expect(precache).not.toContain("'/'");
    // Navigation requests are network-first with a cache (and offline page)
    // fallback — the core of the offline story.
    expect(sw.text).toContain("request.mode === 'navigate'");
    expect(sw.text).toContain('caches.match(OFFLINE_FALLBACK)');
    expect(sw.text).toContain("const OFFLINE_FALLBACK = '/offline.html'");
    // API responses are never intercepted by the cache-first path.
    expect(sw.text).toContain("request.url.includes('/api/')");

    const manifest = await page.evaluate(async () => {
      const res = await fetch('/manifest.json');
      return {status: res.status, json: await res.json()};
    });
    expect(manifest.status).toBe(200);
    expect(manifest.json.name).toBe('Apex Home Fitness');
    expect(manifest.json.display).toBe('standalone');
    const icons = manifest.json.icons as {src: string; sizes: string}[] | undefined;
    expect(Array.isArray(icons)).toBe(true);
    expect(icons!.length).toBeGreaterThan(0);

    // Every install icon must actually exist — the offline app shell depends
    // on them (home-screen icon + splash assets).
    for (const icon of icons!) {
      const status = await page.evaluate(async (src: string) => {
        const res = await fetch(src);
        return res.status;
      }, icon.src);
      expect(status, `icon ${icon.src}`).toBe(200);
    }
  });

  test('registering the app service worker never breaks the running app', async ({
    page,
  }) => {
    await useDashboardData(page);
    await page.goto('/en/dashboard');
    await expect(page.getByText('Your weekly training plan')).toBeVisible();

    const pageErrors: string[] = [];
    page.on('pageerror', (error) => pageErrors.push(error.message));

    // register() itself must resolve — failures must never surface to the UI.
    const result = await page.evaluate(async () => {
      try {
        const reg = await navigator.serviceWorker.register('/service-worker.js');
        return {registered: true, scope: reg.scope};
      } catch (error) {
        return {registered: false, error: String(error)};
      }
    });
    expect(result.registered).toBe(true);
    expect(result.scope).toBe('http://localhost:3000/');

    // Give the install a moment to settle. In dev the worker may activate
    // and claim this page (controller set) or stay pending until the next
    // navigation — either state is fine; what matters is that the running
    // app stays fully functional and unmanaged by stale cache entries.
    await page.waitForTimeout(2500);
    const controller = await page.evaluate(() => navigator.serviceWorker.controller?.scriptURL ?? null);
    if (controller !== null) {
      // If the worker took control, it must be OUR worker (same origin).
      expect(controller).toBe('http://localhost:3000/service-worker.js');
    }

    await expect(page.getByText('Your weekly training plan')).toBeVisible();
    const firstDay = page
      .getByRole('region', {name: 'Weekly calendar'})
      .getByRole('button')
      .first();
    await firstDay.click();
    await expect(firstDay).toHaveAttribute('aria-pressed', 'true');
    expect(pageErrors).toEqual([]);
  });

  test('service worker install activates and precaches the offline shell', async ({
    page,
  }) => {
    // PRECACHE_URLS contains only static files that exist under /public
    // (offline fallback, manifest, icons) and never '/' — so cache.addAll()
    // succeeds and the worker activates instead of being discarded.
    await page.goto('/en/dashboard');

    await page.evaluate(() => navigator.serviceWorker.register('/service-worker.js'));

    // Install + activate must complete and populate the versioned cache.
    await page.waitForFunction(async () => {
      const keys = await caches.keys();
      return keys.includes('next-pwa-cache-v3');
    });

    const state = await page.evaluate(async () => {
      const keys = await caches.keys();
      const entries: Record<string, number> = {};
      for (const key of keys) {
        const cache = await caches.open(key);
        entries[key] = (await cache.keys()).length;
      }
      return entries;
    });

    // Every precached URL must be present in the current cache.
    const precached = await page.evaluate(async () => {
      const cache = await caches.open('next-pwa-cache-v3');
      const urls = (await cache.keys()).map((req) => new URL(req.url).pathname);
      return {
        offline: urls.includes('/offline.html'),
        manifest: urls.includes('/manifest.json'),
        icon: urls.includes('/icons/icon-512x512.png'),
      };
    });
    expect(precached).toEqual({offline: true, manifest: true, icon: true});

    // The cache got populated (previously it stayed empty because the first
    // precache entry '/' redirected and rejected addAll).
    expect(state['next-pwa-cache-v3'] ?? 0).toBeGreaterThan(0);
  });
});
