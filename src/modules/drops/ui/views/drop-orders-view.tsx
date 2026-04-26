'use client';

import { AlertCircle, ArrowLeft, Clock } from 'lucide-react';
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
import {
  cancelOrder,
  cleanupExpiredBankTransferOrders,
  confirmBankTransfer,
} from '@/modules/tickets/server/actions';

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
  bankTransfer: {
    id: string;
    depositorName: string;
    amount: number;
    expiresAt: Date | string;
    status: string;
    confirmedAt: Date | null;
  } | null;
};

function formatRemaining(expiresAt: Date | string): {
  text: string;
  urgent: boolean;
  expired: boolean;
} {
  const target =
    typeof expiresAt === 'string' ? new Date(expiresAt) : expiresAt;
  const diffMs = target.getTime() - Date.now();
  if (diffMs <= 0) return { text: '만료됨', urgent: true, expired: true };
  const totalMin = Math.floor(diffMs / 60_000);
  const hours = Math.floor(totalMin / 60);
  const mins = totalMin % 60;
  const text = hours > 0 ? `${hours}시간 ${mins}분 남음` : `${mins}분 남음`;
  const urgent = totalMin <= 360; // 6시간 이내
  return { text, urgent, expired: false };
}

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
  const [confirmTarget, setConfirmTarget] = useState<Order | null>(null);
  const [actionInFlight, setActionInFlight] = useState(false);
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

  // 페이지 진입 시 만료된 무통장 주문 lazy 정리 → 목록 로드
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const cleanup = await cleanupExpiredBankTransferOrders();
      if (cancelled) return;
      if (cleanup.success && cleanup.expiredCount > 0) {
        toast({
          title: `만료된 무통장 주문 ${cleanup.expiredCount}건 자동 취소`,
        });
      }
      loadOrders();
    })();
    return () => {
      cancelled = true;
    };
  }, [loadOrders, toast]);

  async function handleCancel() {
    if (!cancelTarget) return;
    setActionInFlight(true);
    const result = await cancelOrder(cancelTarget.id);
    if (result.success) {
      toast({ title: '주문이 취소되었습니다.' });
      loadOrders();
    } else {
      toast({ title: result.error, variant: 'destructive' });
    }
    setCancelTarget(null);
    setActionInFlight(false);
  }

  async function handleConfirmDeposit() {
    if (!confirmTarget) return;
    setActionInFlight(true);
    const result = await confirmBankTransfer(confirmTarget.id);
    if (result.success) {
      toast({ title: '입금이 확인되었습니다.' });
      loadOrders();
    } else {
      toast({ title: result.error, variant: 'destructive' });
    }
    setConfirmTarget(null);
    setActionInFlight(false);
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
                const isPendingDeposit =
                  order.status === 'pending' &&
                  order.bankTransfer?.status === 'pending';
                const remaining = isPendingDeposit
                  ? formatRemaining(order.bankTransfer!.expiresAt)
                  : null;
                const statusInfo =
                  STATUS_LABELS[order.status] ?? STATUS_LABELS.pending;
                const isCancellable =
                  order.status === 'pending' ||
                  order.status === 'paid' ||
                  order.status === 'confirmed';

                return (
                  <div
                    key={order.id}
                    className={`flex items-center justify-between gap-4 px-6 py-4 ${
                      isPendingDeposit && remaining?.urgent
                        ? 'bg-amber-50/50'
                        : ''
                    }`}
                  >
                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-medium">
                          {order.orderNo}
                        </span>
                        {isPendingDeposit ? (
                          <Badge
                            variant="outline"
                            className="border-amber-300 bg-amber-50 text-amber-700"
                          >
                            입금대기
                          </Badge>
                        ) : (
                          <Badge variant={statusInfo.variant}>
                            {statusInfo.label}
                          </Badge>
                        )}
                        {isPendingDeposit && remaining && (
                          <span
                            className={`inline-flex items-center gap-1 text-xs ${
                              remaining.urgent
                                ? 'text-red-600'
                                : 'text-muted-foreground'
                            }`}
                          >
                            {remaining.urgent ? (
                              <AlertCircle className="h-3 w-3" />
                            ) : (
                              <Clock className="h-3 w-3" />
                            )}
                            {remaining.text}
                          </span>
                        )}
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
                      {isPendingDeposit && (
                        <p className="font-mono text-xs text-amber-700">
                          입금자명: {order.bankTransfer!.depositorName}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <p className="text-sm font-semibold">
                          {order.totalAmount.toLocaleString()}원
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(order.createdAt).toLocaleString('ko-KR')}
                        </p>
                      </div>
                      <div className="flex flex-col gap-1.5">
                        {isPendingDeposit && (
                          <Button
                            size="sm"
                            onClick={() => setConfirmTarget(order)}
                            disabled={actionInFlight}
                          >
                            입금 확인
                          </Button>
                        )}
                        {isCancellable && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setCancelTarget(order)}
                            disabled={actionInFlight}
                          >
                            취소
                          </Button>
                        )}
                      </div>
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

      <AlertDialog
        open={!!confirmTarget}
        onOpenChange={() => setConfirmTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>입금 확인</AlertDialogTitle>
            <AlertDialogDescription>
              {confirmTarget?.orderNo} 주문(
              <span className="font-mono">
                {confirmTarget?.bankTransfer?.depositorName}
              </span>
              , {confirmTarget?.totalAmount.toLocaleString()}원) 입금을
              확인하시겠습니까? 확정 메일이 자동 발송됩니다.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>돌아가기</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmDeposit}>
              입금 확인
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
