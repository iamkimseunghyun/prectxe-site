import type { PnLRow } from '@/lib/schemas/pnl';

export function computeRowAmount(row: PnLRow, scenario: string): number {
  const cell = row.values[scenario];
  if (!cell) return 0;
  if (row.inputMode === 'qty_price') {
    const qty = Number(cell.qty ?? 0);
    const price = Number(cell.price ?? 0);
    return qty * price;
  }
  return Number(cell.amount ?? 0);
}

export interface ScenarioTotals {
  revenue: number;
  expense: number;
  fixedCost: number;
  variableCost: number;
  net: number;
}

export function computeTotals(
  rows: PnLRow[],
  scenario: string
): ScenarioTotals {
  let revenue = 0;
  let expense = 0;
  let fixedCost = 0;
  let variableCost = 0;

  for (const row of rows) {
    if (row.type !== 'item') continue;
    const amount = computeRowAmount(row, scenario);
    if (row.section === 'revenue') {
      revenue += amount;
    } else {
      expense += amount;
      if (row.costType === 'fixed') fixedCost += amount;
      else if (row.costType === 'variable') variableCost += amount;
    }
  }

  return {
    revenue,
    expense,
    fixedCost,
    variableCost,
    net: revenue - expense,
  };
}

export interface BEPResult {
  computable: boolean;
  reason?: string;
  // 매출액 기준 손익분기점
  bepRevenue?: number;
  // 공헌이익률 (1 - 변동비/총수익)
  contributionMarginRatio?: number;
}

export function computeBEP(totals: ScenarioTotals): BEPResult {
  if (totals.revenue <= 0) {
    return { computable: false, reason: '총수익이 0이라 BEP 계산 불가' };
  }
  if (totals.fixedCost <= 0) {
    return { computable: false, reason: '고정비 항목이 없어 BEP 계산 불가' };
  }
  const ratio = 1 - totals.variableCost / totals.revenue;
  if (ratio <= 0) {
    return {
      computable: false,
      reason: '변동비가 총수익 이상 → 공헌이익 ≤ 0',
    };
  }
  return {
    computable: true,
    bepRevenue: totals.fixedCost / ratio,
    contributionMarginRatio: ratio,
  };
}

export function formatKRW(n: number): string {
  if (!Number.isFinite(n)) return '-';
  return `${Math.round(n).toLocaleString('ko-KR')}원`;
}
