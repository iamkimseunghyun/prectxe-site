import type { PnLRow } from '@/lib/schemas/pnl';

export const DEFAULT_SCENARIOS = ['낙관', '기본', '비관'];

function emptyValues(): PnLRow['values'] {
  return Object.fromEntries(
    DEFAULT_SCENARIOS.map((s) => [s, { qty: null, price: null, amount: null }])
  );
}

let seq = 0;
const id = (prefix: string) => `${prefix}-${++seq}`;

function header(label: string, section: PnLRow['section']): PnLRow {
  return {
    id: id('h'),
    type: 'header',
    section,
    label,
    inputMode: 'amount',
    values: emptyValues(),
  };
}

function item(
  label: string,
  section: PnLRow['section'],
  inputMode: PnLRow['inputMode'] = 'amount',
  costType: PnLRow['costType'] = null
): PnLRow {
  return {
    id: id('i'),
    type: 'item',
    section,
    costType: section === 'expense' ? costType : null,
    label,
    inputMode,
    values: emptyValues(),
  };
}

export function buildDefaultRows(): PnLRow[] {
  seq = 0;
  return [
    header('수익', 'revenue'),
    item('티켓 판매', 'revenue', 'qty_price'),
    item('굿즈 판매', 'revenue', 'qty_price'),
    item('스폰서십', 'revenue', 'amount'),
    item('지원금/보조금', 'revenue', 'amount'),
    item('기타 수익', 'revenue', 'amount'),

    header('비용', 'expense'),
    item('인건비 (기획/운영)', 'expense', 'amount', 'fixed'),
    item('아티스트 페이', 'expense', 'amount', 'fixed'),
    item('공간 대관료', 'expense', 'amount', 'fixed'),
    item('제작비 (무대/장비)', 'expense', 'amount', 'fixed'),
    item('홍보/디자인', 'expense', 'amount', 'fixed'),
    item('굿즈 제작 단가', 'expense', 'qty_price', 'variable'),
    item('티켓 결제 수수료', 'expense', 'amount', 'variable'),
    item('운영 잡비', 'expense', 'amount', 'variable'),
  ];
}
