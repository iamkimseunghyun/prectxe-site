// app/api/auth/session/route.ts
import { NextRequest, NextResponse } from 'next/server';
import getSession from '@/lib/auth/session';
import { prisma } from '@/lib/db/prisma';

export interface SessionUser {
  id: string;
  username: string;
  role: 'ADMIN' | 'USER';
}
export interface SessionData {
  isLoggedIn: boolean;
  user: SessionUser | null;
}

export async function GET(request: NextRequest) {
  console.time('Total /api/auth/session'); // 전체 시간 측정 시작
  try {
    console.time('getSession');
    const session = await getSession();
    console.timeEnd('getSession'); // getSession 소요 시간 출력

    if (!session.id) {
      console.timeEnd('Total /api/auth/session');
      return NextResponse.json<SessionData>({ isLoggedIn: false, user: null });
    }

    console.time('prismaFindUser');
    const user = await prisma.user.findUnique({
      where: { id: session.id },
      select: { id: true, username: true, role: true },
    });
    console.timeEnd('prismaFindUser'); // prisma.user.findUnique 소요 시간 출력

    if (!user) {
      console.time('sessionDestroy');
      session.destroy(); // destroy 시간도 측정 (save가 필요할 수도 있음)
      console.timeEnd('sessionDestroy');
      console.timeEnd('Total /api/auth/session');
      return NextResponse.json<SessionData>({ isLoggedIn: false, user: null });
    }

    const userRole = user.role ?? 'USER';
    const response = NextResponse.json<SessionData>({
      isLoggedIn: true,
      user: {
        id: user.id,
        username: user.username!,
        role: userRole as 'ADMIN' | 'USER', // 타입 단언 또는 검증 추가
      },
    });
    console.timeEnd('Total /api/auth/session'); // 전체 시간 측정 종료 및 출력
    return response;
  } catch (error) {
    console.error('Error fetching session:', error);
    console.timeEnd('Total /api/auth/session'); // 에러 시에도 시간 측정 종료
    return NextResponse.json<SessionData>(
      { isLoggedIn: false, user: null },
      { status: 500 }
    );
  }
}
