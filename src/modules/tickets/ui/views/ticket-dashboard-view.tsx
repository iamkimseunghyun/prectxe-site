'use client';

import { Banknote, BarChart3, Ticket, Users } from 'lucide-react';
import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { getTicketDashboard } from '@/modules/tickets/server/actions';
import { TicketTierList } from '../components/ticket-tier-list';

type DashboardData = {
  tiers: {
    id: string;
    name: string;
    description: string | null;
    price: number;
    quantity: number;
    soldCount: number;
    maxPerOrder: number;
    saleStart: Date | null;
    saleEnd: Date | null;
    status: string;
    order: number;
  }[];
  totalRevenue: number;
  totalSold: number;
  totalCapacity: number;
  salesRate: number;
  recentOrders: {
    id: string;
    orderNo: string;
    buyerName: string;
    buyerEmail: string;
    totalAmount: number;
    status: string;
    createdAt: Date;
    items: {
      id: string;
      quantity: number;
      ticketTier: { name: string };
    }[];
  }[];
};

const ORDER_STATUS_LABELS: Record<
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

export function TicketDashboardView() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    setLoading(true);
    const result = await getTicketDashboard();
    if (result.success) {
      setData(result.data as DashboardData);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-2">
        <Ticket className="h-5 w-5" />
        <h1 className="text-xl font-semibold">티켓 관리</h1>
      </div>

      {loading ? (
        <div className="py-20 text-center text-muted-foreground">
          로딩 중...
        </div>
      ) : !data ? (
        <div className="py-20 text-center text-muted-foreground">
          데이터를 불러올 수 없습니다.
        </div>
      ) : (
        <>
          {/* Stats Cards */}
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <Card>
              <CardContent className="flex items-center gap-3 p-4">
                <div className="rounded-lg bg-blue-50 p-2">
                  <Banknote className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">총 매출</p>
                  <p className="text-lg font-semibold">
                    {data.totalRevenue.toLocaleString()}원
                  </p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="flex items-center gap-3 p-4">
                <div className="rounded-lg bg-green-50 p-2">
                  <Ticket className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">판매량</p>
                  <p className="text-lg font-semibold">
                    {data.totalSold}/{data.totalCapacity}매
                  </p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="flex items-center gap-3 p-4">
                <div className="rounded-lg bg-purple-50 p-2">
                  <BarChart3 className="h-5 w-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">판매율</p>
                  <p className="text-lg font-semibold">{data.salesRate}%</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="flex items-center gap-3 p-4">
                <div className="rounded-lg bg-orange-50 p-2">
                  <Users className="h-5 w-5 text-orange-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">등급 수</p>
                  <p className="text-lg font-semibold">{data.tiers.length}</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Ticket Tiers */}
          <Card>
            <CardContent className="p-6">
              <TicketTierList
                tiers={data.tiers}
                onRefresh={loadData}
              />
            </CardContent>
          </Card>

          {/* Recent Orders */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">최근 주문</CardTitle>
                <Button variant="outline" size="sm" asChild>
                  <Link href="/admin/tickets/orders">전체 보기</Link>
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {data.recentOrders.length === 0 ? (
                <p className="py-8 text-center text-sm text-muted-foreground">
                  아직 주문이 없습니다.
                </p>
              ) : (
                <div className="space-y-2">
                  {data.recentOrders.map((order) => {
                    const statusInfo =
                      ORDER_STATUS_LABELS[order.status] ??
                      ORDER_STATUS_LABELS.pending;
                    return (
                      <div
                        key={order.id}
                        className="flex items-center justify-between rounded-md border px-4 py-3"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-medium">
                              {order.buyerName}
                            </p>
                            <Badge variant={statusInfo.variant}>
                              {statusInfo.label}
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {order.orderNo} ·{' '}
                            {order.items
                              .map(
                                (i) => `${i.ticketTier.name} ×${i.quantity}`
                              )
                              .join(', ')}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-medium">
                            {order.totalAmount.toLocaleString()}원
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(order.createdAt).toLocaleDateString(
                              'ko-KR'
                            )}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
