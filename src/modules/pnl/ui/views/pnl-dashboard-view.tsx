'use client';

import { Pencil, Plus, Trash2 } from 'lucide-react';
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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  createDefaultPnLTemplate,
  createPnLSheet,
  deletePnLTemplate,
} from '@/modules/pnl/server/actions';

interface SheetItem {
  id: string;
  name: string;
  projectName: string | null;
  updatedAt: Date;
  template: { id: string; name: string } | null;
}

interface TemplateItem {
  id: string;
  name: string;
  description: string | null;
  updatedAt: Date;
  _count: { sheets: number };
}

interface Props {
  sheets: SheetItem[];
  templates: TemplateItem[];
}

export function PnLDashboardView({ sheets, templates }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [newSheetOpen, setNewSheetOpen] = useState(false);
  const [newSheetName, setNewSheetName] = useState('');
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(
    null
  );

  function handleCreateSheet() {
    if (!newSheetName.trim()) return;
    startTransition(async () => {
      const res = await createPnLSheet({
        name: newSheetName.trim(),
        templateId: selectedTemplateId,
      });
      if (!res.success || !res.data) {
        setError(res.error ?? '시트 생성 실패');
        return;
      }
      setNewSheetOpen(false);
      router.push(`/admin/pnl/sheets/${res.data.id}/edit`);
    });
  }

  function handleSeedTemplate() {
    startTransition(async () => {
      const res = await createDefaultPnLTemplate();
      if (!res.success || !res.data) {
        setError(res.error ?? '기본 템플릿 생성 실패');
        return;
      }
      router.push(`/admin/pnl/templates/${res.data.id}/edit`);
    });
  }

  function handleDeleteTemplate(id: string, name: string, sheetCount: number) {
    const msg =
      sheetCount > 0
        ? `"${name}" 템플릿을 삭제할까요? 이 템플릿을 사용한 시트 ${sheetCount}개의 템플릿 연결이 끊어집니다 (시트 자체는 유지).`
        : `"${name}" 템플릿을 삭제할까요? 되돌릴 수 없습니다.`;
    if (!confirm(msg)) return;
    setError(null);
    startTransition(async () => {
      const res = await deletePnLTemplate(id);
      if (!res.success) {
        setError(res.error ?? '삭제 실패');
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">PnL 시트</h1>
          <p className="text-sm text-muted-foreground">
            프로그램 기획용 손익 계산 시트와 템플릿을 관리합니다
          </p>
        </div>
        <Dialog open={newSheetOpen} onOpenChange={setNewSheetOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-1 h-4 w-4" />새 시트
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>새 PnL 시트</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-1">
                <Label>시트 이름</Label>
                <Input
                  value={newSheetName}
                  onChange={(e) => setNewSheetName(e.target.value)}
                  placeholder="예: 2026 봄 페스티벌"
                />
              </div>
              <div className="space-y-1">
                <Label>템플릿</Label>
                <select
                  value={selectedTemplateId ?? ''}
                  onChange={(e) =>
                    setSelectedTemplateId(e.target.value || null)
                  }
                  className="h-9 w-full rounded-md border bg-background px-2 text-sm"
                >
                  <option value="">기본 구조로 시작 (빌트인)</option>
                  {templates.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setNewSheetOpen(false)}
              >
                취소
              </Button>
              <Button
                type="button"
                onClick={handleCreateSheet}
                disabled={isPending || !newSheetName.trim()}
              >
                생성
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {error && (
        <div className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
          {error}
        </div>
      )}

      <Tabs defaultValue="sheets">
        <TabsList>
          <TabsTrigger value="sheets">시트 ({sheets.length})</TabsTrigger>
          <TabsTrigger value="templates">
            템플릿 ({templates.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="sheets" className="mt-4">
          {sheets.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-sm text-muted-foreground">
                생성된 시트가 없습니다. 우측 상단 “새 시트”로 시작하세요.
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-3 md:grid-cols-2">
              {sheets.map((s) => (
                <Link
                  key={s.id}
                  href={`/admin/pnl/sheets/${s.id}/edit`}
                  className="rounded-md border bg-background p-4 transition-colors hover:bg-accent"
                >
                  <p className="font-medium">{s.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {s.projectName ?? '관련 프로그램 미지정'} ·{' '}
                    {s.template ? `템플릿: ${s.template.name}` : '빈 시트'}
                  </p>
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    {new Date(s.updatedAt).toLocaleDateString('ko-KR')}
                  </p>
                </Link>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="templates" className="mt-4">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-xs text-muted-foreground">
              템플릿은 행 구조 + 시나리오 컬럼을 정의합니다
            </p>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleSeedTemplate}
                disabled={isPending}
              >
                기본 템플릿 생성
              </Button>
              <Link href="/admin/pnl/templates/new">
                <Button type="button" size="sm">
                  <Plus className="mr-1 h-3 w-3" />새 템플릿
                </Button>
              </Link>
            </div>
          </div>
          {templates.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-sm text-muted-foreground">
                템플릿이 없습니다. “기본 템플릿 생성”으로 빠르게 시작할 수
                있습니다.
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-3 md:grid-cols-2">
              {templates.map((t) => (
                <div
                  key={t.id}
                  className="flex items-start justify-between gap-2 rounded-md border bg-background p-4 transition-colors hover:bg-accent/50"
                >
                  <Link
                    href={`/admin/pnl/templates/${t.id}/edit`}
                    className="min-w-0 flex-1"
                  >
                    <p className="font-medium">{t.name}</p>
                    {t.description && (
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {t.description}
                      </p>
                    )}
                    <p className="mt-1 text-[11px] text-muted-foreground">
                      사용 시트 {t._count.sheets}개 ·{' '}
                      {new Date(t.updatedAt).toLocaleDateString('ko-KR')}
                    </p>
                  </Link>
                  <div className="flex shrink-0 items-center gap-1">
                    <Link
                      href={`/admin/pnl/templates/${t.id}/edit`}
                      className="rounded p-1 text-muted-foreground hover:bg-background hover:text-foreground"
                      aria-label={`${t.name} 편집`}
                    >
                      <Pencil className="h-4 w-4" />
                    </Link>
                    <button
                      type="button"
                      onClick={() =>
                        handleDeleteTemplate(t.id, t.name, t._count.sheets)
                      }
                      disabled={isPending}
                      className="rounded p-1 text-muted-foreground hover:bg-background hover:text-rose-600 disabled:opacity-50"
                      aria-label={`${t.name} 삭제`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
