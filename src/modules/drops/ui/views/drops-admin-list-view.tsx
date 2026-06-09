'use client';

import { Banknote, Package, Plus, Ticket } from 'lucide-react';
import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { formatKstDate } from '@/lib/utils';
import {
  listAdminDrops,
  toggleDropFeatured,
} from '@/modules/drops/server/actions';
import { DropStatusBadge } from '@/modules/drops/ui/components/status-badges';

interface Drop {
  id: string;
  title: string;
  slug: string;
  type: string;
  status: string;
  isFeatured: boolean;
  publishedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  ticketTierCount: number;
  variantCount: number;
  revenue: number;
  orderCount: number;
}

const TYPE_LABELS: Record<string, { label: string; icon: typeof Ticket }> = {
  ticket: { label: '티켓', icon: Ticket },
  goods: { label: '굿즈', icon: Package },
};

export function DropsAdminListView({ page }: { page: number }) {
  const [drops, setDrops] = useState<Drop[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const pageSize = 20;

  const loadData = useCallback(async () => {
    setLoading(true);
    const result = await listAdminDrops(page, pageSize);
    if (result.success && result.data) {
      setDrops(result.data.items as Drop[]);
      setTotal(result.data.total);
    }
    setLoading(false);
  }, [page]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // 메인 히어로 노출 토글. featured는 program/article/drop 통틀어 1개만 가능하므로
  // 성공 후 목록을 다시 불러 다른 drop의 토글 해제까지 반영한다.
  const handleToggleFeatured = async (id: string) => {
    const res = await toggleDropFeatured(id);
    if (res.success) {
      loadData();
    } else {
      toast({
        title: '메인 노출 설정 실패',
        description: res.error,
        variant: 'destructive',
      });
    }
  };

  const totalPages = Math.ceil(total / pageSize);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Package className="h-5 w-5" />
          <h1 className="text-xl font-semibold">Drops</h1>
          <span className="text-sm text-muted-foreground">({total})</span>
        </div>
        <Button asChild>
          <Link href="/admin/drops/new">
            <Plus className="mr-1 h-4 w-4" />새 Drop
          </Link>
        </Button>
      </div>

      {loading ? (
        <div className="py-20 text-center text-muted-foreground">
          로딩 중...
        </div>
      ) : drops.length === 0 ? (
        <div className="rounded-lg border border-dashed p-12 text-center">
          <Package className="mx-auto h-10 w-10 text-muted-foreground" />
          <p className="mt-3 text-muted-foreground">
            아직 등록된 Drop이 없습니다.
          </p>
          <Button className="mt-4" asChild>
            <Link href="/admin/drops/new">
              <Plus className="mr-1 h-4 w-4" />첫 Drop 만들기
            </Link>
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {drops.map((drop) => {
            const typeInfo = TYPE_LABELS[drop.type] ?? TYPE_LABELS.ticket;
            const TypeIcon = typeInfo.icon;
            const revenue = drop.revenue;
            const itemCount =
              drop.type === 'ticket' ? drop.ticketTierCount : drop.variantCount;

            return (
              <Link key={drop.id} href={`/admin/drops/${drop.id}`}>
                <Card className="transition-colors hover:bg-muted/50">
                  <CardContent className="flex items-center gap-4 p-4">
                    <div className="rounded-lg bg-muted p-2">
                      <TypeIcon className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-medium">{drop.title}</p>
                        <DropStatusBadge status={drop.status} />
                        <Badge variant="outline">{typeInfo.label}</Badge>
                      </div>
                      <p className="mt-0.5 text-sm text-muted-foreground">
                        /{drop.slug} · {itemCount}개{' '}
                        {drop.type === 'ticket' ? '등급' : '옵션'} ·{' '}
                        {drop.orderCount}건 주문
                      </p>
                    </div>
                    <div className="text-right">
                      <div className="flex items-center gap-1 text-sm font-medium">
                        <Banknote className="h-4 w-4 text-muted-foreground" />
                        {revenue.toLocaleString()}원
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {formatKstDate(new Date(drop.updatedAt))}
                      </p>
                    </div>
                    {/* 메인 히어로 노출 토글 — Card 전체가 Link라 Switch에서 전파 차단 */}
                    <div className="flex shrink-0 flex-col items-center gap-1">
                      <span className="text-[11px] text-muted-foreground">
                        메인
                      </span>
                      <Switch
                        checked={drop.isFeatured}
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                        }}
                        onCheckedChange={() => handleToggleFeatured(drop.id)}
                      />
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1}
            asChild={page > 1}
          >
            {page > 1 ? (
              <Link href={`/admin/drops?page=${page - 1}`}>이전</Link>
            ) : (
              '이전'
            )}
          </Button>
          <span className="text-sm text-muted-foreground">
            {page} / {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= totalPages}
            asChild={page < totalPages}
          >
            {page < totalPages ? (
              <Link href={`/admin/drops?page=${page + 1}`}>다음</Link>
            ) : (
              '다음'
            )}
          </Button>
        </div>
      )}
    </div>
  );
}
