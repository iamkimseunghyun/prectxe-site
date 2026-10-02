import { ticketsQuery } from '@prectxe/gate-contract';
import {
  apiError,
  json,
  requireStaffForDrop,
} from '@/modules/gate/server/http';
import { getDropTickets } from '@/modules/gate/server/queries';

// DB 옆(싱가포르)에서 실행 — 이유는 CLAUDE.md '게이트 앱 API' 리전 항목
export const preferredRegion = 'sin1';

/**
 * 오프라인 판정용 티켓 목록. 처음엔 전체를 받고, 이후에는 응답의 `syncedAt`을
 * `?since=`로 넘겨 바뀐 것만 받는다 (다른 입구의 입장·취소 반영).
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const auth = await requireStaffForDrop(request, id);
  if (!auth.ok) return auth.response;

  const url = new URL(request.url);
  const query = ticketsQuery.safeParse({
    since: url.searchParams.get('since') ?? undefined,
  });
  if (!query.success) return apiError('since 형식이 올바르지 않습니다.', 400);

  const result = await getDropTickets(
    id,
    query.data.since ? new Date(query.data.since) : undefined
  );
  if (!result) return apiError('행사를 찾을 수 없습니다.', 404);
  return json(result);
}
