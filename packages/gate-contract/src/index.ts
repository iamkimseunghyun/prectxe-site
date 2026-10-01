import { z } from 'zod';

// 게이트 앱 ↔ 웹 API 계약. 웹 Route Handler는 요청을 이 스키마로 검증하고,
// 앱은 같은 스키마로 요청을 만들고 같은 타입으로 응답을 읽는다.
// 앱(React Native) 번들에도 들어가므로 런타임 의존은 zod 하나로 유지할 것.

export const GATE_API_PREFIX = '/api/gate';

const email = z
  .string()
  .trim()
  .toLowerCase()
  .pipe(z.email('이메일 형식이 아닙니다.'));

// ─── 요청 ────────────────────────────────────────────

export const requestCodeBody = z.object({ email });
export type RequestCodeBody = z.infer<typeof requestCodeBody>;

export const verifyCodeBody = z.object({
  email,
  code: z.string().regex(/^\d{6}$/, '6자리 숫자를 입력해주세요.'),
});
export type VerifyCodeBody = z.infer<typeof verifyCodeBody>;

/**
 * 입장·입장 취소 요청. `clientId`는 앱이 기록마다 만드는 UUID —
 * 응답을 못 받아 같은 요청을 다시 보내도 서버는 한 번만 처리한다.
 */
export const checkInBody = z.object({
  token: z.string().min(1).max(200),
  clientId: z.uuid(),
  gate: z.string().trim().min(1).max(20).optional(),
});
export type CheckInBody = z.infer<typeof checkInBody>;

export const undoBody = checkInBody;
export type UndoBody = CheckInBody;

/** `since`를 주면 그 시각 이후 바뀐 티켓만 돌려준다 (다른 입구 반영용 폴링) */
export const ticketsQuery = z.object({
  since: z.iso.datetime({ offset: true }).optional(),
});
export type TicketsQuery = z.infer<typeof ticketsQuery>;

// ─── 응답 ────────────────────────────────────────────
// 날짜는 전부 ISO 8601 문자열이다 (JSON 직렬화 그대로).

export type ApiError = { error: string };

export type StaffProfile = {
  id: string;
  email: string;
  name: string | null;
};

export type RequestCodeResponse = { ok: true };

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
  };
};

export type UndoResponse = { ok: true };
