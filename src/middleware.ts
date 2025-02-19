import { NextRequest, NextResponse } from 'next/server';
import getSession from '@/lib/session';

interface Urls {
  [key: string]: boolean;
}

const publicOnlyUrls: Urls = {
  '/auth/signin': true,
  '/auth/signup': true,
};

export async function middleware(req: NextRequest) {
  console.log('middleware 콜 ->', req.nextUrl.pathname);
  const session = await getSession();
  const loggedIn = publicOnlyUrls[req.nextUrl.pathname];

  if (!session.id) {
    if (!loggedIn) {
      return NextResponse.redirect(new URL('/signin', req.nextUrl.toString()));
    }
  } else {
    if (loggedIn) {
      return NextResponse.redirect(new URL('/', req.nextUrl.toString()));
    }
  }
  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|_next/public|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
