'use client';

import { Download } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import type { PnLRow } from '@/lib/schemas/pnl';
import {
  deletePnLSheet,
  saveSheetAsTemplate,
  updatePnLSheet,
} from '@/modules/pnl/server/actions';
import { ScenarioColumns } from '../components/scenario-columns';
import { SheetGrid } from '../components/sheet-grid';
import { TotalsSummary } from '../components/totals-summary';

interface Props {
  sheet: {
    id: string;
    name: string;
    projectName: string | null;
    notes: string | null;
    scenarios: string[];
    rows: PnLRow[];
  };
}

export function PnLSheetEditView({ sheet }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState(sheet.name);
  const [projectName, setProjectName] = useState(sheet.projectName ?? '');
  const [notes, setNotes] = useState(sheet.notes ?? '');
  const [scenarios, setScenarios] = useState<string[]>(sheet.scenarios);
  const [rows, setRows] = useState<PnLRow[]>(sheet.rows);

  const [templateName, setTemplateName] = useState(`${sheet.name} (템플릿)`);
  const [templateDialogOpen, setTemplateDialogOpen] = useState(false);

  function handleSave() {
    setError(null);
    startTransition(async () => {
      const res = await updatePnLSheet(sheet.id, {
        name,
        projectName: projectName || null,
        notes: notes || null,
        scenarios,
        rows,
      });
      if (!res.success) setError(res.error ?? '저장 실패');
      else router.refresh();
    });
  }

  function handleDelete() {
    if (!confirm('이 시트를 삭제할까요? 되돌릴 수 없습니다.')) return;
    startTransition(async () => {
      const res = await deletePnLSheet(sheet.id);
      if (!res.success) setError(res.error ?? '삭제 실패');
      else router.push('/admin/pnl');
    });
  }

  function handleSaveAsTemplate() {
    startTransition(async () => {
      const res = await saveSheetAsTemplate(sheet.id, templateName);
      if (!res.success) setError(res.error ?? '템플릿 저장 실패');
      else {
        setTemplateDialogOpen(false);
        router.push('/admin/pnl');
      }
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
          <h1 className="mt-1 text-2xl font-semibold">PnL 시트 편집</h1>
        </div>
        <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button type="button" variant="outline">
                <Download className="mr-1 h-4 w-4" />
                내보내기
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem asChild>
                <a
                  href={`/api/admin/pnl/sheets/${sheet.id}/export?format=xlsx`}
                  download
                >
                  Excel (.xlsx)
                </a>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <a
                  href={`/api/admin/pnl/sheets/${sheet.id}/export?format=csv`}
                  download
                >
                  CSV (.csv)
                </a>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Dialog
            open={templateDialogOpen}
            onOpenChange={setTemplateDialogOpen}
          >
            <DialogTrigger asChild>
              <Button type="button" variant="outline">
                템플릿으로 저장
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>템플릿으로 저장</DialogTitle>
              </DialogHeader>
              <div className="space-y-2">
                <Label>템플릿 이름</Label>
                <Input
                  value={templateName}
                  onChange={(e) => setTemplateName(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  값(수량/단가/금액)은 비워지고, 행 구조와 시나리오만
                  보존됩니다.
                </p>
              </div>
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setTemplateDialogOpen(false)}
                >
                  취소
                </Button>
                <Button
                  type="button"
                  onClick={handleSaveAsTemplate}
                  disabled={isPending}
                >
                  저장
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          <Button
            type="button"
            variant="outline"
            onClick={handleDelete}
            disabled={isPending}
          >
            삭제
          </Button>
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
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1">
              <Label htmlFor="sheet-name">시트 이름</Label>
              <Input
                id="sheet-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="project-name">관련 프로그램 (메모)</Label>
              <Input
                id="project-name"
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
                placeholder="예: 2026 봄 페스티벌"
              />
            </div>
          </div>
          <div className="space-y-1">
            <Label htmlFor="notes">메모</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              placeholder="가정, 전제, 리스크 메모"
            />
          </div>
        </CardContent>
      </Card>

      <ScenarioColumns
        scenarios={scenarios}
        rows={rows}
        onChange={(next) => {
          setScenarios(next.scenarios);
          setRows(next.rows);
        }}
      />

      <SheetGrid rows={rows} scenarios={scenarios} onChange={setRows} />

      <TotalsSummary rows={rows} scenarios={scenarios} />
    </div>
  );
}
