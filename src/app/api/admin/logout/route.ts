import {NextRequest, NextResponse} from 'next/server';

import {
  adminCookieOptions,
  isSameOriginRequest,
  revokeCurrentAdminSession,
  ADMIN_SESSION_COOKIE,
} from '@/lib/admin/auth';

export async function POST(request: NextRequest) {
  if (!isSameOriginRequest(request)) {
    return NextResponse.json({ok: false, error: 'invalid_request'}, {status: 403});
  }

  await revokeCurrentAdminSession();
  const response = NextResponse.json({ok: true});
  response.cookies.set(
    ADMIN_SESSION_COOKIE,
    '',
    adminCookieOptions(new Date(0)),
  );
  return response;
}
