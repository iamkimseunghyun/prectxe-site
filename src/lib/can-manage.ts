import { prisma } from '@/lib/db/prisma';

export default async function canManage(
  sessionId: string,
  artistId: string
): Promise<boolean> {
  let user = null;
  if (sessionId) {
    user = await prisma.user.findUnique({
      where: { id: sessionId },
      select: { role: true },
    });
  }

  const canManage = user?.role === 'ADMIN' || sessionId === artistId;
  return canManage;
}
