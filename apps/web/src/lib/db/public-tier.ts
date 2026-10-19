import type { Prisma } from '@prisma/client';

/**
 * 공개 화면에 보이는 티켓 등급만 고르는 조건. 비공개 등급(`accessCode`가 있는 것)은
 * 초대 링크로 들어온 사람에게만 보여야 하므로 목록 최저가·판매 상태·홈·OG 같은
 * 공개 집계에 섞이면 안 된다 — 공개 쿼리에서 `ticketTiers`를 읽을 때는 이 조건을
 * 붙일 것: `ticketTiers: { where: publicTierWhere, ... }`.
 */
export const publicTierWhere = {
  accessCode: null,
} as const satisfies Prisma.TicketTierWhereInput;
