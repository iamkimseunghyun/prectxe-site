import { randomUUID } from 'node:crypto';
import type { CheckInKind, Prisma } from '@prisma/client';
import { prisma } from '@/lib/db/prisma';

// 입장 판정·기록. 웹 스캐너(server action)와 게이트 앱 API가 같은 함수를 쓴다.
// 'use server' 파일에 두면 인증 없는 RPC 엔드포인트로 노출되므로 분리했다 —
// 인증·권한 확인은 호출하는 쪽 책임이다.

/** 웹 스캐너는 어드민(User), 게이트 앱은 스태프(Staff)가 처리한다 */
export type CheckInActor = { userId: string } | { staffId: string };

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
  clientId?: string;
  at: Date;
};

// Ticket.checkedInBy는 FK 없는 문자열이라 어느 테이블의 ID인지 구분되게 둔다.
// 기존 값(웹 스캐너 = User.id)은 접두사 없이 그대로다. 처리자의 정확한 기록은
// CheckIn.userId/staffId에 있다.
function actorId(actor: CheckInActor): string {
  return 'userId' in actor ? actor.userId : `staff:${actor.staffId}`;
}

function logData(input: LogInput): Prisma.CheckInUncheckedCreateInput {
  return {
    // 앱은 기록마다 UUID를 붙여 보낸다. 웹 스캐너처럼 없으면 서버가 만든다
    clientId: input.clientId ?? randomUUID(),
    kind: input.kind,
    ticketId: input.ticketId,
    dropId: input.dropId,
    gate: input.gate ?? null,
    userId: 'userId' in input.actor ? input.actor.userId : null,
    staffId: 'staffId' in input.actor ? input.actor.staffId : null,
    scannedAt: input.at,
  };
}

/** 같은 clientId가 동시에 두 번 들어와 고유키에 걸린 경우 */
function isClientIdConflict(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    error.code === 'P2002'
  );
}

/**
 * 이미 처리한 clientId인지. 앱이 응답을 못 받고 같은 요청을 다시 보내면
 * 두 번째 요청은 "이미 입장"(빨강)으로 보이면 안 되고 처음 결과를 받아야 한다.
 * 다른 티켓에 쓰인 clientId면 잘못된 요청이다.
 */
async function findReplay(
  clientId: string | undefined,
  ticketId: string,
  kind: CheckInKind
): Promise<'none' | 'same' | 'mismatch'> {
  if (!clientId) return 'none';
  const prev = await prisma.checkIn.findUnique({
    where: { clientId },
    select: { ticketId: true, kind: true },
  });
  if (!prev) return 'none';
  // 티켓뿐 아니라 작업 종류까지 같아야 같은 요청이다 — 입장에 쓴 ID로 취소를
  // 보내면 실제로 취소하지 않고 성공만 돌려주게 된다
  return prev.ticketId === ticketId && prev.kind === kind ? 'same' : 'mismatch';
}

const CLIENT_ID_MISMATCH = '같은 요청 ID가 다른 요청에 이미 쓰였습니다.';

export async function checkInByToken(input: {
  token: string;
  dropId: string;
  actor: CheckInActor;
  gate?: string;
  clientId?: string;
}): Promise<CheckInOutcome> {
  const { token, dropId, actor, gate, clientId } = input;

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

  const buyerName = ticket.order.buyerName;
  const tierName = ticket.ticketTier?.name ?? '티켓';

  // 이 요청이 이미 처리된 재전송이면 처음 결과를, 아니면 null. 처음 들어올
  // 때뿐 아니라 갱신이 0건이거나 고유키에 걸렸을 때도 다시 본다 — 같은 요청이
  // 동시에 두 번 오면 둘 다 처음엔 'none'을 보고, 늦은 쪽은 먼저 커밋된 기록에
  // 막힌 뒤에야 재전송이었다는 걸 알 수 있다.
  const replayed = async (): Promise<CheckInOutcome | null> => {
    const replay = await findReplay(clientId, ticket.id, 'entry');
    if (replay === 'none') return null;
    if (replay === 'mismatch')
      return { success: false, error: CLIENT_ID_MISMATCH };
    const settled = await prisma.ticket.findUnique({
      where: { id: ticket.id },
      select: { checkedInAt: true },
    });
    return {
      success: true,
      result: 'entered',
      data: { buyerName, tierName, checkedInAt: settled?.checkedInAt ?? null },
    };
  };

  // 미입장 티켓의 첫 스캔이 대부분이라 그때는 재전송 조회를 건너뛴다 — 입장
  // 판정은 DB 왕복 하나하나가 응답 시간이다. 미입장 티켓에서의 재전송·ID 충돌은
  // 아래 갱신 0건·고유키 충돌 지점에서 다시 확인하므로 놓치지 않는다.
  if (ticket.status !== 'active') {
    const early = await replayed();
    if (early) return early;
  }

  if (ticket.status === 'cancelled')
    return { success: false, error: '취소된 티켓입니다.' };
  if (ticket.order.status !== 'paid')
    return { success: false, error: '결제가 완료되지 않은 티켓입니다.' };

  const allowReentry = ticket.order.drop?.allowReentry ?? false;
  const log = (at: Date) =>
    logData({
      kind: 'entry',
      ticketId: ticket.id,
      dropId,
      actor,
      gate,
      clientId,
      at,
    });

  try {
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
            checkedInBy: actorId(actor),
          },
        });
        if (count === 0) return false;
        await tx.checkIn.create({ data: log(now) });
        return true;
      });
      if (entered)
        return {
          success: true,
          result: 'entered',
          data: { buyerName, tierName, checkedInAt: now },
        };
      const late = await replayed();
      if (late) return late;
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

    // 재입장 허용 행사: 상태는 그대로 두고 입장 기록만 남긴다 (입구별 유입 집계용).
    // 확인과 기록 사이에 입장 취소·주문 취소가 끼면 기록과 상태가 어긋나므로,
    // 조건부 갱신으로 행을 잠그고 같은 트랜잭션에서 기록한다. 바꿀 값이 없으면
    // UPDATE 자체가 생략될 수 있어 updatedAt을 실제로 갱신한다.
    const now = new Date();
    const reentered = await prisma.$transaction(async (tx) => {
      const { count } = await tx.ticket.updateMany({
        where: { id: ticket.id, status: 'checked_in' },
        data: { updatedAt: now },
      });
      if (count === 0) return false;
      await tx.checkIn.create({ data: log(now) });
      return true;
    });
    if (!reentered)
      return {
        success: false,
        error: '티켓 상태가 바뀌었습니다. 다시 스캔해주세요.',
      };
    return { success: true, result: 'reentered', data: view };
  } catch (error) {
    // 고유키 충돌 — 같은 요청의 동시 재전송이면 먼저 들어간 쪽 결과를 준다.
    // 다른 요청이 같은 ID를 썼다면 트랜잭션이 롤백됐으므로 입장된 게 아니다
    if (!isClientIdConflict(error)) throw error;
    const late = await replayed();
    if (late) return late;
    throw error;
  }
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
  clientId?: string;
}): Promise<{ success: true } | { success: false; error: string }> {
  const { token, dropId, actor, gate, clientId } = input;

  const ticket = await prisma.ticket.findUnique({
    where: { token },
    select: { id: true, order: { select: { dropId: true } } },
  });
  if (!ticket) return { success: false, error: '유효하지 않은 티켓입니다.' };
  if (ticket.order.dropId !== dropId)
    return { success: false, error: '다른 공연의 입장권입니다.' };

  // checkInByToken과 같은 이유로 처음·갱신 0건·고유키 충돌 세 지점에서 본다
  const replayed = async () => {
    const replay = await findReplay(clientId, ticket.id, 'undo');
    if (replay === 'same') return { success: true } as const;
    if (replay === 'mismatch')
      return { success: false, error: CLIENT_ID_MISMATCH } as const;
    return null;
  };

  const early = await replayed();
  if (early) return early;

  const now = new Date();
  try {
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
          clientId,
          at: now,
        }),
      });
      return true;
    });
    if (undone) return { success: true };
    const late = await replayed();
    if (late) return late;
    return { success: false, error: '체크인된 티켓이 아닙니다.' };
  } catch (error) {
    if (!isClientIdConflict(error)) throw error;
    const late = await replayed();
    if (late) return late;
    throw error;
  }
}

export type UndoEntryOutcome =
  /** 취소 기록을 남겼다 (그 입장이 현재 상태를 만든 기록이면 티켓도 되돌렸다) */
  | { status: 'applied' }
  /** 되돌릴 입장 기록이 서버에 없다 (거절됐거나 아직 안 올라옴) */
  | { status: 'not_found' }
  | { status: 'rejected'; error: string };

/**
 * 특정 입장 기록(`undoes`)을 취소한다 — 게이트 앱의 온라인·오프라인 취소가
 * 쓴다. 토큰 기준으로 현재 상태를 되돌리는 `undoCheckInByToken`과 달리, 그
 * 입장이 지금의 입장 상태를 만든 기록일 때만 티켓을 되돌린다. 재입장 기록이나
 * 이미 취소된 뒤 다른 입구에서 다시 들어온 경우의 옛 입장은 현재 상태와 무관해
 * 되돌리면 다른 사람의 입장을 지운다 — 그때는 취소 기록만 남긴다.
 * (입장 기록의 scannedAt과 그 입장이 만든 티켓 checkedInAt은 같은 시각이다)
 */
export async function undoEntry(input: {
  dropId: string;
  actor: CheckInActor;
  token: string;
  clientId: string;
  undoes: string;
  gate?: string;
  at: Date;
}): Promise<UndoEntryOutcome> {
  const { dropId, actor, token, clientId, undoes, gate, at } = input;

  const ticket = await prisma.ticket.findUnique({
    where: { token },
    select: { id: true, order: { select: { dropId: true } } },
  });
  if (!ticket)
    return { status: 'rejected', error: '유효하지 않은 티켓입니다.' };
  if (ticket.order.dropId !== dropId)
    return { status: 'rejected', error: '다른 공연의 입장권입니다.' };

  const replayed = async (): Promise<UndoEntryOutcome | null> => {
    const replay = await findReplay(clientId, ticket.id, 'undo');
    if (replay === 'same') return { status: 'applied' };
    if (replay === 'mismatch')
      return { status: 'rejected', error: CLIENT_ID_MISMATCH };
    return null;
  };
  const early = await replayed();
  if (early) return early;

  const target = await prisma.checkIn.findUnique({
    where: { clientId: undoes },
    select: { ticketId: true, kind: true, scannedAt: true },
  });
  if (!target || target.kind !== 'entry') return { status: 'not_found' };
  if (target.ticketId !== ticket.id)
    return {
      status: 'rejected',
      error: '다른 티켓의 입장은 취소할 수 없습니다.',
    };

  try {
    await prisma.$transaction(async (tx) => {
      await tx.ticket.updateMany({
        where: {
          id: ticket.id,
          status: 'checked_in',
          checkedInAt: target.scannedAt,
        },
        data: { status: 'active', checkedInAt: null, checkedInBy: null },
      });
      await tx.checkIn.create({
        data: logData({
          kind: 'undo',
          ticketId: ticket.id,
          dropId,
          actor,
          gate,
          clientId,
          at,
        }),
      });
    });
    return { status: 'applied' };
  } catch (error) {
    if (!isClientIdConflict(error)) throw error;
    const late = await replayed();
    if (late) return late;
    throw error;
  }
}
