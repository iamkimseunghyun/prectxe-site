/**
 * TicketTier 상태를 saleStart/saleEnd/soldCount/quantity + 행사 종료 시각에서
 * 실시간 계산. DB의 status 필드 대신 이 함수를 사용
 */
export type EffectiveTierStatus =
  | 'scheduled'
  | 'on_sale'
  | 'sold_out'
  | 'closed';

/** 행사 종료 시각 — eventEndDate 우선, 없으면 eventDate. 둘 다 없으면 null */
function eventEndOf(event: {
  eventDate?: Date | string | null;
  eventEndDate?: Date | string | null;
}): Date | null {
  const end = event.eventEndDate ?? event.eventDate;
  return end ? new Date(end) : null;
}

/** 행사가 이미 끝났는가. 날짜가 없는 드랍(상시 굿즈 등)은 항상 false */
export function isEventOver(
  event: {
    eventDate?: Date | string | null;
    eventEndDate?: Date | string | null;
  },
  now: Date = new Date()
): boolean {
  const end = eventEndOf(event);
  return end !== null && end < now;
}

/**
 * 판정 우선순위: closed > sold_out > scheduled > on_sale
 *
 * 매진은 **판매창이 열려 있는 동안에만** 의미 있는 상태다. 주문 취소 시
 * 재고가 복구되므로(cancelOrder) 판매 중 매진은 "지금은 없음, 풀릴 수 있음"이지만,
 * 판매가 마감됐거나 행사가 끝난 뒤의 매진은 아무 행동도 유도하지 못한다.
 * 그래서 종료가 매진을 이긴다. (#94 이전에는 반대라 끝난 공연이 계속 '매진'이었다)
 *
 * @param event 소속 drop의 행사 일시. 넘기면 행사 종료 후 closed로 판정한다.
 *   생략하면 판매창(saleEnd)만으로 판정하므로, saleEnd가 비어 있는 등급은
 *   행사가 끝나도 on_sale로 남는다 — 결제 경로에서는 반드시 넘길 것.
 */
export function getEffectiveTierStatus(
  tier: {
    saleStart: Date | string | null;
    saleEnd: Date | string | null;
    soldCount: number;
    quantity: number;
  },
  event?: {
    eventDate?: Date | string | null;
    eventEndDate?: Date | string | null;
  } | null
): EffectiveTierStatus {
  const now = new Date();

  if (event && isEventOver(event, now)) return 'closed';
  if (tier.saleEnd && new Date(tier.saleEnd) < now) return 'closed';
  if (tier.soldCount >= tier.quantity) return 'sold_out';
  if (tier.saleStart && new Date(tier.saleStart) > now) return 'scheduled';
  return 'on_sale';
}

export type EffectiveDropStatus =
  | 'upcoming'
  | 'on_sale'
  | 'sold_out'
  | 'closed';

/**
 * Drop 전체의 노출용 상태를 tier(티켓)/variant(굿즈) + 행사 일시에서 실시간 파생한다.
 * 수동 Drop.status 컬럼을 대체 — 판매 가능 여부의 단일 출처는 판매창+재고+행사일이다.
 * - 행사가 끝났으면(eventEndDate ?? eventDate 경과) 재고와 무관하게 closed
 * - ticket: 등급들의 getEffectiveTierStatus 집계
 *   (on_sale 있으면 on_sale > scheduled 있으면 upcoming >
 *    sold_out 있으면 sold_out > 나머지 closed)
 * - goods: variant 재고 잔량 있으면 on_sale, 전부 소진이면 sold_out
 * - 등급/옵션이 아직 없으면 upcoming(준비 중)
 */
export function getEffectiveDropStatus(drop: {
  type: 'ticket' | 'goods';
  eventDate?: Date | string | null;
  eventEndDate?: Date | string | null;
  ticketTiers?: {
    saleStart: Date | string | null;
    saleEnd: Date | string | null;
    soldCount: number;
    quantity: number;
  }[];
  variants?: { stock: number; soldCount: number }[];
}): EffectiveDropStatus {
  if (isEventOver(drop)) return 'closed';

  if (drop.type === 'ticket') {
    const tiers = drop.ticketTiers ?? [];
    if (tiers.length === 0) return 'upcoming';
    const statuses = tiers.map((t) => getEffectiveTierStatus(t, drop));
    if (statuses.includes('on_sale')) return 'on_sale';
    if (statuses.includes('scheduled')) return 'upcoming';
    // 살아 있는 판매창이 없을 때, 매진 등급이 하나라도 있으면 매진으로 알린다
    // (취소분이 풀릴 수 있는 상태) — 전부 마감이면 종료
    if (statuses.includes('sold_out')) return 'sold_out';
    return 'closed';
  }

  const variants = drop.variants ?? [];
  if (variants.length === 0) return 'upcoming';
  const hasStock = variants.some((v) => v.stock - v.soldCount > 0);
  return hasStock ? 'on_sale' : 'sold_out';
}

/**
 * 여러 TicketTier에서 드랍 전체의 판매 윈도를 파생한다.
 * - saleStart: 티어들의 non-null saleStart 중 가장 이른 값 (판매가 처음 열리는 시각)
 * - saleEnd: 티어들의 non-null saleEnd 중 가장 늦은 값 (판매가 완전히 닫히는 시각)
 * 해당 값이 하나도 없으면 null. 카운트다운 표시용.
 */
export function getDropSaleWindow(
  tiers: { saleStart: Date | string | null; saleEnd: Date | string | null }[]
): { saleStart: Date | null; saleEnd: Date | null } {
  let saleStart: Date | null = null;
  let saleEnd: Date | null = null;

  for (const tier of tiers) {
    if (tier.saleStart) {
      const start = new Date(tier.saleStart);
      if (!saleStart || start < saleStart) saleStart = start;
    }
    if (tier.saleEnd) {
      const end = new Date(tier.saleEnd);
      if (!saleEnd || end > saleEnd) saleEnd = end;
    }
  }

  return { saleStart, saleEnd };
}
