import { NextRequest, NextResponse } from 'next/server';
import getSession from '@/lib/session';

interface Urls {
  [key: string]: boolean;
}

const publicOnlyUrls: Urls = {
  '/auth/signin': true,
  '/auth/signup': true,
};

// 정적 공개 URL (로그인 없이 접근 가능)
const staticPublicUrls: Urls = {
  '/': true,
  '/about': true,
  '/artists': true,
  '/events': true,
  '/projects': true,
  '/venues': true,
};

// 다이나믹 라우팅 패턴 (정규표현식 형태로 정의)
const dynamicPublicPatterns = [
  /^\/artists\/[^/]+$/, // /artists/[id] 패턴
  /^\/events\/[^/]+$/, // /events/[id] 패턴
  /^\/artworks\/[^/]+$/, // /artworks/[id] 패턴
  /^\/projects\/[^/]+$/, // /projects/[id] 패턴 (주석 수정됨)
  /^\/venues\/[^/]+$/, // /venues/[id] 패턴 (주석 수정됨)
];

/**
 * 주어진 경로가 공개 접근 가능한지 확인하는 함수
 */
function isPublicPath(path: string): boolean {
  // 1. 정적 공개 URL 체크
  if (staticPublicUrls[path]) {
    return true;
  }
  // 2. 다이나믹 라우팅 패턴 체크
  return dynamicPublicPatterns.some((pattern) => pattern.test(path));
}

export async function middleware(req: NextRequest) {
  console.log('middleware 콜 ->', req.nextUrl.pathname);
  const session = await getSession();
  const path = req.nextUrl.pathname;
  const isPublicOnlyUrl = publicOnlyUrls[path];
  const isPublicAccessible = isPublicPath(path);

  // 정적 파일에 대한 추가 검사
  if (path.includes('.') && /\.(svg|png|jpg|jpeg|gif|webp)$/.test(path)) {
    return NextResponse.next();
  }

  // 로그인하지 않은 사용자
  if (!session.id) {
    // 공개 URL이면 통과
    if (isPublicAccessible) {
      return NextResponse.next();
    }

    // 로그인 전용 URL이면 통과 (로그인/가입 페이지)
    if (isPublicOnlyUrl) {
      return NextResponse.next();
    }

    // 그 외의 URL은 홈으로 리다이렉트
    return NextResponse.redirect(new URL('/', req.nextUrl.toString()));
  }
  // 로그인한 사용자
  else {
    // 로그인 전용 URL(signin/signup)에 접근하면 프로필로 리다이렉트
    if (isPublicOnlyUrl) {
      return NextResponse.redirect(new URL('/profile', req.nextUrl.toString()));
    }

    // 그 외에는 정상 진행
    return NextResponse.next();
  }
}

// export const config = {
//   matcher: [
//     '/((?!api|_next/static|_next/image|_next/public|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
//   ],
// };

export const config = {
  matcher: [
    // 명시적으로 처리할 경로만 포함
    '/',
    '/about',
    '/artists/:path*',
    '/events/:path*',
    '/auth/:path*',
    '/profile/:path*',
  ],
};
