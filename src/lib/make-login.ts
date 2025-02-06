import getSession from '@/lib/session';

export default async function makeLogin(userId: string) {
  const session = await getSession();
  session.id = userId;
  await session.save();
}
