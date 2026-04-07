'use client';

import { useRouter } from 'next/navigation';
import { useMemo, useState, useTransition } from 'react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { computeRowAmount, formatKRW } from '@/lib/pnl/calc';
import type { PnLRow } from '@/lib/schemas/pnl';
import { createEstimateFromSheet } from '@/modules/estimates/server/actions';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sheetId: string;
  sheetName: string;
  scenarios: string[];
  rows: PnLRow[];
}

export function CreateEstimateDialog({
  open,
  onOpenChange,
  sheetId,
  sheetName,
  scenarios,
  rows,
}: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [scenario, setScenario] = useState(scenarios[0] ?? '');
  const [title, setTitle] = useState(`${sheetName} 견적서`);

  // 비용 행 기본 선택
  const expenseRowIds = useMemo(
    () =>
      rows
        .filter((r) => r.type === 'item' && r.section === 'expense')
        .map((r) => r.id),
    [rows]
  );
  const [selectedIds, setSelectedIds] = useState<Set<string>>(
    new Set(expenseRowIds)
  );

  // 수신자
  const [recipientCompany, setRecipientCompany] = useState('');
  const [recipientContact, setRecipientContact] = useState('');
  const [recipientPhone, setRecipientPhone] = useState('');
  const [validUntil, setValidUntil] = useState('');

  function toggle(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleSection(section: 'revenue' | 'expense') {
    const ids = rows
      .filter((r) => r.type === 'item' && r.section === section)
      .map((r) => r.id);
    const allSelected = ids.every((id) => selectedIds.has(id));
    setSelectedIds((prev) => {
      const next = new Set(prev);
      for (const id of ids) {
        if (allSelected) next.delete(id);
        else next.add(id);
      }
      return next;
    });
  }

  const previewSubtotal = rows
    .filter((r) => r.type === 'item' && selectedIds.has(r.id))
    .reduce((sum, r) => sum + computeRowAmount(r, scenario), 0);

  function handleSubmit() {
    setError(null);
    if (!recipientCompany.trim()) {
      setError('수신자 회사명을 입력하세요');
      return;
    }
    if (selectedIds.size === 0) {
      setError('항목을 1개 이상 선택하세요');
      return;
    }
    startTransition(async () => {
      const res = await createEstimateFromSheet({
        sheetId,
        scenario,
        title: title.trim(),
        itemRowIds: Array.from(selectedIds),
        recipient: {
          companyName: recipientCompany.trim(),
          contactName: recipientContact.trim() || null,
          phone: recipientPhone.trim() || null,
        },
        validUntil: validUntil ? new Date(validUntil) : null,
      });
      if (!res.success || !res.data) {
        setError(res.error ?? '견적서 생성 실패');
        return;
      }
      router.push(`/admin/estimates/${res.data.id}/edit`);
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>견적서 만들기</DialogTitle>
        </DialogHeader>

        {error && (
          <div className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
            {error}
          </div>
        )}

        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <Label>제목</Label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>기준 시나리오</Label>
              <select
                value={scenario}
                onChange={(e) => setScenario(e.target.value)}
                className="h-9 w-full rounded-md border bg-background px-2 text-sm"
              >
                {scenarios.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <p className="mb-2 text-sm font-medium">수신자 정보</p>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <Label>회사명 *</Label>
                <Input
                  value={recipientCompany}
                  onChange={(e) => setRecipientCompany(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label>담당자</Label>
                <Input
                  value={recipientContact}
                  onChange={(e) => setRecipientContact(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label>연락처</Label>
                <Input
                  value={recipientPhone}
                  onChange={(e) => setRecipientPhone(e.target.value)}
                  placeholder="010-1234-5678"
                />
              </div>
              <div className="space-y-1">
                <Label>유효기간 (선택)</Label>
                <Input
                  type="date"
                  value={validUntil}
                  onChange={(e) => setValidUntil(e.target.value)}
                />
              </div>
            </div>
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between">
              <p className="text-sm font-medium">
                포함할 항목 ({selectedIds.size}개 선택)
              </p>
              <div className="flex gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => toggleSection('revenue')}
                  className="text-blue-600 hover:underline"
                >
                  수익 전체
                </button>
                <button
                  type="button"
                  onClick={() => toggleSection('expense')}
                  className="text-blue-600 hover:underline"
                >
                  비용 전체
                </button>
              </div>
            </div>
            <div className="max-h-[300px] space-y-1 overflow-y-auto rounded-md border p-2">
              {(['revenue', 'expense'] as const).map((section) => {
                const sectionRows = rows.filter(
                  (r) => r.type === 'item' && r.section === section
                );
                if (sectionRows.length === 0) return null;
                return (
                  <div key={section}>
                    <p className="px-2 py-1 text-xs font-semibold text-muted-foreground">
                      {section === 'revenue' ? '수익' : '비용'}
                    </p>
                    {sectionRows.map((row) => {
                      const amount = computeRowAmount(row, scenario);
                      return (
                        // biome-ignore lint/a11y/useSemanticElements: Checkbox 내부가 <button>이라 의미적 button을 쓰면 nested button이 됨
                        <div
                          key={row.id}
                          role="button"
                          tabIndex={0}
                          onClick={() => toggle(row.id)}
                          onKeyDown={(e) => {
                            if (e.key === ' ' || e.key === 'Enter') {
                              e.preventDefault();
                              toggle(row.id);
                            }
                          }}
                          className="flex cursor-pointer items-center gap-2 rounded px-2 py-1 hover:bg-accent focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        >
                          <Checkbox
                            checked={selectedIds.has(row.id)}
                            onCheckedChange={() => toggle(row.id)}
                            tabIndex={-1}
                          />
                          <span className="flex-1 text-sm">
                            {row.label || '(이름 없음)'}
                          </span>
                          <span className="text-xs tabular-nums text-muted-foreground">
                            {formatKRW(amount)}원
                          </span>
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="rounded-md border bg-muted/30 p-3 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">선택 항목 공급가액</span>
              <span className="font-medium tabular-nums">
                {formatKRW(previewSubtotal)}원
              </span>
            </div>
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>+ 부가세 10%</span>
              <span className="tabular-nums">
                {formatKRW(Math.round(previewSubtotal * 0.1))}원
              </span>
            </div>
            <div className="mt-1 flex justify-between border-t pt-1 font-semibold">
              <span>합계</span>
              <span className="tabular-nums">
                {formatKRW(Math.round(previewSubtotal * 1.1))}원
              </span>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            취소
          </Button>
          <Button type="button" onClick={handleSubmit} disabled={isPending}>
            {isPending ? '생성 중…' : '견적서 생성'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
