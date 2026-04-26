'use client';

import { Banknote, Package, Plus, Ticket } from 'lucide-react';
import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { listAdminDrops } from '@/modules/drops/server/actions';
import { DropStatusBadge } from '@/modules/drops/ui/components/status-badges';

type Drop = {
  id: string;
  title: string;
  slug: string;
  type: string;
  status: string;
  publishedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  ticketTiers: { id: string }[];
  variants: { id: string }[];
  orders: { totalAmount: number }[];
};

const TYPE_LABELS: Record<string, { label: string; icon: typeof Ticket }> = {
  ticket: { label: '티켓', icon: Ticket },
  goods: { label: '굿즈', icon: Package },
};

export function DropsAdminListView({ page }: { page: number }) {
  const [drops, setDrops] = useState<Drop[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
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
            const revenue = drop.orders.reduce((s, o) => s + o.totalAmount, 0);
            const itemCount =
              drop.type === 'ticket'
                ? drop.ticketTiers.length
                : drop.variants.length;

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
                        {drop.orders.length}건 주문
                      </p>
                    </div>
                    <div className="text-right">
                      <div className="flex items-center gap-1 text-sm font-medium">
                        <Banknote className="h-4 w-4 text-muted-foreground" />
                        {revenue.toLocaleString()}원
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {new Date(drop.updatedAt).toLocaleDateString('ko-KR')}
                      </p>
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
