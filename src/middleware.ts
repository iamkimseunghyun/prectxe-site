import { NextRequest, NextResponse } from 'next/server';
import getSession from '@/lib/session';

interface Urls {
  [key: string]: boolean;
}

const publicOnlyUrls: Urls = {
  '/auth/signin': true,
  '/auth/signup': true,
};

// 공개적으로 접근 가능한 경로들 (로그인 없이 접근 가능)
const publicUrls: Urls = {
  '/': true,
  '/about': true,
  // 필요한 다른 공개 URL들을 여기에 추가
};

export async function middleware(req: NextRequest) {
  console.log('middleware 콜 ->', req.nextUrl.pathname);
  const session = await getSession();
  const isPublicOnlyUrl = publicOnlyUrls[req.nextUrl.pathname];
  const isPublicUrl = publicUrls[req.nextUrl.pathname];

  // 로그인하지 않은 사용자
  if (!session.id) {
    // 공개 URL이면 통과
    if (isPublicUrl) {
      return NextResponse.next();
    }
    // 로그인 전용 URL이면 통과 (로그인/가입 페이지)
    if (isPublicOnlyUrl) {
      return NextResponse.next();
    }
    // 그 외의 URL은 홈으로 리다이렉트
    return NextResponse.redirect(new URL('/', req.nextUrl.toString()));
  } else {
    // 로그인 전용 URL(signin/signup)에 접근하면 프로필로 리다이렉트
    if (isPublicOnlyUrl) {
      return NextResponse.redirect(new URL('/profile', req.nextUrl.toString()));
    }
    // 그 외에는 정상 진행
    return NextResponse.next();
  }
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|_next/public|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
