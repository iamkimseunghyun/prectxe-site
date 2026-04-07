'use client';

import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Trash2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { computeRowAmount, formatKRW } from '@/lib/pnl/calc';
import type { PnLCostType, PnLInputMode, PnLRow } from '@/lib/schemas/pnl';

interface Props {
  row: PnLRow;
  scenarios: string[];
  inputModeLabel: Record<PnLInputMode, string>;
  costTypeLabel: Record<PnLCostType, string>;
  onPatchRow: (id: string, patch: Partial<PnLRow>) => void;
  onPatchCell: (
    id: string,
    scenario: string,
    patch: Partial<PnLRow['values'][string]>
  ) => void;
  onRemoveRow: (id: string) => void;
}

export function SortableSheetRow({
  row,
  scenarios,
  inputModeLabel,
  costTypeLabel,
  onPatchRow,
  onPatchCell,
  onRemoveRow,
}: Props) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: row.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
    position: 'relative' as const,
    zIndex: isDragging ? 10 : undefined,
  };

  return (
    <tr
      ref={setNodeRef}
      style={style}
      className={`border-t ${isDragging ? 'bg-muted/50' : ''}`}
    >
      <td className="px-2 py-1.5">
        <div className="flex items-center gap-1">
          <button
            type="button"
            {...attributes}
            {...listeners}
            className="cursor-grab text-muted-foreground hover:text-foreground active:cursor-grabbing"
            aria-label="행 드래그"
          >
            <GripVertical className="h-4 w-4" />
          </button>
          <Input
            value={row.label}
            onChange={(e) => onPatchRow(row.id, { label: e.target.value })}
            placeholder="항목명"
            className="h-8 text-sm"
          />
        </div>
      </td>
      <td className="px-2 py-1.5">
        {/* native select to avoid Radix Select infinite re-render in form */}
        <select
          value={row.inputMode}
          onChange={(e) =>
            onPatchRow(row.id, {
              inputMode: e.target.value as PnLInputMode,
            })
          }
          className="h-8 w-full rounded-md border bg-background px-2 text-xs"
        >
          {Object.entries(inputModeLabel).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </select>
      </td>
      <td className="px-2 py-1.5">
        {row.section === 'expense' ? (
          <select
            value={row.costType ?? 'fixed'}
            onChange={(e) =>
              onPatchRow(row.id, {
                costType: e.target.value as PnLCostType,
              })
            }
            className="h-8 w-full rounded-md border bg-background px-2 text-xs"
          >
            {Object.entries(costTypeLabel).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
        ) : (
          <span className="text-xs text-muted-foreground">-</span>
        )}
      </td>
      {scenarios.map((s) => {
        const cell = row.values[s] ?? {
          qty: null,
          price: null,
          amount: null,
        };
        return (
          <td key={s} className="px-2 py-1.5 align-top">
            {row.inputMode === 'qty_price' ? (
              <div className="space-y-1">
                <div className="flex gap-1">
                  <Input
                    type="number"
                    value={cell.qty ?? ''}
                    onChange={(e) =>
                      onPatchCell(row.id, s, {
                        qty:
                          e.target.value === '' ? null : Number(e.target.value),
                      })
                    }
                    placeholder="수량"
                    className="h-7 text-xs"
                  />
                  <Input
                    type="number"
                    value={cell.price ?? ''}
                    onChange={(e) =>
                      onPatchCell(row.id, s, {
                        price:
                          e.target.value === '' ? null : Number(e.target.value),
                      })
                    }
                    placeholder="단가"
                    className="h-7 text-xs"
                  />
                </div>
                <p className="text-right text-[11px] text-muted-foreground">
                  = {formatKRW(computeRowAmount(row, s))}
                </p>
              </div>
            ) : (
              <Input
                type="number"
                value={cell.amount ?? ''}
                onChange={(e) =>
                  onPatchCell(row.id, s, {
                    amount:
                      e.target.value === '' ? null : Number(e.target.value),
                  })
                }
                placeholder="금액"
                className="h-8 text-right text-xs"
              />
            )}
          </td>
        );
      })}
      <td className="px-2 py-1.5 text-center">
        <button
          type="button"
          onClick={() => onRemoveRow(row.id)}
          className="text-muted-foreground hover:text-rose-600"
          aria-label="행 삭제"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </td>
    </tr>
  );
}
