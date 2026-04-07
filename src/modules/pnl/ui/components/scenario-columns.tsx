'use client';

import { Plus, X } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { PnLRow } from '@/lib/schemas/pnl';

interface Props {
  scenarios: string[];
  rows: PnLRow[];
  onChange: (next: { scenarios: string[]; rows: PnLRow[] }) => void;
}

export function ScenarioColumns({ scenarios, rows, onChange }: Props) {
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState('');

  function rename(idx: number, value: string) {
    const oldName = scenarios[idx];
    if (!value || value === oldName) return;
    if (scenarios.includes(value)) return;
    const nextScenarios = scenarios.map((s, i) => (i === idx ? value : s));
    const nextRows = rows.map((r) => {
      const { [oldName]: oldVal, ...rest } = r.values;
      return {
        ...r,
        values: {
          ...rest,
          [value]: oldVal ?? { qty: null, price: null, amount: null },
        },
      };
    });
    onChange({ scenarios: nextScenarios, rows: nextRows });
  }

  function remove(idx: number) {
    if (scenarios.length <= 1) return;
    const name = scenarios[idx];
    const nextScenarios = scenarios.filter((_, i) => i !== idx);
    const nextRows = rows.map((r) => {
      const { [name]: _removed, ...rest } = r.values;
      return { ...r, values: rest };
    });
    onChange({ scenarios: nextScenarios, rows: nextRows });
  }

  function add() {
    const name = newName.trim();
    if (!name || scenarios.includes(name)) {
      setNewName('');
      setAdding(false);
      return;
    }
    if (scenarios.length >= 8) return;
    const nextScenarios = [...scenarios, name];
    const nextRows = rows.map((r) => ({
      ...r,
      values: {
        ...r.values,
        [name]: { qty: null, price: null, amount: null },
      },
    }));
    onChange({ scenarios: nextScenarios, rows: nextRows });
    setNewName('');
    setAdding(false);
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-xs text-muted-foreground">시나리오:</span>
      {scenarios.map((s, idx) => (
        <div
          key={s}
          className="flex items-center gap-1 rounded-md border bg-background px-2 py-1"
        >
          <input
            value={s}
            onChange={(e) => rename(idx, e.target.value)}
            className="w-20 bg-transparent text-xs outline-none"
          />
          {scenarios.length > 1 && (
            <button
              type="button"
              onClick={() => remove(idx)}
              className="text-muted-foreground hover:text-rose-600"
              aria-label={`${s} 시나리오 삭제`}
            >
              <X className="h-3 w-3" />
            </button>
          )}
        </div>
      ))}
      {adding ? (
        <div className="flex items-center gap-1">
          <Input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                add();
              }
              if (e.key === 'Escape') {
                setAdding(false);
                setNewName('');
              }
            }}
            placeholder="이름"
            className="h-7 w-24 text-xs"
            autoFocus
          />
          <Button type="button" size="sm" onClick={add} className="h-7">
            추가
          </Button>
        </div>
      ) : (
        scenarios.length < 8 && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setAdding(true)}
            className="h-7 text-xs"
          >
            <Plus className="mr-1 h-3 w-3" />
            시나리오
          </Button>
        )
      )}
    </div>
  );
}
