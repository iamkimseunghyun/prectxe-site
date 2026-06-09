/**
 * TicketTier 상태를 saleStart/saleEnd/soldCount/quantity에서 실시간 계산
 * DB의 status 필드 대신 이 함수를 사용
 */
export type EffectiveTierStatus =
  | 'scheduled'
  | 'on_sale'
  | 'sold_out'
  | 'closed';

export function getEffectiveTierStatus(tier: {
  saleStart: Date | string | null;
  saleEnd: Date | string | null;
  soldCount: number;
  quantity: number;
}): EffectiveTierStatus {
  const now = new Date();

  if (tier.soldCount >= tier.quantity) return 'sold_out';
  if (tier.saleEnd && new Date(tier.saleEnd) < now) return 'closed';
  if (tier.saleStart && new Date(tier.saleStart) > now) return 'scheduled';
  return 'on_sale';
}

export type EffectiveDropStatus =
  | 'upcoming'
  | 'on_sale'
  | 'sold_out'
  | 'closed';

/**
 * Drop 전체의 노출용 상태를 tier(티켓)/variant(굿즈)에서 실시간 파생한다.
 * 수동 Drop.status 컬럼을 대체 — 판매 가능 여부의 단일 출처는 판매창+재고다.
 * - ticket: 등급들의 getEffectiveTierStatus 집계
 *   (on_sale 있으면 on_sale > scheduled 있으면 upcoming > 전부 sold_out이면 sold_out > 나머지 closed)
 * - goods: variant 재고 잔량 있으면 on_sale, 전부 소진이면 sold_out
 * - 등급/옵션이 아직 없으면 upcoming(준비 중)
 */
export function getEffectiveDropStatus(drop: {
  type: 'ticket' | 'goods';
  ticketTiers?: {
    saleStart: Date | string | null;
    saleEnd: Date | string | null;
    soldCount: number;
    quantity: number;
  }[];
  variants?: { stock: number; soldCount: number }[];
}): EffectiveDropStatus {
  if (drop.type === 'ticket') {
    const tiers = drop.ticketTiers ?? [];
    if (tiers.length === 0) return 'upcoming';
    const statuses = tiers.map(getEffectiveTierStatus);
    if (statuses.includes('on_sale')) return 'on_sale';
    if (statuses.includes('scheduled')) return 'upcoming';
    if (statuses.every((s) => s === 'sold_out')) return 'sold_out';
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
