import { randomUUID } from 'node:crypto';
import type { OfflineRecord } from '@prectxe/gate-contract';
import type { CheckInKind, Prisma } from '@prisma/client';
import { ORDERS } from '@/lib/constants/constants';
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
  /** `already`일 때만 — 먼저 입장한 입구 */
  checkedInGate?: string | null;
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
  /** 취소 기록이 되돌린 입장의 clientId */
  undoes?: string;
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
    undoes: input.undoes ?? null,
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
          isGuest: true,
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
  const tierName =
    ticket.ticketTier?.name ??
    (ticket.order.isGuest ? ORDERS.GUEST_TIER_LABEL : '티켓');

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
    if (!allowReentry) {
      // 거절 화면에 "언제·어디서 들어갔는지"를 보여준다. 거절 때만 조회한다.
      // 지금의 입장 상태를 만든 기록을 찾는다 — 입장 시각(checkedInAt)과 스캔
      // 시각이 같은 기록이다(undoEntry와 같은 기준). 취소된 옛 입장이나 중복
      // 표시된 입장의 입구를 보여주면 안 된다
      const settledBy = await prisma.checkIn.findFirst({
        where: {
          ticketId: ticket.id,
          kind: 'entry',
          flag: null,
          ...(current.checkedInAt && { scannedAt: current.checkedInAt }),
        },
        orderBy: { scannedAt: 'desc' },
        select: { gate: true },
      });
      return {
        success: true,
        result: 'already',
        data: { ...view, checkedInGate: settledBy?.gate ?? null },
      };
    }

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

export type UndoEntryOutcome =
  /**
   * 취소 기록을 남겼다. `reverted`: 그 입장이 지금의 입장 상태를 만든 기록이라
   * 티켓도 미입장으로 되돌렸는지 — 재입장·중복 표시 기록이거나 이미 다른
   * 상태로 바뀐 뒤면 false(기록만 남음). 같은 취소의 재전송이면 false
   */
  | { status: 'applied'; reverted: boolean }
  /** 되돌릴 입장 기록이 서버에 없다 (거절됐거나 아직 안 올라옴) */
  | { status: 'not_found' }
  | { status: 'rejected'; error: string };

/**
 * 특정 입장 기록(`undoes`)을 취소한다 — 게이트 앱의 온라인·오프라인 취소와
 * 웹(스캐너·입장 기록·게스트 명단)의 취소가 모두 이 경로다. 토큰 기준으로 현재
 * 상태만 되돌리지 않고, 그 입장이 지금의 입장 상태를 만든 기록일 때만 티켓을
 * 되돌린다. 재입장 기록이나
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
    if (replay === 'same') return { status: 'applied', reverted: false };
    if (replay === 'mismatch')
      return { status: 'rejected', error: CLIENT_ID_MISMATCH };
    return null;
  };
  const early = await replayed();
  if (early) return early;

  const target = await prisma.checkIn.findUnique({
    where: { clientId: undoes },
    select: { ticketId: true, kind: true, flag: true, scannedAt: true },
  });
  if (!target || target.kind !== 'entry') return { status: 'not_found' };
  if (target.ticketId !== ticket.id)
    return {
      status: 'rejected',
      error: '다른 티켓의 입장은 취소할 수 없습니다.',
    };

  try {
    const reverted = await prisma.$transaction(async (tx) => {
      // 중복·취소 티켓으로 표시된 입장은 애초에 티켓 상태를 바꾼 적이 없다
      const { count } = target.flag
        ? { count: 0 }
        : await tx.ticket.updateMany({
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
          undoes,
          at,
        }),
      });
      return count > 0;
    });
    return { status: 'applied', reverted };
  } catch (error) {
    if (!isClientIdConflict(error)) throw error;
    const late = await replayed();
    if (late) return late;
    throw error;
  }
}

/**
 * 이 입장 기록이 지금의 입장 상태를 만든 기록인지 — `undoEntry`가 티켓을
 * 되돌리는 기준과 같다. 입장 기록 화면의 '취소' 버튼도 이것만 연다.
 */
export function isCurrentEntry(
  entry: { kind: string; flag: string | null; scannedAt: Date },
  ticket: { status: string; checkedInAt: Date | null }
): boolean {
  return (
    entry.kind === 'entry' &&
    !entry.flag &&
    ticket.status === 'checked_in' &&
    ticket.checkedInAt?.getTime() === entry.scannedAt.getTime()
  );
}

/**
 * 티켓의 지금 입장을 취소한다 — 그 입장 상태를 만든 기록을 찾아 `undoEntry`로.
 * 게스트 명단처럼 '이 사람의 입장'을 되돌리는 화면이 쓴다. 대상 기록을
 * 지정하므로 입장 기록 화면에 어느 입장이 취소됐는지 남는다.
 */
export async function undoCurrentEntry(input: {
  token: string;
  dropId: string;
  actor: CheckInActor;
}): Promise<UndoEntryOutcome> {
  const { token, dropId, actor } = input;
  const ticket = await prisma.ticket.findUnique({
    where: { token },
    select: {
      id: true,
      status: true,
      checkedInAt: true,
      order: { select: { dropId: true } },
    },
  });
  if (!ticket)
    return { status: 'rejected', error: '유효하지 않은 티켓입니다.' };
  if (ticket.order.dropId !== dropId)
    return { status: 'rejected', error: '다른 공연의 입장권입니다.' };
  if (ticket.status !== 'checked_in' || !ticket.checkedInAt)
    return { status: 'rejected', error: '입장한 티켓이 아닙니다.' };

  const current = await prisma.checkIn.findFirst({
    where: {
      ticketId: ticket.id,
      kind: 'entry',
      flag: null,
      scannedAt: ticket.checkedInAt,
    },
    select: { clientId: true },
  });
  if (!current) return { status: 'not_found' };

  return undoEntry({
    dropId,
    actor,
    token,
    clientId: randomUUID(),
    undoes: current.clientId,
    at: new Date(),
  });
}

// ─── 오프라인 기록 동기화 ─────────────────────────────

// 계약의 기록 형태에서 scannedAt만 Date로 바꾼 것. 유니언을 유지하려고 분배한다
type WithDate<T> = T extends unknown
  ? Omit<T, 'scannedAt'> & { scannedAt: Date }
  : never;
export type OfflineRecordInput = WithDate<OfflineRecord>;

export type OfflineOutcome =
  | {
      status:
        | 'applied'
        | 'duplicate'
        | 'cancelled_ticket'
        | 'skipped'
        | 'retry';
    }
  | { status: 'rejected'; error: string };

// 상태를 읽은 뒤 조건부 갱신 사이에 다른 입구가 끼면 다시 읽는다. 그 이상
// 계속 바뀌면 retry로 돌려 앱이 다음 동기화 때 다시 보내게 한다 (거절하면
// 앱이 기록을 버린다).
const OFFLINE_MAX_ATTEMPTS = 3;

/**
 * 오프라인 동안 기기가 판정한 기록 1건을 반영한다. 기기는 이미 사람을
 * 들여보냈으므로 입장 기록은 항상 남긴다 — 들여보내면 안 됐던 경우(이미
 * 입장한 티켓, 취소된 티켓)는 막을 수 없으니 `flag`로 표시해 주최자가 사후에
 * 확인하게 한다. 재전송은 clientId로 걸러 처음 결과를 돌려준다.
 */
export async function applyOfflineRecord(input: {
  dropId: string;
  actor: CheckInActor;
  record: OfflineRecordInput;
}): Promise<OfflineOutcome> {
  const { dropId, actor, record } = input;
  // 기기 시계가 앞서 있으면 미래 시각이 들어온다 — 서버 시각을 넘지 않게
  const at = new Date(Math.min(record.scannedAt.getTime(), Date.now()));

  // 취소는 온라인 취소와 같은 규칙(대상 입장 지정)을 그대로 쓴다
  if (record.kind === 'undo') {
    const outcome = await undoEntry({
      dropId,
      actor,
      token: record.token,
      clientId: record.clientId,
      undoes: record.undoes,
      gate: record.gate,
      at,
    });
    // 되돌릴 입장이 서버에 없다 (거절됐거나 아직 안 올라옴) — 반영할 것 없음
    // 동기화 응답은 계약의 상태만 내려보낸다 (reverted는 웹 화면용)
    if (outcome.status === 'not_found') return { status: 'skipped' };
    if (outcome.status === 'applied') return { status: 'applied' };
    return outcome;
  }

  const ticket = await prisma.ticket.findUnique({
    where: { token: record.token },
    select: {
      id: true,
      status: true,
      order: {
        select: {
          status: true,
          dropId: true,
          drop: { select: { allowReentry: true } },
        },
      },
    },
  });
  if (!ticket)
    return { status: 'rejected', error: '유효하지 않은 티켓입니다.' };
  if (ticket.order.dropId !== dropId)
    return { status: 'rejected', error: '다른 공연의 입장권입니다.' };

  const replayed = async (): Promise<OfflineOutcome | null> => {
    const prev = await prisma.checkIn.findUnique({
      where: { clientId: record.clientId },
      select: { ticketId: true, kind: true, flag: true },
    });
    if (!prev) return null;
    if (prev.ticketId !== ticket.id || prev.kind !== record.kind)
      return { status: 'rejected', error: CLIENT_ID_MISMATCH };
    return { status: prev.flag ?? 'applied' };
  };

  // 미입장 티켓이면 재전송 조회를 건너뛴다 (온라인 입장과 같은 이유). 그
  // 경우의 재전송·ID 충돌은 아래 갱신 0건·고유키 충돌 지점에서 다시 확인한다.
  if (ticket.status !== 'active') {
    const early = await replayed();
    if (early) return early;
  }

  const entryLog = (flag: 'duplicate' | 'cancelled_ticket' | null) => ({
    ...logData({
      kind: 'entry',
      ticketId: ticket.id,
      dropId,
      actor,
      gate: record.gate,
      clientId: record.clientId,
      at,
    }),
    flag,
  });

  try {
    const allowReentry = ticket.order.drop?.allowReentry ?? false;
    // 첫 시도는 위에서 읽은 상태를 쓰고, 경합으로 갱신이 0건이면 다시 읽는다
    let current: { status: string; order: { status: string } } | null = ticket;
    for (let attempt = 0; attempt < OFFLINE_MAX_ATTEMPTS; attempt++) {
      if (attempt > 0)
        current = await prisma.ticket.findUnique({
          where: { id: ticket.id },
          select: { status: true, order: { select: { status: true } } },
        });
      if (!current)
        return { status: 'rejected', error: '유효하지 않은 티켓입니다.' };

      // 목록을 받은 뒤 취소·환불된 티켓 — 티켓 상태는 그대로 두고 표시만
      if (current.status === 'cancelled' || current.order.status !== 'paid') {
        await prisma.checkIn.create({ data: entryLog('cancelled_ticket') });
        return { status: 'cancelled_ticket' };
      }

      if (current.status === 'active') {
        const entered = await prisma.$transaction(async (tx) => {
          const { count } = await tx.ticket.updateMany({
            where: { id: ticket.id, status: 'active' },
            // 입장 시각은 서버 수신이 아니라 실제로 들여보낸 시각
            data: {
              status: 'checked_in',
              checkedInAt: at,
              checkedInBy: actorId(actor),
            },
          });
          if (count === 0) return false;
          await tx.checkIn.create({ data: entryLog(null) });
          return true;
        });
        if (entered) return { status: 'applied' };
        const late = await replayed();
        if (late) return late;
        continue;
      }

      // 이미 입장한 티켓. 재입장 행사면 정상, 아니면 중복으로 표시.
      // 기록 직전 입장 취소가 끼지 않게 조건부 갱신으로 행을 잠근다.
      const flag = allowReentry ? null : 'duplicate';
      const recorded = await prisma.$transaction(async (tx) => {
        const { count } = await tx.ticket.updateMany({
          where: { id: ticket.id, status: 'checked_in' },
          data: { updatedAt: new Date() },
        });
        if (count === 0) return false;
        await tx.checkIn.create({ data: entryLog(flag) });
        return true;
      });
      if (recorded) return { status: flag ?? 'applied' };
    }
    return { status: 'retry' };
  } catch (error) {
    if (!isClientIdConflict(error)) throw error;
    const late = await replayed();
    if (late) return late;
    throw error;
  }
}
