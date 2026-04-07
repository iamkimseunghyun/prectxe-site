'use client';

import { Plus, Settings, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  createBlankEstimate,
  deleteEstimate,
} from '@/modules/estimates/server/actions';

interface EstimateItem {
  id: string;
  number: string;
  title: string;
  issueDate: Date;
  validUntil: Date | null;
  recipientName: string;
  total: number;
  sourceSheet: { id: string; name: string } | null;
}

interface Props {
  estimates: EstimateItem[];
  hasSupplierProfile: boolean;
}

export function EstimateDashboardView({
  estimates,
  hasSupplierProfile,
}: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');

  const filtered = estimates.filter((e) => {
    if (!query.trim()) return true;
    const q = query.toLowerCase();
    return (
      e.number.toLowerCase().includes(q) ||
      e.title.toLowerCase().includes(q) ||
      e.recipientName.toLowerCase().includes(q)
    );
  });

  function handleCreateBlank() {
    if (!hasSupplierProfile) {
      setError('먼저 공급자 정보를 등록하세요');
      return;
    }
    setError(null);
    startTransition(async () => {
      const res = await createBlankEstimate();
      if (!res.success || !res.data) {
        setError(res.error ?? '견적서 생성 실패');
        return;
      }
      router.push(`/admin/estimates/${res.data.id}/edit`);
    });
  }

  function handleDelete(id: string, number: string) {
    if (!confirm(`견적서 ${number}을(를) 삭제할까요? 되돌릴 수 없습니다.`))
      return;
    setError(null);
    startTransition(async () => {
      const res = await deleteEstimate(id);
      if (!res.success) {
        setError(res.error ?? '삭제 실패');
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">견적서</h1>
          <p className="text-sm text-muted-foreground">
            발행한 견적서를 관리합니다. PnL 시트에서 만들거나 직접 작성할 수
            있어요.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/admin/estimates/settings">
            <Button type="button" variant="outline" size="sm">
              <Settings className="mr-1 h-4 w-4" />
              공급자 설정
            </Button>
          </Link>
          <Button
            type="button"
            onClick={handleCreateBlank}
            disabled={isPending}
          >
            <Plus className="mr-1 h-4 w-4" />새 견적서
          </Button>
        </div>
      </div>

      {!hasSupplierProfile && (
        <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
          공급자 정보가 등록되어 있지 않습니다.{' '}
          <Link
            href="/admin/estimates/settings"
            className="font-semibold underline"
          >
            공급자 설정
          </Link>
          에서 회사 정보를 먼저 등록하세요.
        </div>
      )}

      {error && (
        <div className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
          {error}
        </div>
      )}

      <div className="max-w-sm">
        <Input
          type="search"
          placeholder="견적번호 / 제목 / 수신자로 검색"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      {filtered.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-sm text-muted-foreground">
            {estimates.length === 0
              ? '발행된 견적서가 없습니다.'
              : '검색 결과가 없습니다.'}
          </CardContent>
        </Card>
      ) : (
        <div className="overflow-x-auto rounded-md border bg-background">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-xs">
              <tr>
                <th className="px-3 py-2 text-left font-medium">견적번호</th>
                <th className="px-3 py-2 text-left font-medium">제목</th>
                <th className="px-3 py-2 text-left font-medium">수신자</th>
                <th className="px-3 py-2 text-right font-medium">합계</th>
                <th className="px-3 py-2 text-left font-medium">발행일</th>
                <th className="px-3 py-2 text-left font-medium">유효기간</th>
                <th className="px-3 py-2 text-left font-medium">원본 시트</th>
                <th className="w-[40px] px-2 py-2" />
              </tr>
            </thead>
            <tbody>
              {filtered.map((e) => (
                <tr key={e.id} className="border-t hover:bg-accent">
                  <td className="px-3 py-2 font-mono text-xs">
                    <Link
                      href={`/admin/estimates/${e.id}/edit`}
                      className="hover:underline"
                    >
                      {e.number}
                    </Link>
                  </td>
                  <td className="px-3 py-2">
                    <Link
                      href={`/admin/estimates/${e.id}/edit`}
                      className="hover:underline"
                    >
                      {e.title}
                    </Link>
                  </td>
                  <td className="px-3 py-2 text-xs">
                    {e.recipientName || (
                      <span className="text-muted-foreground">미입력</span>
                    )}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums">
                    {e.total.toLocaleString('ko-KR')}원
                  </td>
                  <td className="px-3 py-2 text-xs text-muted-foreground">
                    {new Date(e.issueDate).toLocaleDateString('ko-KR')}
                  </td>
                  <td className="px-3 py-2 text-xs text-muted-foreground">
                    {e.validUntil
                      ? new Date(e.validUntil).toLocaleDateString('ko-KR')
                      : '-'}
                  </td>
                  <td className="px-3 py-2 text-xs">
                    {e.sourceSheet ? (
                      <Link
                        href={`/admin/pnl/sheets/${e.sourceSheet.id}/edit`}
                        className="text-blue-600 hover:underline"
                      >
                        {e.sourceSheet.name}
                      </Link>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </td>
                  <td className="px-2 py-2 text-center">
                    <button
                      type="button"
                      onClick={() => handleDelete(e.id, e.number)}
                      disabled={isPending}
                      className="text-muted-foreground hover:text-rose-600 disabled:opacity-50"
                      aria-label={`${e.number} 삭제`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
