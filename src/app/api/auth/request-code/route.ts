import {NextRequest, NextResponse} from 'next/server';

import {getOtpService} from '@/lib/auth/otpService';
import {maskPhone} from '@/lib/auth/phone';
import type {OtpErrorCode} from '@/lib/auth/types';
import {logger} from '@/lib/logger';

/**
 * POST /api/auth/request-code
 * ---------------------------
 * Requests a one-time SMS code for an Iranian mobile number (canonical route —
 * see `src/lib/auth/types.ts` + `src/lib/auth/otpService.ts`; the secure
 * implementation resolves the SMS.ir env automatically).
 *
 * Body:    { "phone": "09123456789" }
 * 200:     { "ok": true, "retryAfterSeconds", "devCode"? }  — `devCode` only
 *                                                             in mock mode
 * 400:     { "ok": false, "error": "invalid_phone" }
 * 429:     { "ok": false, "error": "rate_limited", "retryAfterSeconds" }
 * 503:     { "ok": false, "error": "provider_error" }  — honest failure, never
 *                                                        a fake success
 *
 * The code itself is NEVER returned (except the dev-only `devCode` seam);
 * the plaintext code only exists in the SMS payload and (scrypt-hashed) in
 * the ledger.
 */
function statusFor(error: OtpErrorCode): number {
  switch (error) {
    case 'rate_limited':
      return 429;
    case 'provider_error':
      return 503;
    default:
      return 400;
  }
}

export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => null)) as {phone?: unknown} | null;
  if (!body || typeof body.phone !== 'string') {
    return NextResponse.json({ok: false, error: 'invalid_phone'}, {status: 400});
  }

  const service = getOtpService();
  const result = await service.requestCode({phone: body.phone});

  if (!result.ok) {
    const error = result.error ?? 'provider_error';
    return NextResponse.json(
      {
        ok: false,
        error,
        ...(result.retryAfterSeconds !== undefined
          ? {retryAfterSeconds: result.retryAfterSeconds}
          : {}),
      },
      {status: statusFor(error)},
    );
  }

  const normalized = maskPhone(body.phone);
  logger.info('auth.request_code.sent', {phone: normalized});

  return NextResponse.json({
    ok: true,
    retryAfterSeconds: result.retryAfterSeconds ?? 60,
    ...(result.devCode ? {devCode: result.devCode} : {}),
  });
}
