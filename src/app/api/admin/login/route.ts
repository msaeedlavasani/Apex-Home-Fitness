import {NextRequest, NextResponse} from 'next/server';

import {getRateLimitStore} from '@/lib/ai/requestSecurity';
import {RateLimitStoreError} from '@/lib/ai/rateLimitStore';
import {
  adminCookieOptions,
  authenticateAdmin,
  createAdminSession,
  isSameOriginRequest,
  normalizeAdminEmail,
  ADMIN_SESSION_COOKIE,
} from '@/lib/admin/auth';

function clientIp(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for');
  return forwarded?.split(',')[0]?.trim() || request.headers.get('x-real-ip') || 'unknown';
}

function envLimit(name: string, fallback: number, min: number, max: number): number {
  const parsed = Number.parseInt(process.env[name] ?? '', 10);
  return Number.isSafeInteger(parsed) && parsed >= min && parsed <= max ? parsed : fallback;
}

function envWindowMs(): number {
  return envLimit('ADMIN_LOGIN_WINDOW_MS', 15 * 60 * 1000, 60_000, 24 * 60 * 60 * 1000);
}

async function allowed(key: string, limit: number): Promise<boolean> {
  const result = await getRateLimitStore().incrementWindow(
    `admin:login:${key}`,
    envWindowMs(),
    limit,
  );
  return result.allowed;
}

export async function POST(request: NextRequest) {
  if (!isSameOriginRequest(request)) {
    return NextResponse.json({ok: false, error: 'invalid_request'}, {status: 403});
  }

  const body = (await request.json().catch(() => null)) as
    | {email?: unknown; password?: unknown}
    | null;
  const email = normalizeAdminEmail(body?.email);
  const password = typeof body?.password === 'string' ? body.password : '';
  if (!email || password.length === 0 || password.length > 1024) {
    return NextResponse.json({ok: false, error: 'invalid_credentials'}, {status: 400});
  }

  try {
    const ip = clientIp(request);
    const [ipAllowed, emailAllowed] = await Promise.all([
      allowed(`ip:${ip}`, envLimit('ADMIN_LOGIN_IP_LIMIT', 10, 1, 1000)),
      allowed(`email:${email}`, envLimit('ADMIN_LOGIN_EMAIL_LIMIT', 5, 1, 1000)),
    ]);
    if (!ipAllowed || !emailAllowed) {
      return NextResponse.json({ok: false, error: 'invalid_credentials'}, {status: 429});
    }

    const admin = await authenticateAdmin(email, password);
    if (!admin) {
      return NextResponse.json({ok: false, error: 'invalid_credentials'}, {status: 401});
    }

    const session = await createAdminSession(admin.id);
    const response = NextResponse.json({ok: true});
    response.cookies.set(ADMIN_SESSION_COOKIE, session.token, adminCookieOptions(session.expiresAt));
    return response;
  } catch (error) {
    if (error instanceof RateLimitStoreError) {
      return NextResponse.json({ok: false, error: 'temporarily_unavailable'}, {status: 503});
    }
    return NextResponse.json({ok: false, error: 'temporarily_unavailable'}, {status: 503});
  }
}
