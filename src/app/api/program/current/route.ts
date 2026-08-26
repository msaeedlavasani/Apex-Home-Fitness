import {NextResponse} from 'next/server';

import {prisma} from '@/lib/prisma';
import {getSupabaseAuthUser, syncUserWithSupabase, UnauthenticatedError} from '@/services/userService';

export async function GET() {
  try {
    const supabaseUser = await getSupabaseAuthUser();
    const user = await syncUserWithSupabase(supabaseUser);
    const program = await prisma.program.findFirst({
      where: {ownerId: user.id},
      orderBy: {createdAt: 'desc'},
      include: {
        exercises: {
          orderBy: {order: 'asc'},
          include: {exercise: true},
        },
        workoutSessions: {
          where: {completedAt: {not: null}},
          orderBy: {startedAt: 'desc'},
          take: 100,
          select: {id: true, startedAt: true, completedAt: true},
        },
      },
    });

    return NextResponse.json({program});
  } catch (error) {
    if (error instanceof UnauthenticatedError) {
      return NextResponse.json({error: 'Authentication required'}, {status: 401});
    }
    console.error('Current program lookup failed:', error instanceof Error ? error.name : 'unknown');
    return NextResponse.json({error: 'Failed to load program'}, {status: 500});
  }
}
