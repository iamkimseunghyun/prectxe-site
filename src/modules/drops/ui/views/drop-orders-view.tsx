'use client';

import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { getDropOrders } from '@/modules/drops/server/actions';
import { cancelOrder } from '@/modules/tickets/server/actions';

const STATUS_LABELS: Record<
  string,
  {
    label: string;
    variant: 'default' | 'secondary' | 'destructive' | 'outline';
  }
> = {
  pending: { label: '대기', variant: 'secondary' },
  paid: { label: '결제완료', variant: 'default' },
  confirmed: { label: '확정', variant: 'default' },
  cancelled: { label: '취소', variant: 'destructive' },
  refunded: { label: '환불', variant: 'outline' },
};

type Order = {
  id: string;
  orderNo: string;
  buyerName: string;
  buyerEmail: string;
  buyerPhone: string;
  totalAmount: number;
  status: string;
  createdAt: Date;
  items: {
    id: string;
    quantity: number;
    unitPrice: number;
    subtotal: number;
    ticketTier: { name: string } | null;
    goodsVariant: { name: string } | null;
  }[];
  payment: {
    method: string | null;
    paidAt: Date | null;
  } | null;
};

export function DropOrdersView({
  dropId,
  page,
}: {
  dropId: string;
  page: number;
}) {
  const { toast } = useToast();
  const [orders, setOrders] = useState<Order[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [cancelTarget, setCancelTarget] = useState<Order | null>(null);
  const pageSize = 20;

  const loadOrders = useCallback(async () => {
    setLoading(true);
    const result = await getDropOrders(dropId, page, pageSize);
    if (result.success && result.data) {
      setOrders(result.data.items as Order[]);
      setTotal(result.data.total);
    }
    setLoading(false);
  }, [dropId, page]);

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  async function handleCancel() {
    if (!cancelTarget) return;
    const result = await cancelOrder(cancelTarget.id);
    if (result.success) {
      toast({ title: '주문이 취소되었습니다.' });
      loadOrders();
    } else {
      toast({ title: result.error, variant: 'destructive' });
    }
    setCancelTarget(null);
  }

  const totalPages = Math.ceil(total / pageSize);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" asChild>
          <Link href={`/admin/drops/${dropId}`}>
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-xl font-semibold">주문 목록</h1>
          <p className="text-sm text-muted-foreground">총 {total}건</p>
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="py-20 text-center text-muted-foreground">
              로딩 중...
            </div>
          ) : orders.length === 0 ? (
            <div className="py-20 text-center text-muted-foreground">
              주문이 없습니다.
            </div>
          ) : (
            <div className="divide-y">
              {orders.map((order) => {
                const statusInfo =
                  STATUS_LABELS[order.status] ?? STATUS_LABELS.pending;
                return (
                  <div
                    key={order.id}
                    className="flex items-center justify-between px-6 py-4"
                  >
                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">
                          {order.orderNo}
                        </span>
                        <Badge variant={statusInfo.variant}>
                          {statusInfo.label}
                        </Badge>
                      </div>
                      <p className="text-sm">
                        {order.buyerName} · {order.buyerPhone} ·{' '}
                        {order.buyerEmail}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {order.items
                          .map((i) => {
                            const name =
                              i.ticketTier?.name ?? i.goodsVariant?.name ?? '?';
                            return `${name} ×${i.quantity} (${i.subtotal.toLocaleString()}원)`;
                          })
                          .join(', ')}
                      </p>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="text-sm font-semibold">
                          {order.totalAmount.toLocaleString()}원
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(order.createdAt).toLocaleString('ko-KR')}
                        </p>
                      </div>
                      {(order.status === 'paid' ||
                        order.status === 'confirmed') && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setCancelTarget(order)}
                        >
                          취소
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1}
            asChild={page > 1}
          >
            {page > 1 ? (
              <Link href={`/admin/drops/${dropId}/orders?page=${page - 1}`}>
                이전
              </Link>
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
              <Link href={`/admin/drops/${dropId}/orders?page=${page + 1}`}>
                다음
              </Link>
            ) : (
              '다음'
            )}
          </Button>
        </div>
      )}

      <AlertDialog
        open={!!cancelTarget}
        onOpenChange={() => setCancelTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>주문 취소</AlertDialogTitle>
            <AlertDialogDescription>
              {cancelTarget?.orderNo} 주문을 취소하시겠습니까? 결제가 완료된
              경우 환불 처리됩니다.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>돌아가기</AlertDialogCancel>
            <AlertDialogAction onClick={handleCancel}>
              주문 취소
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
