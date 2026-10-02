import { z } from 'zod';

// 게이트 앱 ↔ 웹 API 계약. 웹 Route Handler는 요청을 이 스키마로 검증하고,
// 앱은 같은 스키마로 요청을 만들고 같은 타입으로 응답을 읽는다.
// 앱(React Native) 번들에도 들어가므로 런타임 의존은 zod 하나로 유지할 것.

export const GATE_API_PREFIX = '/api/gate';

// QR 파서는 의존성이 없어 웹 클라이언트 번들이 zod 없이 쓸 수 있게 따로 둔다
export { extractTicketToken } from './qr';

const email = z
  .string()
  .trim()
  .toLowerCase()
  .pipe(z.email('이메일 형식이 아닙니다.'));

// ─── 요청 ────────────────────────────────────────────

export const requestCodeBody = z.object({ email });
export type RequestCodeBody = z.infer<typeof requestCodeBody>;

/**
 * `challengeId`는 request-code 응답으로 받은 값. 코드는 이 요청에 묶여 있어,
 * 다른 사람이 같은 이메일로 코드를 요청하거나 틀린 코드를 넣어도 내 요청의
 * 코드와 시도 횟수에는 영향이 없다.
 */
export const verifyCodeBody = z.object({
  email,
  challengeId: z.uuid(),
  code: z.string().regex(/^\d{6}$/, '6자리 숫자를 입력해주세요.'),
});
export type VerifyCodeBody = z.infer<typeof verifyCodeBody>;

/**
 * 길이 제한 — 앱도 같은 값으로 미리 막는다. 넘는 값이 오프라인 큐에 들어가면
 * 그 기록이 든 배치가 통째로 400을 받아 뒤의 기록까지 영영 올라가지 못한다.
 */
export const TICKET_TOKEN_MAX = 200;
export const GATE_NAME_MAX = 20;

const ticketToken = z.string().min(1).max(TICKET_TOKEN_MAX);
const gateName = z.string().trim().min(1).max(GATE_NAME_MAX);

/**
 * 입장·입장 취소 요청. `clientId`는 앱이 기록마다 만드는 UUID —
 * 응답을 못 받아 같은 요청을 다시 보내도 서버는 한 번만 처리한다.
 */
export const checkInBody = z.object({
  token: ticketToken,
  clientId: z.uuid(),
  gate: gateName.optional(),
});
export type CheckInBody = z.infer<typeof checkInBody>;

/**
 * 입장 취소는 되돌릴 입장 기록의 clientId(`undoes`)를 함께 보낸다. 토큰만
 * 보내면 이 기기가 처리하지 않은 다른 입구의 정상 입장까지 취소된다 —
 * 예를 들어 "이미 입장"이 뜬 캡처 QR을 자기 실수로 알고 취소하면 먼저 들어간
 * 사람의 입장이 지워진다. 그래서 앱은 자기가 `entered`를 받은 입장만 취소한다.
 */
export const undoBody = checkInBody.extend({ undoes: z.uuid() });
export type UndoBody = z.infer<typeof undoBody>;

/**
 * `since`를 주면 그 시각 이후 바뀐 티켓만 돌려준다 (다른 입구 반영용 폴링).
 * 놓치지 않으려고 서버가 1분 겹치게 조회하므로 이미 받은 티켓이 다시 올 수
 * 있다 — 토큰 기준으로 덮어쓰면 된다.
 */
export const ticketsQuery = z.object({
  since: z.iso.datetime({ offset: true }).optional(),
});
export type TicketsQuery = z.infer<typeof ticketsQuery>;

const offlineBase = {
  clientId: z.uuid(),
  token: ticketToken,
  gate: gateName.optional(),
  scannedAt: z.iso.datetime({ offset: true }),
};

/**
 * 오프라인 동안 기기에 쌓인 기록 1건. `scannedAt`은 기기가 실제로 판정한
 * 시각으로 입장 시각에 쓰인다. 적용 순서는 `scannedAt`이 아니라 **배열 순서**다 —
 * 기기 시계가 중간에 보정되면 시각 순서가 실제 순서와 어긋나므로, 앱은 기록이
 * 생긴 순서 그대로 보내야 한다.
 *
 * 취소(`undo`)는 되돌릴 입장 기록의 clientId(`undoes`)를 함께 보낸다. 토큰만
 * 보내면, 이 기기의 입장이 중복으로 표시됐을 때 다른 입구의 정상 입장을
 * 대신 취소해버린다. 아직 올리지 않은 입장을 취소하는 경우엔 기기에서
 * 그 입장을 큐에서 지우면 되고, 서버로 보낼 필요가 없다.
 */
export const offlineRecord = z.discriminatedUnion('kind', [
  z.object({ ...offlineBase, kind: z.literal('entry') }),
  z.object({ ...offlineBase, kind: z.literal('undo'), undoes: z.uuid() }),
]);
export type OfflineRecord = z.infer<typeof offlineRecord>;

/** 한 번에 최대 200건. 더 쌓였으면 나눠 보낸다 */
export const SYNC_BATCH_LIMIT = 200;

export const syncBody = z.object({
  records: z
    .array(offlineRecord)
    .min(1)
    .max(SYNC_BATCH_LIMIT)
    // 결과를 clientId로 돌려주므로 한 배치 안에서 겹치면 어느 결과인지 모른다
    .refine(
      (records) =>
        new Set(records.map((r) => r.clientId)).size === records.length,
      '같은 clientId가 한 배치에 두 번 들어 있습니다.'
    ),
});
export type SyncBody = z.infer<typeof syncBody>;

// ─── 응답 ────────────────────────────────────────────
// 날짜는 전부 ISO 8601 문자열이다 (JSON 직렬화 그대로).

export type ApiError = { error: string };

export type StaffProfile = {
  id: string;
  email: string;
  name: string | null;
};

/**
 * 등록된 스태프인지와 무관하게 항상 같은 형태다. `challengeId`를 보관했다가
 * verify에 함께 보낸다.
 */
export type RequestCodeResponse = { ok: true; challengeId: string };

export type VerifyCodeResponse = {
  /** 이후 요청의 `Authorization: Bearer <token>`. 다시 받을 수 없으니 안전하게 보관할 것 */
  token: string;
  expiresAt: string;
  staff: StaffProfile;
};

export type MeResponse = { staff: StaffProfile };

export type GateDrop = {
  id: string;
  title: string;
  eventDate: string | null;
  eventEndDate: string | null;
  venue: string | null;
  allowReentry: boolean;
};

export type GateDropsResponse = { drops: GateDrop[] };

/** 결제가 취소·환불된 주문의 티켓은 `cancelled`로 내려간다 */
export type GateTicketStatus = 'active' | 'checked_in' | 'cancelled';

export type GateTicket = {
  token: string;
  status: GateTicketStatus;
  buyerName: string;
  tierName: string;
  /** 명단 검색용 전화번호 뒷자리. 전화번호 전체는 기기에 내려보내지 않는다 */
  phoneLast4: string | null;
  checkedInAt: string | null;
  /** 게스트 메모 (누구의 게스트인지 등). 판매 주문은 null */
  note: string | null;
};

export type GateTicketsResponse = {
  drop: GateDrop;
  tickets: GateTicket[];
  /** 다음 폴링 때 `since`로 그대로 넘길 값 */
  syncedAt: string;
};

export type CheckInResult = 'entered' | 'reentered' | 'already';

export type CheckInResponse = {
  result: CheckInResult;
  ticket: {
    buyerName: string;
    tierName: string;
    checkedInAt: string | null;
    /**
     * `already`일 때, 지금의 입장 상태를 만든 입장 기록의 입구 — 거절 화면에
     * "언제·어디서"를 보여준다. 입장을 취소한 뒤 다른 입구로 다시 들어왔으면
     * 취소된 옛 입구가 아니라 다시 들어온 입구다
     */
    checkedInGate: string | null;
  };
};

export type UndoResponse = { ok: true };

/**
 * 동기화 결과. `retry`만 빼고 전부 최종 상태라, 앱은 그 기록을 큐에서 지우고
 * `retry`인 기록만 남겨 다음 동기화 때 다시 보낸다.
 * - `applied`: 정상 반영 (재전송이라 이미 반영돼 있던 경우 포함)
 * - `duplicate`: 이미 입장한 티켓이 또 입장 — 기록은 남기고 주최자에게 표시
 * - `cancelled_ticket`: 취소·환불된 티켓으로 입장 — 기록은 남기고 표시
 * - `skipped`: 되돌릴 입장이 없는 취소 등, 반영할 것이 없음
 * - `rejected`: 없는 티켓·다른 행사 티켓·요청 ID 충돌 (`error`에 사유)
 * - `retry`: 일시적 문제로 반영하지 못함 — 큐에 남겨 다시 보낼 것
 */
export type SyncRecordStatus =
  | 'applied'
  | 'duplicate'
  | 'cancelled_ticket'
  | 'skipped'
  | 'rejected'
  | 'retry';

export type SyncResponse = {
  results: { clientId: string; status: SyncRecordStatus; error?: string }[];
};
