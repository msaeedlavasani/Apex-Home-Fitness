import {NextResponse} from 'next/server';
import {prisma} from '@/lib/prisma';
import {isWorkoutCompletionKind, type WorkoutCompletionKind} from '@/lib/outcomes';
import {resolveWorkoutExercises} from '@/services/movementGraphStore';
import {getSupabaseAuthUser, syncUserWithSupabase, UnauthenticatedError} from '@/services/userService';

function strings(value: unknown): string[] {
  return Array.isArray(value)
    ? [...new Set(value.filter((item): item is string => typeof item === 'string' && item.trim().length > 0).map((item) => item.trim()))]
    : [];
}

export async function POST(request: Request) {
  try {
    const authUser = await getSupabaseAuthUser();
    const user = await syncUserWithSupabase(authUser);
    const body = await request.json().catch(() => null) as Record<string, unknown> | null;
    const action = body?.action;
    const exerciseNames = strings(body?.exerciseNames);

    if (action === 'start') {
      if (exerciseNames.length === 0) return NextResponse.json({error: 'WORKOUT_EXERCISES_REQUIRED'}, {status: 400});
      const requestedProgramId = typeof body?.programId === 'string' ? body.programId : undefined;
      const program = requestedProgramId
        ? await prisma.program.findFirst({where: {id: requestedProgramId, ownerId: user.id}, select: {id: true}})
        : await prisma.program.findFirst({where: {ownerId: user.id}, orderBy: {createdAt: 'desc'}, select: {id: true}});
      // MG-09 runtime switchover: resolves through the Movement Graph when
      // adopted, otherwise the exact legacy Exercise lookup (fail-safe gate).
      const exercises = await resolveWorkoutExercises(exerciseNames, program?.id ?? null);
      if (exercises.length === 0) return NextResponse.json({error: 'WORKOUT_EXERCISES_NOT_FOUND'}, {status: 422});
      const session = await prisma.workoutSession.create({
        data: {userId: user.id, programId: program?.id ?? null, exercises: {create: exercises.map((exercise, order) => ({exerciseId: exercise.id, order}))}},
        select: {id: true, startedAt: true},
      });
      return NextResponse.json({session});
    }

    if (action === 'complete') {
      const sessionId = typeof body?.sessionId === 'string' ? body.sessionId : '';
      if (!sessionId) return NextResponse.json({error: 'WORKOUT_SESSION_REQUIRED'}, {status: 400});
      const session = await prisma.workoutSession.findFirst({where: {id: sessionId, userId: user.id}, select: {id: true, startedAt: true, endedAt: true, completedAt: true, exercises: {select: {sessionId: true}}}});
      if (!session) return NextResponse.json({error: 'WORKOUT_SESSION_NOT_FOUND'}, {status: 404});
      if (session.endedAt || session.completedAt) return NextResponse.json({ok: true, sessionId: session.id, replay: true});
      const durationSeconds = typeof body?.durationSeconds === 'number' && Number.isFinite(body.durationSeconds) ? Math.max(0, Math.floor(body.durationSeconds)) : Math.max(0, Math.floor((Date.now() - session.startedAt.getTime()) / 1000));
      const completedSets = typeof body?.completedSets === 'number' && Number.isFinite(body.completedSets) ? Math.max(0, Math.floor(body.completedSets)) : null;
      const requestedCompletionKind = body?.completionKind;
      const completionKind: WorkoutCompletionKind = isWorkoutCompletionKind(requestedCompletionKind)
        ? requestedCompletionKind
        : completedSets === 0
          ? 'ENDED_WITHOUT_COMPLETION'
          : 'COMPLETED_PARTIALLY';
      const endedWithoutCompletion = completionKind === 'ENDED_WITHOUT_COMPLETION';
      if (endedWithoutCompletion && completedSets !== 0) {
        return NextResponse.json({error: 'ENDED_WITHOUT_COMPLETION_REQUIRES_ZERO_SETS'}, {status: 422});
      }
      const actualSets = completedSets === null || session.exercises.length === 0 ? null : Math.max(1, Math.round(completedSets / session.exercises.length));
      await prisma.$transaction([
        prisma.workoutSession.update({where: {id: session.id}, data: {endedAt: new Date(), completedAt: endedWithoutCompletion ? null : new Date(), completionKind, durationSeconds}}),
        ...(endedWithoutCompletion ? [] : [prisma.workoutSessionExercise.updateMany({where: {sessionId: session.id}, data: {completed: true, actualSets}})]),
      ]);
      return NextResponse.json({ok: true, sessionId: session.id, completionKind});
    }
    return NextResponse.json({error: 'WORKOUT_ACTION_INVALID'}, {status: 400});
  } catch (error) {
    if (error instanceof UnauthenticatedError) return NextResponse.json({error: 'Authentication required'}, {status: 401});
    console.error('Workout session failed:', error instanceof Error ? error.name : 'unknown');
    return NextResponse.json({error: 'Workout session failed'}, {status: 500});
  }
}
