'use server';

import { revalidatePath } from 'next/cache';
import { requireAdmin } from '@/lib/auth/require-admin';
import { prisma } from '@/lib/db/prisma';
import portone, { PortOneError } from '@/lib/payment/portone';
import {
  type GoodsVariantInput,
  goodsOrderFormSchema,
  goodsVariantSchema,
  orderFormSchema,
  type TicketTierInput,
  ticketTierSchema,
} from '@/lib/schemas/ticket';

// ─── 주문번호 생성 ───────────────────────────────────

function generateOrderNo(): string {
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const rand = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `PRXE-${date}-${rand}`;
}

// ─── TicketTier CRUD (Admin) ─────────────────────────

export async function createTicketTier(dropId: string, data: TicketTierInput) {
  const auth = await requireAdmin();
  if (!auth.success) return { success: false, error: auth.error };

  const parsed = ticketTierSchema.safeParse(data);
  if (!parsed.success)
    return { success: false, error: parsed.error.errors[0].message };

  const tier = await prisma.ticketTier.create({
    data: {
      dropId,
      name: parsed.data.name,
      description: parsed.data.description,
      price: parsed.data.price,
      quantity: parsed.data.quantity,
      maxPerOrder: parsed.data.maxPerOrder,
      saleStart: parsed.data.saleStart ? new Date(parsed.data.saleStart) : null,
      saleEnd: parsed.data.saleEnd ? new Date(parsed.data.saleEnd) : null,
      order: parsed.data.order,
    },
  });

  revalidatePath('/admin/drops');
  return { success: true, data: tier };
}

export async function updateTicketTier(tierId: string, data: TicketTierInput) {
  const auth = await requireAdmin();
  if (!auth.success) return { success: false, error: auth.error };

  const parsed = ticketTierSchema.safeParse(data);
  if (!parsed.success)
    return { success: false, error: parsed.error.errors[0].message };

  await prisma.ticketTier.update({
    where: { id: tierId },
    data: {
      name: parsed.data.name,
      description: parsed.data.description,
      price: parsed.data.price,
      quantity: parsed.data.quantity,
      maxPerOrder: parsed.data.maxPerOrder,
      saleStart: parsed.data.saleStart ? new Date(parsed.data.saleStart) : null,
      saleEnd: parsed.data.saleEnd ? new Date(parsed.data.saleEnd) : null,
      order: parsed.data.order,
    },
  });

  revalidatePath('/admin/drops');
  return { success: true };
}

export async function deleteTicketTier(tierId: string) {
  const auth = await requireAdmin();
  if (!auth.success) return { success: false, error: auth.error };

  const tier = await prisma.ticketTier.findUnique({
    where: { id: tierId },
    select: { soldCount: true },
  });
  if (!tier) return { success: false, error: '등급을 찾을 수 없습니다.' };
  if (tier.soldCount > 0)
    return {
      success: false,
      error: '이미 판매된 티켓이 있어 삭제할 수 없습니다.',
    };

  await prisma.ticketTier.delete({ where: { id: tierId } });
  revalidatePath('/admin/drops');
  return { success: true };
}

export async function updateTicketTierStatus(
  tierId: string,
  status: 'scheduled' | 'on_sale' | 'sold_out' | 'closed'
) {
  const auth = await requireAdmin();
  if (!auth.success) return { success: false, error: auth.error };

  await prisma.ticketTier.update({
    where: { id: tierId },
    data: { status },
  });

  revalidatePath('/admin/drops');
  return { success: true };
}

// ─── GoodsVariant CRUD (Admin) ──────────────────────

export async function createGoodsVariant(
  dropId: string,
  data: GoodsVariantInput
) {
  const auth = await requireAdmin();
  if (!auth.success) return { success: false, error: auth.error };

  const parsed = goodsVariantSchema.safeParse(data);
  if (!parsed.success)
    return { success: false, error: parsed.error.errors[0].message };

  const variant = await prisma.goodsVariant.create({
    data: {
      dropId,
      name: parsed.data.name,
      price: parsed.data.price,
      stock: parsed.data.stock,
      options: parsed.data.options ? JSON.parse(parsed.data.options) : null,
      order: parsed.data.order,
    },
  });

  revalidatePath('/admin/drops');
  return { success: true, data: variant };
}

export async function updateGoodsVariant(
  variantId: string,
  data: GoodsVariantInput
) {
  const auth = await requireAdmin();
  if (!auth.success) return { success: false, error: auth.error };

  const parsed = goodsVariantSchema.safeParse(data);
  if (!parsed.success)
    return { success: false, error: parsed.error.errors[0].message };

  await prisma.goodsVariant.update({
    where: { id: variantId },
    data: {
      name: parsed.data.name,
      price: parsed.data.price,
      stock: parsed.data.stock,
      options: parsed.data.options ? JSON.parse(parsed.data.options) : null,
      order: parsed.data.order,
    },
  });

  revalidatePath('/admin/drops');
  return { success: true };
}

export async function deleteGoodsVariant(variantId: string) {
  const auth = await requireAdmin();
  if (!auth.success) return { success: false, error: auth.error };

  const variant = await prisma.goodsVariant.findUnique({
    where: { id: variantId },
    select: { soldCount: true },
  });
  if (!variant) return { success: false, error: '옵션을 찾을 수 없습니다.' };
  if (variant.soldCount > 0)
    return {
      success: false,
      error: '이미 판매된 상품이 있어 삭제할 수 없습니다.',
    };

  await prisma.goodsVariant.delete({ where: { id: variantId } });
  revalidatePath('/admin/drops');
  return { success: true };
}

// ─── 주문 생성 + 결제 ───────────────────────────────

export async function createOrder(
  dropId: string,
  input: {
    buyerName: string;
    buyerEmail: string;
    buyerPhone: string;
    items: { ticketTierId: string; quantity: number }[];
  }
) {
  const parsed = orderFormSchema.safeParse(input);
  if (!parsed.success)
    return { success: false, error: parsed.error.errors[0].message };

  const { buyerName, buyerEmail, buyerPhone, items } = parsed.data;

  const result = await prisma.$transaction(async (tx) => {
    let totalAmount = 0;
    const orderItems: {
      ticketTierId: string;
      quantity: number;
      unitPrice: number;
      subtotal: number;
    }[] = [];

    for (const item of items) {
      const tier = await tx.ticketTier.findUnique({
        where: { id: item.ticketTierId },
      });
      if (!tier) throw new Error('티켓 등급을 찾을 수 없습니다.');
      if (tier.status !== 'on_sale')
        throw new Error(`${tier.name}은(는) 현재 판매 중이 아닙니다.`);
      if (item.quantity > tier.maxPerOrder)
        throw new Error(
          `${tier.name}은(는) 최대 ${tier.maxPerOrder}장까지 구매 가능합니다.`
        );

      const remaining = tier.quantity - tier.soldCount;
      if (item.quantity > remaining)
        throw new Error(`${tier.name} 잔여 수량이 부족합니다.`);

      await tx.ticketTier.update({
        where: { id: tier.id },
        data: { soldCount: { increment: item.quantity } },
      });

      const subtotal = tier.price * item.quantity;
      totalAmount += subtotal;
      orderItems.push({
        ticketTierId: tier.id,
        quantity: item.quantity,
        unitPrice: tier.price,
        subtotal,
      });
    }

    const order = await tx.order.create({
      data: {
        orderNo: generateOrderNo(),
        dropId,
        buyerName,
        buyerEmail,
        buyerPhone,
        totalAmount,
        items: { create: orderItems },
      },
      include: { items: true },
    });

    return order;
  });

  return { success: true, data: result };
}

// ─── 굿즈 주문 생성 ─────────────────────────────────

export async function createGoodsOrder(
  dropId: string,
  input: {
    buyerName: string;
    buyerEmail: string;
    buyerPhone: string;
    items: { goodsVariantId: string; quantity: number }[];
  }
) {
  const parsed = goodsOrderFormSchema.safeParse(input);
  if (!parsed.success)
    return { success: false, error: parsed.error.errors[0].message };

  const { buyerName, buyerEmail, buyerPhone, items } = parsed.data;

  const result = await prisma.$transaction(async (tx) => {
    let totalAmount = 0;
    const orderItems: {
      goodsVariantId: string;
      quantity: number;
      unitPrice: number;
      subtotal: number;
    }[] = [];

    for (const item of items) {
      const variant = await tx.goodsVariant.findUnique({
        where: { id: item.goodsVariantId },
      });
      if (!variant) throw new Error('옵션을 찾을 수 없습니다.');

      const remaining = variant.stock - variant.soldCount;
      if (item.quantity > remaining)
        throw new Error(`${variant.name} 재고가 부족합니다.`);

      await tx.goodsVariant.update({
        where: { id: variant.id },
        data: { soldCount: { increment: item.quantity } },
      });

      const subtotal = variant.price * item.quantity;
      totalAmount += subtotal;
      orderItems.push({
        goodsVariantId: variant.id,
        quantity: item.quantity,
        unitPrice: variant.price,
        subtotal,
      });
    }

    const order = await tx.order.create({
      data: {
        orderNo: generateOrderNo(),
        dropId,
        buyerName,
        buyerEmail,
        buyerPhone,
        totalAmount,
        items: { create: orderItems },
      },
      include: { items: true },
    });

    return order;
  });

  return { success: true, data: result };
}

// ─── 결제 완료 검증 ─────────────────────────────────

export async function verifyPayment(orderId: string, portonePaymentId: string) {
  try {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { items: { include: { ticketTier: true } } },
    });
    if (!order) return { success: false, error: '주문을 찾을 수 없습니다.' };
    if (order.status !== 'pending')
      return { success: false, error: '이미 처리된 주문입니다.' };

    const payment = await portone.payment.getPayment({
      paymentId: portonePaymentId,
    });

    if (payment.status !== 'PAID') {
      return { success: false, error: '결제가 완료되지 않았습니다.' };
    }

    if (payment.amount.total !== order.totalAmount) {
      return { success: false, error: '결제 금액이 일치하지 않습니다.' };
    }

    await prisma.$transaction([
      prisma.payment.create({
        data: {
          orderId: order.id,
          portonePaymentId,
          method: payment.method?.type ? String(payment.method.type) : null,
          amount: payment.amount.total,
          status: 'paid',
          paidAt: new Date(),
          rawData: JSON.parse(JSON.stringify(payment)),
        },
      }),
      prisma.order.update({
        where: { id: order.id },
        data: { status: 'paid' },
      }),
    ]);

    revalidatePath('/admin/drops');
    return { success: true, data: { orderNo: order.orderNo } };
  } catch (e) {
    console.error('결제 검증 실패:', e);
    if (e instanceof PortOneError) {
      return { success: false, error: '포트원 결제 조회에 실패했습니다.' };
    }
    return { success: false, error: '결제 검증 중 오류가 발생했습니다.' };
  }
}

// ─── 주문 취소 (Admin) ──────────────────────────────

export async function cancelOrder(orderId: string) {
  const auth = await requireAdmin();
  if (!auth.success) return { success: false, error: auth.error };

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { items: true, payment: true },
  });
  if (!order) return { success: false, error: '주문을 찾을 수 없습니다.' };
  if (order.status === 'cancelled' || order.status === 'refunded')
    return { success: false, error: '이미 취소된 주문입니다.' };

  if (order.payment?.portonePaymentId) {
    try {
      await portone.payment.cancelPayment({
        paymentId: order.payment.portonePaymentId,
        reason: '관리자 취소',
      });
    } catch (e) {
      console.error('포트원 취소 실패:', e);
      return { success: false, error: '결제 취소에 실패했습니다.' };
    }
  }

  await prisma.$transaction([
    ...order.items
      .filter((item) => item.ticketTierId)
      .map((item) =>
        prisma.ticketTier.update({
          where: { id: item.ticketTierId! },
          data: { soldCount: { decrement: item.quantity } },
        })
      ),
    ...order.items
      .filter((item) => item.goodsVariantId)
      .map((item) =>
        prisma.goodsVariant.update({
          where: { id: item.goodsVariantId! },
          data: { soldCount: { decrement: item.quantity } },
        })
      ),
    prisma.order.update({
      where: { id: orderId },
      data: { status: 'cancelled' },
    }),
    ...(order.payment
      ? [
          prisma.payment.update({
            where: { id: order.payment.id },
            data: { status: 'cancelled', cancelledAt: new Date() },
          }),
        ]
      : []),
  ]);

  revalidatePath('/admin/drops');
  return { success: true };
}

// ─── 주문 목록 조회 (Admin) ─────────────────────────

export async function getOrders(page = 1, pageSize = 20) {
  const auth = await requireAdmin();
  if (!auth.success) return { success: false, error: auth.error } as const;

  const [total, items] = await Promise.all([
    prisma.order.count(),
    prisma.order.findMany({
      include: {
        drop: { select: { title: true, slug: true, type: true } },
        items: { include: { ticketTier: true, goodsVariant: true } },
        payment: true,
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
  ]);

  return {
    success: true,
    data: { page, pageSize, total, items },
  } as const;
}
