import { openai } from '@ai-sdk/openai';
import { generateObject } from 'ai';
import { z } from 'zod';
import { loadSystemPrompt, PromptMode } from '@/lib/ai/prompts';
import { NextResponse } from 'next/server';

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
import { persistProgramForUser } from '@/services/programService';
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

export async function POST(req: Request) {
  let generationUserId: string | null = null;
  let slotAcquired = false;
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  try {
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
    const {level, goal, equipment, limitations, limitationsDetails} = parsedInput.data;

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

    const rejection = acquireGenerationSlot(user.id, getClientIp(req));
    if (rejection) {
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
    // progression/regression adjustments.
    const recentSessions = await prisma.workoutSession.findMany({
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

    const workoutHistory = formatWorkoutHistory(recentSessions);

    const systemPrompt = await loadSystemPrompt(mode);

    const generation = generateObject({
      model: openai('gpt-4o-mini'),
      schema: ProgramSchema,
      prompt: `Generate a workout program for a user with the following profile:
        - Level: ${level}
        - Goal: ${goal}
        - Available Equipment: ${equipment.join(', ')}
        - Injuries/Limitations: ${limitations.join(', ')}
        - Details: ${limitationsDetails || 'None'}

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

    const timeout = new Promise<never>((_, reject) => {
      timeoutId = setTimeout(() => reject(new Error('AI generation timeout')), AI_GENERATION_TIMEOUT_MS);
    });
    const result = await Promise.race([generation, timeout]);
    const generated = {
      ...result.object,
      disclaimer: result.object.disclaimer.trim() || MEDICAL_DISCLAIMER,
    };

    // Persist the validated program into `Program` / `ProgramExercise`,
    // linked to the current authenticated user (transactional).
    const program = await persistProgramForUser(user.id, {
      program: generated,
      level,
      goal,
    });

    return NextResponse.json({
      program, // persisted DB record (Program + ProgramExercise links)
      generated, // full validated AI output (warmups, cooldowns, progression, adjustments…)
    });
  } catch (error) {
    if (error instanceof UnauthenticatedError) {
      return NextResponse.json({error: 'Authentication required'}, {status: 401});
    }
    if (error instanceof Error && error.message === 'AI generation timeout') {
      return NextResponse.json({error: 'Program generation timed out. Please try again.'}, {status: 504});
    }
    // Log only a stable error category; never include prompts, profiles, or API details.
    console.error('Program generation failed:', error instanceof Error ? error.name : 'unknown');
    return NextResponse.json({error: 'Failed to generate program'}, {status: 500});
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
    if (slotAcquired && generationUserId) releaseGenerationSlot(generationUserId);
  }
}
