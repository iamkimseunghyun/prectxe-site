import { type CheckInResponse, checkInBody } from '@prectxe/gate-contract';
import { bearerToken } from '@/modules/gate/server/auth';
import {
  apiError,
  json,
  parseBody,
  requireStaffForDrop,
} from '@/modules/gate/server/http';
import {
  checkInByToken,
  loadCheckInTicket,
} from '@/modules/tickets/server/check-in';

/**
 * 온라인 입장 판정. 서버가 최종 판정한다 — 여러 입구에서 같은 QR을 동시에
 * 찍어도 한 곳만 `entered`를 받는다. 거절 사유는 422 + `error`로 내려간다.
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await parseBody(request, checkInBody);
  // 로그인 확인과 티켓 조회를 동시에 — 서로 기다릴 이유가 없다(DB가 싱가포르라
  // 왕복 하나가 ~75ms). 조회는 읽기만 하고, 인증에 실패하면 결과를 버린다.
  // 로그인 헤더조차 없는 요청은 조회하지 않는다(어차피 401)
  const [auth, preloaded] = await Promise.all([
    requireStaffForDrop(request, id),
    body.ok && bearerToken(request)
      ? loadCheckInTicket(body.data.token, body.data.clientId)
      : Promise.resolve(null),
  ]);
  if (!auth.ok) return auth.response;
  if (!body.ok) return body.response;

  const outcome = await checkInByToken({
    token: body.data.token,
    dropId: id,
    actor: { staffId: auth.staff.id },
    gate: body.data.gate,
    clientId: body.data.clientId,
    preloaded,
  });
  if (!outcome.success) return apiError(outcome.error, 422);

  return json<CheckInResponse>({
    result: outcome.result,
    ticket: {
      buyerName: outcome.data.buyerName,
      tierName: outcome.data.tierName,
      checkedInAt: outcome.data.checkedInAt?.toISOString() ?? null,
      checkedInGate: outcome.data.checkedInGate ?? null,
    },
  });
}
