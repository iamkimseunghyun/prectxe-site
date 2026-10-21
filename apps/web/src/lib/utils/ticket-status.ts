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

/**
 * 잔여 수량을 화면에 보여주는 경계. 잔여가 이 값 이하(또는 인당 구매 제한 이하)일 때만
 * "잔여 N장"을 알린다 — 넉넉할 땐 숨겨서 판매 속도(= 정확한 판매량)가 공개 페이지에서
 * 계산되지 않게 한다.
 */
export const LOW_STOCK_THRESHOLD = 10;

/**
 * 공개 화면(클라이언트)에 내려보내는 티켓 등급. **`quantity`·`soldCount`를 일부러 뺐다** —
 * 화면에서만 숨기면 props로 내려간 정확한 판매량을 페이지 소스에서 읽을 수 있다.
 * 클라이언트가 필요로 하는 파생값(`status`·`maxSelectable`·`lowStockRemaining`)은
 * 서버에서 `toPublicTier`로 계산해 넘긴다.
 */
export type PublicTier = {
  id: string;
  name: string;
  description: string | null;
  price: number;
  maxPerOrder: number;
  saleStart: Date | null;
  saleEnd: Date | null;
  /** 값이 있으면 초대 링크로만 보이는 비공개 등급 */
  accessCode: string | null;
  status: EffectiveTierStatus;
  /** 한 번에 고를 수 있는 최대 수량 = min(잔여, 인당 구매 제한) */
  maxSelectable: number;
  /** 잔여가 적을 때만 실제 값, 넉넉하면 null(숨김) */
  lowStockRemaining: number | null;
};

/**
 * 한 번에 고를 수 있는 수량과 "잔여 N" 노출 여부를 정한다(티켓·굿즈 공용).
 * - 선택 상한 `maxSelectable` = min(잔여, 1회 구매 상한)
 * - 잔여가 `max(LOW_STOCK_THRESHOLD, 1회 구매 상한)` 이하일 때만 `lowStockRemaining`에 값을 준다.
 *   상한이 잔여에 걸리는 구간(잔여 < 1회 구매 상한)은 항상 알려서, 수량 버튼이 왜 멈추는지
 *   보이게 한다. 반대로 잔여가 넉넉하면 상한은 1회 구매 상한이라 잔여를 유추할 수 없다
 *   (수량 버튼을 끝까지 눌러 재고를 알아내는 우회로를 막는다).
 */
function getStockDisplay(remaining: number, maxPerOrder: number) {
  const left = Math.max(0, remaining);
  const showRemaining =
    left > 0 && left <= Math.max(LOW_STOCK_THRESHOLD, maxPerOrder);
  return {
    maxSelectable: Math.min(maxPerOrder, left),
    lowStockRemaining: showRemaining ? left : null,
  };
}

/** DB 등급 → 공개 화면용 등급. 잔여 수량·판매 상태 판정은 모두 여기서(서버에서) 끝낸다. */
export function toPublicTier(
  tier: {
    id: string;
    name: string;
    description: string | null;
    price: number;
    quantity: number;
    soldCount: number;
    maxPerOrder: number;
    saleStart: Date | null;
    saleEnd: Date | null;
    accessCode: string | null;
  },
  event?: {
    eventDate?: Date | string | null;
    eventEndDate?: Date | string | null;
  } | null
): PublicTier {
  const { maxSelectable, lowStockRemaining } = getStockDisplay(
    tier.quantity - tier.soldCount,
    tier.maxPerOrder
  );

  return {
    id: tier.id,
    name: tier.name,
    description: tier.description,
    price: tier.price,
    maxPerOrder: tier.maxPerOrder,
    saleStart: tier.saleStart,
    saleEnd: tier.saleEnd,
    accessCode: tier.accessCode,
    status: getEffectiveTierStatus(tier, event),
    maxSelectable,
    lowStockRemaining,
  };
}

/**
 * 굿즈 옵션의 1회 구매 상한. 굿즈엔 등급의 `maxPerOrder` 같은 컬럼이 없는데, 화면의 수량
 * 버튼 상한이 곧 재고(잔여)였다 — 숨긴 잔여를 버튼을 끝까지 눌러 알아낼 수 있어서
 * 잔여 대신 이 값으로 상한을 둔다. 서버 주문 검증에는 없는 화면 상한이다.
 */
export const GOODS_MAX_PER_ORDER = 10;

/** 공개 화면(클라이언트)에 내려보내는 굿즈 옵션. `stock`·`soldCount`를 일부러 뺐다. */
export type PublicVariant = {
  id: string;
  name: string;
  price: number;
  soldOut: boolean;
  /** 한 번에 고를 수 있는 최대 수량 = min(잔여, GOODS_MAX_PER_ORDER) */
  maxSelectable: number;
  /** 잔여가 적을 때만 실제 값, 넉넉하면 null(숨김) */
  lowStockRemaining: number | null;
};

/** DB 굿즈 옵션 → 공개 화면용 옵션. 재고 판정은 서버에서 끝낸다. */
export function toPublicVariant(variant: {
  id: string;
  name: string;
  price: number;
  stock: number;
  soldCount: number;
}): PublicVariant {
  const remaining = variant.stock - variant.soldCount;
  return {
    id: variant.id,
    name: variant.name,
    price: variant.price,
    soldOut: remaining <= 0,
    ...getStockDisplay(remaining, GOODS_MAX_PER_ORDER),
  };
}
