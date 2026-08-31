import { type NextRequest, NextResponse } from 'next/server';
import getSession from '@/lib/auth/session';

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
  // '/discover': true,
  // '/archive': true,
  '/journal': true,
  '/artists': true,
  '/artworks': true,
  '/venues': true,
  '/programs': true,
};

// 다이나믹 라우팅 패턴 (정규표현식 형태로 정의)
// 공개적으로 접근 가능한 다이나믹 경로 패턴
const publicDynamicPatterns = [
  /^\/artists\/[^/]+$/, // /artists/[id] 패턴 (상세 보기만 허용)
  /^\/venues\/[^/]+$/, // /venues/[id] 패턴 (상세 보기만 허용)
  /^\/artworks\/[^/]+$/, // /artworks/[id] 패턴 (상세 보기만 허용)
  /^\/programs\/[^/]+$/, // /programs/[slug] 패턴 (상세 보기 허용)
  /^\/journal\/[^/]+$/, // /journal/[slug] 패턴 (상세 보기 허용)
  /^\/forms\/[^/]+$/, // /forms/[slug] 패턴 (공개 폼 제출)
];

// 로그인이 필요한 특정 패턴 (더 구체적인 패턴이 우선 적용됨)
const privatePathPatterns = [
  /^\/artists\/[^/]+\/edit$/, // /artists/[id]/edit 패턴
  /^\/artists\/new$/, // /artists/new 패턴
  /^\/artworks\/[^/]+\/edit$/, // /artists/[id]/edit 패턴
  /^\/artworks\/new$/, // /artists/new 패턴
  /^\/venues\/[^/]+\/edit$/, // /venues/[id]/edit 패턴
  /^\/venues\/new$/, // /venues/new 패턴
  /^\/admin\/?.*$/, // 모든 /admin 경로
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
  const path = req.nextUrl.pathname;

  // 개발 환경에서만 로깅
  if (process.env.NODE_ENV === 'development') {
    console.log('middleware 콜 ->', path);
  }

  // 정적 파일에 대한 추가 검사
  if (path.includes('.') && /\.(svg|png|jpg|jpeg|gif|webp)$/.test(path)) {
    return NextResponse.next();
  }

  // 공개 경로는 세션을 읽기 전에 통과시킨다.
  // getSession()은 iron-session 쿠키 복호화(AES)를 수반하므로, 공개
  // 상세 페이지(/artists/[id] 등)에서 매 요청 불필요한 비용이 들었다.
  if (isPublicPath(path)) {
    return NextResponse.next();
  }

  const session = await getSession();
  const isPublicOnlyUrl = publicOnlyUrls[path];

  // 로그인하지 않은 사용자
  if (!session.id) {
    // 로그인 전용 URL이면 통과 (로그인/가입 페이지)
    if (isPublicOnlyUrl) {
      return NextResponse.next();
    }

    // 그 외의 URL은 메인 페이지로 리다이렉트
    return NextResponse.redirect(new URL('/', req.nextUrl.toString()));
  }

  // 로그인 전용 URL(signin/signup)에 접근하면 관리자 페이지로 리다이렉트
  if (isPublicOnlyUrl) {
    return NextResponse.redirect(new URL('/admin', req.nextUrl.toString()));
  }

  // 비공개 경로(편집/등록/admin)는 ADMIN만 허용.
  // 이전에는 세션 존재 여부만 확인해서, 일반 회원이 생기는 순간
  // 로그인한 누구나 편집 폼(email 등 비공개 필드 포함)에 진입할 수 있었다.
  if (privatePathPatterns.some((pattern) => pattern.test(path))) {
    if (!session.isAdmin) {
      return NextResponse.redirect(new URL('/', req.nextUrl.toString()));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/',
    '/about',
    // '/discover',
    // '/archive',
    '/journal/:path*',
    '/artists/:path*',
    '/venues/:path*',
    '/artworks/:path*',
    '/programs/:path*',
    '/forms/:path*',
    '/auth/:path*',
    '/admin/:path*',
  ],
};
