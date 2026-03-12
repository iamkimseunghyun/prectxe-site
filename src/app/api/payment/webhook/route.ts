import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import portone, { Webhook } from '@/lib/payment/portone';

export async function POST(req: Request) {
  try {
    const body = await req.text();
    const headers = Object.fromEntries(req.headers.entries());

    let webhook: Awaited<ReturnType<typeof Webhook.verify>>;
    try {
      webhook = await Webhook.verify(
        process.env.PORTONE_WEBHOOK_SECRET!,
        body,
        headers
      );
    } catch (e) {
      if (e instanceof Webhook.WebhookVerificationError) {
        return NextResponse.json(
          { error: 'Webhook 검증 실패' },
          { status: 400 }
        );
      }
      throw e;
    }

    if ('data' in webhook && 'paymentId' in webhook.data) {
      const portonePaymentId = webhook.data.paymentId;

      const paymentInfo = await portone.payment.getPayment({
        paymentId: portonePaymentId,
      });

      if (paymentInfo.status === 'PAID') {
        const existing = await prisma.payment.findUnique({
          where: { portonePaymentId },
        });

        if (existing && existing.status === 'paid') {
          return NextResponse.json({ status: 'already_processed' });
        }

        if (paymentInfo.customData) {
          const customData = JSON.parse(paymentInfo.customData);
          const orderId = customData.orderId;

          if (orderId) {
            const order = await prisma.order.findUnique({
              where: { id: orderId },
            });

            if (order && order.status === 'pending') {
              await prisma.$transaction([
                prisma.payment.upsert({
                  where: { portonePaymentId },
                  create: {
                    orderId,
                    portonePaymentId,
                    method: paymentInfo.method?.type
                      ? String(paymentInfo.method.type)
                      : null,
                    amount: paymentInfo.amount.total,
                    status: 'paid',
                    paidAt: new Date(),
                    rawData: JSON.parse(JSON.stringify(paymentInfo)),
                  },
                  update: {
                    status: 'paid',
                    paidAt: new Date(),
                  },
                }),
                prisma.order.update({
                  where: { id: orderId },
                  data: { status: 'paid' },
                }),
              ]);
            }
          }
        }
      }
    }

    return NextResponse.json({ status: 'ok' });
  } catch (e) {
    console.error('Webhook 처리 오류:', e);
    return NextResponse.json({ error: '처리 중 오류 발생' }, { status: 500 });
  }
}
