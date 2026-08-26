import {DifficultyLevel} from '@prisma/client';
import {NextResponse} from 'next/server';
import {EXERCISE_STYLE_IDS} from '@/lib/exerciseStyles';
import {buildGenerationInput, QUIZ_ANSWERS_SCHEMA} from '@/lib/quiz/quizFlow';
import {prisma} from '@/lib/prisma';
import {getCurrentUserProfile, getSupabaseAuthUser, syncUserWithSupabase} from '@/services/userService';

const EQUIPMENT_IDS = ['none', 'pull_up_bar', 'bands', 'dumbbells', 'barbell', 'kettlebells', 'bench', 'cable_machine', 'jump_rope'] as const;
const PROFILE_GOALS = ['strength', 'fat_loss', 'flexibility', 'functional_fitness'] as const;
const PROFILE_LEVELS: Record<string, DifficultyLevel> = {
  beginner: DifficultyLevel.BEGINNER,
  intermediate: DifficultyLevel.INTERMEDIATE,
  advanced: DifficultyLevel.ADVANCED,
};
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type ProfilePatch = {
  email?: unknown;
  name?: unknown;
  heightCm?: unknown;
  weightKg?: unknown;
  fitnessGoal?: unknown;
  fitnessLevel?: unknown;
  exerciseStyles?: unknown;
  equipment?: unknown;
};

function cleanName(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const name = value.trim().replace(/\s+/g, ' ');
  return name.length >= 2 && name.length <= 80 ? name : null;
}
function cleanEmail(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const email = value.trim().toLowerCase();
  return email.length <= 254 && EMAIL_PATTERN.test(email) ? email : null;
}
function cleanNumber(value: unknown, min: number, max: number): number | null {
  return typeof value === 'number' && Number.isFinite(value) && value >= min && value <= max ? value : null;
}
function cleanGoals(value: unknown): string[] {
  const values = typeof value === 'string' ? [value] : Array.isArray(value) ? value : [];
  return [...new Set(values.filter((item): item is string => PROFILE_GOALS.includes(item as typeof PROFILE_GOALS[number])))];
}
function cleanLevel(value: unknown): DifficultyLevel | null {
  return typeof value === 'string' ? PROFILE_LEVELS[value] ?? null : null;
}
function cleanList(value: unknown, allowed?: readonly string[]): string[] {
  if (!Array.isArray(value)) return [];
  const values = value.filter((item): item is string => typeof item === 'string').map((item) => item.trim()).filter(Boolean);
  return allowed ? [...new Set(values.filter((item) => allowed.includes(item)))] : [...new Set(values)];
}
function answerRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
}
function generationInputFromAnswers(answers: Record<string, unknown>) {
  const parsed = QUIZ_ANSWERS_SCHEMA.safeParse(answers);
  return parsed.success ? buildGenerationInput(parsed.data) : null;
}

export async function GET() {
  try {
    const user = await getCurrentUserProfile();
    const [response, weightHistory] = await Promise.all([
      prisma.quizResponse.findFirst({where: {userId: user.id}, orderBy: {createdAt: 'desc'}}),
      prisma.weightEntry.findMany({where: {userId: user.id}, orderBy: {recordedAt: 'desc'}, take: 52}),
    ]);
    const answers = answerRecord(response?.answers);
    return NextResponse.json({
      profile: {email: user.profileEmail ?? '', name: user.name, heightCm: user.heightCm, weightKg: user.weightKg, fitnessGoal: user.fitnessGoal, fitnessLevel: user.fitnessLevel},
      weightHistory,
      quizCompleted: Boolean(response),
      preferences: {exerciseStyles: cleanList(answers.exerciseStyles, EXERCISE_STYLE_IDS), equipment: cleanList(answers.equipment, EQUIPMENT_IDS)},
      generationInput: response ? generationInputFromAnswers(answers) : null,
    });
  } catch {
    return NextResponse.json({error: 'UNAUTHENTICATED'}, {status: 401});
  }
}

export async function PATCH(request: Request) {
  try {
    const authUser = await getSupabaseAuthUser();
    const user = await syncUserWithSupabase(authUser);
    const body = await request.json().catch(() => null) as ProfilePatch | null;
    if (!body) return NextResponse.json({error: 'PROFILE_UPDATE_REQUIRED'}, {status: 400});

    const hasPreferences = body.exerciseStyles !== undefined || body.equipment !== undefined;
    const hasProfileDetails = body.name !== undefined || body.heightCm !== undefined || body.weightKg !== undefined || body.email !== undefined || body.fitnessGoal !== undefined || body.fitnessLevel !== undefined;
    if (!hasPreferences && !hasProfileDetails) return NextResponse.json({error: 'PROFILE_UPDATE_REQUIRED'}, {status: 400});

    const data: {profileEmail?: string; name?: string; heightCm?: number | null; weightKg?: number | null; fitnessGoal?: string; fitnessLevel?: DifficultyLevel | null} = {};
    if (body.email !== undefined) {
      const email = cleanEmail(body.email);
      if (!email) return NextResponse.json({error: 'INVALID_EMAIL'}, {status: 422});
      data.profileEmail = email;
    }
    if (body.name !== undefined) {
      const name = cleanName(body.name);
      if (!name) return NextResponse.json({error: 'INVALID_NAME'}, {status: 422});
      data.name = name;
    }
    if (body.heightCm !== undefined) {
      const height = body.heightCm === null ? null : cleanNumber(body.heightCm, 80, 260);
      if (height === null && body.heightCm !== null) return NextResponse.json({error: 'INVALID_HEIGHT'}, {status: 422});
      data.heightCm = height;
    }
    if (body.weightKg !== undefined) {
      const weight = body.weightKg === null ? null : cleanNumber(body.weightKg, 25, 400);
      if (weight === null && body.weightKg !== null) return NextResponse.json({error: 'INVALID_WEIGHT'}, {status: 422});
      data.weightKg = weight;
    }
    if (body.fitnessGoal !== undefined) {
      const goals = cleanGoals(body.fitnessGoal);
      if (goals.length === 0 || goals.length > 4) return NextResponse.json({error: 'INVALID_GOAL'}, {status: 422});
      data.fitnessGoal = goals.join(',');
    }
    if (body.fitnessLevel !== undefined) {
      const level = body.fitnessLevel === null ? null : cleanLevel(body.fitnessLevel);
      if (level === null && body.fitnessLevel !== null) return NextResponse.json({error: 'INVALID_LEVEL'}, {status: 422});
      data.fitnessLevel = level;
    }

    const exerciseStyles = cleanList(body.exerciseStyles, EXERCISE_STYLE_IDS);
    const equipment = cleanList(body.equipment, EQUIPMENT_IDS);
    if (hasPreferences && (exerciseStyles.length === 0 || equipment.length === 0)) return NextResponse.json({error: 'PREFERENCES_REQUIRED'}, {status: 422});
    if (equipment.includes('none') && equipment.length > 1) return NextResponse.json({error: 'EQUIPMENT_NONE_EXCLUSIVE'}, {status: 422});

    const latest = await prisma.quizResponse.findFirst({where: {userId: user.id}, orderBy: {createdAt: 'desc'}});
    if ((hasPreferences || body.fitnessGoal !== undefined) && !latest) return NextResponse.json({error: 'QUIZ_REQUIRED'}, {status: 422});

    const weightChanged = typeof data.weightKg === 'number' && data.weightKg !== user.weightKg;
    const weightToRecord: number | null = weightChanged ? data.weightKg! : null;

    let generationInput = null;
    await prisma.$transaction(async (tx) => {
      if (Object.keys(data).length > 0) await tx.user.update({where: {id: user.id}, data});
      if (weightToRecord !== null) await tx.weightEntry.create({data: {userId: user.id, weightKg: weightToRecord}});
      if (latest && (hasPreferences || body.fitnessGoal !== undefined)) {
        const answers = {
          ...answerRecord(latest.answers),
          ...(hasPreferences ? {exerciseStyles, equipment} : {}),
          ...(body.fitnessGoal !== undefined ? {goal: cleanGoals(body.fitnessGoal)} : {}),
        };
        await tx.quizResponse.update({where: {id: latest.id}, data: {answers}});
        generationInput = generationInputFromAnswers(answers);
      }
    });

    const [updated, weightHistory] = await Promise.all([
      prisma.user.findUniqueOrThrow({where: {id: user.id}}),
      prisma.weightEntry.findMany({where: {userId: user.id}, orderBy: {recordedAt: 'desc'}, take: 52}),
    ]);
    return NextResponse.json({
      ok: true,
      profile: {email: updated.profileEmail ?? '', name: updated.name, heightCm: updated.heightCm, weightKg: updated.weightKg, fitnessGoal: updated.fitnessGoal, fitnessLevel: updated.fitnessLevel},
      weightHistory,
      preferences: hasPreferences ? {exerciseStyles, equipment} : undefined,
      generationInput,
    });
  } catch (error) {
    if (error instanceof Error && error.name === 'UnauthenticatedError') {
      return NextResponse.json({error: 'UNAUTHENTICATED'}, {status: 401});
    }
    console.error('Profile update failed:', error instanceof Error ? error.name : 'unknown');
    return NextResponse.json({error: 'PROFILE_UPDATE_FAILED'}, {status: 500});
  }
}
