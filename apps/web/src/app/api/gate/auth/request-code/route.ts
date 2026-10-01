import { randomUUID } from 'node:crypto';
import {
  type RequestCodeResponse,
  requestCodeBody,
} from '@prectxe/gate-contract';
import { after } from 'next/server';
import { sendEmail } from '@/lib/email/send';
import { getClientIp } from '@/lib/rate-limit/client-ip';
import { checkRateLimit } from '@/lib/rate-limit/memory';
import {
  issueLoginCode,
  LOGIN_CODE_TTL_MINUTES,
} from '@/modules/gate/server/auth';
import { apiError, json, parseBody } from '@/modules/gate/server/http';

const TEN_MINUTES = 10 * 60 * 1000;

/**
 * 로그인 코드 메일 요청. 등록된 스태프인지와 무관하게 항상 같은 응답을 같은
 * 시간에 준다 — 스태프 확인·코드 발급·메일 발송을 전부 응답 뒤(after)에 한다.
 * 그 앞에서 DB를 읽으면 스태프 주소일 때만 응답이 늦어져 주소가 드러난다.
 */
export async function POST(request: Request) {
  const ip = await getClientIp();
  if (!checkRateLimit(`gate:code:ip:${ip}`, 10, TEN_MINUTES))
    return apiError('요청이 너무 많습니다. 잠시 후 다시 시도해주세요.', 429);

  const body = await parseBody(request, requestCodeBody);
  if (!body.ok) return body.response;
  const { email } = body.data;

  // 같은 곳에서 한 주소로 메일을 쏟아붓지 못하게 막는다. 주소 단위로만 막으면
  // 남이 그 주소로 요청을 채워 스태프 본인의 요청까지 막을 수 있어 IP와 묶는다.
  if (!checkRateLimit(`gate:code:email:${email}:ip:${ip}`, 5, TEN_MINUTES))
    return apiError('요청이 너무 많습니다. 잠시 후 다시 시도해주세요.', 429);

  const challengeId = randomUUID();
  after(async () => {
    const issued = await issueLoginCode(email, challengeId);
    if (!issued) return;
    const sent = await sendEmail({
      to: issued.staff.email,
      subject: `[PRECTXE 게이트] 로그인 코드 ${issued.code}`,
      template: 'staff-login-code',
      data: {
        code: issued.code,
        expiresInMinutes: LOGIN_CODE_TTL_MINUTES,
        staffName: issued.staff.name,
      },
    });
    if (!sent.success)
      console.error('[gate] 로그인 코드 메일 발송 실패', {
        staffId: issued.staff.id,
        error: sent.results[0]?.error,
      });
  });

  return json<RequestCodeResponse>({ ok: true, challengeId });
}
