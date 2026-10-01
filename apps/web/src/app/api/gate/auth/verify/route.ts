import {
  type VerifyCodeResponse,
  verifyCodeBody,
} from '@prectxe/gate-contract';
import { getClientIp } from '@/lib/rate-limit/client-ip';
import { checkRateLimit } from '@/lib/rate-limit/memory';
import { verifyLoginCode } from '@/modules/gate/server/auth';
import { apiError, json, parseBody } from '@/modules/gate/server/http';

const TEN_MINUTES = 10 * 60 * 1000;

export async function POST(request: Request) {
  // 코드당 시도 횟수 제한과 별개로, 여러 주소를 번갈아 찍어보는 시도를 막는다
  const ip = await getClientIp();
  if (!checkRateLimit(`gate:verify:ip:${ip}`, 20, TEN_MINUTES))
    return apiError('요청이 너무 많습니다. 잠시 후 다시 시도해주세요.', 429);

  const body = await parseBody(request, verifyCodeBody);
  if (!body.ok) return body.response;

  const session = await verifyLoginCode(
    body.data.email,
    body.data.challengeId,
    body.data.code
  );
  if (!session)
    return apiError(
      '코드가 맞지 않거나 만료됐습니다. 새 코드를 요청해주세요.',
      401
    );

  return json<VerifyCodeResponse>({
    token: session.token,
    expiresAt: session.expiresAt.toISOString(),
    staff: session.staff,
  });
}
