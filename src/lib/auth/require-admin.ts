import getSession from '@/lib/auth/session';
import { prisma } from '@/lib/db/prisma';

export async function requireAdmin() {
  const session = await getSession();
  if (!session.id) return { success: false as const, error: 'UNAUTHORIZED' };
  const user = await prisma.user.findUnique({
    where: { id: session.id },
    select: { role: true },
  });
  if (user?.role !== 'ADMIN') return { success: false as const, error: 'FORBIDDEN' };
  return { success: true as const, userId: session.id };
}
