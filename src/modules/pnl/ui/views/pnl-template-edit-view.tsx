'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import type { PnLRow } from '@/lib/schemas/pnl';
import {
  createPnLTemplate,
  deletePnLTemplate,
  updatePnLTemplate,
} from '@/modules/pnl/server/actions';
import { ScenarioColumns } from '../components/scenario-columns';
import { SheetGrid } from '../components/sheet-grid';

interface Props {
  template: {
    id: string | null; // null = new
    name: string;
    description: string | null;
    scenarios: string[];
    rows: PnLRow[];
  };
}

export function PnLTemplateEditView({ template }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState(template.name);
  const [description, setDescription] = useState(template.description ?? '');
  const [scenarios, setScenarios] = useState<string[]>(template.scenarios);
  const [rows, setRows] = useState<PnLRow[]>(template.rows);

  function handleSave() {
    setError(null);
    startTransition(async () => {
      const payload = {
        name,
        description: description || null,
        scenarios,
        rows,
      };
      const res = template.id
        ? await updatePnLTemplate(template.id, payload)
        : await createPnLTemplate(payload);
      if (!res.success) {
        setError(res.error ?? '저장 실패');
        return;
      }
      router.push('/admin/pnl');
    });
  }

  function handleDelete() {
    if (!template.id) return;
    if (!confirm('이 템플릿을 삭제할까요?')) return;
    startTransition(async () => {
      const res = await deletePnLTemplate(template.id as string);
      if (!res.success) setError(res.error ?? '삭제 실패');
      else router.push('/admin/pnl');
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link
            href="/admin/pnl"
            className="text-xs text-muted-foreground hover:underline"
          >
            ← PnL 시트 목록
          </Link>
          <h1 className="mt-1 text-2xl font-semibold">
            {template.id ? '템플릿 편집' : '새 템플릿'}
          </h1>
        </div>
        <div className="flex items-center gap-2">
          {template.id && (
            <Button
              type="button"
              variant="outline"
              onClick={handleDelete}
              disabled={isPending}
            >
              삭제
            </Button>
          )}
          <Button type="button" onClick={handleSave} disabled={isPending}>
            {isPending ? '저장 중…' : '저장'}
          </Button>
        </div>
      </div>

      {error && (
        <div className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
          {error}
        </div>
      )}

      <Card>
        <CardContent className="space-y-4 p-4">
          <div className="space-y-1">
            <Label htmlFor="tpl-name">템플릿 이름</Label>
            <Input
              id="tpl-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="tpl-desc">설명</Label>
            <Textarea
              id="tpl-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
            />
          </div>
        </CardContent>
      </Card>

      <p className="text-xs text-muted-foreground">
        템플릿에서는 행 구조와 시나리오 컬럼을 정의합니다. 값(수량/단가/금액)은
        시트에서 입력하세요.
      </p>

      <ScenarioColumns
        scenarios={scenarios}
        rows={rows}
        onChange={(next) => {
          setScenarios(next.scenarios);
          setRows(next.rows);
        }}
      />

      <SheetGrid rows={rows} scenarios={scenarios} onChange={setRows} />
    </div>
  );
}
