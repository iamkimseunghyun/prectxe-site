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
