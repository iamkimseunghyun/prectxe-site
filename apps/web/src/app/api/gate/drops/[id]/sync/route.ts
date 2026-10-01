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
  const queue = [...byTicket.values()].map((group) =>
    group.sort((a, b) => Date.parse(a.scannedAt) - Date.parse(b.scannedAt))
  );

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
