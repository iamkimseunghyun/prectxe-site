import * as SQLite from 'expo-sqlite';

// 기기 저장소. 통신이 끊겨도 판정할 수 있게 명단·행사 정보를 두고, 오프라인
// 동안 판정한 입장 기록을 큐에 쌓는다. 화면에서 바로 읽을 만큼 작아서 동기
// API를 쓴다 (명단 수천 건 기준).
export const db = SQLite.openDatabaseSync('gate.db');

const MIGRATIONS = [
  `
  CREATE TABLE kv (
    key TEXT PRIMARY KEY NOT NULL,
    value TEXT NOT NULL
  );
  CREATE TABLE tickets (
    drop_id TEXT NOT NULL,
    token TEXT NOT NULL,
    status TEXT NOT NULL,
    buyer_name TEXT NOT NULL,
    tier_name TEXT NOT NULL,
    phone_last4 TEXT,
    checked_in_at TEXT,
    note TEXT,
    PRIMARY KEY (drop_id, token)
  );
  -- 서버에 아직 올리지 않은 기록. 올리는 순서가 곧 적용 순서라 seq로 정렬한다
  CREATE TABLE queue (
    seq INTEGER PRIMARY KEY AUTOINCREMENT,
    client_id TEXT NOT NULL UNIQUE,
    drop_id TEXT NOT NULL,
    kind TEXT NOT NULL,
    token TEXT NOT NULL,
    gate TEXT,
    scanned_at TEXT NOT NULL,
    undoes TEXT
  );
  CREATE INDEX queue_drop ON queue (drop_id, seq);
  `,
  // 명단 밖 QR을 수동 승인하면 기기에만 있는 자리표시 행이 생긴다 — 발권 수에서 뺀다
  'ALTER TABLE tickets ADD COLUMN local_only INTEGER NOT NULL DEFAULT 0;',
  // 큐는 로그아웃해도 남는다 — 공용 기기에서 다음 사람이 남의 기록을 자기
  // 이름으로 올리지 않게 누가 판정했는지 남긴다
  'ALTER TABLE queue ADD COLUMN staff_id TEXT;',
];

function migrate() {
  db.execSync('PRAGMA journal_mode = WAL;');
  const row = db.getFirstSync<{ user_version: number }>('PRAGMA user_version');
  const from = row?.user_version ?? 0;
  for (let v = from; v < MIGRATIONS.length; v++) {
    db.withTransactionSync(() => {
      db.execSync(MIGRATIONS[v]);
      db.execSync(`PRAGMA user_version = ${v + 1}`);
    });
  }
}

migrate();

export function kvGet<T>(key: string): T | null {
  const row = db.getFirstSync<{ value: string }>(
    'SELECT value FROM kv WHERE key = ?',
    key
  );
  if (!row) return null;
  try {
    return JSON.parse(row.value) as T;
  } catch {
    return null;
  }
}

export function kvSet(key: string, value: unknown) {
  db.runSync(
    'INSERT INTO kv (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value',
    key,
    JSON.stringify(value)
  );
}
