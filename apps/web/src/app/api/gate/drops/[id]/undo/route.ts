import { type UndoResponse, undoBody } from '@prectxe/gate-contract';
import {
  apiError,
  json,
  parseBody,
  requireStaffForDrop,
} from '@/modules/gate/server/http';
import { undoCheckInByToken } from '@/modules/tickets/server/check-in';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const auth = await requireStaffForDrop(request, id);
  if (!auth.ok) return auth.response;

  const body = await parseBody(request, undoBody);
  if (!body.ok) return body.response;

  const outcome = await undoCheckInByToken({
    token: body.data.token,
    dropId: id,
    actor: { staffId: auth.staff.id },
    gate: body.data.gate,
    clientId: body.data.clientId,
  });
  if (!outcome.success) return apiError(outcome.error, 422);

  return json<UndoResponse>({ ok: true });
}
