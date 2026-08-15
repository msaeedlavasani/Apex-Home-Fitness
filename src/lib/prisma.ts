/**
 * Shared Prisma client singleton.
 *
 * Reuses a single PrismaClient across hot reloads in development to avoid
 * exhausting the SQLite connection pool / file locks.
 *
 * Requires `npx prisma generate` to have been run (generates the client from
 * `prisma/schema.prisma`).
 */
import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}
