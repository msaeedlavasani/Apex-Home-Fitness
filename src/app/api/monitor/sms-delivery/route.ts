import {NextRequest, NextResponse} from 'next/server';

import {createSmsIrOtpProvider, SmsIrProviderError, SMSIR_ERROR_CODES} from '@/lib/auth/smsIrProvider';

/**
 * GET /api/monitor/sms-delivery?messageId=<id>
 * -------------------------------------------
 * On-demand delivery status for a single SMS.ir message — the same lookup the
 * automatic post-send probe runs (see `smsIrProvider.ts`). Read-only; the raw
 * message TEXT is deliberately not returned because it may contain the
 * plaintext OTP code.
 *
 * 200: { ok: true, data: { messageId, deliveryState, state, sendDateTime,
 *                          deliveryDateTime, deliveryLagSeconds } }
 * 400: { ok: false, error: "invalid_message_id" }
 * 503: { ok: false, error: "provider_not_configured" }   (SMS env missing)
 * 502: { ok: false, error: <provider error code> }
 */
export async function GET(request: NextRequest) {
  const messageId = request.nextUrl.searchParams.get('messageId')?.trim() ?? '';
  if (!/^\d+$/.test(messageId)) {
    return NextResponse.json({ok: false, error: 'invalid_message_id'}, {status: 400});
  }

  let provider;
  try {
    provider = createSmsIrOtpProvider();
  } catch {
    return NextResponse.json({ok: false, error: 'provider_not_configured'}, {status: 503});
  }

  try {
    const data = await provider.getDeliveryStatus(messageId);
    return NextResponse.json({ok: true, data});
  } catch (error) {
    const code = error instanceof SmsIrProviderError ? error.code : SMSIR_ERROR_CODES.PROVIDER_UNAVAILABLE;
    return NextResponse.json({ok: false, error: code}, {status: 502});
  }
}
