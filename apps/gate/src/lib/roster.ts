import type {
  GateDrop,
  GateDropsResponse,
  GateTicket,
  GateTicketStatus,
  GateTicketsResponse,
} from '@prectxe/gate-contract';
import { isUnreachable, type RequestOptions } from './api';
import { db, kvGet, kvSet } from './db';

// 기기에 내려받은 행사·명단과, 서버에 아직 올리지 않은 입장 기록(큐).

export type AuthedRequest = <T>(
  path: string,
  options?: Omit<RequestOptions, 'token'>
) => Promise<T>;

/** 명단 밖 QR을 수동 승인했을 때 기기 명단에 남기는 자리표시 */
export const PLACEHOLDER_NAME = '명단 밖 입장';
export const PLACEHOLDER_TIER = '수동 승인';

const DROPS_KEY = 'drops';
const dropKey = (dropId: string) => `drop:${dropId}`;
const syncedKey = (dropId: string) => `syncedAt:${dropId}`;
const gateKey = (dropId: string) => `gate:${dropId}`;

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
  db.runSync('DELETE FROM kv WHERE key = ?', gateKey(dropId));
}

function removeDrop(dropId: string) {
  db.runSync('DELETE FROM tickets WHERE drop_id = ?', dropId);
  for (const key of [dropKey(dropId), syncedKey(dropId), gateKey(dropId)])
    db.runSync('DELETE FROM kv WHERE key = ?', key);
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
     WHERE key LIKE 'drop:%' OR key LIKE 'syncedAt:%' OR key LIKE 'gate:%'`
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
       FROM queue WHERE drop_id = ? AND kind = 'entry'
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
                          WHERE q.drop_id = tickets.drop_id AND q.token = tickets.token AND q.kind = 'entry')
       WHERE drop_id = ? AND status = 'active'
         AND token IN (SELECT token FROM queue WHERE drop_id = ? AND kind = 'entry')`,
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
  /** 서버에 아직 올리지 않은 기록 수 */
  pending: number;
  syncedAt: string | null;
};

export function rosterStats(dropId: string): RosterStats {
  // 발권 수는 서버 명단 기준, 입장 수는 수동 승인까지 실제로 들어간 사람 수
  const row = db.getFirstSync<{ total: number | null; entered: number | null }>(
    `SELECT SUM(CASE WHEN local_only = 0 THEN 1 ELSE 0 END) AS total,
            SUM(CASE WHEN status = 'checked_in' THEN 1 ELSE 0 END) AS entered
     FROM tickets WHERE drop_id = ? AND status != 'cancelled'`,
    dropId
  );
  const queued = db.getFirstSync<{ n: number }>(
    'SELECT COUNT(*) AS n FROM queue WHERE drop_id = ?',
    dropId
  );
  return {
    total: row?.total ?? 0,
    entered: row?.entered ?? 0,
    pending: queued?.n ?? 0,
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
