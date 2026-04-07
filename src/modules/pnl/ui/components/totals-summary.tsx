'use client';

import { Card, CardContent } from '@/components/ui/card';
import { computeBEP, computeTotals, formatKRW } from '@/lib/pnl/calc';
import type { PnLRow } from '@/lib/schemas/pnl';

interface Props {
  rows: PnLRow[];
  scenarios: string[];
}

export function TotalsSummary({ rows, scenarios }: Props) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {scenarios.map((scenario) => {
        const totals = computeTotals(rows, scenario);
        const bep = computeBEP(totals);
        const netPositive = totals.net >= 0;
        return (
          <Card key={scenario}>
            <CardContent className="space-y-2 p-4">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold">{scenario}</p>
                <span
                  className={`text-xs ${netPositive ? 'text-emerald-600' : 'text-rose-600'}`}
                >
                  {netPositive ? '흑자' : '적자'}
                </span>
              </div>
              <Row label="총수익" value={formatKRW(totals.revenue)} />
              <Row label="총비용" value={formatKRW(totals.expense)} />
              <Row
                label="순이익"
                value={formatKRW(totals.net)}
                emphasis={netPositive ? 'positive' : 'negative'}
              />
              <div className="border-t pt-2">
                <Row label="고정비" value={formatKRW(totals.fixedCost)} />
                <Row label="변동비" value={formatKRW(totals.variableCost)} />
                <Row
                  label="BEP (매출액)"
                  value={
                    bep.computable && bep.bepRevenue !== undefined
                      ? formatKRW(bep.bepRevenue)
                      : (bep.reason ?? '-')
                  }
                  emphasis="info"
                />
                {bep.computable &&
                  bep.contributionMarginRatio !== undefined && (
                    <p className="pt-1 text-[11px] text-muted-foreground">
                      공헌이익률{' '}
                      {(bep.contributionMarginRatio * 100).toFixed(1)}%
                    </p>
                  )}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

function Row({
  label,
  value,
  emphasis,
}: {
  label: string;
  value: string;
  emphasis?: 'positive' | 'negative' | 'info';
}) {
  const color =
    emphasis === 'positive'
      ? 'text-emerald-600 font-semibold'
      : emphasis === 'negative'
        ? 'text-rose-600 font-semibold'
        : emphasis === 'info'
          ? 'text-blue-600'
          : 'text-foreground';
  return (
    <div className="flex items-center justify-between text-xs">
      <span className="text-muted-foreground">{label}</span>
      <span className={color}>{value}</span>
    </div>
  );
}
