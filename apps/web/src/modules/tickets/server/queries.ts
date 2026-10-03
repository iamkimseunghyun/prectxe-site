import { prisma } from '@/lib/db/prisma';
import { isCurrentEntry } from './check-in';

// 전체 기록 표에 보여줄 최대 행 수 (1,500명 행사 기준 여유분). 집계와 확인
// 필요 목록은 이 제한과 별개로 전체를 기준으로 한다.
const CHECK_IN_LOG_LIMIT = 3000;

const logSelect = {
  id: true,
  clientId: true,
  kind: true,
  flag: true,
  gate: true,
  scannedAt: true,
  createdAt: true,
  userId: true,
  staff: { select: { name: true, email: true } },
  ticket: {
    select: {
      status: true,
      checkedInAt: true,
      order: { select: { buyerName: true, orderNo: true, isGuest: true } },
      ticketTier: { select: { name: true } },
    },
  },
} as const;

/** 어드민 입장 기록 화면. 스캔 시각 최신순 */
export async function getDropCheckInLog(dropId: string) {
  const [rows, flaggedRows, byKind, voids] = await Promise.all([
    // 한 건 더 읽어 실제로 잘렸는지 판단한다
    prisma.checkIn.findMany({
      where: { dropId },
      select: logSelect,
      orderBy: { scannedAt: 'desc' },
      take: CHECK_IN_LOG_LIMIT + 1,
    }),
    prisma.checkIn.findMany({
      where: { dropId, flag: { not: null } },
      select: logSelect,
      orderBy: { scannedAt: 'desc' },
    }),
    prisma.checkIn.groupBy({
      by: ['kind'],
      where: { dropId },
      _count: true,
    }),
    // 게이트 앱의 취소는 어느 입장을 되돌렸는지 남긴다 — 표시된 입장이 이미
    // 취소로 무효가 됐으면 '확인 필요'에서 뺀다
    prisma.checkIn.findMany({
      where: { dropId, kind: 'undo', undoes: { not: null } },
      select: { undoes: true },
    }),
  ]);

  const voided = new Set(voids.map((v) => v.undoes));
  const annotateEntry = <
    T extends {
      clientId: string;
      kind: string;
      flag: string | null;
      scannedAt: Date;
      ticket: { status: string; checkedInAt: Date | null };
    },
  >(
    row: T
  ) => ({
    ...row,
    voided: voided.has(row.clientId),
    // 지금의 입장 상태를 만든 기록 — 입장 기록 화면의 '취소' 버튼은 이것만
    current: isCurrentEntry(row, row.ticket),
  });

  const truncated = rows.length > CHECK_IN_LOG_LIMIT;
  const count = (kind: 'entry' | 'undo') =>
    byKind.find((g) => g.kind === kind)?._count ?? 0;
  const flagged = flaggedRows.map(annotateEntry);

  return {
    entries: (truncated ? rows.slice(0, CHECK_IN_LOG_LIMIT) : rows).map(
      annotateEntry
    ),
    truncated,
    flagged,
    counts: {
      entry: count('entry'),
      undo: count('undo'),
      needsReview: flagged.filter((f) => !f.voided).length,
    },
  };
}

export type CheckInLog = Awaited<ReturnType<typeof getDropCheckInLog>>;
export type CheckInLogEntry = CheckInLog['entries'][number];

/** 어드민 게스트 화면. 취소(삭제)된 게스트는 빼고 최근 추가순 */
export async function getDropGuests(dropId: string) {
  return prisma.order.findMany({
    where: { dropId, isGuest: true, status: 'paid' },
    select: {
      id: true,
      buyerName: true,
      buyerPhone: true,
      buyerEmail: true,
      note: true,
      accessToken: true,
      createdAt: true,
      tickets: {
        select: { token: true, status: true, checkedInAt: true },
        orderBy: { createdAt: 'asc' },
      },
    },
    orderBy: { createdAt: 'desc' },
  });
}

/**
 * 어드민 입장 현황 명단 — 결제된 주문의 티켓(게스트 포함) 한 장이 한 행.
 * 집계 기준은 `getCheckInStats`와 같다(active·checked_in). 입구는 지금의 입장
 * 상태를 만든 기록(`isCurrentEntry`)에서 가져오므로, 취소 후 다시 입장해도
 * 마지막 입구가 나온다. 폴링으로 반복 호출되니 토큰·연락처는 내려보내지 않는다.
 */
export async function getDropRoster(dropId: string) {
  const tickets = await prisma.ticket.findMany({
    where: {
      status: { in: ['active', 'checked_in'] },
      order: { dropId, status: 'paid' },
    },
    select: {
      id: true,
      status: true,
      checkedInAt: true,
      order: {
        select: { buyerName: true, orderNo: true, isGuest: true, note: true },
      },
      ticketTier: { select: { name: true } },
      checkIns: {
        where: { kind: 'entry' },
        select: { kind: true, flag: true, gate: true, scannedAt: true },
        orderBy: { scannedAt: 'desc' },
        take: 3,
      },
    },
    orderBy: { createdAt: 'asc' },
  });

  return tickets.map((t) => ({
    id: t.id,
    entered: t.status === 'checked_in',
    checkedInAt: t.checkedInAt,
    buyerName: t.order.buyerName,
    orderNo: t.order.orderNo,
    isGuest: t.order.isGuest,
    note: t.order.note,
    tierName: t.ticketTier?.name ?? null,
    gate:
      t.status === 'checked_in'
        ? (t.checkIns.find((c) => isCurrentEntry(c, t))?.gate ?? null)
        : null,
  }));
}

export type RosterEntry = Awaited<ReturnType<typeof getDropRoster>>[number];

export type DropGuest = Awaited<ReturnType<typeof getDropGuests>>[number];
