import {NextResponse} from 'next/server';
import {EXERCISE_STYLE_IDS} from '@/lib/exerciseStyles';
import {buildGenerationInput, QUIZ_ANSWERS_SCHEMA} from '@/lib/quiz/quizFlow';
import {prisma} from '@/lib/prisma';
import {getCurrentUserProfile, getSupabaseAuthUser, syncUserWithSupabase} from '@/services/userService';

const EQUIPMENT_IDS = [
  'none',
  'pull_up_bar',
  'bands',
  'dumbbells',
  'barbell',
  'kettlebells',
  'bench',
  'cable_machine',
  'jump_rope',
] as const;

function cleanList(value: unknown, allowed?: readonly string[]): string[] {
  if (!Array.isArray(value)) return [];
  const values = value
    .filter((item): item is string => typeof item === 'string')
    .map((item) => item.trim())
    .filter(Boolean);
  return allowed ? [...new Set(values.filter((item) => allowed.includes(item)))] : [...new Set(values)];
}

function answerRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

function generationInputFromAnswers(answers: Record<string, unknown>) {
  const parsed = QUIZ_ANSWERS_SCHEMA.safeParse(answers);
  return parsed.success ? buildGenerationInput(parsed.data) : null;
}

export async function GET() {
  try {
    const user = await getCurrentUserProfile();
    const response = await prisma.quizResponse.findFirst({where: {userId: user.id}, orderBy: {createdAt: 'desc'}});
    const answers = answerRecord(response?.answers);
    const exerciseStyles = cleanList(answers.exerciseStyles, EXERCISE_STYLE_IDS);
    const equipment = cleanList(answers.equipment, EQUIPMENT_IDS);

    return NextResponse.json({
      profile: {email: user.email, name: user.name, fitnessGoal: user.fitnessGoal, fitnessLevel: user.fitnessLevel},
      quizCompleted: Boolean(response),
      preferences: {exerciseStyles, equipment},
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
    const body = await request.json().catch(() => null) as {exerciseStyles?: unknown; equipment?: unknown} | null;
    const exerciseStyles = cleanList(body?.exerciseStyles, EXERCISE_STYLE_IDS);
    const equipment = cleanList(body?.equipment, EQUIPMENT_IDS);

    if (exerciseStyles.length === 0) return NextResponse.json({error: 'STYLE_REQUIRED'}, {status: 422});
    if (equipment.length === 0) return NextResponse.json({error: 'EQUIPMENT_REQUIRED'}, {status: 422});
    if (equipment.includes('none') && equipment.length > 1) {
      return NextResponse.json({error: 'EQUIPMENT_NONE_EXCLUSIVE'}, {status: 422});
    }

    const latest = await prisma.quizResponse.findFirst({where: {userId: user.id}, orderBy: {createdAt: 'desc'}});
    if (!latest) return NextResponse.json({error: 'QUIZ_REQUIRED'}, {status: 422});

    const answers = {...answerRecord(latest.answers), exerciseStyles, equipment};
    await prisma.quizResponse.update({where: {id: latest.id}, data: {answers}});
    return NextResponse.json({
      ok: true,
      preferences: {exerciseStyles, equipment},
      generationInput: generationInputFromAnswers(answers),
    });
  } catch {
    return NextResponse.json({error: 'UNAUTHENTICATED'}, {status: 401});
  }
}
