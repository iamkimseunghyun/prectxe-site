import {
  type OfflineRecord,
  type SyncResponse,
  syncBody,
} from '@prectxe/gate-contract';
import {
  json,
  parseBody,
  requireStaffForDrop,
} from '@/modules/gate/server/http';
import { applyOfflineRecord } from '@/modules/tickets/server/check-in';

// DB 옆(싱가포르)에서 실행 — 이유는 CLAUDE.md '게이트 앱 API' 리전 항목
export const preferredRegion = 'sin1';

// 기록 1건당 DB 왕복이 여러 번이라 순서대로만 돌면 수백 건에 수십 초가 걸린다.
// 같은 티켓의 기록끼리만 순서가 의미 있으므로 티켓별로 묶어 동시에 처리한다.
const CONCURRENCY = 5;

type Result = SyncResponse['results'][number];

/**
 * 오프라인 동안 쌓인 입장·취소 기록을 한 번에 반영한다. 기록마다 결과를
 * 돌려주며, `retry`가 아닌 기록은 앱이 큐에서 지우면 된다.
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const auth = await requireStaffForDrop(request, id);
  if (!auth.ok) return auth.response;

  const body = await parseBody(request, syncBody);
  if (!body.ok) return body.response;
  const { records } = body.data;

  const byTicket = new Map<string, OfflineRecord[]>();
  for (const record of records) {
    const group = byTicket.get(record.token) ?? [];
    group.push(record);
    byTicket.set(record.token, group);
  }
  // 같은 티켓의 기록은 기기가 보낸 순서(= 기록이 생긴 순서)대로 적용한다.
  // scannedAt으로 다시 정렬하면 오프라인 중 기기 시계가 뒤로 보정됐을 때 취소가
  // 자기 입장보다 먼저 처리돼 '대상 없음'으로 버려지고 잘못된 입장만 남는다.
  const queue = [...byTicket.values()];

  const results = new Map<string, Result>();
  const worker = async () => {
    for (let group = queue.shift(); group; group = queue.shift()) {
      for (const record of group) {
        try {
          const outcome = await applyOfflineRecord({
            dropId: id,
            actor: { staffId: auth.staff.id },
            record: { ...record, scannedAt: new Date(record.scannedAt) },
          });
          results.set(record.clientId, {
            clientId: record.clientId,
            ...outcome,
          });
          // 앞 기록이 반영되지 않았는데 뒤 기록(예: 그 입장의 취소)을 처리하면
          // 뒤 기록만 최종 결과로 끝나 앱이 버린다. 남은 기록은 결과를 비워
          // 아래에서 전부 retry로 돌려준다.
          if (outcome.status === 'retry') break;
        } catch (error) {
          // 한 건의 일시적 오류로 배치 전체를 실패시키지 않는다 — 그 건만 재시도
          console.error('[gate] 오프라인 기록 반영 실패', {
            dropId: id,
            clientId: record.clientId,
            error,
          });
          results.set(record.clientId, {
            clientId: record.clientId,
            status: 'retry',
          });
          break;
        }
      }
    }
  };
  await Promise.all(
    Array.from({ length: Math.min(CONCURRENCY, queue.length) }, worker)
  );

  return json<SyncResponse>({
    results: records.map(
      (r) =>
        results.get(r.clientId) ?? { clientId: r.clientId, status: 'retry' }
    ),
  });
}
