/**
 * 게이트 API 스모크 테스트. 시드된 테스트 드랍(`gate-test`)으로 로그인부터
 * 입장·재전송·취소·재입장·동시 스캔·변경분 조회까지 실제 HTTP로 확인한다.
 *
 *   cd apps/web
 *   bun scripts/gate-test-seed.ts          # 먼저 드랍 초기화
 *   bun run dev                            # 다른 터미널에서 서버 (또는 next start)
 *   bun scripts/gate-test-smoke.ts         # GATE_BASE_URL로 서버 주소 변경 가능
 *
 * 로그인 코드는 메일 대신 issueLoginCode로 직접 받아 실제 /auth/verify를 통과한다.
 * 실행 후 티켓 상태가 바뀌므로 다시 돌리려면 시드부터 다시 실행할 것.
 */

import { randomUUID } from 'node:crypto';
import type {
  CheckInResponse,
  GateDropsResponse,
  GateTicketsResponse,
  MeResponse,
  VerifyCodeResponse,
} from '@prectxe/gate-contract';
import { prisma } from '@/lib/db/prisma';
import { issueLoginCode } from '@/modules/gate/server/auth';
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
    select: { token: true, status: true },
    orderBy: { createdAt: 'asc' },
  });
  const active = tickets.filter((t) => t.status === 'active');
  const cancelled = tickets.find((t) => t.status === 'cancelled');
  if (active.length < 3 || !cancelled)
    throw new Error('티켓 상태가 초기값이 아닙니다. 시드를 다시 실행하세요.');
  const [A, B, C] = active;
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
  const issued = await issueLoginCode(STAFF_EMAIL);
  if (!issued) throw new Error('로그인 코드를 발급하지 못했습니다.');
  const wrong = issued.code === '000000' ? '111111' : '000000';
  const bad = await call('POST', '/auth/verify', undefined, {
    email: STAFF_EMAIL,
    code: wrong,
  });
  check('틀린 코드 → 401', bad.status === 401, bad);
  const ok = await call<VerifyCodeResponse>('POST', '/auth/verify', undefined, {
    email: STAFF_EMAIL.toUpperCase(),
    code: issued.code,
  });
  check(
    '맞는 코드(대문자 이메일) → 200 + 토큰',
    ok.status === 200 && !!ok.data.token,
    ok
  );
  const reuse = await call('POST', '/auth/verify', undefined, {
    email: STAFF_EMAIL,
    code: issued.code,
  });
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
  check(
    '전화번호는 뒷자리만, 이메일 없음',
    list.data.tickets?.every(
      (t) => (t.phoneLast4 ?? '').length === 4 && !('buyerEmail' in t)
    )
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
  const e2 = await call<CheckInResponse>('POST', `${D}/check-in`, token, {
    token: A.token,
    clientId: randomUUID(),
    gate: 'B',
  });
  check('다른 입구에서 같은 티켓 → already', e2.data.result === 'already', e2);
  const mis = await call('POST', `${D}/undo`, token, {
    token: A.token,
    clientId: c1,
  });
  check('입장에 쓴 clientId로 취소 → 422', mis.status === 422, mis);
  const u1 = randomUUID();
  const undo = await call('POST', `${D}/undo`, token, {
    token: A.token,
    clientId: u1,
  });
  check('입장 취소 → 200', undo.status === 200, undo);
  const undoR = await call('POST', `${D}/undo`, token, {
    token: A.token,
    clientId: u1,
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
  const changed = new Set(delta.data.tickets?.map((t) => t.token));
  check(
    'since 이후 변경분 = A·B·C',
    changed.size === 3 && [A, B, C].every((t) => changed.has(t.token)),
    [...changed]
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

  const log = await prisma.checkIn.groupBy({
    by: ['kind'],
    where: { dropId: drop.id },
    _count: true,
  });
  console.log(
    '\n  입장 기록:',
    Object.fromEntries(log.map((l) => [l.kind, l._count]))
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
