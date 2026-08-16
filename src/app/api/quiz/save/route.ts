/**
 * `POST /api/quiz/save` — persists the onboarding quiz response for the
 * authenticated user (Batch 14 / task 3).
 *
 * Contract (mirrors docs/OTP_LAUNCH_READINESS.md §3):
 *   - 200 `{ quizResponse }` — created, or the EXISTING response when
 *     `clientRequestId` replays a previous save (idempotent; retries,
 *     refreshes and post-OTP resumes never create a duplicate).
 *   - 400 invalid body / invalid answers / invalid clientRequestId.
 *   - 401 no session (the auth UI must run first).
 *   - 409 `CLIENT_REQUEST_ID_CONFLICT` — the idempotency key is already bound
 *     to a different user's response.
 *   - 500 unexpected failure (no internals leaked).
 *
 * Authentication is the existing Supabase SSR session (`userService
  * .saveQuizResponse` → `getSupabaseAuthUser`). The session is created by
  * `POST /api/auth/verify` after the canonical OTP flow completes.
 */
import { NextResponse } from 'next/server';

import { isValidIdempotencyKey } from '@/lib/ai/idempotency';
import { isAuthConfigured } from '@/lib/auth/mode';
import { QUIZ_ANSWERS_SCHEMA } from '@/lib/quiz/quizFlow';
import {
  QuizResponseConflictError,
  saveQuizResponse,
  UnauthenticatedError,
} from '@/services/userService';

export async function POST(req: Request) {
  // No auth backend configured on the server (no Supabase env, no mock mode):
  // an honest 503 — retrying cannot help until ops configures auth.
  if (!isAuthConfigured()) {
    return NextResponse.json(
      {error: 'Auth backend is not configured.', code: 'AUTH_BACKEND_NOT_CONFIGURED'},
      {status: 503},
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({error: 'Invalid JSON body.'}, {status: 400});
  }

  if (!body || typeof body !== 'object') {
    return NextResponse.json({error: 'Invalid request body.'}, {status: 400});
  }
  const {answers, clientRequestId} = body as {answers?: unknown; clientRequestId?: unknown};

  const parsedAnswers = QUIZ_ANSWERS_SCHEMA.safeParse(answers);
  if (!parsedAnswers.success) {
    return NextResponse.json(
      {error: 'Invalid quiz answers.', code: 'INVALID_QUIZ_ANSWERS'},
      {status: 400},
    );
  }

  const requestId = typeof clientRequestId === 'string' ? clientRequestId : null;
  if (clientRequestId != null && (requestId === null || !isValidIdempotencyKey(requestId))) {
    return NextResponse.json(
      {
        error:
          'Invalid clientRequestId. Use 8-64 characters of [A-Za-z0-9_-].',
        code: 'INVALID_CLIENT_REQUEST_ID',
      },
      {status: 400},
    );
  }

  try {
    const quizResponse = await saveQuizResponse({
      answers: parsedAnswers.data,
      clientRequestId: requestId,
    });
    return NextResponse.json({quizResponse});
  } catch (error) {
    if (error instanceof UnauthenticatedError) {
      return NextResponse.json(
        {error: 'Authentication required', code: 'UNAUTHENTICATED'},
        {status: 401},
      );
    }
    if (error instanceof QuizResponseConflictError) {
      return NextResponse.json(
        {error: error.message, code: 'CLIENT_REQUEST_ID_CONFLICT'},
        {status: 409},
      );
    }
    // The auth backend was reported configured but the Supabase client is
    // not (e.g. mock mode where only the session cookie seam exists) —
    // persisting a quiz response is impossible until a real identity exists.
    if (error instanceof Error && /missing configuration/i.test(error.message)) {
      return NextResponse.json(
        {error: 'Auth backend is not configured.', code: 'AUTH_BACKEND_NOT_CONFIGURED'},
        {status: 503},
      );
    }
    // Log only a stable category; never answers or internal details.
    console.error('Quiz save failed:', error instanceof Error ? error.name : 'unknown');
    return NextResponse.json(
      {error: 'Failed to save quiz response', code: 'QUIZ_SAVE_FAILED'},
      {status: 500},
    );
  }
}
