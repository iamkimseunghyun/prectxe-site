import type {
  GateDrop,
  GateTicket,
  GateTicketsResponse,
} from '@prectxe/gate-contract';
import { prisma } from '@/lib/db/prisma';

// 행사 목록에 노출하는 시간 창. 입장 준비(목록 다운로드)를 하루 전부터 할 수
// 있게 하고, 종료(없으면 시작) 후 반나절까지는 늦은 입장·정리를 위해 남긴다.
const SHOW_BEFORE_MS = 24 * 60 * 60 * 1000;
const SHOW_AFTER_MS = 12 * 60 * 60 * 1000;
// 변경분 조회를 앞당기는 폭. 트랜잭션 지연·인스턴스 간 시계 차보다 넉넉하게
const SINCE_OVERLAP_MS = 60 * 1000;

const gateDropSelect = {
  id: true,
  title: true,
  eventDate: true,
  eventEndDate: true,
  venue: true,
  allowReentry: true,
} as const;

function toGateDrop(drop: {
  id: string;
  title: string;
  eventDate: Date | null;
  eventEndDate: Date | null;
  venue: string | null;
  allowReentry: boolean;
}): GateDrop {
  return {
    ...drop,
    eventDate: drop.eventDate?.toISOString() ?? null,
    eventEndDate: drop.eventEndDate?.toISOString() ?? null,
  };
}

/** 스태프에게 배정된 티켓 행사 중 지금 입장을 처리할 만한 것만 */
export async function listStaffDrops(staffId: string): Promise<GateDrop[]> {
  const now = Date.now();
  const drops = await prisma.drop.findMany({
    where: {
      type: 'ticket',
      staff: { some: { staffId } },
      eventDate: { not: null, lte: new Date(now + SHOW_BEFORE_MS) },
      OR: [
        { eventEndDate: { gte: new Date(now - SHOW_AFTER_MS) } },
        {
          eventEndDate: null,
          eventDate: { gte: new Date(now - SHOW_AFTER_MS) },
        },
      ],
    },
    select: gateDropSelect,
    orderBy: { eventDate: 'asc' },
  });
  return drops.map(toGateDrop);
}

function phoneLast4(phone: string): string | null {
  const digits = phone.replace(/\D/g, '');
  return digits.length >= 4 ? digits.slice(-4) : null;
}

/**
 * 오프라인 판정용 티켓 목록. `since`가 있으면 그 뒤 바뀐 것만 — 티켓 상태가
 * 바뀌었거나(입장·취소·재입장) 주문 상태가 바뀐 경우(관리자 환불 등) 둘 다.
 * 판정에 필요한 최소 정보만 내려보낸다 (이메일·전화번호 전체는 제외).
 */
export async function getDropTickets(
  dropId: string,
  since?: Date
): Promise<GateTicketsResponse | null> {
  // 조회 전에 시각을 잡아야 조회 중에 바뀐 행을 다음 폴링이 놓치지 않는다
  const syncedAt = new Date();

  const drop = await prisma.drop.findUnique({
    where: { id: dropId },
    select: gateDropSelect,
  });
  if (!drop) return null;

  // updatedAt은 갱신 문장을 실행할 때(커밋 전) 함수 인스턴스의 시계로 찍힌다.
  // 그 사이에 폴링하면 아직 안 보이던 행이 since보다 이른 시각으로 커밋돼 영영
  // 빠지므로 since를 앞당겨 겹치게 받는다. 응답은 티켓의 현재 상태 전체라 같은
  // 티켓을 두 번 받아도 앱은 덮어쓰기만 하면 된다.
  const from = since && new Date(since.getTime() - SINCE_OVERLAP_MS);
  const tickets = await prisma.ticket.findMany({
    where: {
      order: { dropId },
      ...(from && {
        OR: [
          { updatedAt: { gte: from } },
          { order: { updatedAt: { gte: from } } },
        ],
      }),
    },
    select: {
      token: true,
      status: true,
      checkedInAt: true,
      order: { select: { status: true, buyerName: true, buyerPhone: true } },
      ticketTier: { select: { name: true } },
    },
    orderBy: { createdAt: 'asc' },
  });

  return {
    drop: toGateDrop(drop),
    tickets: tickets.map(
      (t): GateTicket => ({
        token: t.token,
        // 주문이 결제 상태가 아니면(취소·환불) 티켓 상태와 무관하게 무효
        status: t.order.status === 'paid' ? t.status : 'cancelled',
        buyerName: t.order.buyerName,
        tierName: t.ticketTier?.name ?? '티켓',
        phoneLast4: phoneLast4(t.order.buyerPhone),
        checkedInAt: t.checkedInAt?.toISOString() ?? null,
      })
    ),
    syncedAt: syncedAt.toISOString(),
  };
}

/** 어드민 드랍 편집 화면의 스태프 목록 */
export async function getDropStaff(dropId: string) {
  const rows = await prisma.dropStaff.findMany({
    where: { dropId },
    select: {
      createdAt: true,
      staff: { select: { id: true, email: true, name: true } },
    },
    orderBy: { createdAt: 'asc' },
  });
  return rows.map((r) => r.staff);
}
