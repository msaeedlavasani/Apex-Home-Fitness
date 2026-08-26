import { generateObject } from 'ai';
import { z } from 'zod';
import { loadSystemPrompt, PromptMode } from '@/lib/ai/prompts';
import { buildRuleBasedProgram } from '@/lib/ai/ruleBasedProgram';
import {
  AI_ENGINE_VERSION,
  classifyAiGenerationError,
  resolveAiProvider,
  type AiProviderName,
  type AiFallbackCategory,
} from '@/lib/ai/provider';
import { enforceRestDays } from '@/lib/ai/restDays';
import { NextResponse } from 'next/server';

import {
  IDEMPOTENCY_CODES,
  IDEMPOTENCY_KEY_HEADER,
  idempotencyKeyErrorMessage,
  isValidIdempotencyKey,
} from '@/lib/ai/idempotency';
import {
  AI_GENERATION_TIMEOUT_MS,
  GENERATE_PROGRAM_INPUT_SCHEMA,
  MEDICAL_DISCLAIMER,
  acquireGenerationSlot,
  getClientIp,
  hasHighRiskDisclosure,
  releaseGenerationSlot,
  securityMessage,
} from '@/lib/ai/requestSecurity';
import { prisma } from '@/lib/prisma';
import {
  HISTORY_QUERY_TIMEOUT_MS,
  TIMEOUT_CODES,
  TimeoutError,
  timeoutErrorMessage,
  withTimeout,
} from '@/lib/timeout';
import { beginIdempotentGeneration, markIdempotentGenerationFailed } from '@/services/generationIdempotency';
import { persistProgramForUser, persistProgramForUserWithIdempotency } from '@/services/programService';
import {
  getSupabaseAuthUser,
  syncUserWithSupabase,
  UnauthenticatedError,
} from '@/services/userService';

// Schema for the exercise object in the AI output
const ExerciseSchema = z.object({
  id: z.string(),
  name: z.string(),
  method: z.enum(['strength', 'hypertrophy', 'cardio', 'mobility', 'pilates', 'bodyweight', 'isometric', 'flexibility']),
  equipment: z.enum(['none', 'dumbbell', 'barbell', 'kettlebell', 'resistance_band', 'pull_up_bar', 'bench', 'mat', 'cardio_machine', 'other']),
  sets: z.number().nullable(),
  reps: z.string().nullable(),
  rest_seconds: z.number().nullable(),
  tempo: z.string().nullable(),
  rpe: z.number().nullable(),
  instruction_cue: z.string(),
  alternatives: z.array(z.object({
    name: z.string(),
    equipment: z.string(),
    reason: z.string(),
  })),
  contraindicated_for: z.array(z.string()),
});

// Full program schema
const ProgramSchema = z.object({
  mode: z.enum(['general', 'injury_focused', 'equipment_limited']),
  program_id: z.string(),
  // Echoes the user's rest-day selection (weekday ids, e.g.
  // ["wednesday", "sunday"]) so the output always carries the constraint
  // that produced it. The route overwrites this with the validated input
  // value after generation (see `enforceRestDays`), so the field is
  // guaranteed present even if the model omits it.
  rest_days: z.array(z.string()).optional(),
  method_mix: z.object({
    strength_pct: z.number(),
    hypertrophy_pct: z.number(),
    cardio_pct: z.number(),
    mobility_pct: z.number(),
    pilates_pct: z.number(),
    bodyweight_pct: z.number(),
    isometric_pct: z.number(),
  }),
  weekly_schedule: z.array(z.object({
    day: z.number(),
    focus: z.string(),
    // Weekday of the session ("Monday"…"Sunday") — the enforcement pass uses
    // it to guarantee no session lands on a user-selected rest day.
    day_name: z.string().optional(),
    // Set by the post-generation enforcement pass when a session was placed
    // on a rest day; such entries carry NO warmup/exercises/cooldown.
    is_rest_day: z.boolean().optional(),
    warmup: z.array(z.object({
      name: z.string(),
      duration_seconds: z.number(),
      purpose: z.string(),
    })),
    exercises: z.array(ExerciseSchema),
    cooldown: z.array(z.object({
      name: z.string(),
      duration_seconds: z.number(),
      purpose: z.string(),
    })),
    notes: z.string().optional(),
  })),
  progression_plan: z.object({
    weeks_1_2: z.string(),
    weeks_3_5: z.string(),
    week_6: z.string(),
    overload_variables: z.array(z.string()),
  }),
  // Evidence-based progression/regression adjustments derived from the user's
  // recent WorkoutSession history (completion status + actual performance).
  // Required so every generated program explicitly carries them.
  adjustments: z.object({
    summary: z.string(),
    progression: z.array(z.string()),
    regression: z.array(z.string()),
    rationale: z.string(),
  }),
  warnings: z.array(z.string()),
  notes: z.string(),
  disclaimer: z.string(),
});

// ---------------------------------------------------------------------------
// Recent WorkoutSession history → AI prompt
// ---------------------------------------------------------------------------

/** How many of the user's most recent sessions are fed into the prompt. */
const HISTORY_SESSION_LIMIT = 10;

/** Cap exercises listed per session so the prompt stays focused. */
const HISTORY_EXERCISE_LIMIT = 12;

/** Minimal `WorkoutSessionExercise` shape needed for the history block. */
interface HistorySessionExercise {
  completed: boolean;
  actualSets: number | null;
  actualReps: number | null;
  durationSeconds: number | null;
  exercise: { name: string; category?: string | null };
}

/** Minimal `WorkoutSession` shape needed for the history block. */
interface HistorySession {
  startedAt: Date | string;
  completedAt?: Date | string | null;
  durationSeconds?: number | null;
  caloriesBurned?: number | null;
  exercises?: HistorySessionExercise[];
}

/** A session counts as completed once `completedAt` is recorded. */
function isCompletedSession(session: HistorySession): boolean {
  return session.completedAt != null;
}

/** Renders a duration (seconds) as a compact human label, e.g. "42 min". */
function formatDuration(totalSeconds: number | null | undefined): string {
  if (!totalSeconds || totalSeconds <= 0) return '—';
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return seconds > 0 ? `${minutes}m ${seconds}s` : `${minutes} min`;
}

/**
 * Renders the user's recent workout history as a compact, LLM-friendly block:
 * per-session status (completed / in progress), duration, calories, and each
 * exercise's completion flag plus actual sets / reps / duration. Ends with an
 * aggregate summary (completion rate, total actual volume) so the model can
 * reason about progression vs. regression at a glance.
 */
function formatWorkoutHistory(sessions: HistorySession[]): string {
  if (sessions.length === 0) {
    return 'No recent workout history found for this user.';
  }

  let completedSessions = 0;
  let totalExercises = 0;
  let completedExercises = 0;
  let totalSets = 0;
  let totalReps = 0;

  const lines: string[] = [];
  for (const session of sessions) {
    const doneSession = isCompletedSession(session);
    if (doneSession) completedSessions += 1;

    const when = new Date(session.startedAt).toISOString().slice(0, 10);
    const duration = formatDuration(session.durationSeconds);
    const calories =
      typeof session.caloriesBurned === 'number' && session.caloriesBurned > 0
        ? ` — ~${session.caloriesBurned} kcal`
        : '';

    let sessionDone = 0;
    let sessionTotal = 0;
    const exerciseLines: string[] = [];
    for (const entry of (session.exercises ?? []).slice(0, HISTORY_EXERCISE_LIMIT)) {
      sessionTotal += 1;
      totalExercises += 1;
      const name = entry.exercise?.name ?? 'Unknown exercise';
      const done = entry.completed === true;
      if (done) {
        sessionDone += 1;
        completedExercises += 1;
        totalSets += entry.actualSets ?? 0;
        totalReps += entry.actualReps ?? 0;
      }

      const volume =
        typeof entry.actualSets === 'number' && typeof entry.actualReps === 'number'
          ? ` — ${entry.actualSets} sets x ${entry.actualReps} reps`
          : typeof entry.actualSets === 'number'
            ? ` — ${entry.actualSets} sets`
            : '';
      const time = entry.durationSeconds ? ` — ${formatDuration(entry.durationSeconds)}` : '';

      exerciseLines.push(
        done ? `  - ${name}: completed${volume}${time}` : `  - ${name}: NOT completed`,
      );
    }

    const status = doneSession ? 'COMPLETED' : 'IN PROGRESS (not completed)';
    lines.push(
      `- ${when} — ${status} — ${duration}${calories} — exercises done: ${sessionDone}/${sessionTotal}`,
      ...exerciseLines,
    );
  }

  const completionRate =
    totalExercises > 0 ? Math.round((completedExercises / totalExercises) * 100) : 0;
  lines.push(
    '',
    `History summary: ${sessions.length} session(s) shown, ${completedSessions} completed, ` +
      `exercise completion rate ${completionRate}% (${completedExercises}/${totalExercises}), ` +
      `total actual volume ${totalSets} sets / ${totalReps} reps.`,
  );

  return lines.join('\n');
}

function isAiQuotaError(error: unknown): boolean {
  return classifyAiGenerationError(error) === 'ai_quota_exhausted';
}

function safeGenerationLog(category: AiFallbackCategory): void {
  console.warn(category);
}

export async function POST(req: Request) {
  let generationUserId: string | null = null;
  let slotAcquired = false;
  let idempotencyRecordId: string | null = null;
  try {
    // Idempotency contract: the optional `Idempotency-Key` header must match
    // the documented format when present (see `src/lib/ai/idempotency.ts`).
    const idempotencyKey = req.headers.get(IDEMPOTENCY_KEY_HEADER);
    if (idempotencyKey !== null && !isValidIdempotencyKey(idempotencyKey)) {
      return NextResponse.json(
        {error: idempotencyKeyErrorMessage(), code: IDEMPOTENCY_CODES.INVALID_KEY},
        {status: 400},
      );
    }

    let requestBody: unknown;
    try {
      requestBody = await req.json();
    } catch {
      return NextResponse.json({error: 'Invalid JSON body.'}, {status: 400});
    }
    const parsedInput = GENERATE_PROGRAM_INPUT_SCHEMA.safeParse(requestBody);
    if (!parsedInput.success) {
      return NextResponse.json({error: 'Invalid workout profile.'}, {status: 400});
    }
    const {
      level,
      goal,
      exerciseStyles,
      equipment,
      limitations,
      limitationsDetails,
      restDays = [],
    } = parsedInput.data;
    // `goal` is normalized by the Zod schema to a canonical array
    // (legacy single strings are wrapped), e.g. ['strength', 'fat_loss'].
    const goals = goal.join(', ');
    // Canonical rest-day ids (1–3 weekdays) — enforced by the AI prompt AND
    // by the post-generation pass, so selected days never carry workouts.
    const restDaysJoined = restDays.join(', ');

    // Resolve the authenticated user once — the same identity backs both the
    // workout-history lookup and the program persistence.
    const supabaseUser = await getSupabaseAuthUser();
    const user = await syncUserWithSupabase(supabaseUser);
    generationUserId = user.id;

    if (hasHighRiskDisclosure(limitationsDetails)) {
      return NextResponse.json(
        {
          error: 'Medical clearance is required before generating a program for the disclosed symptoms or condition.',
          code: 'MEDICAL_CLEARANCE_REQUIRED',
        },
        {status: 422},
      );
    }

    // Idempotency: claim the key (or classify the retry) BEFORE rate limiting,
    // so replays of completed generations and duplicates of in-flight ones
    // never consume generation quota and never re-run the AI:
    //   - replay  → the exact 200 response of the original request,
    //   - in_progress → 409 (a generation with this key is already running),
    //   - conflict → 409 (key already bound to a different request body).
    // Only a `claimed` key proceeds to generation and persistence.
    if (idempotencyKey !== null) {
      const outcome = await beginIdempotentGeneration(user.id, idempotencyKey, parsedInput.data);
      if (outcome.kind === 'replay') {
        return NextResponse.json(outcome.responsePayload);
      }
      if (outcome.kind === 'in_progress') {
        return NextResponse.json(
          {
            error: 'A generation with this Idempotency-Key is already in progress. Please retry shortly.',
            code: IDEMPOTENCY_CODES.IN_PROGRESS,
          },
          {status: 409},
        );
      }
      if (outcome.kind === 'conflict') {
        return NextResponse.json(
          {
            error: 'This Idempotency-Key was already used with a different request.',
            code: IDEMPOTENCY_CODES.CONFLICT,
          },
          {status: 409},
        );
      }
      idempotencyRecordId = outcome.record.id;
    }

    const rejection = await acquireGenerationSlot(user.id, getClientIp(req));
    if (rejection) {
      // The key was claimed — release it (FAILED) so the client can retry once
      // the limit resets instead of being stuck in IN_PROGRESS forever.
      if (idempotencyRecordId) await markIdempotentGenerationFailed(idempotencyRecordId);
      const status = rejection === 'daily_limit' ? 429 : rejection === 'concurrent_request' ? 409 : 429;
      return NextResponse.json({error: securityMessage(rejection)}, {status});
    }
    slotAcquired = true;

    // Determine mode
    let mode: PromptMode = 'general';
    if (limitations.length > 0 && !limitations.includes('none')) {
      mode = 'injury_focused';
    } else if (equipment.length === 1 && equipment[0] === 'none') {
      mode = 'equipment_limited';
    }

    // Recent WorkoutSession history (newest first) — completion status and
    // actual performance (sets / reps / duration) drive the AI's
    // progression/regression adjustments. Bounded so a stuck database cannot
    // hold the generation slot open indefinitely.
    const historyQuery = prisma.workoutSession.findMany({
      where: { userId: user.id },
      orderBy: { startedAt: 'desc' },
      take: HISTORY_SESSION_LIMIT,
      select: {
        id: true,
        startedAt: true,
        completedAt: true,
        durationSeconds: true,
        caloriesBurned: true,
        exercises: {
          orderBy: { order: 'asc' },
          select: {
            completed: true,
            actualSets: true,
            actualReps: true,
            durationSeconds: true,
            exercise: { select: { name: true, category: true } },
          },
        },
      },
    });
    const recentSessions = await withTimeout(historyQuery, HISTORY_QUERY_TIMEOUT_MS, {
      message: 'Workout history query timed out',
      code: TIMEOUT_CODES.PERSISTENCE,
    });

    const workoutHistory = formatWorkoutHistory(recentSessions);

    const systemPrompt = await loadSystemPrompt(mode);
    const fallbackEnabled = (process.env.AI_GENERATION_FALLBACK ?? 'rules').trim().toLowerCase() === 'rules';
    let provider: ReturnType<typeof resolveAiProvider> | null = null;
    let generatedOutput!: z.infer<typeof ProgramSchema>;
    let generationSource: 'ai' | 'rules' = 'rules';
    let generationProvider: AiProviderName | null = null;
    let generationModel: string | null = null;
    let fallbackReason: AiFallbackCategory | null = null;

    try {
      provider = resolveAiProvider();
    } catch (error) {
      const category = classifyAiGenerationError(error);
      if (!fallbackEnabled || category !== 'ai_configuration_error') throw error;
      fallbackReason = category;
      safeGenerationLog(category);
      generatedOutput = ProgramSchema.parse(buildRuleBasedProgram(parsedInput.data));
      generationSource = 'rules';
    }

    if (!provider) {
      // Configuration fallback intentionally avoids constructing an external
      // provider or making any network request.
      generationProvider = null;
      generationModel = null;
    } else if (provider.generator === 'rules') {
      generatedOutput = ProgramSchema.parse(buildRuleBasedProgram(parsedInput.data));
      generationSource = 'rules';
      generationProvider = null;
      generationModel = null;
    } else {
      generationProvider = provider.provider;
      generationModel = provider.modelName;
      try {
        const generation = generateObject({
          model: provider.model as NonNullable<typeof provider.model>,
          schema: ProgramSchema,
          prompt: `Generate a workout program for a user with the following profile:
        - Level: ${level}
        - Goals: ${goals}
        - Preferred exercise styles (use only these styles unless a safety substitution is necessary): ${exerciseStyles.join(', ')}
        - Available Equipment: ${equipment.join(', ')}
        - Injuries/Limitations: ${limitations.join(', ')}
        - Details: ${limitationsDetails || 'None'}
        - Rest days (weekdays that MUST NOT contain any workout): ${restDaysJoined || 'None specified'}
          The user selected exercise styles intentionally. Do not include a session
          or exercise whose primary method is outside the selected styles unless
          it is required as a brief safety warm-up or cooldown. Explain any
          unavoidable substitution in notes.
          Place sessions ONLY on weekdays that are not rest days. Every
          weekly_schedule entry MUST carry BOTH a numeric day (the ISO
          weekday number: 1=Monday, 2=Tuesday, 3=Wednesday, 4=Thursday,
          5=Friday, 6=Saturday, 7=Sunday) AND an English day_name
          ("Monday" … "Sunday"); never schedule a session on a rest day.

        RECENT WORKOUT HISTORY (newest first, last ${HISTORY_SESSION_LIMIT} sessions):
        ${workoutHistory}

        ADJUSTMENT REQUIREMENTS:
        Use the workout history above to tune the program — do not ignore it.
        - PROGRESS (progression) when the user completes most sessions, hits or
          exceeds target volume, and shows a high exercise completion rate: raise
          volume/intensity (more sets or reps, heavier RPE targets, shorter rest,
          harder exercise variations).
        - REGRESS (regression) when completion is low, sessions are abandoned, or
          actual sets/reps consistently fall below target: cut volume and intensity
          (fewer sets, lower RPE, longer rest, easier variations) and add supportive
          cues to rebuild confidence and adherence.
        - When there is no history, start from a sensible baseline for the stated
          level and say so in the adjustments.
        Fill the "adjustments" object with a concise summary, the concrete
        progression choices, the concrete regression choices, and a rationale
        grounded in the history (cite completion status and actual performance).
         Mirror those choices in the weekly_schedule prescriptions (sets, reps, RPE,
         rest) and in the progression_plan.
         The output disclaimer must include this safety message or its equivalent:
         ${MEDICAL_DISCLAIMER}`,
          system: systemPrompt,
        });
        const result = await withTimeout(generation, AI_GENERATION_TIMEOUT_MS, {
          message: 'AI generation timeout',
          code: TIMEOUT_CODES.AI,
        });
        generatedOutput = result.object;
        generationSource = 'ai';
      } catch (error) {
        const category = classifyAiGenerationError(error);
        if (!fallbackEnabled || !category) throw error;
        fallbackReason = category;
        safeGenerationLog(category);
        generatedOutput = ProgramSchema.parse(buildRuleBasedProgram(parsedInput.data));
        generationSource = 'rules';
        generationProvider = provider.provider;
        generationModel = provider.modelName;
      }
    }
    // Enforce the rest-day invariant deterministically — regardless of model
    // behavior: any weekly_schedule entry placed on a user-selected rest day
    // is rewritten into an explicit rest entry (is_rest_day: true, NO
    // exercises/warmup/cooldown), and the canonical rest_days list is echoed
    // into the output. Weekday resolution covers English AND Persian
    // day_name values, plus the numeric `day` (ISO 1=Monday…7=Sunday)
    // fallback — see `weekdayOf` in src/lib/ai/restDays.ts. The same
    // enforcement result is what gets persisted and replayed on idempotent
    // retries, so every output path (fresh generation, retry/replay) is
    // covered.
    const enforced = enforceRestDays(generatedOutput, restDays);
    const generated = {
      ...enforced,
      disclaimer: enforced.disclaimer.trim() || MEDICAL_DISCLAIMER,
      metadata: {
        source: generationSource,
        provider: generationSource === 'ai' ? generationProvider : generationProvider,
        model: generationSource === 'ai' ? generationModel : generationModel,
        fallbackReason,
        engineVersion: AI_ENGINE_VERSION,
      },
    };

    // Persist the validated program into `Program` / `ProgramExercise`,
    // linked to the current authenticated user (transactional). With an
    // idempotency key, the record is finalized to SUCCEEDED in the same
    // transaction so retries replay the exact same program — a duplicate
    // program is never persisted.
    const program = idempotencyRecordId
      ? await persistProgramForUserWithIdempotency(user.id, {
          program: generated,
          level,
          goal: goals,
          exerciseStyles,
          restDays,
          idempotencyRecordId,
        })
      : await persistProgramForUser(user.id, {
          program: generated,
          level,
          goal: goals,
          exerciseStyles,
          restDays,
        });

    return NextResponse.json({
      program, // persisted DB record (Program + ProgramExercise links)
      generated, // full validated AI output (warmups, cooldowns, progression, adjustments…)
    });
  } catch (error) {
    // Any failure after the key was claimed must flip the record to FAILED so
    // a retry with the same key re-executes instead of hanging on 409.
    if (idempotencyRecordId) {
      try {
        await markIdempotentGenerationFailed(idempotencyRecordId);
      } catch {
        // Best-effort cleanup — never mask the original error.
      }
    }
    if (error instanceof UnauthenticatedError) {
      return NextResponse.json({error: 'Authentication required'}, {status: 401});
    }
    // Differentiated, safe timeout response: AI generation and persistence
    // (history query / program save) share the 504 status but carry distinct
    // stable `code`s so clients can tell them apart. No internal details leak.
    if (error instanceof TimeoutError) {
      return NextResponse.json(
        {error: timeoutErrorMessage(error.code), code: error.code},
        {status: 504},
      );
    }
    if (isAiQuotaError(error)) {
      return NextResponse.json(
        {
          error: 'Program generation is temporarily unavailable because the configured AI service has no remaining credit.',
          code: 'AI_CREDITS_UNAVAILABLE',
        },
        {status: 503},
      );
    }
    // Log only a stable error category; never include prompts, profiles, or API details.
    console.error('Program generation failed:', error instanceof Error ? error.name : 'unknown');
    return NextResponse.json({error: 'Failed to generate program'}, {status: 500});
  } finally {
    // Lock cleanup is preserved: the concurrency slot is always released, even
    // on timeout — the bounded DB operations above ensure it cannot be held
    // indefinitely by a stuck database.
    if (slotAcquired && generationUserId) await releaseGenerationSlot(generationUserId);
  }
}
