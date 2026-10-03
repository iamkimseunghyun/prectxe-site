/**
 * 게이트 입장 1건이 DB에 쿼리를 몇 번 보내는지 센다 (서울 함수 ↔ 싱가포르 DB라
 * 쿼리 하나가 왕복 ~75ms). 로그인 확인 + checkInByToken을 실제로 실행해
 * prisma 쿼리 로그를 센다. dev DB 전용.
 *
 *   cd apps/web && bun scripts/gate-test-seed.ts --staff g@x.io
 *   bun scripts/gate-query-count.ts
 */
import { createHash, randomUUID } from 'node:crypto';
import { PrismaNeon } from '@prisma/adapter-neon';
import { PrismaClient } from '@prisma/client';

const client = new PrismaClient({
  adapter: new PrismaNeon({ connectionString: process.env.DATABASE_URL! }),
  log: [{ emit: 'event', level: 'query' }],
});
let log: string[] = [];
client.$on('query', (e) => log.push(e.query.replace(/\s+/g, ' ').slice(0, 90)));
(globalThis as { prisma?: PrismaClient }).prisma = client;

const { assertNotProduction } = await import('./gate-test-guard');
assertNotProduction();
const { requireStaffForDrop } = await import('@/modules/gate/server/http');
const { checkInByToken, loadCheckInTicket } = await import(
  '@/modules/tickets/server/check-in'
);

const drop = await client.drop.findFirstOrThrow({
  where: { slug: 'gate-test' },
});
const staff = await client.staff.findUniqueOrThrow({
  where: { email: 'g@x.io' },
});
const token = randomUUID();
await client.staffSession.create({
  data: {
    staffId: staff.id,
    tokenHash: createHash('sha256').update(token).digest('hex'),
    expiresAt: new Date(Date.now() + 3600_000),
  },
});
const tickets = await client.ticket.findMany({
  where: { status: 'active', order: { dropId: drop.id, isGuest: false } },
  select: { token: true },
  take: 2,
});

async function measure(label: string, ticketToken: string) {
  log = [];
  const started = performance.now();
  const req = new Request('http://x', {
    headers: { authorization: `Bearer ${token}` },
  });
  // 라우트(/api/gate/drops/[id]/check-in)와 같은 순서 — 로그인 확인과 티켓
  // 조회는 동시에, 그다음 기록. 동시에 나간 쿼리는 왕복 하나로 친다
  const clientId = randomUUID();
  const [auth, preloaded] = await Promise.all([
    requireStaffForDrop(req, drop.id),
    loadCheckInTicket(ticketToken, clientId),
  ]);
  if (!auth.ok) throw new Error('auth 실패');
  const r = await checkInByToken({
    token: ticketToken,
    dropId: drop.id,
    actor: { staffId: auth.staff.id },
    gate: 'A',
    clientId,
    preloaded,
  });
  const ms = performance.now() - started;
  console.log(
    `\n${label}: 쿼리 ${log.length}개, ${ms.toFixed(0)}ms → ${r.success ? r.result : r.error}`
  );
  for (const q of log) console.log('  ·', q);
}

// 연결 예열(첫 연결 비용 제외)
await client.$queryRaw`SELECT 1`;
await measure('첫 입장(entered)', tickets[0].token);
await measure('같은 티켓 다시(already)', tickets[0].token);
await measure('다른 티켓 첫 입장(entered)', tickets[1].token);

await client.staffSession.deleteMany({
  where: { tokenHash: createHash('sha256').update(token).digest('hex') },
});
await client.$disconnect();
