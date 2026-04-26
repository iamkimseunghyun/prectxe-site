'use client';

import { Minus, Plus, Ticket } from 'lucide-react';
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
import {
  type GAItem,
  trackBeginCheckout,
  trackPurchase,
} from '@/lib/analytics/gtag';
import { subscribeNewsletter } from '@/modules/email/server/actions';
import {
  createBankTransferOrder,
  createOrder,
  verifyPayment,
} from '@/modules/tickets/server/actions';
import {
  BankTransferOrderSuccess,
  FreeOrderSuccess,
} from '@/modules/tickets/ui/components/ticket-order-success';

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

type BankTransferSuccess = {
  type: 'bank_transfer';
  orderNo: string;
  totalAmount: number;
  depositorName: string;
  expiresAt: Date | string;
  bankInfo: { bankName: string; accountNumber: string; accountHolder: string };
};

type FreeSuccess = {
  type: 'free';
  orderNo: string;
};

type OrderCompleteState = BankTransferSuccess | FreeSuccess;

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
  const [depositorName, setDepositorName] = useState('');
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [newsletterOptIn, setNewsletterOptIn] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [orderComplete, setOrderComplete] = useState<OrderCompleteState | null>(
    null
  );

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

  const isFree = totalAmount === 0;

  function handleCheckout() {
    if (selectedItems.length === 0) {
      toast({ title: '티켓을 선택해주세요.', variant: 'destructive' });
      return;
    }
    setCheckoutOpen(true);
  }

  const gaItems: GAItem[] = selectedItems.map((item) => ({
    item_id: item.tier.id,
    item_name: `${title} - ${item.tier.name}`,
    item_category: 'ticket',
    item_variant: item.tier.name,
    price: item.tier.price,
    quantity: item.quantity,
  }));

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (isProcessing) return;
    setIsProcessing(true);

    trackBeginCheckout(totalAmount, gaItems);

    try {
      // 무료 티켓 — 카드/무통장 흐름 우회, 즉시 주문 생성 + 무료 검증
      if (isFree) {
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
        const verifyResult = await verifyPayment(order.id, `free-${order.id}`);
        if (verifyResult.success) {
          trackPurchase({
            transactionId: `free-${order.id}`,
            value: 0,
            items: gaItems,
          });
          if (newsletterOptIn) {
            // best-effort, 실패해도 주문 결과에 영향 없음
            subscribeNewsletter(buyerEmail).catch((err) =>
              console.error('newsletter 구독 실패:', err)
            );
          }
          setOrderComplete({
            type: 'free',
            orderNo: verifyResult.data?.orderNo ?? order.orderNo,
          });
          setCheckoutOpen(false);
          setQuantities({});
        } else {
          toast({ title: verifyResult.error, variant: 'destructive' });
        }
        setIsProcessing(false);
        return;
      }

      // 유료 — 무통장 입금 주문
      const result = await createBankTransferOrder(dropId, {
        buyerName,
        buyerEmail,
        buyerPhone,
        depositorName,
        items: selectedItems.map((item) => ({
          ticketTierId: item.tier.id,
          quantity: item.quantity,
        })),
      });

      if (!result.success) {
        toast({ title: result.error, variant: 'destructive' });
        setIsProcessing(false);
        return;
      }

      const data = result.data!;
      trackPurchase({
        transactionId: data.orderNo,
        value: data.totalAmount,
        items: gaItems,
      });
      if (newsletterOptIn) {
        subscribeNewsletter(buyerEmail).catch((err) =>
          console.error('newsletter 구독 실패:', err)
        );
      }
      setOrderComplete({
        type: 'bank_transfer',
        orderNo: data.orderNo,
        totalAmount: data.totalAmount,
        depositorName: data.depositorName,
        expiresAt: data.expiresAt,
        bankInfo: data.bankInfo,
      });
      setCheckoutOpen(false);
      setQuantities({});
    } catch (err) {
      console.error('주문 처리 오류:', err);
      toast({
        title: '주문 처리 중 오류가 발생했습니다.',
        variant: 'destructive',
      });
    }

    setIsProcessing(false);
  }

  if (tiers.length === 0) return null;

  if (orderComplete?.type === 'free') {
    return (
      <FreeOrderSuccess
        orderNo={orderComplete.orderNo}
        buyerEmail={buyerEmail}
      />
    );
  }

  if (orderComplete?.type === 'bank_transfer') {
    return (
      <BankTransferOrderSuccess
        orderNo={orderComplete.orderNo}
        totalAmount={orderComplete.totalAmount}
        depositorName={orderComplete.depositorName}
        expiresAt={orderComplete.expiresAt}
        bankInfo={orderComplete.bankInfo}
        buyerEmail={buyerEmail}
      />
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
                  {isFree ? '무료' : `${totalAmount.toLocaleString()}원`}
                </p>
              </div>
              <Button
                size="lg"
                className="h-12 shrink-0 rounded-xl px-8 text-base font-semibold"
                onClick={handleCheckout}
              >
                {isFree ? '신청하기' : '주문하기'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Checkout Dialog */}
      <Dialog
        open={checkoutOpen}
        onOpenChange={(open) => {
          setCheckoutOpen(open);
          if (!open) setAgreedToTerms(false);
        }}
      >
        <DialogContent className="max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-lg">
              {isFree ? '신청자 정보' : '주문자 정보'}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
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

            {!isFree && (
              <div className="space-y-1.5">
                <Label htmlFor="depositorName" className="text-sm font-medium">
                  입금자명
                </Label>
                <Input
                  id="depositorName"
                  value={depositorName}
                  onChange={(e) => setDepositorName(e.target.value)}
                  required
                  maxLength={20}
                  placeholder="실제 입금하실 분 이름"
                  className="h-11"
                />
                <p className="text-xs text-neutral-500">
                  주문번호 끝 4자리가 자동으로 추가됩니다 (예: 홍길동A1B2)
                </p>
              </div>
            )}

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
                  {isFree ? '무료' : `${totalAmount.toLocaleString()}원`}
                </span>
              </div>
            </div>

            {/* 결제 방식 안내 */}
            {!isFree && (
              <div className="rounded-lg border border-neutral-200 bg-white p-3 text-xs text-neutral-600">
                결제 방식: <strong>무통장 입금</strong> · 주문 후 안내된 계좌로
                24시간 이내 입금
              </div>
            )}

            {/* 뉴스레터 구독 (선택) */}
            <label className="flex cursor-pointer items-start gap-2 rounded-lg border border-neutral-200 bg-white p-3 text-xs leading-relaxed text-neutral-600">
              <input
                type="checkbox"
                checked={newsletterOptIn}
                onChange={(e) => setNewsletterOptIn(e.target.checked)}
                className="mt-0.5 h-4 w-4 shrink-0 rounded border-neutral-300 accent-neutral-900"
              />
              <span>
                <span className="font-medium text-neutral-900">
                  PRECTXE의 다음 공연·기획 소식 받기 (선택)
                </span>{' '}
                — 새 라인업이 떴을 때 가장 먼저 알려드립니다. 언제든 메일 하단
                링크로 구독 해지 가능.
              </span>
            </label>

            {/* 구매조건 동의 */}
            <label className="flex cursor-pointer items-start gap-2 rounded-lg border border-neutral-200 bg-neutral-50 p-3 text-xs leading-relaxed text-neutral-600">
              <input
                type="checkbox"
                checked={agreedToTerms}
                onChange={(e) => setAgreedToTerms(e.target.checked)}
                className="mt-0.5 h-4 w-4 shrink-0 rounded border-neutral-300 accent-neutral-900"
                required
              />
              <span>
                <a
                  href="/terms"
                  target="_blank"
                  rel="noreferrer"
                  className="font-medium text-neutral-900 underline underline-offset-2"
                >
                  이용약관
                </a>
                ,{' '}
                <a
                  href="/privacy"
                  target="_blank"
                  rel="noreferrer"
                  className="font-medium text-neutral-900 underline underline-offset-2"
                >
                  개인정보처리방침
                </a>
                ,{' '}
                <a
                  href="/refund-policy"
                  target="_blank"
                  rel="noreferrer"
                  className="font-medium text-neutral-900 underline underline-offset-2"
                >
                  환불·취소 정책
                </a>
                에 동의하며, 위 주문 내용을 확인하고{' '}
                {isFree ? '신청을 진행합니다.' : '주문을 진행합니다.'}
              </span>
            </label>

            <Button
              type="submit"
              className="h-12 w-full rounded-xl text-base font-semibold"
              disabled={isProcessing || !agreedToTerms}
            >
              {isProcessing
                ? '처리 중...'
                : isFree
                  ? '무료 신청하기'
                  : `${totalAmount.toLocaleString()}원 주문하기`}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
