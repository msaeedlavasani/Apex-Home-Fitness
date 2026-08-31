/**
 * Admin Console V1 — read-only data service.
 *
 * Entirely server-side. Every query here is READ-ONLY against the current
 * Prisma schema and returns SAFE projections only. No mutation, no
 * impersonation, no broad registration.
 *
 * These are supporting queries for the protected `/admin/*` console surfaces.
 * Call them only from Server Components / Route Handlers behind
 * `requireAdmin()`; never import this module from client code.
 */
import type {DifficultyLevel, ExerciseCategory} from '@prisma/client';

import {prisma} from '@/lib/prisma';

// ---------------------------------------------------------------------------
// Safe projections only — never select credential or secret columns.
// ---------------------------------------------------------------------------

export interface AdminUserRow {
  id: string;
  email: string;
  phone: string | null;
  profileEmail: string | null;
  name: string;
  fitnessGoal: string | null;
  fitnessLevel: DifficultyLevel | null;
  xp: number;
  level: number;
  createdAt: Date;
  lastWorkoutAt: Date | null;
  weightEntries: number;
  programs: number;
  workoutSessions: number;
}

/** Paged, safely-projected user list. */
export async function listUsers(limit = 50, offset = 0): Promise<AdminUserRow[]> {
  const rows = await prisma.user.findMany({
    orderBy: {createdAt: 'desc'},
    take: Math.min(Math.max(limit, 1), 200),
    skip: Math.max(offset, 0),
    select: {
      id: true,
      email: true,
      phone: true,
      profileEmail: true,
      name: true,
      fitnessGoal: true,
      fitnessLevel: true,
      xp: true,
      level: true,
      createdAt: true,
      _count: {select: {weightEntries: true, programs: true, workoutSessions: true}},
    },
  });
  return rows.map((row) => ({
    id: row.id,
    email: row.email,
    phone: row.phone,
    profileEmail: row.profileEmail,
    name: row.name,
    fitnessGoal: row.fitnessGoal,
    fitnessLevel: row.fitnessLevel,
    xp: row.xp,
    level: row.level,
    createdAt: row.createdAt,
    lastWorkoutAt: null,
    weightEntries: row._count.weightEntries,
    programs: row._count.programs,
    workoutSessions: row._count.workoutSessions,
  }));
}

export interface AdminProgramRow {
  id: string;
  name: string;
  level: DifficultyLevel;
  durationWeeks: number;
  sessionsPerWeek: number | null;
  createdAt: Date;
  ownerEmail: string | null;
  exercises: number;
  workoutSessions: number;
}

/** Safely-projected program/workout-plan list (latest first). */
export async function listPrograms(limit = 50): Promise<AdminProgramRow[]> {
  const rows = await prisma.program.findMany({
    orderBy: {createdAt: 'desc'},
    take: Math.min(Math.max(limit, 1), 200),
    select: {
      id: true,
      name: true,
      level: true,
      durationWeeks: true,
      sessionsPerWeek: true,
      createdAt: true,
      owner: {select: {email: true}},
      _count: {select: {exercises: true, workoutSessions: true}},
    },
  });
  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    level: row.level,
    durationWeeks: row.durationWeeks,
    sessionsPerWeek: row.sessionsPerWeek,
    createdAt: row.createdAt,
    ownerEmail: row.owner?.email ?? null,
    exercises: row._count.exercises,
    workoutSessions: row._count.workoutSessions,
  }));
}

export interface AdminExerciseRow {
  id: string;
  name: string;
  slug: string | null;
  category: ExerciseCategory;
  difficulty: DifficultyLevel;
  createdAt: Date;
  programs: number;
  sessions: number;
}

/** Safely-projected exercise catalog rows. */
export async function listExercises(limit = 100): Promise<AdminExerciseRow[]> {
  const rows = await prisma.exercise.findMany({
    orderBy: {createdAt: 'asc'},
    take: Math.min(Math.max(limit, 1), 400),
    select: {
      id: true,
      name: true,
      slug: true,
      category: true,
      difficulty: true,
      createdAt: true,
      _count: {select: {programExercises: true, sessionExercises: true}},
    },
  });
  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    slug: row.slug,
    category: row.category,
    difficulty: row.difficulty,
    createdAt: row.createdAt,
    programs: row._count.programExercises,
    sessions: row._count.sessionExercises,
  }));
}

export interface AdminOperationRow {
  id: string;
  userId: string;
  userEmail: string | null;
  idempotencyKey: string;
  status: string;
  createdAt: Date;
  updatedAt: Date;
  hasProgram: boolean;
}

/** Safely-projected program-generation operation ledger (recent first). */
export async function listOperations(limit = 50): Promise<AdminOperationRow[]> {
  const rows = await prisma.programGenerationRequest.findMany({
    orderBy: {createdAt: 'desc'},
    take: Math.min(Math.max(limit, 1), 200),
    select: {
      id: true,
      userId: true,
      user: {select: {email: true}},
      idempotencyKey: true,
      status: true,
      createdAt: true,
      updatedAt: true,
      programId: true,
    },
  });
  return rows.map((row) => ({
    id: row.id,
    userId: row.userId,
    userEmail: row.user?.email ?? null,
    idempotencyKey: row.idempotencyKey,
    status: row.status,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    hasProgram: row.programId != null,
  }));
}

export interface AdminAccountRow {
  id: string;
  email: string;
  role: string;
  enabled: boolean;
  lastLoginAt: Date | null;
  createdAt: Date;
}

/** Safely-projected admin accounts (credential columns excluded). */
export async function listAdminAccounts(): Promise<AdminAccountRow[]> {
  const rows = await prisma.adminAccount.findMany({
    orderBy: {createdAt: 'asc'},
    select: {id: true, email: true, role: true, enabled: true, lastLoginAt: true, createdAt: true},
  });
  return rows.map((row) => ({
    id: row.id,
    email: row.email,
    role: row.role,
    enabled: row.enabled,
    lastLoginAt: row.lastLoginAt,
    createdAt: row.createdAt,
  }));
}

export interface AdminSessionRow {
  id: string;
  email: string;
  createdAt: Date;
  expiresAt: Date;
  revokedAt: Date | null;
  active: boolean;
  expired: boolean;
}

/** Safely-projected admin sessions (credential columns excluded). */
export async function listAdminSessions(limit = 50): Promise<AdminSessionRow[]> {
  const rows = await prisma.adminSession.findMany({
    orderBy: {createdAt: 'desc'},
    take: Math.min(Math.max(limit, 1), 200),
    select: {
      id: true,
      createdAt: true,
      expiresAt: true,
      revokedAt: true,
      admin: {select: {email: true}},
    },
  });
  const now = Date.now();
  return rows.map((row) => {
    const revoked = row.revokedAt != null;
    const expired = row.expiresAt.getTime() <= now;
    return {
      id: row.id,
      email: row.admin.email,
      createdAt: row.createdAt,
      expiresAt: row.expiresAt,
      revokedAt: row.revokedAt,
      active: !revoked && !expired,
      expired,
    };
  });
}

export interface AdminOverview {
  users: number;
  programs: number;
  exercises: number;
  workoutSessions: number;
  completedWorkouts: number;
  quizResponses: number;
  adminAccounts: number;
  activeAdminSessions: number;
  recentUsers: {id: string; email: string; name: string; createdAt: Date}[];
  recentPrograms: {id: string; name: string; level: DifficultyLevel; createdAt: Date}[];
}

/** Read-only aggregated overview for the Admin Console home surface. */
export async function getOverview(): Promise<AdminOverview> {
  const [
    users,
    programs,
    exercises,
    workoutSessions,
    completedWorkouts,
    quizResponses,
    adminAccounts,
    adminSessions,
    recentUsers,
    recentPrograms,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.program.count(),
    prisma.exercise.count(),
    prisma.workoutSession.count(),
    prisma.workoutSession.count({where: {completedAt: {not: null}}}),
    prisma.quizResponse.count(),
    prisma.adminAccount.count(),
    prisma.adminSession.count({where: {revokedAt: null}}),
    prisma.user.findMany({orderBy: {createdAt: 'desc'}, take: 5, select: {id: true, email: true, name: true, createdAt: true}}),
    prisma.program.findMany({
      orderBy: {createdAt: 'desc'},
      take: 5,
      select: {id: true, name: true, level: true, createdAt: true},
    }),
  ]);
  return {
    users,
    programs,
    exercises,
    workoutSessions,
    completedWorkouts,
    quizResponses,
    adminAccounts,
    activeAdminSessions: adminSessions,
    recentUsers,
    recentPrograms,
  };
}