import {
  type CheckInResponse,
  extractTicketToken,
  type GateDrop,
  TICKET_TOKEN_MAX,
} from '@prectxe/gate-contract';
import * as Crypto from 'expo-crypto';
import { GateApiError, isUnreachable } from './api';
import { formatClock } from './format';
import {
  type AuthedRequest,
  enqueueEntry,
  findTicket,
  markEntered,
  PLACEHOLDER_NAME,
  PLACEHOLDER_TIER,
} from './roster';

// 판정은 세 가지뿐이다 — 스태프가 글자를 읽지 않고 색만 보고 움직일 수 있게.
// 초록: 들여보낸다 / 빨강: 들여보내지 않는다 / 노랑: 들여보내기 전에 확인한다

/** 이 시간 안에 서버가 답하지 않으면 기기 명단으로 판정한다 (PRD FR-3) */
export const SERVER_DECISION_MS = 800;

type Person = { name: string; tier: string; note?: string | null };

type Pending = { token: string; clientId: string; scannedAt: string };

/** 초록 판정을 취소할 때 필요한 것 — 서버·큐에 남은 그 입장의 clientId */
export type EntryRef = { token: string; clientId: string; reentry: boolean };

export type Verdict =
  | ({
      color: 'green';
      title: string;
      offline: boolean;
      entry: EntryRef;
      /** 재입장일 때 직전 입장 — "직전 13:05 입장 (3분 전) · B 입구" */
      previous?: string;
    } & Person)
  | ({
      color: 'red';
      title: string;
      reason?: string;
      offline: boolean;
    } & Partial<Person>)
  | {
      color: 'yellow';
      title: string;
      reason: string;
      offline: boolean;
      /**
       * 명단에 없는 QR — 수동 승인하면 이 값으로 큐에 넣는다(서버 요청에 쓴
       * clientId 그대로). 없으면 티켓이 아니라 앱 쪽 문제로 판정을 못 한 것이라
       * 승인 버튼 없이 닫기만 있다.
       */
      pending?: Pending;
    };

export type JudgeInput = {
  request: AuthedRequest;
  drop: GateDrop;
  gate: string;
  /** 기기 판정을 큐에 넣을 때 남긴다 — 공용 기기에서 남의 기록을 올리지 않게 */
  staffId: string;
  data: string;
  /** false면 서버를 건너뛰고 바로 기기 명단으로 판정한다 */
  tryServer: boolean;
};

/**
 * - `ok`: 서버가 답했다(입장·거절 모두)
 * - `slow`: 연결은 되는데 0.8초 안에 답이 없었다 — 이번 스캔만 기기로 판정
 * - `down`: 연결 실패·서버 오류 — 잠시 서버를 건너뛰고 오프라인으로 표시
 * - `skipped`: 서버를 시도하지 않았다
 */
export type ServerState = 'ok' | 'slow' | 'down' | 'skipped';

export type JudgeOutcome = { verdict: Verdict; server: ServerState };

function describeEntry(at: string | null, gate?: string | null): string {
  const parts = [at ? `${formatClock(at)} 입장` : '입장 기록 있음'];
  if (gate) parts.push(`${gate} 입구`);
  return parts.join(' · ');
}

function agoLabel(iso: string): string {
  const minutes = Math.floor((Date.now() - new Date(iso).getTime()) / 60_000);
  if (minutes < 1) return '방금';
  if (minutes < 60) return `${minutes}분 전`;
  return `${Math.floor(minutes / 60)}시간 전`;
}

/**
 * 재입장 화면용 — "직전 13:05 입장 (3분 전) · B 입구". 같은 QR이 방금 다른
 * 입구로 들어갔다면 복제된 QR일 수 있어, 스태프가 알아볼 수 있게 보여준다
 */
function describePrevious(at: string | null, gate?: string | null): string {
  const parts = [
    at
      ? `직전 ${formatClock(at)} 입장 (${agoLabel(at)})`
      : '직전 입장 기록 있음',
  ];
  if (gate) parts.push(`${gate} 입구`);
  // 두 줄로 — 한 줄이면 화면 폭에서 "입구"가 어색하게 갈라진다
  return parts.join('\n');
}

/**
 * 티켓이 아니라 앱·권한 쪽 문제로 판정하지 못했을 때. 빨강으로 띄우면
 * 스태프가 색만 보고 정상 관객을 돌려보낸다.
 */
export function cannotJudge(reason: string): Verdict {
  return { color: 'yellow', title: '판정 불가', reason, offline: false };
}

/** 기기 명단 쓰기는 판정 결과를 바꾸지 않는다 — 실패해도 화면은 서버 판정대로 */
function quietly<T>(work: () => T): T | undefined {
  try {
    return work();
  } catch (error) {
    console.warn('[gate] 기기 명단 갱신 실패', error);
    return undefined;
  }
}

export async function judge(input: JudgeInput): Promise<JudgeOutcome> {
  const { request, drop, gate, staffId, data, tryServer } = input;

  // 계약의 길이 제한을 넘는 값을 큐에 넣으면 그 배치가 영영 거절된다
  const parsed = extractTicketToken(data);
  const token = parsed && parsed.length <= TICKET_TOKEN_MAX ? parsed : null;
  if (!token)
    return {
      verdict: {
        color: 'red',
        title: '유효하지 않은 QR',
        reason: 'PRECTXE 입장권 QR이 아닙니다.',
        offline: false,
      },
      server: 'skipped',
    };

  const clientId = Crypto.randomUUID();
  const scannedAt = new Date().toISOString();
  let server: ServerState = 'skipped';

  if (tryServer) {
    let res: CheckInResponse | null = null;
    try {
      res = await request<CheckInResponse>(`/drops/${drop.id}/check-in`, {
        method: 'POST',
        body: { token, clientId, gate },
        timeoutMs: SERVER_DECISION_MS,
      });
    } catch (error) {
      if (isUnreachable(error)) {
        server = error.timedOut ? 'slow' : 'down';
      } else if (
        error instanceof GateApiError &&
        (error.status === 401 || error.status === 403)
      ) {
        // 로그인 만료·배정 해제는 관객의 티켓과 무관하다
        return {
          verdict: cannotJudge(
            `${error.message} 관리자에게 확인하고, 그동안은 구매 내역으로 확인해주세요.`
          ),
          server: 'ok',
        };
      } else {
        // 서버가 내린 거절(다른 행사·취소·없는 티켓 등)은 그대로 보여준다
        const reason =
          error instanceof GateApiError
            ? error.message
            : '판정하지 못했습니다.';
        return {
          verdict: { color: 'red', title: '입장 불가', reason, offline: false },
          server: 'ok',
        };
      }
    }

    if (res) {
      const { ticket } = res;
      quietly(() =>
        markEntered(drop.id, token, ticket.checkedInAt ?? scannedAt)
      );
      const person = { name: ticket.buyerName, tier: ticket.tierName };
      if (res.result === 'already')
        return {
          verdict: {
            color: 'red',
            title: '이미 입장',
            reason: describeEntry(ticket.checkedInAt, ticket.checkedInGate),
            offline: false,
            ...person,
          },
          server: 'ok',
        };
      const reentry = res.result === 'reentered';
      return {
        verdict: {
          color: 'green',
          title: reentry ? '재입장' : '입장',
          offline: false,
          entry: { token, clientId, reentry },
          ...person,
          note: quietly(() => findTicket(drop.id, token)?.note),
          previous: reentry
            ? describePrevious(ticket.checkedInAt, ticket.checkedInGate)
            : undefined,
        },
        server: 'ok',
      };
    }
  }

  return {
    verdict: judgeLocally({ drop, gate, staffId, token, clientId, scannedAt }),
    server,
  };
}

/**
 * 기기 명단으로 판정한다 (오프라인·서버 응답 지연). 기기가 아는 범위에서 첫
 * 입장이면 초록, 이미 입장이면 빨강, 명단에 없으면 노랑. "다른 입구 상태를
 * 모른다"는 노랑 사유가 아니다 — 겹친 입장은 동기화 후 서버가 표시한다.
 */
function judgeLocally(args: {
  drop: GateDrop;
  gate: string;
  staffId: string;
  token: string;
  clientId: string;
  scannedAt: string;
}): Verdict {
  const { drop, gate, staffId, token, clientId, scannedAt } = args;
  const ticket = findTicket(drop.id, token);

  if (!ticket)
    return {
      color: 'yellow',
      title: '확인 필요',
      reason:
        '기기 명단에 없는 QR입니다. 명단을 받은 뒤 발급된 티켓일 수 있어요. 구매 확정 메일이나 입장권 페이지를 확인해주세요.',
      offline: true,
      pending: { token, clientId, scannedAt },
    };

  const person = {
    name: ticket.buyerName,
    tier: ticket.tierName,
    note: ticket.note,
  };
  if (ticket.status === 'cancelled')
    return {
      color: 'red',
      title: '취소된 티켓',
      reason: '취소·환불된 입장권입니다.',
      offline: true,
      ...person,
    };
  if (ticket.status === 'checked_in' && !drop.allowReentry)
    return {
      color: 'red',
      title: '이미 입장',
      reason: describeEntry(ticket.checkedInAt),
      offline: true,
      ...person,
    };

  enqueueEntry({ dropId: drop.id, staffId, clientId, token, gate, scannedAt });
  const reentry = ticket.status === 'checked_in';
  return {
    color: 'green',
    title: reentry ? '재입장' : '입장',
    offline: true,
    entry: { token, clientId, reentry },
    ...person,
    previous: reentry ? describePrevious(ticket.checkedInAt) : undefined,
  };
}

/** 노랑(명단에 없음)을 스태프가 확인하고 들여보낸 경우 */
export function approvePending(args: {
  drop: GateDrop;
  gate: string;
  staffId: string;
  pending: Pending;
}): Verdict {
  enqueueEntry({
    dropId: args.drop.id,
    gate: args.gate,
    staffId: args.staffId,
    ...args.pending,
  });
  return {
    color: 'green',
    title: '입장',
    name: PLACEHOLDER_NAME,
    tier: PLACEHOLDER_TIER,
    offline: true,
    entry: {
      token: args.pending.token,
      clientId: args.pending.clientId,
      reentry: false,
    },
  };
}
