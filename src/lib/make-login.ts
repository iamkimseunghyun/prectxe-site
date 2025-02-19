import getSession from '@/lib/session';

export async function makeLogin(userId: string) {
  const session = await getSession();
  session.id = userId;
  await session.save();
}

export async function makeLogout() {
  const session = await getSession();
  session.destroy();
}
