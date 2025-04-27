import { getIronSession } from 'iron-session';
import { cookies } from 'next/headers';

interface SessionContent {
  id?: string;
  name?: string;
  isAdmin?: boolean;
}

export default async function getSession() {
  return getIronSession<SessionContent>(await cookies(), {
    cookieName: 'prectxe',
    password: process.env.COOKIE_PASSWORD!,
  });
}
