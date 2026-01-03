import { prisma } from '@/lib/db/prisma';
import getSession from '@/lib/auth/session';

export async function requireAdmin() {
  const session = await getSession();
  if (!session.id) return { ok: false as const, error: 'UNAUTHORIZED' };
  const user = await prisma.user.findUnique({
    where: { id: session.id },
    select: { role: true },
  });
  if (user?.role !== 'ADMIN') return { ok: false as const, error: 'FORBIDDEN' };
  return { ok: true as const, userId: session.id };
}
