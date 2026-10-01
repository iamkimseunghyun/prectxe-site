import { prisma } from '@/lib/db/prisma';

// 한 행사 기록이 이보다 많으면 오래된 것부터 잘린다 (1,500명 행사 기준 여유분)
const CHECK_IN_LOG_LIMIT = 3000;

/** 어드민 입장 기록 화면. 스캔 시각 최신순 */
export async function getDropCheckInLog(dropId: string) {
  const entries = await prisma.checkIn.findMany({
    where: { dropId },
    select: {
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
    },
    orderBy: { scannedAt: 'desc' },
    take: CHECK_IN_LOG_LIMIT,
  });
  return { entries, truncated: entries.length === CHECK_IN_LOG_LIMIT };
}

export type CheckInLogEntry = Awaited<
  ReturnType<typeof getDropCheckInLog>
>['entries'][number];
