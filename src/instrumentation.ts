/**
 * instrumentation.ts — Next.js server bootstrap hook.
 *
 * Next.js App Router runs `register()` once when the server process starts
 * (both the Node and edge runtimes). This is where we initialize the error
 * tracker so every route handler / server action has a working error
 * pipeline from the first request.
 *
 * Everything is wrapped defensively: monitoring must never prevent the app
 * from booting.
 */

export async function register() {
  try {
    const { initServerMonitoring } = await import('@/lib/errorTracking');
    await initServerMonitoring();
  } catch (error) {
    // Swallow — a telemetry failure must never take the server down.
    // eslint-disable-next-line no-console
    console.error('[monitoring] server monitoring initialization failed', error);
  }
}
