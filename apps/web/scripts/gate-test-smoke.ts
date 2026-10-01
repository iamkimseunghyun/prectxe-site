/**
 * 게이트 API 스모크 테스트. 시드된 테스트 드랍(`gate-test`)으로 로그인부터
 * 입장·재전송·취소·재입장·동시 스캔·변경분 조회까지 실제 HTTP로 확인한다.
 *
 *   cd apps/web
 *   bun scripts/gate-test-seed.ts          # 먼저 드랍 초기화
 *   bun run dev                            # 다른 터미널에서 서버 (또는 next start)
 *   bun scripts/gate-test-smoke.ts         # GATE_BASE_URL로 서버 주소 변경 가능
 *
 * 로그인 코드는 메일 대신 issueLoginCode로 직접 받아 실제 /auth/verify를 통과한다
 * (등록된 주소로 request-code를 부르면 실제 메일이 나가므로 부르지 않는다).
 * 실행 후 티켓 상태가 바뀌므로 다시 돌리려면 시드부터 다시 실행할 것.
 */

import { randomUUID } from 'node:crypto';
import type {
  CheckInResponse,
  GateDropsResponse,
  GateTicketsResponse,
  MeResponse,
  OfflineRecord,
  RequestCodeResponse,
  SyncResponse,
  VerifyCodeResponse,
} from '@prectxe/gate-contract';
import { prisma } from '@/lib/db/prisma';
import { salesOrderWhere } from '@/lib/db/sales-order';
import { issueLoginCode } from '@/modules/gate/server/auth';
import { getDropCheckInLog } from '@/modules/tickets/server/queries';
import { assertNotProduction } from './gate-test-guard';

const BASE = `${process.env.GATE_BASE_URL ?? 'http://localhost:3000'}/api/gate`;
const SLUG = 'gate-test';
const STAFF_EMAIL = 'gate-smoke@example.com';

let failures = 0;
function check(label: string, ok: boolean, detail?: unknown) {
  if (ok) console.log(`  ✓ ${label}`);
  else {
    failures++;
    console.log(`  ✗ ${label}`, detail === undefined ? '' : detail);
  }
}

async function call<T>(
  method: 'GET' | 'POST',
  path: string,
  token?: string,
  body?: unknown
): Promise<{ status: number; data: T & { error?: string } }> {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      ...(token && { Authorization: `Bearer ${token}` }),
      ...(body !== undefined && { 'Content-Type': 'application/json' }),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  return { status: res.status, data: await res.json() };
}

async function main() {
  assertNotProduction();
  console.log(`  API: ${BASE}\n`);

  const drop = await prisma.drop.findUnique({
    where: { slug: SLUG },
    select: { id: true },
  });
  if (!drop)
    throw new Error(
      '테스트 드랍이 없습니다. gate-test-seed.ts를 먼저 실행하세요.'
    );
  const tickets = await prisma.ticket.findMany({
    where: { order: { dropId: drop.id } },
    select: { token: true, status: true, order: { select: { isGuest: true } } },
    orderBy: { createdAt: 'asc' },
  });
  const active = tickets.filter(
    (t) => t.status === 'active' && !t.order.isGuest
  );
  const cancelled = tickets.find((t) => t.status === 'cancelled');
  const guestTickets = tickets.filter((t) => t.order.isGuest);
  if (active.length < 8 || !cancelled || guestTickets.length < 1)
    throw new Error('티켓 상태가 초기값이 아닙니다. 시드를 다시 실행하세요.');
  const [A, B, C, T4, T5, T6, T7, T8] = active;
  const D = `/drops/${drop.id}`;

  // 스모크 전용 스태프를 이 드랍에 배정
  const staff = await prisma.staff.upsert({
    where: { email: STAFF_EMAIL },
    create: { email: STAFF_EMAIL, name: '스모크 테스트' },
    update: {},
    select: { id: true },
  });
  await prisma.dropStaff.upsert({
    where: { dropId_staffId: { dropId: drop.id, staffId: staff.id } },
    create: { dropId: drop.id, staffId: staff.id },
    update: {},
  });

  console.log('로그인');
  // 실제 스태프 주소로 request-code를 부르면 메일이 나가므로 미등록 주소로 형태만 본다
  const req = await call<RequestCodeResponse>(
    'POST',
    '/auth/request-code',
    undefined,
    { email: 'nobody-smoke@example.com' }
  );
  check(
    '미등록 주소 request-code → 200 + challengeId',
    req.status === 200 && /^[0-9a-f-]{36}$/.test(req.data.challengeId ?? ''),
    req
  );
  const verify = (challengeId: string, code: string, email = STAFF_EMAIL) =>
    call<VerifyCodeResponse>('POST', '/auth/verify', undefined, {
      email,
      challengeId,
      code,
    });
  const wrongOf = (code: string) => (code === '000000' ? '111111' : '000000');

  // 코드는 메일 대신 같은 발급 함수로 직접 받는다
  const mine = randomUUID();
  const issued = await issueLoginCode(STAFF_EMAIL, mine);
  if (!issued) throw new Error('로그인 코드를 발급하지 못했습니다.');
  // 남이 같은 주소로 만든 요청에서 틀린 코드를 한도까지 넣는다
  const theirs = randomUUID();
  const otherIssued = await issueLoginCode(STAFF_EMAIL, theirs);
  if (!otherIssued) throw new Error('로그인 코드를 발급하지 못했습니다.');
  for (let i = 0; i < 5; i++) await verify(theirs, wrongOf(otherIssued.code));
  const locked = await verify(theirs, otherIssued.code);
  check(
    '틀린 코드 5회 뒤 그 요청은 맞는 코드도 거절 → 401',
    locked.status === 401,
    locked
  );
  const bad = await verify(mine, wrongOf(issued.code));
  check('틀린 코드 → 401', bad.status === 401, bad);
  const stranger = await verify(mine, issued.code, 'someone@example.com');
  check(
    '남의 요청 ID를 다른 이메일로 → 401',
    stranger.status === 401,
    stranger
  );
  const ok = await verify(mine, issued.code, STAFF_EMAIL.toUpperCase());
  check(
    '남의 요청이 잠겨도 내 요청 코드(대문자 이메일) → 200 + 토큰',
    ok.status === 200 && !!ok.data.token,
    ok
  );
  const reuse = await verify(mine, issued.code);
  check('같은 코드 재사용 → 401', reuse.status === 401, reuse);
  const token = ok.data.token;

  const me = await call<MeResponse>('GET', '/me', token);
  check('/me → 스태프 이메일', me.data.staff?.email === STAFF_EMAIL, me);

  console.log('\n행사·목록');
  const drops = await call<GateDropsResponse>('GET', '/drops', token);
  check(
    '/drops에 테스트 드랍 포함',
    drops.data.drops?.some((d) => d.id === drop.id),
    drops
  );
  const list = await call<GateTicketsResponse>('GET', `${D}/tickets`, token);
  check(
    `티켓 ${tickets.length}장 전부 내려옴`,
    list.data.tickets?.length === tickets.length,
    list.data
  );
  check(
    '취소 주문 티켓은 cancelled',
    list.data.tickets?.find((t) => t.token === cancelled.token)?.status ===
      'cancelled'
  );
  const guestTokens = new Set(guestTickets.map((t) => t.token));
  check(
    '전화번호는 뒷자리만, 이메일 없음 (판매 티켓)',
    list.data.tickets
      ?.filter((t) => !guestTokens.has(t.token))
      .every((t) => (t.phoneLast4 ?? '').length === 4 && !('buyerEmail' in t))
  );
  const listedGuests = list.data.tickets?.filter((t) =>
    guestTokens.has(t.token)
  );
  // 대시보드·매출·주문 목록·내보내기가 쓰는 판매 주문 조건은 게스트를 뺀다
  const [allOrders, salesOrders, guestOrders] = await Promise.all([
    prisma.order.count({ where: { dropId: drop.id } }),
    prisma.order.count({ where: { dropId: drop.id, ...salesOrderWhere } }),
    prisma.order.count({ where: { dropId: drop.id, isGuest: true } }),
  ]);
  check(
    '판매 주문 조건(salesOrderWhere)은 게스트 주문을 뺀다',
    guestOrders > 0 && salesOrders === allOrders - guestOrders,
    { allOrders, salesOrders, guestOrders }
  );
  check(
    "게스트는 '게스트' 등급·메모와 함께 목록에 포함",
    listedGuests?.length === guestTickets.length &&
      listedGuests.every(
        (t) => t.tierName === '게스트' && t.note === '아티스트 게스트'
      ),
    listedGuests
  );
  const syncedAt = list.data.syncedAt;

  const other = await prisma.drop.findFirst({
    where: { id: { not: drop.id } },
    select: { id: true },
  });
  if (other) {
    const forbidden = await call('GET', `/drops/${other.id}/tickets`, token);
    check('배정 안 된 행사 → 403', forbidden.status === 403, forbidden);
  }

  console.log('\n입장·재전송·취소');
  const c1 = randomUUID();
  const e1 = await call<CheckInResponse>('POST', `${D}/check-in`, token, {
    token: A.token,
    clientId: c1,
    gate: 'A',
  });
  check('A 첫 입장 → entered', e1.data.result === 'entered', e1);
  const e1r = await call<CheckInResponse>('POST', `${D}/check-in`, token, {
    token: A.token,
    clientId: c1,
    gate: 'A',
  });
  check('같은 clientId 재전송 → entered', e1r.data.result === 'entered', e1r);
  const c2 = randomUUID();
  const e2 = await call<CheckInResponse>('POST', `${D}/check-in`, token, {
    token: A.token,
    clientId: c2,
    gate: 'B',
  });
  check('다른 입구에서 같은 티켓 → already', e2.data.result === 'already', e2);
  check(
    'already 응답에 먼저 들어간 입구(A)',
    e2.data.ticket?.checkedInGate === 'A',
    e2
  );
  // B 입구가 '이미 입장'을 자기 실수로 알고 취소해도 A 입구의 입장은 남아야 한다
  const wrongUndo = await call('POST', `${D}/undo`, token, {
    token: A.token,
    clientId: randomUUID(),
    undoes: c2,
  });
  const aStill = await prisma.ticket.findUnique({
    where: { token: A.token },
    select: { status: true },
  });
  check(
    "'이미 입장' 받은 요청을 취소 → 422, 다른 입구 입장 유지",
    wrongUndo.status === 422 && aStill?.status === 'checked_in',
    { wrongUndo, aStill }
  );
  const mis = await call('POST', `${D}/undo`, token, {
    token: A.token,
    clientId: c1,
    undoes: c1,
  });
  check('입장에 쓴 clientId로 취소 → 422', mis.status === 422, mis);
  const u1 = randomUUID();
  const undo = await call('POST', `${D}/undo`, token, {
    token: A.token,
    clientId: u1,
    undoes: c1,
  });
  check('입장 취소 → 200', undo.status === 200, undo);
  const undoR = await call('POST', `${D}/undo`, token, {
    token: A.token,
    clientId: u1,
    undoes: c1,
  });
  check('취소 재전송 → 200', undoR.status === 200, undoR);
  const e3 = await call<CheckInResponse>('POST', `${D}/check-in`, token, {
    token: A.token,
    clientId: randomUUID(),
  });
  check('취소 후 다시 입장 → entered', e3.data.result === 'entered', e3);
  const cx = await call('POST', `${D}/check-in`, token, {
    token: cancelled.token,
    clientId: randomUUID(),
  });
  check('취소된 티켓 → 422', cx.status === 422, cx);
  const fake = await call('POST', `${D}/check-in`, token, {
    token: 'tk_fake',
    clientId: randomUUID(),
  });
  check('없는 토큰 → 422', fake.status === 422, fake);
  const guestIn = await call<CheckInResponse>('POST', `${D}/check-in`, token, {
    token: guestTickets[0].token,
    clientId: randomUUID(),
  });
  check(
    "게스트 입장 → entered, 등급 '게스트'",
    guestIn.data.result === 'entered' &&
      guestIn.data.ticket?.tierName === '게스트',
    guestIn
  );

  console.log('\n동시성');
  const race = await Promise.all(
    Array.from({ length: 5 }, () =>
      call<CheckInResponse>('POST', `${D}/check-in`, token, {
        token: B.token,
        clientId: randomUUID(),
      })
    )
  );
  const results = race.map((r) => r.data.result);
  check(
    'B를 5곳에서 동시에 → entered 1, already 4',
    results.filter((r) => r === 'entered').length === 1 &&
      results.filter((r) => r === 'already').length === 4,
    results
  );
  const same = randomUUID();
  const dup = await Promise.all(
    Array.from({ length: 3 }, () =>
      call<CheckInResponse>('POST', `${D}/check-in`, token, {
        token: C.token,
        clientId: same,
      })
    )
  );
  const rows = await prisma.checkIn.count({ where: { clientId: same } });
  check(
    'C를 같은 clientId로 동시에 3번 → 전부 entered, 기록 1건',
    dup.every((r) => r.data.result === 'entered') && rows === 1,
    { results: dup.map((r) => r.data.result ?? r.data.error), rows }
  );

  console.log('\n변경분·재입장');
  const delta = await call<GateTicketsResponse>(
    'GET',
    `${D}/tickets?since=${encodeURIComponent(syncedAt)}`,
    token
  );
  // 서버가 1분 겹치게 조회하므로 방금 시드한 다른 티켓이 섞여 올 수 있다 —
  // 바뀐 티켓이 빠짐없이 오는지와 그 상태가 최신인지를 본다
  const changed = new Map(delta.data.tickets?.map((t) => [t.token, t]));
  check(
    'since 이후 변경분에 A·B·C가 입장 상태로 포함',
    [A, B, C].every((t) => changed.get(t.token)?.status === 'checked_in'),
    [...changed.keys()]
  );
  await prisma.drop.update({
    where: { id: drop.id },
    data: { allowReentry: true },
  });
  const re = await call<CheckInResponse>('POST', `${D}/check-in`, token, {
    token: A.token,
    clientId: randomUUID(),
  });
  check(
    '재입장 허용 시 A 다시 → reentered',
    re.data.result === 'reentered',
    re
  );
  await prisma.drop.update({
    where: { id: drop.id },
    data: { allowReentry: false },
  });

  console.log('\n오프라인 동기화');
  const ago = (s: number) => new Date(Date.now() - s * 1000).toISOString();
  const id = () => randomUUID();
  const ids = {
    d1: id(),
    d2: id(),
    d3: id(),
    a: id(),
    x: id(),
    f: id(),
    e1: id(),
    e2: id(),
    n: id(),
    fut: id(),
  };
  const batch: OfflineRecord[] = [
    // T4: 기기1 입장 → 기기2 중복 입장 → 기기2가 자기 중복 입장을 취소
    {
      kind: 'entry',
      clientId: ids.d1,
      token: T4.token,
      gate: 'A',
      scannedAt: ago(300),
    },
    {
      kind: 'entry',
      clientId: ids.d2,
      token: T4.token,
      gate: 'B',
      scannedAt: ago(240),
    },
    {
      kind: 'undo',
      clientId: ids.d3,
      token: T4.token,
      gate: 'B',
      scannedAt: ago(30),
      undoes: ids.d2,
    },
    // A는 온라인으로 이미 입장 — 오프라인 기기가 또 들여보냄
    {
      kind: 'entry',
      clientId: ids.a,
      token: A.token,
      gate: 'B',
      scannedAt: ago(180),
    },
    {
      kind: 'entry',
      clientId: ids.x,
      token: cancelled.token,
      scannedAt: ago(170),
    },
    {
      kind: 'entry',
      clientId: ids.f,
      token: 'tk_not_a_ticket',
      scannedAt: ago(160),
    },
    // T5: 같은 배치 안에서 입장 후 취소
    { kind: 'entry', clientId: ids.e1, token: T5.token, scannedAt: ago(120) },
    {
      kind: 'undo',
      clientId: ids.e2,
      token: T5.token,
      scannedAt: ago(60),
      undoes: ids.e1,
    },
    // T6: 대상 없는 취소, 기기 시계가 하루 앞선 입장
    {
      kind: 'undo',
      clientId: ids.n,
      token: T6.token,
      scannedAt: ago(10),
      undoes: id(),
    },
    {
      kind: 'entry',
      clientId: ids.fut,
      token: T6.token,
      scannedAt: new Date(Date.now() + 86_400_000).toISOString(),
    },
  ];
  const countBefore = await prisma.checkIn.count({
    where: { dropId: drop.id },
  });
  const sync = await call<SyncResponse>('POST', `${D}/sync`, token, {
    records: batch,
  });
  const status = Object.fromEntries(
    (sync.data.results ?? []).map((r) => [r.clientId, r.status])
  );
  const expected: Record<string, string> = {
    [ids.d1]: 'applied',
    [ids.d2]: 'duplicate',
    [ids.d3]: 'applied',
    [ids.a]: 'duplicate',
    [ids.x]: 'cancelled_ticket',
    [ids.f]: 'rejected',
    [ids.e1]: 'applied',
    [ids.e2]: 'applied',
    [ids.n]: 'skipped',
    [ids.fut]: 'applied',
  };
  const labels: Record<string, string> = {
    [ids.d1]: 'T4 첫 오프라인 입장',
    [ids.d2]: 'T4 다른 기기 중복',
    [ids.d3]: '중복 입장 취소',
    [ids.a]: '온라인 입장 후 오프라인 입장',
    [ids.x]: '취소된 티켓',
    [ids.f]: '없는 토큰',
    [ids.e1]: 'T5 입장',
    [ids.e2]: 'T5 같은 배치에서 취소',
    [ids.n]: '대상 없는 취소',
    [ids.fut]: '미래 시각 입장',
  };
  for (const [cid, want] of Object.entries(expected))
    check(`${labels[cid]} → ${want}`, status[cid] === want, status[cid]);

  const [t4, t5, t6] = await Promise.all(
    [T4, T5, T6].map((t) =>
      prisma.ticket.findUnique({
        where: { token: t.token },
        select: { status: true, checkedInAt: true },
      })
    )
  );
  check(
    'T4는 입장 상태, 입장 시각 = 첫 오프라인 스캔 시각 (중복 취소가 정상 입장을 건드리지 않음)',
    t4?.status === 'checked_in' &&
      Math.abs(
        (t4.checkedInAt?.getTime() ?? 0) - Date.parse(batch[0].scannedAt)
      ) < 1000,
    t4
  );
  check('T5는 입장 취소돼 미입장', t5?.status === 'active', t5);
  check(
    'T6 미래 시각은 서버 시각으로 보정',
    t6?.status === 'checked_in' &&
      (t6.checkedInAt?.getTime() ?? Infinity) <= Date.now(),
    t6
  );

  const countAfter = await prisma.checkIn.count({ where: { dropId: drop.id } });
  const replay = await call<SyncResponse>('POST', `${D}/sync`, token, {
    records: batch,
  });
  const replayStatus = Object.fromEntries(
    (replay.data.results ?? []).map((r) => [r.clientId, r.status])
  );
  const countReplay = await prisma.checkIn.count({
    where: { dropId: drop.id },
  });
  check(
    '같은 배치 재전송 → 결과 동일, 기록 추가 없음',
    Object.entries(expected).every(
      ([cid, want]) => replayStatus[cid] === want
    ) && countReplay === countAfter,
    { added: countAfter - countBefore, replayAdded: countReplay - countAfter }
  );
  const misuse = await call<SyncResponse>('POST', `${D}/sync`, token, {
    records: [
      {
        kind: 'undo',
        clientId: ids.d1,
        token: T4.token,
        scannedAt: ago(1),
        undoes: ids.d1,
      },
    ],
  });
  check(
    '입장에 쓴 clientId를 취소에 재사용 → rejected',
    misuse.data.results?.[0]?.status === 'rejected',
    misuse.data
  );
  const empty = await call('POST', `${D}/sync`, token, { records: [] });
  check('빈 배치 → 400', empty.status === 400, empty);
  const dupId = id();
  const dupBatch = await call('POST', `${D}/sync`, token, {
    records: [
      { kind: 'entry', clientId: dupId, token: T7.token, scannedAt: ago(5) },
      { kind: 'entry', clientId: dupId, token: T8.token, scannedAt: ago(4) },
    ],
  });
  check(
    '한 배치에 같은 clientId 두 번 → 400',
    dupBatch.status === 400,
    dupBatch
  );

  // 기기가 중복 입장을 취소했으면 '확인 필요'에서 빠진다 (d2는 위에서 d3로 취소됨)
  const review = await getDropCheckInLog(drop.id);
  check(
    '취소된 중복 입장은 취소됨 표시, 확인 필요 = 남은 2건',
    review.flagged.find((f) => f.clientId === ids.d2)?.voided === true &&
      review.counts.needsReview === 2,
    {
      needsReview: review.counts.needsReview,
      flagged: review.flagged.map((f) => [f.flag, f.voided]),
    }
  );

  // 기기 시계가 뒤로 보정돼 취소가 자기 입장보다 이른 시각으로 와도 보낸 순서대로
  const o1 = id();
  const ordered = await call<SyncResponse>('POST', `${D}/sync`, token, {
    records: [
      { kind: 'entry', clientId: o1, token: T7.token, scannedAt: ago(10) },
      {
        kind: 'undo',
        clientId: id(),
        token: T7.token,
        scannedAt: ago(40),
        undoes: o1,
      },
    ],
  });
  const t7 = await prisma.ticket.findUnique({
    where: { token: T7.token },
    select: { status: true },
  });
  check(
    '취소 시각이 입장보다 일러도 보낸 순서대로 → 입장 후 취소',
    ordered.data.results?.every((r) => r.status === 'applied') &&
      t7?.status === 'active',
    { results: ordered.data.results, t7 }
  );

  // 두 기기가 같은 티켓을 동시에 올리면 한쪽만 정상, 다른 쪽은 중복
  const both = await Promise.all(
    [ago(30), ago(20)].map((at) =>
      call<SyncResponse>('POST', `${D}/sync`, token, {
        records: [
          { kind: 'entry', clientId: id(), token: T8.token, scannedAt: at },
        ],
      })
    )
  );
  const bothStatus = both.map((r) => r.data.results?.[0]?.status).sort();
  check(
    'T8을 두 기기가 동시에 동기화 → applied 1, duplicate 1',
    bothStatus.join() === 'applied,duplicate',
    bothStatus
  );

  // 취소 대상이 지금의 입장 상태를 만든 기록이 아니면 티켓을 되돌리지 않는다
  await prisma.drop.update({
    where: { id: drop.id },
    data: { allowReentry: true },
  });
  const r1 = id();
  const reBatch = await call<SyncResponse>('POST', `${D}/sync`, token, {
    records: [
      { kind: 'entry', clientId: r1, token: B.token, scannedAt: ago(20) },
      {
        kind: 'undo',
        clientId: id(),
        token: B.token,
        scannedAt: ago(5),
        undoes: r1,
      },
    ],
  });
  await prisma.drop.update({
    where: { id: drop.id },
    data: { allowReentry: false },
  });
  const b = await prisma.ticket.findUnique({
    where: { token: B.token },
    select: { status: true },
  });
  check(
    '재입장 기록을 오프라인 취소 → 최초 입장은 유지',
    reBatch.data.results?.every((r) => r.status === 'applied') &&
      b?.status === 'checked_in',
    { results: reBatch.data.results, b }
  );
  // A: c1 입장 → 온라인 취소 → 다른 입장으로 다시 입장된 상태. c1의 오프라인 취소가 늦게 도착
  const stale = await call<SyncResponse>('POST', `${D}/sync`, token, {
    records: [
      {
        kind: 'undo',
        clientId: id(),
        token: A.token,
        scannedAt: ago(1),
        undoes: c1,
      },
    ],
  });
  const a = await prisma.ticket.findUnique({
    where: { token: A.token },
    select: { status: true },
  });
  check(
    '이미 취소된 옛 입장을 늦게 취소 → 이후 입장은 유지',
    stale.data.results?.[0]?.status === 'applied' && a?.status === 'checked_in',
    { results: stale.data.results, a }
  );

  const log = await prisma.checkIn.groupBy({
    by: ['kind', 'flag'],
    where: { dropId: drop.id },
    _count: true,
  });
  console.log(
    '\n  입장 기록:',
    Object.fromEntries(
      log.map((l) => [`${l.kind}${l.flag ? `(${l.flag})` : ''}`, l._count])
    )
  );

  console.log('\n로그아웃');
  await call('POST', '/auth/logout', token);
  const after = await call('GET', '/me', token);
  check('로그아웃 후 /me → 401', after.status === 401, after);

  console.log(failures === 0 ? '\n✓ 전부 통과' : `\n✗ 실패 ${failures}건`);
  if (failures > 0) process.exitCode = 1;
}

main()
  .catch((error) => {
    console.error(`\n✗ ${error instanceof Error ? error.message : error}`);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
