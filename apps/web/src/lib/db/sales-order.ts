import type { Prisma } from '@prisma/client';

/**
 * 판매 주문만 고르는 조건. 게스트(`isGuest`)는 어드민이 0원으로 발급한 입장
 * 자격이라 매출·주문 수·주문 목록·내보내기·구매자 대상 발송에 섞이면 안 된다.
 * 주문을 집계하거나 나열하는 쿼리는 이 조건을 spread해서 쓸 것 —
 * `where: { dropId, status: 'paid', ...salesOrderWhere }`.
 */
export const salesOrderWhere = {
  isGuest: false,
} as const satisfies Prisma.OrderWhereInput;
