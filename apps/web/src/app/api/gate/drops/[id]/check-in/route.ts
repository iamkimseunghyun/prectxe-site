import { type CheckInResponse, checkInBody } from '@prectxe/gate-contract';
import {
  apiError,
  json,
  parseBody,
  requireStaffForDrop,
} from '@/modules/gate/server/http';
import { checkInByToken } from '@/modules/tickets/server/check-in';

// DB 옆(싱가포르)에서 실행 — 이유는 CLAUDE.md '게이트 앱 API' 리전 항목
export const preferredRegion = 'sin1';

/**
 * 온라인 입장 판정. 서버가 최종 판정한다 — 여러 입구에서 같은 QR을 동시에
 * 찍어도 한 곳만 `entered`를 받는다. 거절 사유는 422 + `error`로 내려간다.
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const auth = await requireStaffForDrop(request, id);
  if (!auth.ok) return auth.response;

  const body = await parseBody(request, checkInBody);
  if (!body.ok) return body.response;

  const outcome = await checkInByToken({
    token: body.data.token,
    dropId: id,
    actor: { staffId: auth.staff.id },
    gate: body.data.gate,
    clientId: body.data.clientId,
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
