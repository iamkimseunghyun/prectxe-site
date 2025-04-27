import getSession from '@/lib/auth/session';
import { prisma } from '@/lib/db/prisma';

export async function makeLogin(userId: string) {
  const session = await getSession();
  session.id = userId;
  await session.save();
}

export async function makeLogout() {
  const session = await getSession();
  session.destroy();
}

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
