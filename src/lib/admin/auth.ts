import {createHash, randomBytes} from 'node:crypto';
import {cookies} from 'next/headers';
import {redirect} from 'next/navigation';

import {prisma} from '@/lib/prisma';
import {verifyAdminPassword} from './password';
import {normalizeAdminEmail} from './identity';
export {normalizeAdminEmail} from './identity';

export const ADMIN_SESSION_COOKIE = 'ahf.admin.session';
const DEFAULT_SESSION_TTL_MS = 12 * 60 * 60 * 1000;

export type AdminRole = 'ADMIN';

export interface AdminPrincipal {
  id: string;
  email: string;
  role: AdminRole;
}

function boundedIntEnv(name: string, fallback: number, min: number, max: number): number {
  const parsed = Number.parseInt(process.env[name] ?? '', 10);
  return Number.isSafeInteger(parsed) && parsed >= min && parsed <= max ? parsed : fallback;
}

export function adminSessionTtlMs(): number {
  return boundedIntEnv('ADMIN_SESSION_TTL_MS', DEFAULT_SESSION_TTL_MS, 5 * 60 * 1000, 7 * 24 * 60 * 60 * 1000);
}

export function hashAdminSessionToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export function isSameOriginRequest(request: Request): boolean {
  const origin = request.headers.get('origin');
  const referer = request.headers.get('referer');
  if (!origin && !referer) return true;
  const expected = new URL(request.url).origin;
  try {
    if (origin) return new URL(origin).origin === expected;
    return new URL(referer as string).origin === expected;
  } catch {
    return false;
  }
}

function cookieOptions(expiresAt: Date) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    // The API route and protected page both need the cookie; keep it host-only
    // and use a dedicated name rather than weakening the public session boundary.
    path: '/',
    expires: expiresAt,
  };
}

function principalFromAccount(account: {id: string; email: string; role: string; enabled: boolean}): AdminPrincipal | null {
  if (!account.enabled || account.role !== 'ADMIN') return null;
  return {id: account.id, email: account.email, role: 'ADMIN'};
}

export async function authenticateAdmin(email: string, password: string): Promise<AdminPrincipal | null> {
  const account = await prisma.adminAccount.findUnique({where: {email}});
  // Invalid credentials intentionally use the same generic result as an
  // unknown/disabled account to prevent account enumeration.
  if (!account || !account.enabled || account.role !== 'ADMIN') return null;
  return (await verifyAdminPassword(password, account.passwordHash))
    ? principalFromAccount(account)
    : null;
}

export async function createAdminSession(adminId: string): Promise<{token: string; expiresAt: Date}> {
  const token = randomBytes(32).toString('base64url');
  const expiresAt = new Date(Date.now() + adminSessionTtlMs());
  await prisma.adminSession.create({
    data: {adminId, tokenHash: hashAdminSessionToken(token), expiresAt},
  });
  await prisma.adminAccount.update({where: {id: adminId}, data: {lastLoginAt: new Date()}});
  return {token, expiresAt};
}

export async function getCurrentAdmin(): Promise<AdminPrincipal | null> {
  const token = (await cookies()).get(ADMIN_SESSION_COOKIE)?.value;
  if (!token) return null;
  const session = await prisma.adminSession.findUnique({
    where: {tokenHash: hashAdminSessionToken(token)},
    include: {admin: true},
  });
  if (!session || session.revokedAt || session.expiresAt <= new Date()) return null;
  return principalFromAccount(session.admin);
}

export async function requireAdmin(): Promise<AdminPrincipal> {
  const admin = await getCurrentAdmin();
  if (!admin) redirect('/admin/login');
  return admin;
}

export async function revokeCurrentAdminSession(): Promise<void> {
  const token = (await cookies()).get(ADMIN_SESSION_COOKIE)?.value;
  if (!token) return;
  await prisma.adminSession.updateMany({
    where: {tokenHash: hashAdminSessionToken(token), revokedAt: null},
    data: {revokedAt: new Date()},
  });
}

export function adminCookieOptions(expiresAt: Date) {
  return cookieOptions(expiresAt);
}
