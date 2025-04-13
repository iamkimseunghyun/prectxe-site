import { NextRequest, NextResponse } from 'next/server';
import getSession from '@/lib/session';

interface Urls {
  [key: string]: boolean;
}

// 로그인 전용 URL (로그인하지 않은 사용자만 접근 가능)
const publicOnlyUrls: Urls = {
  '/auth/signin': true,
  '/auth/signup': true,
};

// 정적 공개 URL (로그인 없이 접근 가능)
const staticPublicUrls: Urls = {
  '/': true,
  '/about': true,
  '/artists': true,
  '/artworks': true,
  '/events': true,
  '/projects': true,
  '/venues': true,
};

// 다이나믹 라우팅 패턴 (정규표현식 형태로 정의)
// 공개적으로 접근 가능한 다이나믹 경로 패턴
const publicDynamicPatterns = [
  /^\/artists\/[^/]+$/, // /artists/[id] 패턴 (상세 보기만 허용)
  /^\/events\/[^/]+$/, // /events/[id] 패턴 (상세 보기만 허용)
  /^\/projects\/[^/]+$/, // /projects/[id] 패턴 (상세 보기만 허용)
  /^\/venues\/[^/]+$/, // /venues/[id] 패턴 (상세 보기만 허용)
  /^\/artworks\/[^/]+$/, // /artworks/[id] 패턴 (상세 보기만 허용)
];

// 로그인이 필요한 특정 패턴 (더 구체적인 패턴이 우선 적용됨)
const privatePathPatterns = [
  /^\/artists\/[^/]+\/edit$/, // /artists/[id]/edit 패턴
  /^\/artists\/new$/, // /artists/new 패턴
  /^\/events\/[^/]+\/edit$/, // /events/[id]/edit 패턴
  /^\/events\/new$/, // /events/new 패턴
  /^\/projects\/[^/]+\/edit$/, // /projects/[id]/edit 패턴
  /^\/projects\/new$/, // /projects/new 패턴
  /^\/venues\/[^/]+\/edit$/, // /venues/[id]/edit 패턴
  /^\/venues\/new$/, // /venues/new 패턴
  /^\/admin\/?.*$/, // 모든 /admin 경로
  /^\/profile\/?.*$/, // 모든 /profile 경로
];

/**
 * 주어진 경로가 공개 접근 가능한지 확인하는 함수
 */
function isPublicPath(path: string): boolean {
  // 1. 로그인이 필요한 특정 패턴 먼저 체크 (이 패턴들은 무조건 비공개)
  if (privatePathPatterns.some((pattern) => pattern.test(path))) {
    return false;
  }

  // 2. 정적 공개 URL 체크
  if (staticPublicUrls[path]) {
    return true;
  }

  // 3. 다이나믹 라우팅 패턴 체크
  return publicDynamicPatterns.some((pattern) => pattern.test(path));
}

export async function middleware(req: NextRequest) {
  // 개발 환경에서만 로깅
  if (process.env.NODE_ENV === 'development') {
    console.log('middleware 콜 ->', req.nextUrl.pathname);
  }
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

    // 그 외의 URL은 로그인 페이지 or 메인 페이지로 리다이렉트
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

export const config = {
  matcher: [
    '/',
    '/about',
    '/artists/:path*',
    '/events/:path*',
    '/projects/:path*',
    '/venues/:path*',
    '/artworks/:path*',
    '/auth/:path*',
    '/profile/:path*',
    '/admin/:path*',
  ],
};
