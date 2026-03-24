'use client';

import PortOne from '@portone/browser-sdk/v2';
import { CheckCircle2 } from 'lucide-react';
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
  createGoodsOrder,
  verifyPayment,
} from '@/modules/tickets/server/actions';

interface GoodsPurchaseSectionProps {
  dropId: string;
  title: string;
  variantId: string;
  variantName: string;
  unitPrice: number;
  quantity: number;
}

function randomPaymentId() {
  return [...crypto.getRandomValues(new Uint32Array(2))]
    .map((word) => word.toString(16).padStart(8, '0'))
    .join('');
}

export function GoodsPurchaseSection({
  dropId,
  title,
  variantId,
  variantName,
  unitPrice,
  quantity,
}: GoodsPurchaseSectionProps) {
  const { toast } = useToast();
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [buyerName, setBuyerName] = useState('');
  const [buyerEmail, setBuyerEmail] = useState('');
  const [buyerPhone, setBuyerPhone] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [orderComplete, setOrderComplete] = useState<string | null>(null);

  const totalAmount = unitPrice * quantity;

  async function handlePayment(e: React.FormEvent) {
    e.preventDefault();
    if (isProcessing) return;
    setIsProcessing(true);

    try {
      const orderResult = await createGoodsOrder(dropId, {
        buyerName,
        buyerEmail,
        buyerPhone,
        items: [{ goodsVariantId: variantId, quantity }],
      });

      if (!orderResult.success) {
        toast({ title: orderResult.error, variant: 'destructive' });
        setIsProcessing(false);
        return;
      }

      const order = orderResult.data!;

      if (totalAmount === 0) {
        const verifyResult = await verifyPayment(
          order.id,
          `free-${order.id}`
        );
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
        orderName: `${title} - ${variantName}`,
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

  if (orderComplete) {
    return (
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
    );
  }

  return (
    <>
      <Button
        className="mt-6 h-14 w-full rounded-full text-base font-semibold tracking-wide"
        size="lg"
        onClick={() => setCheckoutOpen(true)}
      >
        구매하기
      </Button>

      <Dialog open={checkoutOpen} onOpenChange={setCheckoutOpen}>
        <DialogContent className="max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-lg">구매자 정보</DialogTitle>
          </DialogHeader>
          <form onSubmit={handlePayment} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="gBuyerName" className="text-sm font-medium">
                이름
              </Label>
              <Input
                id="gBuyerName"
                value={buyerName}
                onChange={(e) => setBuyerName(e.target.value)}
                required
                className="h-11"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="gBuyerEmail" className="text-sm font-medium">
                이메일
              </Label>
              <Input
                id="gBuyerEmail"
                type="email"
                value={buyerEmail}
                onChange={(e) => setBuyerEmail(e.target.value)}
                required
                className="h-11"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="gBuyerPhone" className="text-sm font-medium">
                전화번호
              </Label>
              <Input
                id="gBuyerPhone"
                type="tel"
                placeholder="01012345678"
                value={buyerPhone}
                onChange={(e) => setBuyerPhone(e.target.value)}
                required
                className="h-11"
              />
            </div>

            <div className="rounded-xl bg-neutral-50 p-4">
              <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-neutral-400">
                주문 내역
              </p>
              <div className="flex justify-between text-sm">
                <span className="text-neutral-600">
                  {variantName} × {quantity}
                </span>
                <span className="font-medium text-neutral-900">
                  {totalAmount.toLocaleString()}원
                </span>
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
    </>
  );
}
