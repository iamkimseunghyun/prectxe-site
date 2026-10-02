import { type UndoResponse, undoBody } from '@prectxe/gate-contract';
import {
  apiError,
  json,
  parseBody,
  requireStaffForDrop,
} from '@/modules/gate/server/http';
import { undoEntry } from '@/modules/tickets/server/check-in';

/**
 * 앱이 방금 처리한 입장(`undoes`)을 취소한다. 토큰 기준으로 취소하면 다른
 * 입구의 정상 입장까지 지울 수 있어서 대상 입장을 지정받는다.
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const auth = await requireStaffForDrop(request, id);
  if (!auth.ok) return auth.response;

  const body = await parseBody(request, undoBody);
  if (!body.ok) return body.response;

  const outcome = await undoEntry({
    dropId: id,
    actor: { staffId: auth.staff.id },
    token: body.data.token,
    clientId: body.data.clientId,
    undoes: body.data.undoes,
    gate: body.data.gate,
    at: new Date(),
  });
  if (outcome.status === 'rejected') return apiError(outcome.error, 422);
  if (outcome.status === 'not_found')
    return apiError('취소할 입장 기록을 찾을 수 없습니다.', 422);

  return json<UndoResponse>({ ok: true });
}
