'use client';

import PortOne from '@portone/browser-sdk/v2';
import { CheckCircle2, Minus, Plus, Ticket } from 'lucide-react';
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
  dropId: string;
  title: string;
  tiers: AvailableTier[];
}

function randomPaymentId() {
  return [...crypto.getRandomValues(new Uint32Array(2))]
    .map((word) => word.toString(16).padStart(8, '0'))
    .join('');
}

export function TicketPurchaseSection({
  dropId,
  title,
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
      const orderResult = await createOrder(dropId, {
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

      if (totalAmount === 0) {
        const verifyResult = await verifyPayment(order.id, `free-${order.id}`);
        if (verifyResult.success) {
          setOrderComplete(verifyResult.data?.orderNo ?? order.orderNo);
          setCheckoutOpen(false);
        } else {
          toast({ title: verifyResult.error, variant: 'destructive' });
        }
        setIsProcessing(false);
        return;
      }

      const paymentId = randomPaymentId();
      const payment = await PortOne.requestPayment({
        storeId: process.env.NEXT_PUBLIC_PORTONE_STORE_ID!,
        channelKey: process.env.NEXT_PUBLIC_PORTONE_CHANNEL_KEY!,
        paymentId,
        orderName: `${title} 티켓`,
        totalAmount,
        currency: 'CURRENCY_KRW',
        payMethod: 'CARD',
        customData: { orderId: order.id },
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

  if (orderComplete) {
    return (
      <div className="space-y-6">
        <h2 className="text-xs font-semibold uppercase tracking-[0.2em] text-neutral-400">
          Tickets
        </h2>
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-6 py-10 text-center">
          <CheckCircle2 className="mx-auto h-10 w-10 text-emerald-500" />
          <p className="mt-4 text-xl font-semibold text-emerald-900">
            구매가 완료되었습니다
          </p>
          <p className="mt-2 font-mono text-sm text-emerald-700">
            {orderComplete}
          </p>
          <p className="mt-3 text-sm text-emerald-600">
            확인 이메일이 {buyerEmail}로 발송됩니다.
          </p>
        </div>
      </div>
    );
  }

  const lowestPrice = Math.min(...tiers.map((t) => t.price));

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between">
        <div>
          <h2 className="text-xs font-semibold uppercase tracking-[0.2em] text-neutral-400">
            Tickets
          </h2>
          <p className="mt-1 text-2xl font-bold text-neutral-900">
            {lowestPrice === 0
              ? '무료'
              : `${lowestPrice.toLocaleString()}원부터`}
          </p>
        </div>
        <Ticket className="h-6 w-6 text-neutral-300" />
      </div>

      {/* Tier Cards */}
      <div className="space-y-3">
        {tiers.map((tier) => {
          const qty = quantities[tier.id] || 0;
          const maxQty = Math.min(tier.maxPerOrder, tier.remaining);
          const isSoldOut = tier.remaining <= 0;
          const isSelected = qty > 0;

          return (
            <div
              key={tier.id}
              className={`rounded-xl border-2 p-5 transition-all ${
                isSoldOut
                  ? 'border-neutral-100 bg-neutral-50 opacity-60'
                  : isSelected
                    ? 'border-neutral-900 bg-neutral-50'
                    : 'border-neutral-200 hover:border-neutral-300'
              }`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="text-base font-semibold text-neutral-900">
                      {tier.name}
                    </p>
                    {isSoldOut && (
                      <span className="rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-semibold uppercase text-red-600">
                        Sold Out
                      </span>
                    )}
                  </div>
                  {tier.description && (
                    <p className="mt-1 text-sm leading-relaxed text-neutral-500">
                      {tier.description}
                    </p>
                  )}
                  <p className="mt-2 text-lg font-bold text-neutral-900">
                    {tier.price === 0
                      ? '무료'
                      : `${tier.price.toLocaleString()}원`}
                  </p>
                  {!isSoldOut && (
                    <p className="mt-0.5 text-xs text-neutral-400">
                      잔여 {tier.remaining}장
                    </p>
                  )}
                </div>
                {!isSoldOut && (
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      className="flex h-9 w-9 items-center justify-center rounded-lg border border-neutral-200 text-neutral-500 transition-colors hover:border-neutral-400 hover:text-neutral-700 disabled:opacity-30"
                      onClick={() => updateQuantity(tier.id, -1, maxQty)}
                      disabled={qty <= 0}
                    >
                      <Minus className="h-4 w-4" />
                    </button>
                    <span className="w-10 text-center text-base font-semibold tabular-nums text-neutral-900">
                      {qty}
                    </span>
                    <button
                      type="button"
                      className="flex h-9 w-9 items-center justify-center rounded-lg border border-neutral-200 text-neutral-500 transition-colors hover:border-neutral-400 hover:text-neutral-700 disabled:opacity-30"
                      onClick={() => updateQuantity(tier.id, 1, maxQty)}
                      disabled={qty >= maxQty}
                    >
                      <Plus className="h-4 w-4" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Purchase CTA */}
      {selectedItems.length > 0 && (
        <div className="sticky bottom-4 z-10">
          <div className="rounded-2xl border bg-white p-5 shadow-xl">
            <div className="flex items-center justify-between gap-4">
              <div className="min-w-0">
                <p className="truncate text-sm text-neutral-500">
                  {selectedItems
                    .map((i) => `${i.tier.name} × ${i.quantity}`)
                    .join(', ')}
                </p>
                <p className="text-xl font-bold text-neutral-900">
                  {totalAmount === 0
                    ? '무료'
                    : `${totalAmount.toLocaleString()}원`}
                </p>
              </div>
              <Button
                size="lg"
                className="h-12 shrink-0 rounded-xl px-8 text-base font-semibold"
                onClick={handleCheckout}
              >
                {totalAmount === 0 ? '신청하기' : '구매하기'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Checkout Dialog */}
      <Dialog open={checkoutOpen} onOpenChange={setCheckoutOpen}>
        <DialogContent className="max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-lg">구매자 정보</DialogTitle>
          </DialogHeader>
          <form onSubmit={handlePayment} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="buyerName" className="text-sm font-medium">
                이름
              </Label>
              <Input
                id="buyerName"
                value={buyerName}
                onChange={(e) => setBuyerName(e.target.value)}
                required
                className="h-11"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="buyerEmail" className="text-sm font-medium">
                이메일
              </Label>
              <Input
                id="buyerEmail"
                type="email"
                value={buyerEmail}
                onChange={(e) => setBuyerEmail(e.target.value)}
                required
                className="h-11"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="buyerPhone" className="text-sm font-medium">
                전화번호
              </Label>
              <Input
                id="buyerPhone"
                type="tel"
                placeholder="01012345678"
                value={buyerPhone}
                onChange={(e) => setBuyerPhone(e.target.value)}
                required
                className="h-11"
              />
            </div>

            {/* Order Summary */}
            <div className="rounded-xl bg-neutral-50 p-4">
              <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-neutral-400">
                주문 내역
              </p>
              <div className="space-y-1.5">
                {selectedItems.map((item) => (
                  <div
                    key={item.tier.id}
                    className="flex justify-between text-sm"
                  >
                    <span className="text-neutral-600">
                      {item.tier.name} × {item.quantity}
                    </span>
                    <span className="font-medium text-neutral-900">
                      {(item.tier.price * item.quantity).toLocaleString()}원
                    </span>
                  </div>
                ))}
              </div>
              <div className="mt-3 flex justify-between border-t border-neutral-200 pt-3 text-base font-bold">
                <span>합계</span>
                <span>
                  {totalAmount === 0
                    ? '무료'
                    : `${totalAmount.toLocaleString()}원`}
                </span>
              </div>
            </div>

            <Button
              type="submit"
              className="h-12 w-full rounded-xl text-base font-semibold"
              disabled={isProcessing}
            >
              {isProcessing
                ? '처리 중...'
                : totalAmount === 0
                  ? '무료 신청하기'
                  : `${totalAmount.toLocaleString()}원 결제하기`}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
