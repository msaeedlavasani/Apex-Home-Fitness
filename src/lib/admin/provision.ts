import {prisma} from '@/lib/prisma';
import {hashAdminPassword} from './password';

/** Manual operator provisioning only; there is intentionally no web signup path. */
export async function provisionAdmin(email: string, password: string): Promise<void> {
  const passwordHash = await hashAdminPassword(password);
  await prisma.adminAccount.upsert({
    where: {email},
    create: {email, passwordHash, role: 'ADMIN', enabled: true},
    update: {passwordHash, role: 'ADMIN', enabled: true},
  });
}
