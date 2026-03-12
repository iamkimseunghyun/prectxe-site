'use client';

import PortOne from '@portone/browser-sdk/v2';
import { Minus, Plus } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { createOrder, verifyPayment } from '@/modules/tickets/server/actions';

type AvailableTier = {
  id: string;
  name: string;
  description: string | null;
  price: number;
  quantity: number;
  soldCount: number;
  maxPerOrder: number;
  remaining: number;
};

interface TicketPurchaseSectionProps {
  programId: string;
  programTitle: string;
  tiers: AvailableTier[];
}

function randomPaymentId() {
  return [...crypto.getRandomValues(new Uint32Array(2))]
    .map((word) => word.toString(16).padStart(8, '0'))
    .join('');
}

export function TicketPurchaseSection({
  programId,
  programTitle,
  tiers,
}: TicketPurchaseSectionProps) {
  const { toast } = useToast();
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [buyerName, setBuyerName] = useState('');
  const [buyerEmail, setBuyerEmail] = useState('');
  const [buyerPhone, setBuyerPhone] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [orderComplete, setOrderComplete] = useState<string | null>(null);

  function updateQuantity(tierId: string, delta: number, max: number) {
    setQuantities((prev) => {
      const current = prev[tierId] || 0;
      const next = Math.max(0, Math.min(max, current + delta));
      return { ...prev, [tierId]: next };
    });
  }

  const selectedItems = tiers
    .filter((t) => (quantities[t.id] || 0) > 0)
    .map((t) => ({
      tier: t,
      quantity: quantities[t.id],
    }));

  const totalAmount = selectedItems.reduce(
    (sum, item) => sum + item.tier.price * item.quantity,
    0
  );

  function handleCheckout() {
    if (selectedItems.length === 0) {
      toast({ title: '티켓을 선택해주세요.', variant: 'destructive' });
      return;
    }
    setCheckoutOpen(true);
  }

  async function handlePayment(e: React.FormEvent) {
    e.preventDefault();
    if (isProcessing) return;
    setIsProcessing(true);

    try {
      // 1. 주문 생성
      const orderResult = await createOrder(programId, {
        buyerName,
        buyerEmail,
        buyerPhone,
        items: selectedItems.map((item) => ({
          ticketTierId: item.tier.id,
          quantity: item.quantity,
        })),
      });

      if (!orderResult.success) {
        toast({ title: orderResult.error, variant: 'destructive' });
        setIsProcessing(false);
        return;
      }

      const order = orderResult.data!;

      // 2. 무료 티켓인 경우 결제 스킵
      if (totalAmount === 0) {
        const verifyResult = await verifyPayment(order.id, `free-${order.id}`);
        if (verifyResult.success) {
          setOrderComplete(verifyResult.data?.orderNo ?? order.orderNo);
          setCheckoutOpen(false);
        } else {
          toast({
            title: verifyResult.error,
            variant: 'destructive',
          });
        }
        setIsProcessing(false);
        return;
      }

      // 3. 포트원 결제 요청
      const paymentId = randomPaymentId();
      const payment = await PortOne.requestPayment({
        storeId: process.env.NEXT_PUBLIC_PORTONE_STORE_ID!,
        channelKey: process.env.NEXT_PUBLIC_PORTONE_CHANNEL_KEY!,
        paymentId,
        orderName: `${programTitle} 티켓`,
        totalAmount,
        currency: 'CURRENCY_KRW',
        payMethod: 'CARD',
        customData: {
          orderId: order.id,
        },
        customer: {
          fullName: buyerName,
          email: buyerEmail,
          phoneNumber: buyerPhone,
        },
      });

      if (!payment || payment.code !== undefined) {
        toast({
          title: payment?.message ?? '결제가 취소되었습니다.',
          variant: 'destructive',
        });
        setIsProcessing(false);
        return;
      }

      // 4. 결제 검증
      const verifyResult = await verifyPayment(order.id, payment.paymentId);
      if (verifyResult.success) {
        setOrderComplete(verifyResult.data?.orderNo ?? order.orderNo);
        setCheckoutOpen(false);
        setQuantities({});
      } else {
        toast({ title: verifyResult.error, variant: 'destructive' });
      }
    } catch (err) {
      console.error('결제 오류:', err);
      toast({
        title: '결제 처리 중 오류가 발생했습니다.',
        variant: 'destructive',
      });
    }

    setIsProcessing(false);
  }

  if (tiers.length === 0) return null;

  // 결제 완료 화면
  if (orderComplete) {
    return (
      <section className="space-y-4">
        <h2 className="text-lg font-semibold">티켓 구매 완료</h2>
        <div className="rounded-lg border bg-green-50 p-6 text-center">
          <p className="text-lg font-medium text-green-800">
            결제가 완료되었습니다!
          </p>
          <p className="mt-2 text-sm text-green-700">
            주문번호: {orderComplete}
          </p>
          <p className="mt-1 text-sm text-green-600">
            확인 이메일이 {buyerEmail}로 발송됩니다.
          </p>
        </div>
      </section>
    );
  }

  return (
    <section className="space-y-4">
      <h2 className="text-lg font-semibold">티켓</h2>

      {/* Tier Cards */}
      <div className="space-y-3">
        {tiers.map((tier) => {
          const qty = quantities[tier.id] || 0;
          const maxQty = Math.min(tier.maxPerOrder, tier.remaining);
          const isSoldOut = tier.remaining <= 0;

          return (
            <div
              key={tier.id}
              className="flex items-center justify-between rounded-lg border p-4"
            >
              <div className="min-w-0 flex-1">
                <p className="font-medium">{tier.name}</p>
                {tier.description && (
                  <p className="text-sm text-muted-foreground">
                    {tier.description}
                  </p>
                )}
                <p className="mt-1 text-sm font-semibold">
                  {tier.price === 0
                    ? '무료'
                    : `${tier.price.toLocaleString()}원`}
                </p>
                {isSoldOut && (
                  <p className="mt-1 text-sm font-medium text-red-500">매진</p>
                )}
              </div>
              {!isSoldOut && (
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => updateQuantity(tier.id, -1, maxQty)}
                    disabled={qty <= 0}
                  >
                    <Minus className="h-3 w-3" />
                  </Button>
                  <span className="w-8 text-center text-sm font-medium">
                    {qty}
                  </span>
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => updateQuantity(tier.id, 1, maxQty)}
                    disabled={qty >= maxQty}
                  >
                    <Plus className="h-3 w-3" />
                  </Button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Purchase CTA */}
      {totalAmount > 0 || selectedItems.length > 0 ? (
        <div className="sticky bottom-4 rounded-lg border bg-background p-4 shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">
                {selectedItems
                  .map((i) => `${i.tier.name} ×${i.quantity}`)
                  .join(', ')}
              </p>
              <p className="text-lg font-semibold">
                {totalAmount === 0
                  ? '무료'
                  : `${totalAmount.toLocaleString()}원`}
              </p>
            </div>
            <Button size="lg" onClick={handleCheckout}>
              구매하기
            </Button>
          </div>
        </div>
      ) : null}

      {/* Checkout Dialog */}
      <Dialog open={checkoutOpen} onOpenChange={setCheckoutOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>구매자 정보</DialogTitle>
          </DialogHeader>
          <form onSubmit={handlePayment} className="space-y-4">
            <div>
              <Label htmlFor="buyerName">
                이름 <span className="text-red-500">*</span>
              </Label>
              <Input
                id="buyerName"
                value={buyerName}
                onChange={(e) => setBuyerName(e.target.value)}
                required
              />
            </div>
            <div>
              <Label htmlFor="buyerEmail">
                이메일 <span className="text-red-500">*</span>
              </Label>
              <Input
                id="buyerEmail"
                type="email"
                value={buyerEmail}
                onChange={(e) => setBuyerEmail(e.target.value)}
                required
              />
            </div>
            <div>
              <Label htmlFor="buyerPhone">
                전화번호 <span className="text-red-500">*</span>
              </Label>
              <Input
                id="buyerPhone"
                type="tel"
                placeholder="01012345678"
                value={buyerPhone}
                onChange={(e) => setBuyerPhone(e.target.value)}
                required
              />
            </div>

            {/* Order Summary */}
            <div className="rounded-md bg-muted p-3">
              <p className="mb-2 text-sm font-medium">주문 내역</p>
              {selectedItems.map((item) => (
                <div
                  key={item.tier.id}
                  className="flex justify-between text-sm"
                >
                  <span>
                    {item.tier.name} × {item.quantity}
                  </span>
                  <span>
                    {(item.tier.price * item.quantity).toLocaleString()}원
                  </span>
                </div>
              ))}
              <div className="mt-2 flex justify-between border-t pt-2 font-semibold">
                <span>합계</span>
                <span>{totalAmount.toLocaleString()}원</span>
              </div>
            </div>

            <Button type="submit" className="w-full" disabled={isProcessing}>
              {isProcessing
                ? '처리 중...'
                : totalAmount === 0
                  ? '무료 신청하기'
                  : `${totalAmount.toLocaleString()}원 결제하기`}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </section>
  );
}
