import {NextResponse, type NextRequest} from 'next/server';
import createMiddleware from 'next-intl/middleware';
import {createServerClient} from '@supabase/ssr';

import {routing} from '@/i18n/routing';
import {hasSupabaseEnv, isAuthConfigured} from '@/lib/auth/mode';
import {
  isAuthPath,
  isProtectedPath,
  postAuthDefaultPath,
} from '@/lib/auth/protect';

const intlMiddleware = createMiddleware(routing);

/**
 * Middleware — composes next-intl locale handling with Supabase session
 * refresh and route protection in a single pass.
 *
 * Locale: `intlMiddleware` owns locale detection/prefixing (pre-existing
 * behaviour). Its response is returned (or mutated), so locale redirects and
 * headers are untouched.
 *
 * Session refresh: when Supabase is configured, a `createServerClient` reads
 * the request cookies and calls `getUser()` (which refreshes expired sessions
 * and rewrites the auth cookies) with any refreshed cookies written onto the
 * response — the standard `@supabase/ssr` middleware pattern, kept
 * locale-aware. Session cookies are exclusively the real Supabase ones; there
 * is no mock session path (see `src/lib/auth/mode.ts`).
 *
 * Protection (locale-aware, allowlisted):
 *   - Protected segments: dashboard, workout, history, analytics, challenges,
 *     profile. Unauthenticated visitors are redirected to
 *     `/{locale}/auth/login?next=<original path>`.
 *   - Auth pages (login/verify): authenticated visitors bounce to the
 *     dashboard so the sign-in screens never linger for signed-in users.
 *   - Public pages (quiz, faq, library, root) are always open.
 *   - The `next` param is validated on the client against
 *     `sanitizeRedirectPath` (allowlist, see `src/lib/auth/protect.ts`) — no
 *     open redirects.
 *
 * Activation: protection engages when an auth backend is configured
 * (`AUTH_OTP_MODE=mock` for dev/CI E2E, or Supabase env vars in production).
 * Without either, the app degrades gracefully to today's open behaviour —
 * this keeps the UI-only E2E suite and local development working without
 * Supabase (documented in `.env.example`).
 */
export async function middleware(request: NextRequest) {
  // next-intl first: it owns locale routing and returns the response we
  // return (or redirect) at the end.
  const response = intlMiddleware(request);

  if (!isAuthConfigured()) {
    return response;
  }

  const {pathname} = request.nextUrl;
  const locale =
    routing.locales.find(
      (l) => pathname === `/${l}` || pathname.startsWith(`/${l}/`),
    ) ?? routing.defaultLocale;

  // ── Resolve the session (real Supabase SSR only) ───────────────────────
  let authenticated = false;
  if (hasSupabaseEnv()) {
    try {
      const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
          cookies: {
            getAll: () => request.cookies.getAll(),
            setAll: (cookiesToSet) => {
              cookiesToSet.forEach(({name, value, options}) => {
                // Refresh cookies apply to this request AND the response so a
                // refreshed session survives the redirect chain.
                request.cookies.set(name, value);
                response.cookies.set(name, value, options);
              });
            },
          },
        },
      );
      const {data} = await supabase.auth.getUser();
      authenticated = Boolean(data.user);
    } catch {
      // Unreachable/misconfigured Supabase → treat as signed out.
      authenticated = false;
    }
  }
  // Without Supabase env every visitor is signed out — protection still
  // redirects (mock-mode E2E), but no session can ever be minted.

  // ── Route protection ───────────────────────────────────────────────────
  const protectedPage = isProtectedPath(pathname, locale);
  const authPage = isAuthPath(pathname, locale);

  if (protectedPage && !authenticated) {
    const url = request.nextUrl.clone();
    url.pathname = `/${locale}/auth/login`;
    url.search = `?next=${encodeURIComponent(pathname)}`;
    return NextResponse.redirect(url);
  }

  if (authPage && authenticated) {
    const url = request.nextUrl.clone();
    url.pathname = postAuthDefaultPath(locale);
    url.search = '';
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  // Match only internationalized pathnames (API routes and static assets are
  // intentionally excluded — the auth endpoints enforce their own session
  // logic via the server client).
  matcher: ['/', '/(fa|en)/:path*'],
};
