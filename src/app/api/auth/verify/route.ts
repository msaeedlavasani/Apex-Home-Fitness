import {NextRequest, NextResponse} from 'next/server';

import {getOtpService} from '@/lib/auth/otpService';
import {maskPhone} from '@/lib/auth/phone';
import type {OtpErrorCode} from '@/lib/auth/types';
import {logger} from '@/lib/logger';

/**
 * POST /api/auth/verify
 * ---------------------
 * Verifies a submitted OTP code and establishes the session (canonical route).
 *
 * Body:    { "phone": "09123456789", "code": "123456" }
 * 200:     { "ok": true }  — in secure mode the Supabase SSR session cookies
 *                            are attached to this response by the service
 *                            (`establishSessionForVerifiedPhone`); in mock
 *                            mode there is no session (dev/CI only — the
 *                            middleware treats every visitor as signed out).
 * 400:     { "ok": false, "error": "invalid_phone" | "invalid_code" |
 *             "not_requested" }
 * 403:     { "ok": false, "error": "expired" | "too_many_attempts" }
 * 429:     { "ok": false, "error": "rate_limited" }
 * 503:     { "ok": false, "error": "provider_error" }  — session provider not
 *                                                        configured; honest
 *                                                        failure, never fake.
 *
 * Security (delegated to the active service): single-use atomic consumption,
 * per-challenge attempt budget, code expiry, constant-time hash comparison.
 */
function statusFor(error: OtpErrorCode): number {
  switch (error) {
    case 'expired':
    case 'too_many_attempts':
      return 403;
    case 'rate_limited':
      return 429;
    case 'provider_error':
    case 'session_unavailable':
      return 503;
    default:
      return 400;
  }
}

export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => null)) as
    | {phone?: unknown; code?: unknown}
    | null;
  if (!body || typeof body.phone !== 'string' || typeof body.code !== 'string') {
    return NextResponse.json({ok: false, error: 'invalid_code'}, {status: 400});
  }

  const service = getOtpService();
  const result = await service.verifyCode({phone: body.phone, code: body.code});

  if (!result.ok) {
    const error = result.error ?? 'provider_error';
    return NextResponse.json({ok: false, error}, {status: statusFor(error)});
  }

  logger.info('auth.verify.success', {phone: maskPhone(body.phone)});
  return NextResponse.json({ok: true});
}
