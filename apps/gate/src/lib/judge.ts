import {
  type CheckInResponse,
  extractTicketToken,
  type GateDrop,
} from '@prectxe/gate-contract';
import * as Crypto from 'expo-crypto';
import { GateApiError } from './api';
import {
  type AuthedRequest,
  enqueueEntry,
  findTicket,
  markEntered,
} from './roster';

// 판정은 세 가지뿐이다 — 스태프가 글자를 읽지 않고 색만 보고 움직일 수 있게.
// 초록: 들여보낸다 / 빨강: 들여보내지 않는다 / 노랑: 구매 내역을 확인하고 판단한다

/** 이 시간 안에 서버가 답하지 않으면 기기 명단으로 판정한다 (PRD FR-3) */
export const SERVER_DECISION_MS = 800;

type Person = { name: string; tier: string; note?: string | null };

export type Verdict =
  | ({ color: 'green'; title: string; offline: boolean } & Person)
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
      offline: true;
      /** 수동 승인하면 이 값으로 큐에 넣는다 — 서버 요청에 쓴 clientId 그대로 */
      pending: { token: string; clientId: string; scannedAt: string };
    };

export type JudgeInput = {
  request: AuthedRequest;
  drop: GateDrop;
  gate: string;
  data: string;
  /** false면 서버를 건너뛰고 바로 기기 명단으로 판정한다 */
  tryServer: boolean;
};

export type JudgeOutcome = {
  verdict: Verdict;
  /** 서버에 닿았는지 — 오프라인 표시에 쓴다. 서버를 시도하지 않았으면 null */
  reachedServer: boolean | null;
};

const timeFormat = new Intl.DateTimeFormat('ko-KR', {
  timeZone: 'Asia/Seoul',
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
});

function describeEntry(at: string | null, gate?: string | null): string {
  const parts = [
    at ? `${timeFormat.format(new Date(at))} 입장` : '입장 기록 있음',
  ];
  if (gate) parts.push(`${gate} 입구`);
  return parts.join(' · ');
}

/** 서버가 판정을 못 한 경우 — 네트워크·타임아웃·서버 오류. 기기 명단으로 넘어간다 */
function unreachable(error: unknown): boolean {
  return (
    error instanceof GateApiError && (error.status === 0 || error.status >= 500)
  );
}

export async function judge(input: JudgeInput): Promise<JudgeOutcome> {
  const { request, drop, gate, data, tryServer } = input;

  const token = extractTicketToken(data);
  if (!token)
    return {
      verdict: {
        color: 'red',
        title: '유효하지 않은 QR',
        reason: 'PRECTXE 입장권 QR이 아닙니다.',
        offline: false,
      },
      reachedServer: null,
    };

  const clientId = Crypto.randomUUID();
  const scannedAt = new Date().toISOString();

  if (tryServer) {
    try {
      const res = await request<CheckInResponse>(`/drops/${drop.id}/check-in`, {
        method: 'POST',
        body: { token, clientId, gate },
        timeoutMs: SERVER_DECISION_MS,
      });
      const { ticket } = res;
      markEntered(drop.id, token, ticket.checkedInAt ?? scannedAt);
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
          reachedServer: true,
        };
      return {
        verdict: {
          color: 'green',
          title: res.result === 'reentered' ? '재입장' : '입장',
          offline: false,
          ...person,
          note: findTicket(drop.id, token)?.note,
        },
        reachedServer: true,
      };
    } catch (error) {
      if (!unreachable(error)) {
        // 서버가 내린 거절(다른 행사·취소·없는 티켓 등)은 그대로 보여준다
        const message =
          error instanceof GateApiError
            ? error.message
            : '판정하지 못했습니다.';
        return {
          verdict: {
            color: 'red',
            title: '입장 불가',
            reason: message,
            offline: false,
          },
          reachedServer: true,
        };
      }
    }
  }

  return {
    verdict: judgeLocally({ drop, gate, token, clientId, scannedAt }),
    reachedServer: tryServer ? false : null,
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
  token: string;
  clientId: string;
  scannedAt: string;
}): Verdict {
  const { drop, gate, token, clientId, scannedAt } = args;
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

  enqueueEntry({ dropId: drop.id, clientId, token, gate, scannedAt });
  return {
    color: 'green',
    title: ticket.status === 'checked_in' ? '재입장' : '입장',
    offline: true,
    ...person,
  };
}

/** 노랑(명단에 없음)을 스태프가 확인하고 들여보낸 경우 */
export function approvePending(
  drop: GateDrop,
  gate: string,
  pending: { token: string; clientId: string; scannedAt: string }
) {
  enqueueEntry({ dropId: drop.id, gate, ...pending });
}
