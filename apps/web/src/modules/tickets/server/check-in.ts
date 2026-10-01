import { randomUUID } from 'node:crypto';
import type { CheckInKind, Prisma } from '@prisma/client';
import { prisma } from '@/lib/db/prisma';

// 입장 판정·기록. 웹 스캐너(server action)와 게이트 앱 API가 같은 함수를 쓴다.
// 'use server' 파일에 두면 인증 없는 RPC 엔드포인트로 노출되므로 분리했다 —
// 인증·권한 확인은 호출하는 쪽 책임이다.

export type CheckInActor = { userId: string };

type TicketView = {
  buyerName: string;
  tierName: string;
  checkedInAt: Date | null;
};

export type CheckInOutcome =
  | { success: false; error: string }
  | {
      success: true;
      result: 'entered' | 'reentered' | 'already';
      data: TicketView;
    };

type LogInput = {
  kind: CheckInKind;
  ticketId: string;
  dropId: string;
  actor: CheckInActor;
  gate?: string;
  at: Date;
};

function logData(input: LogInput): Prisma.CheckInUncheckedCreateInput {
  return {
    clientId: randomUUID(),
    kind: input.kind,
    ticketId: input.ticketId,
    dropId: input.dropId,
    gate: input.gate ?? null,
    userId: input.actor.userId,
    scannedAt: input.at,
  };
}

export async function checkInByToken(input: {
  token: string;
  dropId: string;
  actor: CheckInActor;
  gate?: string;
}): Promise<CheckInOutcome> {
  const { token, dropId, actor, gate } = input;

  const ticket = await prisma.ticket.findUnique({
    where: { token },
    select: {
      id: true,
      status: true,
      checkedInAt: true,
      order: {
        select: {
          status: true,
          buyerName: true,
          dropId: true,
          drop: { select: { title: true, allowReentry: true } },
        },
      },
      ticketTier: { select: { name: true } },
    },
  });

  if (!ticket) return { success: false, error: '유효하지 않은 티켓입니다.' };
  if (ticket.order.dropId !== dropId)
    return {
      success: false,
      // 어느 공연 것인지 알려줘야 입장구에서 바로 안내할 수 있다
      error: `다른 공연의 입장권입니다${
        ticket.order.drop ? ` (${ticket.order.drop.title})` : ''
      }.`,
    };
  if (ticket.status === 'cancelled')
    return { success: false, error: '취소된 티켓입니다.' };
  if (ticket.order.status !== 'paid')
    return { success: false, error: '결제가 완료되지 않은 티켓입니다.' };

  const buyerName = ticket.order.buyerName;
  const tierName = ticket.ticketTier?.name ?? '티켓';
  const allowReentry = ticket.order.drop?.allowReentry ?? false;

  if (ticket.status === 'active') {
    const now = new Date();
    const entered = await prisma.$transaction(async (tx) => {
      // 조회와 갱신 사이에 다른 입구가 같은 QR을 먼저 찍을 수 있다. active일
      // 때만 갱신해야 동시 스캔에서 한쪽만 입장으로 판정된다 (cancelOrder도
      // 같은 행을 cancelled로 바꾸므로 취소와 겹쳐도 이 조건에서 걸린다)
      const { count } = await tx.ticket.updateMany({
        where: { id: ticket.id, status: 'active' },
        data: {
          status: 'checked_in',
          checkedInAt: now,
          checkedInBy: actor.userId,
        },
      });
      if (count === 0) return false;
      await tx.checkIn.create({
        data: logData({
          kind: 'entry',
          ticketId: ticket.id,
          dropId,
          actor,
          gate,
          at: now,
        }),
      });
      return true;
    });
    if (entered)
      return {
        success: true,
        result: 'entered',
        data: { buyerName, tierName, checkedInAt: now },
      };
  }

  // 이미 입장한 티켓 — 처음부터 그랬거나, 방금 다른 입구가 먼저 찍었거나
  const current =
    ticket.status === 'active'
      ? await prisma.ticket.findUnique({
          where: { id: ticket.id },
          select: { status: true, checkedInAt: true },
        })
      : ticket;
  if (current?.status === 'cancelled')
    return { success: false, error: '취소된 티켓입니다.' };
  if (current?.status !== 'checked_in')
    return {
      success: false,
      error: '티켓 상태가 바뀌었습니다. 다시 스캔해주세요.',
    };

  const view = { buyerName, tierName, checkedInAt: current.checkedInAt };
  if (!allowReentry) return { success: true, result: 'already', data: view };

  // 재입장 허용 행사: 상태는 그대로 두고 입장 기록만 남긴다 (입구별 유입 집계용)
  await prisma.checkIn.create({
    data: logData({
      kind: 'entry',
      ticketId: ticket.id,
      dropId,
      actor,
      gate,
      at: new Date(),
    }),
  });
  return { success: true, result: 'reentered', data: view };
}

/**
 * 잘못 찍은 입장을 되돌린다. 티켓은 미입장으로 돌아가지만 기록은 지우지 않고
 * undo 기록을 덧붙인다. 다른 공연 스캐너에서 남의 티켓을 되돌리지 못하게
 * 같은 드랍 스코프를 건다.
 */
export async function undoCheckInByToken(input: {
  token: string;
  dropId: string;
  actor: CheckInActor;
  gate?: string;
}): Promise<{ success: true } | { success: false; error: string }> {
  const { token, dropId, actor, gate } = input;

  const ticket = await prisma.ticket.findUnique({
    where: { token },
    select: { id: true, order: { select: { dropId: true } } },
  });
  if (!ticket) return { success: false, error: '유효하지 않은 티켓입니다.' };
  if (ticket.order.dropId !== dropId)
    return { success: false, error: '다른 공연의 입장권입니다.' };

  const now = new Date();
  const undone = await prisma.$transaction(async (tx) => {
    const { count } = await tx.ticket.updateMany({
      where: { id: ticket.id, status: 'checked_in' },
      data: { status: 'active', checkedInAt: null, checkedInBy: null },
    });
    if (count === 0) return false;
    await tx.checkIn.create({
      data: logData({
        kind: 'undo',
        ticketId: ticket.id,
        dropId,
        actor,
        gate,
        at: now,
      }),
    });
    return true;
  });

  if (!undone) return { success: false, error: '체크인된 티켓이 아닙니다.' };
  return { success: true };
}
