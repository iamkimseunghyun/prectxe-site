/**
 * 게이트(입장) 테스트용 더미 드랍을 dev DB에 만들거나 초기화한다.
 *
 *   cd apps/web && bun scripts/gate-test-seed.ts [--staff you@example.com]
 *
 * - 비공개(publishedAt null) 티켓 드랍 `gate-test`. 행사 시각은 실행 시점 +2시간 —
 *   게이트 앱 행사 목록의 시간 창에 들어오도록 실행할 때마다 갱신한다.
 * - 결제 완료 주문 7건(티켓 8장) + 취소 주문 1건 + 게스트 1팀(2장, 등급 없음).
 * - 다시 실행하면 이 드랍의 주문·티켓·입장 기록만 지우고 새로 만든다.
 * - `--staff`를 주면 그 이메일을 이 드랍의 게이트 스태프로 배정한다.
 * - QR 시트(HTML)를 임시 폴더에 만든다 — 다른 기기 화면에 띄워 스캐너로 찍는다.
 */

import { writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import QRCode from 'qrcode';
import { prisma } from '@/lib/db/prisma';
import {
  generateAccessToken,
  generateOrderNo,
  generateTicketToken,
} from '@/lib/utils/ticket-token';
import { getTicketScanUrl } from '@/lib/utils/ticket-url';
import { assertNotProduction } from './gate-test-guard';

const SLUG = 'gate-test';
const TITLE = '[테스트] 게이트 입장 테스트';
const PRICE = 30_000;
const HOUR = 60 * 60 * 1000;

const BUYERS = [
  { name: '테스트 관객 1', phone: '010-1111-0001', qty: 1 },
  { name: '테스트 관객 2', phone: '010-1111-0002', qty: 2 },
  { name: '김테스트', phone: '010-1111-0003', qty: 1 },
  { name: '이테스트', phone: '010-1111-0004', qty: 1 },
  { name: '박테스트', phone: '010-1111-0005', qty: 1 },
  { name: '최테스트', phone: '010-1111-0006', qty: 1 },
  { name: '정테스트', phone: '010-1111-0007', qty: 1 },
  { name: '취소 관객', phone: '010-1111-0009', qty: 1, cancelled: true },
] as const;

function staffArg(): string | null {
  const i = process.argv.indexOf('--staff');
  const email = i >= 0 ? process.argv[i + 1] : undefined;
  return email ? email.trim().toLowerCase() : null;
}

async function main() {
  assertNotProduction();

  const existing = await prisma.drop.findUnique({
    where: { slug: SLUG },
    select: { title: true, publishedAt: true, type: true },
  });
  // 같은 slug로 실제 드랍이 있으면 그 주문을 지우게 되므로 멈춘다
  if (
    existing &&
    (existing.publishedAt !== null ||
      !existing.title.startsWith('[테스트]') ||
      existing.type !== 'ticket')
  ) {
    throw new Error(
      `slug "${SLUG}"인 드랍이 테스트 드랍이 아닙니다 (공개됐거나 제목에 [테스트]가 없음). 중단합니다.`
    );
  }

  const now = Date.now();
  const drop = await prisma.drop.upsert({
    where: { slug: SLUG },
    create: {
      slug: SLUG,
      title: TITLE,
      type: 'ticket',
      venue: '테스트 공연장',
      eventDate: new Date(now + 2 * HOUR),
      eventEndDate: new Date(now + 6 * HOUR),
      publishedAt: null,
    },
    update: {
      eventDate: new Date(now + 2 * HOUR),
      eventEndDate: new Date(now + 6 * HOUR),
      publishedAt: null,
      allowReentry: false,
    },
    select: { id: true },
  });

  // 초기화 — 이 드랍의 입장 기록과 주문(→ 주문항목·티켓 cascade)만 지운다
  await prisma.checkIn.deleteMany({ where: { dropId: drop.id } });
  await prisma.order.deleteMany({ where: { dropId: drop.id } });

  const soldCount = BUYERS.filter((b) => !('cancelled' in b)).reduce(
    (n, b) => n + b.qty,
    0
  );
  const tier =
    (await prisma.ticketTier.findFirst({
      where: { dropId: drop.id, name: '일반' },
      select: { id: true },
    })) ??
    (await prisma.ticketTier.create({
      data: { dropId: drop.id, name: '일반', price: PRICE, quantity: 50 },
      select: { id: true },
    }));
  await prisma.ticketTier.update({
    where: { id: tier.id },
    data: { soldCount },
  });

  const created: { buyer: string; token: string; status: string }[] = [];
  for (const [i, buyer] of BUYERS.entries()) {
    const cancelled = 'cancelled' in buyer;
    const order = await prisma.order.create({
      data: {
        orderNo: generateOrderNo(),
        accessToken: generateAccessToken(),
        dropId: drop.id,
        buyerName: buyer.name,
        buyerEmail: `gate-test+${i + 1}@example.com`,
        buyerPhone: buyer.phone,
        totalAmount: PRICE * buyer.qty,
        status: cancelled ? 'cancelled' : 'paid',
        items: {
          create: {
            ticketTierId: tier.id,
            quantity: buyer.qty,
            unitPrice: PRICE,
            subtotal: PRICE * buyer.qty,
          },
        },
      },
      select: { id: true, items: { select: { id: true } } },
    });
    for (let n = 0; n < buyer.qty; n++) {
      const token = generateTicketToken();
      await prisma.ticket.create({
        data: {
          token,
          orderId: order.id,
          orderItemId: order.items[0].id,
          ticketTierId: tier.id,
          status: cancelled ? 'cancelled' : 'active',
        },
      });
      created.push({
        buyer: buyer.qty > 1 ? `${buyer.name} (${n + 1})` : buyer.name,
        token,
        status: cancelled ? 'cancelled' : 'active',
      });
    }
  }

  // 게스트 1팀(본인 +1) — 어드민 addGuest와 같은 형태: 0원·등급 없음·isGuest
  const guest = await prisma.order.create({
    data: {
      orderNo: generateOrderNo(),
      accessToken: generateAccessToken(),
      dropId: drop.id,
      buyerName: '게스트 홍길동',
      buyerEmail: '',
      buyerPhone: '',
      totalAmount: 0,
      status: 'paid',
      isGuest: true,
      note: '아티스트 게스트',
      items: { create: { quantity: 2, unitPrice: 0, subtotal: 0 } },
    },
    select: { id: true, items: { select: { id: true } } },
  });
  for (let n = 0; n < 2; n++) {
    const token = generateTicketToken();
    await prisma.ticket.create({
      data: { token, orderId: guest.id, orderItemId: guest.items[0].id },
    });
    created.push({
      buyer: `게스트 홍길동 (${n + 1})`,
      token,
      status: 'active',
    });
  }

  const staffEmail = staffArg();
  if (staffEmail) {
    const staff = await prisma.staff.upsert({
      where: { email: staffEmail },
      create: { email: staffEmail },
      update: {},
      select: { id: true },
    });
    await prisma.dropStaff.upsert({
      where: { dropId_staffId: { dropId: drop.id, staffId: staff.id } },
      create: { dropId: drop.id, staffId: staff.id },
      update: {},
    });
  }

  const sheetPath = join(tmpdir(), 'gate-test-qr.html');
  const cards = await Promise.all(
    created.map(async (t) => {
      const svg = await QRCode.toString(getTicketScanUrl(t.token), {
        type: 'svg',
        margin: 1,
      });
      return `<figure><div class="qr">${svg}</div><figcaption>${t.buyer}${
        t.status === 'cancelled' ? ' · 취소됨' : ''
      }</figcaption></figure>`;
    })
  );
  writeFileSync(
    sheetPath,
    `<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>게이트 테스트 QR</title><style>body{font-family:system-ui;margin:16px;display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:16px}figure{margin:0;padding:12px;border:1px solid #ddd;border-radius:8px;text-align:center}.qr svg{width:100%;height:auto}figcaption{margin-top:8px;font-size:14px}</style>${cards.join('')}`
  );

  console.log(`\n✓ 테스트 드랍 준비 완료 — ${TITLE}`);
  console.log(`  dropId   ${drop.id}`);
  console.log(
    `  스캐너   http://localhost:3000/admin/drops/${drop.id}/scanner`
  );
  console.log(`  편집     http://localhost:3000/admin/drops/${drop.id}/edit`);
  console.log(`  QR 시트  ${sheetPath}`);
  if (staffEmail) console.log(`  스태프   ${staffEmail} 배정됨`);
  console.log('\n  티켓');
  for (const t of created)
    console.log(`  - ${t.buyer.padEnd(14)} ${t.status.padEnd(9)} ${t.token}`);
  console.log('');
}

main()
  .catch((error) => {
    console.error(`\n✗ ${error instanceof Error ? error.message : error}`);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
