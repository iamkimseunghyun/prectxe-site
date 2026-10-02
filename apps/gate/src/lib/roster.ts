import {
  type GateDrop,
  type GateDropsResponse,
  type GateTicket,
  type GateTicketStatus,
  type GateTicketsResponse,
  type OfflineRecord,
  SYNC_BATCH_LIMIT,
  type SyncResponse,
} from '@prectxe/gate-contract';
import * as Crypto from 'expo-crypto';
import { GateApiError, isUnreachable, type RequestOptions } from './api';
import { db, kvDelete, kvGet, kvSet } from './db';

// 기기에 내려받은 행사·명단과, 서버에 아직 올리지 않은 입장 기록(큐).

export type AuthedRequest = <T>(
  path: string,
  options?: Omit<RequestOptions, 'token'>
) => Promise<T>;

/** 명단 밖 QR을 수동 승인했을 때 기기 명단에 남기는 자리표시 */
export const PLACEHOLDER_NAME = '명단 밖 입장';
export const PLACEHOLDER_TIER = '수동 승인';

// 큐에 있는 입장 중 같은 큐에 취소가 뒤따르지 않는 것 — 취소한 입장을 명단
// 동기화가 다시 '입장'으로 되돌리면 안 된다 (쿼리에서 큐를 q로 부를 것)
const NOT_UNDONE =
  "NOT EXISTS (SELECT 1 FROM queue u WHERE u.kind = 'undo' AND u.undoes = q.client_id)";

const DROPS_KEY = 'drops';
const dropKey = (dropId: string) => `drop:${dropId}`;
const syncedKey = (dropId: string) => `syncedAt:${dropId}`;
const gateKey = (dropId: string) => `gate:${dropId}`;
// 기록 올리기 결과는 기기 DB에 둔다 — 행사 홈·스캔·검색이 명단 쿼리 하나를
// 같이 쓰는데, 컴포넌트 상태에 두면 그 쿼리를 돌린 화면에만 반영된다
const uploadProblemKey = (dropId: string) => `uploadProblem:${dropId}`;
// 서버가 받지 않은 기록 — 행사 명단을 지워도 남긴다(개인정보 없이 건수·사유만).
// 행사가 목록에서 빠진 뒤에 올린 기록의 거절도 알려야 해서다
const rejectedKey = (dropId: string) => `rejected:${dropId}`;

// 명단 전체 다운로드는 수천 건일 수 있어 기본 타임아웃보다 넉넉히 준다.
// 변경분 폴링은 작으니 기본값 — 길게 잡으면 오프라인 감지가 늦어진다
const FULL_ROSTER_TIMEOUT_MS = 20_000;
// 서버 목록과 같은 기준: 행사 종료 12시간 뒤까지만 둔다 (web gate/server/queries.ts)
const KEEP_AFTER_END_MS = 12 * 60 * 60 * 1000;

// ─── 행사 ────────────────────────────────────────────

/**
 * 내 행사 목록. 서버에 닿지 못하면 마지막으로 받은 목록을 돌려준다 — 공연장에서
 * 통신 없이 앱을 열어도 행사 화면으로 들어가 기기 명단으로 판정할 수 있게.
 */
export async function loadDrops(
  request: AuthedRequest,
  signal?: AbortSignal
): Promise<{ drops: GateDrop[]; offline: boolean }> {
  try {
    const { drops } = await request<GateDropsResponse>('/drops', { signal });
    db.withTransactionSync(() => {
      kvSet(DROPS_KEY, drops);
      for (const drop of drops) kvSet(dropKey(drop.id), drop);
      purgeDropsExcept(drops.map((drop) => drop.id));
    });
    return { drops, offline: false };
  } catch (error) {
    if (isUnreachable(error)) {
      const cached = kvGet<GateDrop[]>(DROPS_KEY);
      if (cached) {
        const drops = cached.filter((drop) => !hasEnded(drop, Date.now()));
        purgeEndedDrops();
        return { drops, offline: true };
      }
    }
    throw error;
  }
}

function hasEnded(drop: GateDrop, now: number): boolean {
  const end = drop.eventEndDate ?? drop.eventDate;
  return end !== null && Date.parse(end) + KEEP_AFTER_END_MS < now;
}

export function getDrop(dropId: string): GateDrop | null {
  return kvGet<GateDrop>(dropKey(dropId));
}

export function getGate(dropId: string): string | null {
  return kvGet<string>(gateKey(dropId));
}

export function setGate(dropId: string, gate: string) {
  kvSet(gateKey(dropId), gate);
}

export function clearGate(dropId: string) {
  kvDelete(gateKey(dropId));
}

function removeDrop(dropId: string) {
  db.runSync('DELETE FROM tickets WHERE drop_id = ?', dropId);
  for (const key of [
    dropKey(dropId),
    syncedKey(dropId),
    gateKey(dropId),
    uploadProblemKey(dropId),
  ])
    kvDelete(key);
}

/**
 * 끝난 행사의 명단을 기기 시계 기준으로 지운다 (PRD 6장: 행사 종료 후 기기
 * 목록 자동 삭제). 온라인이면 서버 목록 기준으로도 지우지만, 행사 뒤 앱을
 * 오프라인으로만 열면 그 경로를 타지 않는다.
 */
export function purgeEndedDrops() {
  const now = Date.now();
  const rows = db.getAllSync<{ value: string }>(
    "SELECT value FROM kv WHERE key LIKE 'drop:%'"
  );
  db.withTransactionSync(() => {
    for (const { value } of rows) {
      try {
        const drop = JSON.parse(value) as GateDrop;
        if (hasEnded(drop, now)) removeDrop(drop.id);
      } catch {
        // 깨진 값은 다음 온라인 목록 동기화 때 정리된다
      }
    }
  });
}

/**
 * 목록에서 빠진 행사(종료 후 12시간이 지났거나 배정이 풀린 행사)의 명단을
 * 지운다 — 기기에는 진행 중인 행사의 개인정보만 둔다. 큐는 지우지 않는다:
 * 아직 올리지 않은 입장 기록은 사라지면 안 된다.
 */
function purgeDropsExcept(keep: string[]) {
  const stored = db.getAllSync<{ drop_id: string }>(
    `SELECT DISTINCT drop_id FROM tickets
     UNION SELECT substr(key, instr(key, ':') + 1) FROM kv
     WHERE key LIKE 'drop:%' OR key LIKE 'syncedAt:%' OR key LIKE 'gate:%'
        OR key LIKE 'uploadProblem:%'`
  );
  for (const { drop_id } of stored)
    if (!keep.includes(drop_id)) removeDrop(drop_id);
}

/** 로그아웃: 명단·행사 정보를 지운다. 큐는 남긴다 (다시 로그인하면 올린다) */
export function clearRoster() {
  db.withTransactionSync(() => {
    db.runSync('DELETE FROM tickets');
    db.runSync('DELETE FROM kv');
  });
}

// ─── 명단 ────────────────────────────────────────────

/**
 * 명단을 받아 기기에 반영한다. 처음엔 전체, 이후엔 마지막 동기화 뒤 바뀐 것만
 * (다른 입구의 입장·취소·환불).
 */
export async function syncRoster(
  request: AuthedRequest,
  dropId: string,
  signal?: AbortSignal
) {
  const since = kvGet<string>(syncedKey(dropId));
  const query = since ? `?since=${encodeURIComponent(since)}` : '';
  const res = await request<GateTicketsResponse>(
    `/drops/${dropId}/tickets${query}`,
    { signal, timeoutMs: since ? undefined : FULL_ROSTER_TIMEOUT_MS }
  );

  db.withTransactionSync(() => {
    if (!since) db.runSync('DELETE FROM tickets WHERE drop_id = ?', dropId);
    const upsert = db.prepareSync(
      `INSERT INTO tickets
         (drop_id, token, status, buyer_name, tier_name, phone_last4, checked_in_at, note)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT (drop_id, token) DO UPDATE SET
         status = excluded.status,
         buyer_name = excluded.buyer_name,
         tier_name = excluded.tier_name,
         phone_last4 = excluded.phone_last4,
         checked_in_at = excluded.checked_in_at,
         note = excluded.note,
         local_only = 0
       -- 서버가 이 응답을 만든 뒤에 이 기기가 온라인으로 입장시킨 티켓은
       -- 응답이 늦게 와도 미입장으로 되돌리지 않는다 (시각은 둘 다 서버 ISO 문자열)
       WHERE NOT (tickets.status = 'checked_in' AND excluded.status = 'active'
                  AND COALESCE(tickets.checked_in_at, '') >= ?)`
    );
    try {
      for (const t of res.tickets)
        upsert.executeSync([...ticketParams(dropId, t), res.syncedAt]);
    } finally {
      upsert.finalizeSync();
    }
    // 아직 올리지 않은 오프라인 입장은 서버가 모른다. 서버 값으로 덮인 채
    // 미입장으로 돌아가면 같은 티켓이 이 기기에서 또 초록을 받는다.
    // 명단 밖 QR을 수동 승인한 자리표시 행도 큐에서 다시 만든다 — 전체를 새로
    // 받으면(재로그인 등) 지워지는데, 그러면 같은 QR이 또 노랑이 된다
    db.runSync(
      `INSERT INTO tickets (drop_id, token, status, buyer_name, tier_name, checked_in_at, note, local_only)
       SELECT drop_id, token, 'checked_in', ?, ?, MIN(scanned_at), NULL, 1
       FROM queue q WHERE drop_id = ? AND kind = 'entry' AND ${NOT_UNDONE}
         AND token NOT IN (SELECT token FROM tickets WHERE drop_id = ?)
       GROUP BY drop_id, token`,
      PLACEHOLDER_NAME,
      PLACEHOLDER_TIER,
      dropId,
      dropId
    );
    db.runSync(
      `UPDATE tickets SET
         status = 'checked_in',
         checked_in_at = (SELECT MIN(q.scanned_at) FROM queue q
                          WHERE q.drop_id = tickets.drop_id AND q.token = tickets.token
                            AND q.kind = 'entry' AND ${NOT_UNDONE})
       WHERE drop_id = ? AND status = 'active'
         AND token IN (SELECT token FROM queue q WHERE drop_id = ? AND kind = 'entry' AND ${NOT_UNDONE})`,
      dropId,
      dropId
    );
    kvSet(syncedKey(dropId), res.syncedAt);
    kvSet(dropKey(dropId), res.drop);
  });
}

function ticketParams(dropId: string, t: GateTicket) {
  return [
    dropId,
    t.token,
    t.status,
    t.buyerName,
    t.tierName,
    t.phoneLast4,
    t.checkedInAt,
    t.note,
  ];
}

export type RosterStats = {
  /** 취소된 티켓은 뺀 발권 수 */
  total: number;
  entered: number;
  /** 서버에 아직 올리지 않은 내 기록 수 */
  pending: number;
  /** 이 기기에 남은 다른 스태프의 기록 — 그 스태프가 다시 로그인해야 올라간다 */
  pendingOthers: number;
  /** 마지막으로 기록을 올리려다 서버에 막힌 사유 (배정 해제 등) */
  uploadProblem: string | null;
  /** 서버가 받지 않은 기록 (명단 밖 수동 입장이 위조 QR이었던 경우 등) */
  rejected: Rejected | null;
  syncedAt: string | null;
};

/** 서버가 받지 않은 기록 — 종류별로 사유 → 건수 */
export type Rejected = {
  /** 입장: 이미 들여보냈는데 서버에 기록이 남지 않았다 */
  entries: Record<string, number>;
  /** 취소: 서버엔 아직 입장으로 남아 있을 수 있다 */
  undos: Record<string, number>;
};

export function rosterStats(
  dropId: string,
  staffId: string | null
): RosterStats {
  // 발권 수는 서버 명단 기준, 입장 수는 수동 승인까지 실제로 들어간 사람 수
  const row = db.getFirstSync<{ total: number | null; entered: number | null }>(
    `SELECT SUM(CASE WHEN local_only = 0 THEN 1 ELSE 0 END) AS total,
            SUM(CASE WHEN status = 'checked_in' THEN 1 ELSE 0 END) AS entered
     FROM tickets WHERE drop_id = ? AND status != 'cancelled'`,
    dropId
  );
  const queued = db.getFirstSync<{
    mine: number | null;
    others: number | null;
  }>(
    `SELECT SUM(CASE WHEN staff_id = ? THEN 1 ELSE 0 END) AS mine,
            SUM(CASE WHEN staff_id = ? THEN 0 ELSE 1 END) AS others
     FROM queue WHERE drop_id = ?`,
    staffId,
    staffId,
    dropId
  );
  return {
    total: row?.total ?? 0,
    entered: row?.entered ?? 0,
    pending: queued?.mine ?? 0,
    pendingOthers: queued?.others ?? 0,
    uploadProblem: kvGet<string>(uploadProblemKey(dropId)),
    rejected: kvGet<Rejected>(rejectedKey(dropId)),
    syncedAt: kvGet<string>(syncedKey(dropId)),
  };
}

export type LocalTicket = {
  token: string;
  status: GateTicketStatus;
  buyerName: string;
  tierName: string;
  checkedInAt: string | null;
  note: string | null;
};

export function findTicket(dropId: string, token: string): LocalTicket | null {
  return db.getFirstSync<LocalTicket>(
    `SELECT token, status, buyer_name AS buyerName, tier_name AS tierName,
            checked_in_at AS checkedInAt, note
     FROM tickets WHERE drop_id = ? AND token = ?`,
    dropId,
    token
  );
}

/** 서버나 기기가 입장시킨 티켓을 기기 명단에 반영한다 (오프라인 전환 대비) */
export function markEntered(dropId: string, token: string, at: string) {
  db.runSync(
    `UPDATE tickets SET status = 'checked_in', checked_in_at = COALESCE(checked_in_at, ?)
     WHERE drop_id = ? AND token = ? AND status = 'active'`,
    at,
    dropId,
    token
  );
}

// ─── 큐 ──────────────────────────────────────────────

export type QueuedEntry = {
  dropId: string;
  staffId: string;
  clientId: string;
  token: string;
  gate: string;
  scannedAt: string;
};

/**
 * 기기가 판정한 입장을 큐에 넣고 기기 명단에도 반영한다. 서버 판정을 기다리다
 * 시간이 넘어 기기로 넘어온 경우에도 같은 clientId를 쓴다 — 서버가 사실은
 * 처리했더라도 나중에 올릴 때 재전송으로 인식해 한 번만 반영된다.
 *
 * 명단에 없는 토큰(확인 필요 → 수동 승인)은 자리표시 행을 만든다. 그래야 같은
 * QR을 다시 찍었을 때 또 노랑이 아니라 "이미 입장"이 뜬다.
 */
export function enqueueEntry(entry: QueuedEntry) {
  db.withTransactionSync(() => {
    db.runSync(
      `INSERT INTO queue (client_id, drop_id, staff_id, kind, token, gate, scanned_at)
       VALUES (?, ?, ?, 'entry', ?, ?, ?)
       ON CONFLICT (client_id) DO NOTHING`,
      entry.clientId,
      entry.dropId,
      entry.staffId,
      entry.token,
      entry.gate,
      entry.scannedAt
    );
    db.runSync(
      `INSERT INTO tickets (drop_id, token, status, buyer_name, tier_name, checked_in_at, note, local_only)
       VALUES (?, ?, 'checked_in', ?, ?, ?, NULL, 1)
       ON CONFLICT (drop_id, token) DO NOTHING`,
      entry.dropId,
      entry.token,
      PLACEHOLDER_NAME,
      PLACEHOLDER_TIER,
      entry.scannedAt
    );
    markEntered(entry.dropId, entry.token, entry.scannedAt);
  });
}

/**
 * 입장 취소를 큐에 넣고 기기 명단도 되돌린다. 취소는 언제나 큐를 거쳐 서버로
 * 간다 — 대상 입장이 아직 큐에 있으면 입장 → 취소 순서로 함께 올라가고, 서버가
 * 이미 아는 입장이면 취소만 올라간다. 큐에서 입장을 그냥 지우지 않는 이유는,
 * 서버 응답이 늦어 기기로 판정한 입장은 서버가 사실 이미 처리했을 수 있어서다.
 *
 * 재입장의 취소는 첫 입장을 되돌리지 않는다 (서버 undoEntry와 같은 규칙).
 */
export function enqueueUndo(args: {
  dropId: string;
  staffId: string;
  gate: string;
  token: string;
  /** 취소할 입장의 clientId */
  undoes: string;
  reentry: boolean;
}) {
  db.withTransactionSync(() => {
    db.runSync(
      `INSERT INTO queue (client_id, drop_id, staff_id, kind, token, gate, scanned_at, undoes)
       VALUES (?, ?, ?, 'undo', ?, ?, ?, ?)`,
      Crypto.randomUUID(),
      args.dropId,
      args.staffId,
      args.token,
      args.gate,
      new Date().toISOString(),
      args.undoes
    );
    if (args.reentry) return;
    db.runSync(
      'DELETE FROM tickets WHERE drop_id = ? AND token = ? AND local_only = 1',
      args.dropId,
      args.token
    );
    db.runSync(
      `UPDATE tickets SET status = 'active', checked_in_at = NULL
       WHERE drop_id = ? AND token = ? AND status = 'checked_in'`,
      args.dropId,
      args.token
    );
  });
}

type QueueRow = {
  client_id: string;
  kind: OfflineRecord['kind'];
  token: string;
  gate: string | null;
  scanned_at: string;
  undoes: string | null;
};

/**
 * 큐 행을 계약의 기록으로. 대상이 없는 취소는 null — 입장으로 바꿔 보내면
 * 취소하려던 사람이 입장 처리된다.
 */
function toRecord(row: QueueRow): OfflineRecord | null {
  const base = {
    clientId: row.client_id,
    token: row.token,
    gate: row.gate ?? undefined,
    scannedAt: row.scanned_at,
  };
  if (row.kind === 'undo')
    return row.undoes ? { ...base, kind: 'undo', undoes: row.undoes } : null;
  return { ...base, kind: 'entry' };
}

function setUploadProblem(dropId: string, problem: string | null) {
  if (problem) kvSet(uploadProblemKey(dropId), problem);
  else kvDelete(uploadProblemKey(dropId));
}

function addRejected(
  dropId: string,
  items: { kind: OfflineRecord['kind']; reason: string }[]
) {
  const next = kvGet<Rejected>(rejectedKey(dropId)) ?? {
    entries: {},
    undos: {},
  };
  for (const { kind, reason } of items) {
    const bucket = kind === 'undo' ? next.undos : next.entries;
    bucket[reason] = (bucket[reason] ?? 0) + 1;
  }
  kvSet(rejectedKey(dropId), next);
}

export const countAll = (counts: Record<string, number> | undefined) =>
  Object.values(counts ?? {}).reduce((total, n) => total + n, 0);

/**
 * 큐에 쌓인 **내** 기록을 순서대로 올린다(`/sync`). `retry`가 아닌 결과는 최종이라
 * 큐에서 지운다. 다른 스태프의 기록은 그 스태프가 로그인했을 때 올린다 — 공용
 * 기기에서 남의 입장을 내 이름으로 남기지 않는다.
 *
 * 결과(막힌 사유·거절 건수)는 기기 DB에 남기고 `rosterStats`로 읽는다.
 */
export async function uploadQueue(
  request: AuthedRequest,
  dropId: string,
  staffId: string,
  signal?: AbortSignal
): Promise<void> {
  // 한 번에 최대 200건 — 더 쌓였으면 나눠 보낸다(몇 번까지만, 나머지는 다음 폴링)
  for (let round = 0; round < 5; round++) {
    const rows = db.getAllSync<QueueRow>(
      `SELECT client_id, kind, token, gate, scanned_at, undoes FROM queue
       WHERE drop_id = ? AND staff_id = ? ORDER BY seq LIMIT ?`,
      dropId,
      staffId,
      SYNC_BATCH_LIMIT
    );
    if (rows.length === 0) break;

    const records: OfflineRecord[] = [];
    for (const row of rows) {
      const record = toRecord(row);
      if (record) records.push(record);
      else {
        console.warn('[gate] 대상 없는 취소 기록을 버림', row.client_id);
        db.runSync('DELETE FROM queue WHERE client_id = ?', row.client_id);
      }
    }
    if (records.length === 0) continue;

    let res: SyncResponse;
    try {
      res = await request<SyncResponse>(`/drops/${dropId}/sync`, {
        method: 'POST',
        body: { records },
        signal,
      });
    } catch (error) {
      // 연결이 안 되면 사유를 모른다 — 이전 판단을 그대로 둔다(오프라인 배너가 대신 뜬다)
      if (isUnreachable(error)) return;
      setUploadProblem(
        dropId,
        error instanceof GateApiError
          ? error.message
          : '기록을 올리지 못했습니다.'
      );
      return;
    }

    const kindOf = new Map(records.map((r) => [r.clientId, r.kind]));
    const done = res.results.filter((result) => result.status !== 'retry');
    const rejected = done
      .filter((result) => result.status === 'rejected')
      .map((result) => ({
        kind: kindOf.get(result.clientId) ?? 'entry',
        reason: result.error ?? '서버가 받지 않았습니다.',
      }));
    db.withTransactionSync(() => {
      for (const { clientId } of done)
        db.runSync('DELETE FROM queue WHERE client_id = ?', clientId);
      // 거절된 기록은 다시 보내도 결과가 같아 지우지만, 입장이면 그 사람은
      // 이미 들어갔고 취소면 서버엔 아직 입장으로 남았다 — 스태프가 알고
      // 주최자에게 전할 수 있게 종류·사유별 건수를 남긴다
      if (rejected.length > 0) addRejected(dropId, rejected);
      // 서버가 받아줬다 — 이전에 막혔던 사유는 더 이상 맞지 않는다
      setUploadProblem(dropId, null);
    });
    // 서버가 일시적으로 못 받은 기록(retry)이 앞에 남았다 — 다음 폴링 때 다시
    if (done.length < records.length) break;
  }
  // 올릴 기록이 없었던 경우도 여기서 지운다
  setUploadProblem(dropId, null);
}

/** 서버가 받지 않은 기록 안내를 스태프가 확인했다 (행사를 지정하지 않으면 전부) */
export function clearRejected(dropId?: string) {
  if (dropId) kvDelete(rejectedKey(dropId));
  else db.runSync("DELETE FROM kv WHERE key LIKE 'rejected:%'");
}

export type RejectedTotal = { entries: number; undos: number };

/**
 * 모든 행사에서 서버가 받지 않은 기록 수 — 행사 목록·로그아웃 안내용. 행사
 * 명단을 지워도 남아 있어(목록에서 빠진 행사 포함) 여기서만 보일 수 있다.
 */
export function rejectedTotal(): RejectedTotal {
  const total: RejectedTotal = { entries: 0, undos: 0 };
  const rows = db.getAllSync<{ value: string }>(
    "SELECT value FROM kv WHERE key LIKE 'rejected:%'"
  );
  for (const { value } of rows) {
    try {
      const rejected = JSON.parse(value) as Rejected;
      total.entries += countAll(rejected.entries);
      total.undos += countAll(rejected.undos);
    } catch {
      // 깨진 값은 건너뛴다 — 안내용이라 판정에는 영향이 없다
    }
  }
  return total;
}

/** 로그아웃 안내용 — 이 스태프가 아직 올리지 않은 기록 (모든 행사) */
export function pendingForStaff(staffId: string): number {
  return (
    db.getFirstSync<{ n: number }>(
      'SELECT COUNT(*) AS n FROM queue WHERE staff_id = ?',
      staffId
    )?.n ?? 0
  );
}

function strandedCounts(staffId: string, listed: string[]) {
  return db
    .getAllSync<{ drop_id: string; n: number }>(
      'SELECT drop_id, COUNT(*) AS n FROM queue WHERE staff_id = ? GROUP BY drop_id',
      staffId
    )
    .filter((row) => !listed.includes(row.drop_id));
}

export type Stranded = { count: number; problem: string | null };

/**
 * 목록에서 빠진 행사(종료 12시간 경과·배정 해제)에 묶인 내 미전송 기록을
 * 올린다. 기록은 행사 화면의 명단 동기화로 올라가는데 그 행사는 열 수 없으니
 * 행사 목록이 대신 올린다. 종료된 행사는 여기서 올라가고, 배정이 풀린 행사의
 * 기록만 남아 사유와 함께 안내된다.
 */
export async function uploadStranded(
  request: AuthedRequest,
  staffId: string,
  listed: string[],
  signal?: AbortSignal
): Promise<Stranded> {
  let problem: string | null = null;
  for (const { drop_id } of strandedCounts(staffId, listed)) {
    await uploadQueue(request, drop_id, staffId, signal);
    problem ??= kvGet<string>(uploadProblemKey(drop_id));
  }
  const count = strandedCounts(staffId, listed).reduce(
    (sum, row) => sum + row.n,
    0
  );
  return { count, problem: count > 0 ? problem : null };
}

export type RosterRow = LocalTicket & { phoneLast4: string | null };

/**
 * 명단 검색 — 이름·메모(게스트의 "누구 게스트")·전화번호 뒷자리 4자리. 기기
 * 명단에서 찾으므로 오프라인에서도 된다. 이메일은 기기에 내려받지 않는다.
 */
export function searchRoster(dropId: string, query: string): RosterRow[] {
  const term = query.trim();
  if (!term) return [];
  const like = `%${term.replace(/[\\%_]/g, (c) => `\\${c}`)}%`;
  const digits = term.replace(/\D/g, '');
  return db.getAllSync<RosterRow>(
    `SELECT token, status, buyer_name AS buyerName, tier_name AS tierName,
            checked_in_at AS checkedInAt, note, phone_last4 AS phoneLast4
     FROM tickets
     WHERE drop_id = ? AND local_only = 0
       AND (buyer_name LIKE ? ESCAPE '\\' OR note LIKE ? ESCAPE '\\'
            OR (? <> '' AND phone_last4 = ?))
     ORDER BY CASE status WHEN 'active' THEN 0 WHEN 'checked_in' THEN 1 ELSE 2 END,
              buyer_name
     LIMIT 50`,
    dropId,
    like,
    like,
    digits.length === 4 ? digits : '',
    digits
  );
}
