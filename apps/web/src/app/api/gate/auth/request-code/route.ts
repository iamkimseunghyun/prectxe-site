import {
  type RequestCodeResponse,
  requestCodeBody,
} from '@prectxe/gate-contract';
import { sendEmail } from '@/lib/email/send';
import { getClientIp } from '@/lib/rate-limit/client-ip';
import { checkRateLimit } from '@/lib/rate-limit/memory';
import {
  issueLoginCode,
  LOGIN_CODE_TTL_MINUTES,
} from '@/modules/gate/server/auth';
import { apiError, json, parseBody } from '@/modules/gate/server/http';

const TEN_MINUTES = 10 * 60 * 1000;
const ONE_HOUR = 60 * 60 * 1000;

/**
 * 로그인 코드 메일 요청. 등록된 스태프인지와 무관하게 항상 같은 응답을 준다 —
 * 응답 차이로 어떤 이메일이 스태프인지 알아낼 수 없게.
 */
export async function POST(request: Request) {
  const ip = await getClientIp();
  if (!checkRateLimit(`gate:code:ip:${ip}`, 10, TEN_MINUTES))
    return apiError('요청이 너무 많습니다. 잠시 후 다시 시도해주세요.', 429);

  const body = await parseBody(request, requestCodeBody);
  if (!body.ok) return body.response;
  const { email } = body.data;

  // 한 주소로 메일 폭탄을 보내는 데 쓰이지 않게 주소별로도 제한한다
  if (!checkRateLimit(`gate:code:email:${email}`, 5, ONE_HOUR))
    return apiError('요청이 너무 많습니다. 잠시 후 다시 시도해주세요.', 429);

  const issued = await issueLoginCode(email);
  if (issued) {
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
  }

  return json<RequestCodeResponse>({ ok: true });
}
