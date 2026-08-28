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

/**
 * Temporary S02 diagnostic hook.
 *
 * Next.js replaces Server Component error details in the production RSC
 * payload. This hook records the original server-side exception without
 * request headers or environment values so the failing render can be tied to
 * a concrete source location. Remove it before the release commit.
 */
export async function onRequestError(
  error: unknown,
  request: Readonly<{path: string; method: string}>,
  context: Readonly<{
    routerKind: 'Pages Router' | 'App Router';
    routePath: string;
    routeType: 'render' | 'route' | 'action' | 'middleware';
    renderSource?:
      | 'react-server-components'
      | 'react-server-components-payload'
      | 'server-rendering';
  }>,
) {
  if (!request.path.startsWith('/en') && !request.path.startsWith('/fa')) {
    return;
  }

  const details =
    error instanceof Error
      ? {
          name: error.name,
          message: error.message,
          stack: error.stack,
          digest: 'digest' in error ? String(error.digest) : undefined,
        }
      : {name: typeof error, message: String(error)};

  // eslint-disable-next-line no-console
  console.error('[s02-rsc-diagnostic]', {
    request: {path: request.path, method: request.method},
    context,
    error: details,
  });
}
