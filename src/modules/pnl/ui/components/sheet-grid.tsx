'use client';

import {
  closestCenter,
  DndContext,
  type DragEndEvent,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { computeRowAmount, formatKRW } from '@/lib/pnl/calc';
import type {
  PnLCostType,
  PnLInputMode,
  PnLRow,
  PnLSection,
} from '@/lib/schemas/pnl';
import { SortableSheetRow } from './sortable-sheet-row';

interface Props {
  rows: PnLRow[];
  scenarios: string[];
  onChange: (rows: PnLRow[]) => void;
}

const sectionLabel: Record<PnLSection, string> = {
  revenue: '수익',
  expense: '비용',
};

const inputModeLabel: Record<PnLInputMode, string> = {
  amount: '금액',
  qty_price: '수량×단가',
};

const costTypeLabel: Record<PnLCostType, string> = {
  fixed: '고정비',
  variable: '변동비',
};

function uid(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

function emptyValues(scenarios: string[]): PnLRow['values'] {
  return Object.fromEntries(
    scenarios.map((s) => [s, { qty: null, price: null, amount: null }])
  );
}

/**
 * 한 섹션 내에서 항목 행의 순서만 재배치한다.
 * 비-항목 행(헤더 등)의 위치는 그대로 두고, 항목들이 들어있던 슬롯에 재배열된 항목을 다시 채워넣는다.
 */
function reorderSectionItems(
  rows: PnLRow[],
  section: PnLSection,
  activeId: string,
  overId: string
): PnLRow[] {
  // 현재 섹션 항목 행들의 (전체 인덱스, 항목)
  const slots: { index: number; row: PnLRow }[] = [];
  rows.forEach((r, i) => {
    if (r.section === section && r.type === 'item') {
      slots.push({ index: i, row: r });
    }
  });

  const fromIdx = slots.findIndex((s) => s.row.id === activeId);
  const toIdx = slots.findIndex((s) => s.row.id === overId);
  if (fromIdx === -1 || toIdx === -1 || fromIdx === toIdx) return rows;

  const reorderedItems = arrayMove(
    slots.map((s) => s.row),
    fromIdx,
    toIdx
  );

  // 원래 슬롯(인덱스)에 새 순서의 항목을 채워넣는다
  const next = [...rows];
  slots.forEach((slot, i) => {
    next[slot.index] = reorderedItems[i];
  });
  return next;
}

export function SheetGrid({ rows, scenarios, onChange }: Props) {
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 5 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  function patchRow(id: string, patch: Partial<PnLRow>) {
    onChange(rows.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  }

  function patchCell(
    id: string,
    scenario: string,
    patch: Partial<PnLRow['values'][string]>
  ) {
    onChange(
      rows.map((r) => {
        if (r.id !== id) return r;
        const current = r.values[scenario] ?? {
          qty: null,
          price: null,
          amount: null,
        };
        return {
          ...r,
          values: { ...r.values, [scenario]: { ...current, ...patch } },
        };
      })
    );
  }

  function removeRow(id: string) {
    onChange(rows.filter((r) => r.id !== id));
  }

  function addItem(section: PnLSection) {
    let lastIdx = -1;
    rows.forEach((r, i) => {
      if (r.section === section) lastIdx = i;
    });
    const newRow: PnLRow = {
      id: uid('i'),
      type: 'item',
      section,
      costType: section === 'expense' ? 'fixed' : null,
      label: '',
      inputMode: 'amount',
      values: emptyValues(scenarios),
    };
    const next = [...rows];
    if (lastIdx === -1) next.push(newRow);
    else next.splice(lastIdx + 1, 0, newRow);
    onChange(next);
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const activeRow = rows.find((r) => r.id === String(active.id));
    const overRow = rows.find((r) => r.id === String(over.id));
    if (!activeRow || !overRow) return;
    // 같은 섹션 내에서만 재정렬 허용
    if (activeRow.section !== overRow.section) return;
    onChange(
      reorderSectionItems(
        rows,
        activeRow.section,
        String(active.id),
        String(over.id)
      )
    );
  }

  return (
    <DndContext
      id="pnl-sheet-grid"
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <div className="overflow-x-auto rounded-md border">
        <table className="w-full min-w-[940px] border-collapse text-sm">
          <thead className="bg-muted/50 text-xs">
            <tr>
              <th className="w-[280px] px-2 py-2 text-left font-medium">
                항목
              </th>
              <th className="w-[110px] px-2 py-2 text-left font-medium">
                입력 모드
              </th>
              <th className="w-[100px] px-2 py-2 text-left font-medium">
                비용 분류
              </th>
              {scenarios.map((s) => (
                <th
                  key={s}
                  className="min-w-[180px] px-2 py-2 text-right font-medium"
                >
                  {s}
                </th>
              ))}
              <th className="w-[40px] px-2 py-2" />
            </tr>
          </thead>
          <tbody>
            {(['revenue', 'expense'] as PnLSection[]).map((section) => {
              const sectionItems = rows.filter(
                (r) => r.section === section && r.type === 'item'
              );
              const sectionTotals: Record<string, number> = {};
              for (const s of scenarios) sectionTotals[s] = 0;
              for (const item of sectionItems) {
                for (const s of scenarios) {
                  sectionTotals[s] += computeRowAmount(item, s);
                }
              }
              const colSpan = 3 + scenarios.length + 1;

              return (
                <SortableContext
                  key={section}
                  items={sectionItems.map((r) => r.id)}
                  strategy={verticalListSortingStrategy}
                >
                  <tr className="bg-muted/30">
                    <td
                      colSpan={colSpan}
                      className="px-3 py-2 text-xs font-semibold"
                    >
                      {sectionLabel[section]}
                    </td>
                  </tr>
                  {sectionItems.map((row) => (
                    <SortableSheetRow
                      key={row.id}
                      row={row}
                      scenarios={scenarios}
                      inputModeLabel={inputModeLabel}
                      costTypeLabel={costTypeLabel}
                      onPatchRow={patchRow}
                      onPatchCell={patchCell}
                      onRemoveRow={removeRow}
                    />
                  ))}
                  <tr className="border-t bg-muted/10">
                    <td colSpan={3} className="px-3 py-2 text-xs font-medium">
                      {sectionLabel[section]} 소계
                    </td>
                    {scenarios.map((s) => (
                      <td
                        key={s}
                        className="px-2 py-2 text-right text-xs font-semibold tabular-nums"
                      >
                        {formatKRW(sectionTotals[s])}
                      </td>
                    ))}
                    <td />
                  </tr>
                  <tr>
                    <td colSpan={colSpan} className="px-3 py-2">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => addItem(section)}
                        className="h-7 text-xs"
                      >
                        <Plus className="mr-1 h-3 w-3" />
                        {sectionLabel[section]} 항목 추가
                      </Button>
                    </td>
                  </tr>
                </SortableContext>
              );
            })}
          </tbody>
        </table>
      </div>
    </DndContext>
  );
}
