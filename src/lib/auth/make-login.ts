import { prisma } from '@/lib/db/prisma';

export default async function canManage(
  sessionId: string,
  authorId?: string
): Promise<boolean> {
  let user = null;
  if (sessionId) {
    user = await prisma.user.findUnique({
      where: { id: sessionId },
      select: { role: true },
    });
  }

  const canManage = user?.role === 'ADMIN' || sessionId === authorId;
  return canManage;
}
