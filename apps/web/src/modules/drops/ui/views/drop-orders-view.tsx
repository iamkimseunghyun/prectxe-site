'use client';

import { ArrowLeft, Download, Link2, Mail, Search } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { formatKstDateTime } from '@/lib/utils';
import { getOrderTicketsUrl } from '@/lib/utils/ticket-url';
import { getDropOrders } from '@/modules/drops/server/actions';
import {
  OrderStatusBadge,
  RemainingTimeIndicator,
} from '@/modules/drops/ui/components/status-badges';
import {
  cancelOrder,
  cleanupExpiredBankTransferOrders,
  confirmBankTransfer,
  resendOrderConfirmation,
} from '@/modules/tickets/server/actions';

type Order = {
  id: string;
  orderNo: string;
  accessToken: string | null;
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

/** 서버 액션 자체가 실패했을 때(네트워크·배포 중 등) 어드민에게 보일 문구 */
const FAILED_ACTION_MESSAGE =
  '요청을 처리하지 못했습니다. 잠시 후 다시 시도해 주세요.';

const STATUS_FILTERS: { value: string; label: string }[] = [
  { value: '', label: '전체' },
  { value: 'pending', label: '대기' },
  { value: 'paid', label: '결제완료' },
  { value: 'confirmed', label: '확정' },
  { value: 'cancelled', label: '취소' },
  { value: 'refunded', label: '환불' },
];

export function DropOrdersView({
  dropId,
  page,
  status,
  q,
}: {
  dropId: string;
  page: number;
  status?: string;
  q?: string;
}) {
  const { toast } = useToast();
  const router = useRouter();
  const pathname = `/admin/drops/${dropId}/orders`;
  const [orders, setOrders] = useState<Order[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [cancelTarget, setCancelTarget] = useState<Order | null>(null);
  const [confirmTarget, setConfirmTarget] = useState<Order | null>(null);
  const [resendTarget, setResendTarget] = useState<Order | null>(null);
  const [actionInFlight, setActionInFlight] = useState(false);
  const [search, setSearch] = useState(q ?? '');
  const cleanedRef = useRef(false);
  const pageSize = 20;

  // URL의 q가 바뀌면(뒤로/앞으로 가기 등) 검색 입력창도 동기화
  useEffect(() => {
    setSearch(q ?? '');
  }, [q]);

  // status·q·page를 URL 쿼리로 직렬화 (페이지네이션·필터 링크 공통)
  const buildHref = useCallback(
    (overrides: { status?: string; q?: string; page?: number }) => {
      const params = new URLSearchParams();
      const nextStatus = overrides.status ?? status ?? '';
      const nextQ = overrides.q ?? q ?? '';
      if (nextStatus) params.set('status', nextStatus);
      if (nextQ) params.set('q', nextQ);
      if (overrides.page && overrides.page > 1) {
        params.set('page', String(overrides.page));
      }
      const qs = params.toString();
      return qs ? `${pathname}?${qs}` : pathname;
    },
    [pathname, status, q]
  );

  const loadOrders = useCallback(async () => {
    setLoading(true);
    const result = await getDropOrders(dropId, page, pageSize, { status, q });
    if (result.success && result.data) {
      setOrders(result.data.items as Order[]);
      setTotal(result.data.total);
    }
    setLoading(false);
  }, [dropId, page, status, q]);

  // 만료된 무통장 주문 정리는 최초 1회만(필터/페이지 변경 시 재호출 방지),
  // 그 후 목록 로드. 이후엔 loadOrders 변경(필터·페이지)마다 목록만 재로드.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!cleanedRef.current) {
        cleanedRef.current = true;
        const cleanup = await cleanupExpiredBankTransferOrders();
        if (cancelled) return;
        if (cleanup.success && cleanup.expiredCount > 0) {
          toast({
            title: `만료된 무통장 주문 ${cleanup.expiredCount}건 자동 취소`,
          });
        }
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
    try {
      const result = await cancelOrder(cancelTarget.id);
      if (result.success) {
        toast({ title: '주문이 취소되었습니다.' });
        loadOrders();
      } else {
        toast({ title: result.error, variant: 'destructive' });
      }
    } catch {
      toast({ title: FAILED_ACTION_MESSAGE, variant: 'destructive' });
    } finally {
      // finally가 없으면 서버 액션이 reject할 때 actionInFlight가 true로 굳어
      // 이 화면의 버튼이 전부 새로고침 전까지 잠긴다
      setCancelTarget(null);
      setActionInFlight(false);
    }
  }

  async function handleConfirmDeposit() {
    if (!confirmTarget) return;
    setActionInFlight(true);
    try {
      const result = await confirmBankTransfer(confirmTarget.id);
      if (result.success) {
        // 메일 실패는 입금 확인을 되돌리지 않는다 — 재발송으로 복구하도록 알린다
        toast(
          result.emailSent
            ? { title: '입금이 확인되었습니다.' }
            : {
                title: '입금은 확인됐지만 메일 발송에 실패했습니다.',
                description: '주소를 확인한 뒤 "메일 재발송"을 눌러 주세요.',
                variant: 'destructive',
              }
        );
        loadOrders();
      } else {
        toast({ title: result.error, variant: 'destructive' });
      }
    } catch {
      // 입금 확인이 실제로 됐는지 알 수 없다 — 목록을 다시 읽어 상태를 확인시킨다
      toast({ title: FAILED_ACTION_MESSAGE, variant: 'destructive' });
      loadOrders();
    } finally {
      setConfirmTarget(null);
      setActionInFlight(false);
    }
  }

  /**
   * 메일이 아예 닿지 않는 경우(스팸함·주소 오타)의 최종 수단 —
   * 어드민이 링크를 복사해 카톡·문자로 직접 전달한다.
   */
  async function handleCopyTicketLink(order: Order) {
    if (!order.accessToken) {
      toast({
        title: '입장권 링크가 아직 발급되지 않았습니다.',
        variant: 'destructive',
      });
      return;
    }
    const url = getOrderTicketsUrl(order.accessToken);
    try {
      await navigator.clipboard.writeText(url);
      toast({ title: '입장권 링크를 복사했습니다.', description: url });
    } catch {
      // 클립보드 권한이 막힌 브라우저 — 주소를 띄워 직접 복사하게 한다
      toast({
        title: '복사에 실패했습니다. 아래 주소를 직접 복사하세요.',
        description: url,
        variant: 'destructive',
      });
    }
  }

  async function handleResend() {
    if (!resendTarget) return;
    setActionInFlight(true);
    try {
      const result = await resendOrderConfirmation(resendTarget.id);
      toast(
        result.success
          ? { title: `${result.email}로 다시 보냈습니다.` }
          : { title: result.error, variant: 'destructive' }
      );
    } catch {
      toast({ title: FAILED_ACTION_MESSAGE, variant: 'destructive' });
    } finally {
      setResendTarget(null);
      setActionInFlight(false);
    }
  }

  const totalPages = Math.ceil(total / pageSize);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
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
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button type="button" variant="outline" disabled={total === 0}>
              <Download className="mr-1 h-4 w-4" />
              내보내기
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem asChild>
              <a
                href={`/api/admin/drops/${dropId}/orders/export?format=xlsx`}
                download
              >
                Excel (.xlsx)
              </a>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <a
                href={`/api/admin/drops/${dropId}/orders/export?format=csv`}
                download
              >
                CSV (.csv)
              </a>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-2">
          {STATUS_FILTERS.map((f) => (
            <Button
              key={f.value || 'all'}
              type="button"
              size="sm"
              variant={(status ?? '') === f.value ? 'default' : 'outline'}
              onClick={() => router.replace(buildHref({ status: f.value }))}
            >
              {f.label}
            </Button>
          ))}
        </div>
        <form
          className="flex w-full gap-2 sm:w-auto"
          onSubmit={(e) => {
            e.preventDefault();
            router.replace(buildHref({ q: search.trim() }));
          }}
        >
          <Input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="이름·주문번호·연락처·이메일"
            className="h-9 w-full sm:w-64"
          />
          <Button type="submit" size="sm" variant="outline">
            <Search className="h-4 w-4" />
          </Button>
        </form>
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
                const expiresAt = order.bankTransfer?.expiresAt;
                const isUrgent =
                  isPendingDeposit && expiresAt
                    ? new Date(expiresAt).getTime() - Date.now() <=
                      6 * 60 * 60 * 1000
                    : false;
                const isCancellable =
                  order.status === 'pending' ||
                  order.status === 'paid' ||
                  order.status === 'confirmed';
                // 확정 메일은 결제 완료 이후에만 의미가 있다
                const isResendable =
                  order.status === 'paid' || order.status === 'confirmed';

                return (
                  <div
                    key={order.id}
                    className={`flex items-center justify-between gap-4 px-6 py-4 ${
                      isPendingDeposit && isUrgent ? 'bg-amber-50/50' : ''
                    }`}
                  >
                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-medium">
                          {order.orderNo}
                        </span>
                        <OrderStatusBadge
                          status={order.status}
                          bankTransferStatus={order.bankTransfer?.status}
                        />
                        {isPendingDeposit && expiresAt && (
                          <RemainingTimeIndicator expiresAt={expiresAt} />
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
                          {formatKstDateTime(new Date(order.createdAt))}
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
                        {isResendable && (
                          <div className="flex gap-1.5">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setResendTarget(order)}
                              disabled={actionInFlight}
                            >
                              <Mail className="mr-1 h-3.5 w-3.5" />
                              메일 재발송
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleCopyTicketLink(order)}
                            >
                              <Link2 className="mr-1 h-3.5 w-3.5" />
                              링크 복사
                            </Button>
                          </div>
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
              <Link href={buildHref({ page: page - 1 })}>이전</Link>
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
              <Link href={buildHref({ page: page + 1 })}>다음</Link>
            ) : (
              '다음'
            )}
          </Button>
        </div>
      )}

      <ConfirmDialog
        open={!!cancelTarget}
        onOpenChange={() => setCancelTarget(null)}
        title="주문 취소"
        description={
          <>
            {cancelTarget?.orderNo} 주문을 취소하시겠습니까? 결제가 완료된 경우
            환불 처리됩니다.
          </>
        }
        confirmText="주문 취소"
        variant="destructive"
        disabled={actionInFlight}
        onConfirm={handleCancel}
      />

      <ConfirmDialog
        open={!!confirmTarget}
        onOpenChange={() => setConfirmTarget(null)}
        title="입금 확인"
        description={
          <>
            {confirmTarget?.orderNo} 주문(
            <span className="font-mono">
              {confirmTarget?.bankTransfer?.depositorName}
            </span>
            , {confirmTarget?.totalAmount.toLocaleString()}원) 입금을
            확인하시겠습니까? 확정 메일이 자동 발송됩니다.
          </>
        }
        confirmText="입금 확인"
        disabled={actionInFlight}
        onConfirm={handleConfirmDeposit}
      />

      <ConfirmDialog
        open={!!resendTarget}
        onOpenChange={() => setResendTarget(null)}
        title="확정 메일 재발송"
        description={
          <>
            {resendTarget?.orderNo} 주문의 확정 메일(입장권 링크 포함)을{' '}
            <span className="font-mono">{resendTarget?.buyerEmail}</span>로 다시
            보냅니다. 이미 발급된 입장권을 그대로 보내므로 QR 코드와 링크는
            달라지지 않습니다.
          </>
        }
        confirmText="재발송"
        disabled={actionInFlight}
        onConfirm={handleResend}
      />
    </div>
  );
}
