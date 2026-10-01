import { prisma } from '@/lib/db/prisma';

// 전체 기록 표에 보여줄 최대 행 수 (1,500명 행사 기준 여유분). 집계와 확인
// 필요 목록은 이 제한과 별개로 전체를 기준으로 한다.
const CHECK_IN_LOG_LIMIT = 3000;

const logSelect = {
  id: true,
  kind: true,
  flag: true,
  gate: true,
  scannedAt: true,
  createdAt: true,
  userId: true,
  staff: { select: { name: true, email: true } },
  ticket: {
    select: {
      order: { select: { buyerName: true, orderNo: true } },
      ticketTier: { select: { name: true } },
    },
  },
} as const;

/** 어드민 입장 기록 화면. 스캔 시각 최신순 */
export async function getDropCheckInLog(dropId: string) {
  const [rows, flagged, byKind] = await Promise.all([
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
  ]);

  const truncated = rows.length > CHECK_IN_LOG_LIMIT;
  const count = (kind: 'entry' | 'undo') =>
    byKind.find((g) => g.kind === kind)?._count ?? 0;

  return {
    entries: truncated ? rows.slice(0, CHECK_IN_LOG_LIMIT) : rows,
    truncated,
    flagged,
    counts: { entry: count('entry'), undo: count('undo') },
  };
}

export type CheckInLog = Awaited<ReturnType<typeof getDropCheckInLog>>;
export type CheckInLogEntry = CheckInLog['entries'][number];
