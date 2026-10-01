import { type NextRequest, NextResponse } from 'next/server';
import {
  unsubscribeContact,
  verifyUnsubscribeToken,
} from '@/lib/email/unsubscribe';

/**
 * RFC 8058 원클릭 수신 거부 엔드포인트.
 *
 * `List-Unsubscribe` 헤더가 이 URL을 가리킨다. Gmail·Yahoo 등 메일 클라이언트가
 * 사용자의 "수신 거부" 버튼 클릭 시 **본문 없이 POST**를 보내고, 우리는 즉시
 * 처리한 뒤 200을 돌려줘야 한다(사용자 확인 화면을 띄우면 안 된다).
 *
 * page.tsx는 POST를 처리할 수 없어 라우트 핸들러로 분리했다.
 */
export async function POST(req: NextRequest) {
  const token = req.nextUrl.searchParams.get('t');
  if (!token) {
    return new NextResponse('Missing token', { status: 400 });
  }

  const email = verifyUnsubscribeToken(token);
  if (!email) {
    return new NextResponse('Invalid token', { status: 400 });
  }

  const result = await unsubscribeContact(email);
  if (!result.success) {
    // 메일 클라이언트가 재시도할 수 있도록 5xx로 알린다.
    return new NextResponse('Unsubscribe failed', { status: 502 });
  }

  // RFC 8058: 빈 본문 + 200/202
  return new NextResponse(null, { status: 200 });
}

/**
 * 헤더 URL을 사람이 직접 열었을 때(일부 클라이언트는 GET으로 연다)
 * 확인 화면이 있는 페이지로 넘긴다. 여기서 바로 해지하지 않는 이유는
 * 링크 프리페치·스캐너의 GET으로 의도치 않은 해지가 일어날 수 있어서다.
 */
export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get('t');
  const url = new URL('/unsubscribe', req.nextUrl.origin);
  if (token) url.searchParams.set('t', token);
  return NextResponse.redirect(url);
}
