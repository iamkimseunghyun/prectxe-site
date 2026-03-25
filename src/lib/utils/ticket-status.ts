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
