'use server';

import { revalidatePath } from 'next/cache';
import { requireAdmin } from '@/lib/auth/require-admin';
import { prisma } from '@/lib/db/prisma';
import portone, { PortOneError } from '@/lib/payment/portone';
import {
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

export async function createTicketTier(
  programId: string,
  data: TicketTierInput
) {
  const auth = await requireAdmin();
  if (!auth.success) return { success: false, error: auth.error };

  const parsed = ticketTierSchema.safeParse(data);
  if (!parsed.success)
    return { success: false, error: parsed.error.errors[0].message };

  const tier = await prisma.ticketTier.create({
    data: {
      programId,
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

  revalidatePath(`/admin/programs/${programId}`);
  return { success: true, data: tier };
}

export async function updateTicketTier(tierId: string, data: TicketTierInput) {
  const auth = await requireAdmin();
  if (!auth.success) return { success: false, error: auth.error };

  const parsed = ticketTierSchema.safeParse(data);
  if (!parsed.success)
    return { success: false, error: parsed.error.errors[0].message };

  const tier = await prisma.ticketTier.update({
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

  revalidatePath(`/admin/programs/${tier.programId}`);
  return { success: true, data: tier };
}

export async function deleteTicketTier(tierId: string) {
  const auth = await requireAdmin();
  if (!auth.success) return { success: false, error: auth.error };

  const tier = await prisma.ticketTier.findUnique({
    where: { id: tierId },
    select: { programId: true, soldCount: true },
  });
  if (!tier) return { success: false, error: '등급을 찾을 수 없습니다.' };
  if (tier.soldCount > 0)
    return {
      success: false,
      error: '이미 판매된 티켓이 있어 삭제할 수 없습니다.',
    };

  await prisma.ticketTier.delete({ where: { id: tierId } });
  revalidatePath(`/admin/programs/${tier.programId}`);
  return { success: true };
}

export async function updateTicketTierStatus(
  tierId: string,
  status: 'scheduled' | 'on_sale' | 'sold_out' | 'closed'
) {
  const auth = await requireAdmin();
  if (!auth.success) return { success: false, error: auth.error };

  const tier = await prisma.ticketTier.update({
    where: { id: tierId },
    data: { status },
  });

  revalidatePath(`/admin/programs/${tier.programId}`);
  return { success: true, data: tier };
}

// ─── Ticketing 활성화 토글 (Admin) ───────────────────

export async function toggleTicketing(programId: string, enabled: boolean) {
  const auth = await requireAdmin();
  if (!auth.success) return { success: false, error: auth.error };

  const program = await prisma.program.update({
    where: { id: programId },
    data: { ticketingEnabled: enabled },
    select: { slug: true },
  });

  revalidatePath(`/admin/programs/${programId}`);
  revalidatePath(`/programs/${program.slug}`);
  return { success: true };
}

// ─── 공개 조회 ──────────────────────────────────────

export async function getTicketTiers(programId: string) {
  const tiers = await prisma.ticketTier.findMany({
    where: { programId },
    orderBy: { order: 'asc' },
  });
  return tiers;
}

export async function getAvailableTicketTiers(programId: string) {
  const now = new Date();
  const tiers = await prisma.ticketTier.findMany({
    where: {
      programId,
      status: 'on_sale',
      OR: [{ saleStart: null }, { saleStart: { lte: now } }],
      AND: [
        {
          OR: [{ saleEnd: null }, { saleEnd: { gte: now } }],
        },
      ],
    },
    orderBy: { order: 'asc' },
  });
  return tiers.map((tier) => ({
    ...tier,
    remaining: tier.quantity - tier.soldCount,
  }));
}

// ─── 주문 생성 + 결제 ───────────────────────────────

export async function createOrder(
  programId: string,
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

  // 트랜잭션으로 재고 확인 + 차감 + 주문 생성
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
      if (!tier) throw new Error(`티켓 등급을 찾을 수 없습니다.`);
      if (tier.programId !== programId)
        throw new Error('잘못된 프로그램입니다.');
      if (tier.status !== 'on_sale')
        throw new Error(`${tier.name}은(는) 현재 판매 중이 아닙니다.`);
      if (item.quantity > tier.maxPerOrder)
        throw new Error(
          `${tier.name}은(는) 최대 ${tier.maxPerOrder}장까지 구매 가능합니다.`
        );

      const remaining = tier.quantity - tier.soldCount;
      if (item.quantity > remaining)
        throw new Error(`${tier.name} 잔여 수량이 부족합니다.`);

      // 재고 차감
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
        programId,
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

    // 포트원 결제 조회
    const payment = await portone.payment.getPayment({
      paymentId: portonePaymentId,
    });

    if (payment.status !== 'PAID') {
      return { success: false, error: '결제가 완료되지 않았습니다.' };
    }

    // 금액 검증
    if (payment.amount.total !== order.totalAmount) {
      return { success: false, error: '결제 금액이 일치하지 않습니다.' };
    }

    // 결제 정보 저장 + 주문 상태 변경
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

    revalidatePath(`/admin/programs/${order.programId}`);
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

  // 포트원 결제 취소
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

  // 재고 복원 + 상태 변경
  await prisma.$transaction([
    ...order.items.map((item) =>
      prisma.ticketTier.update({
        where: { id: item.ticketTierId },
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

  revalidatePath(`/admin/programs/${order.programId}`);
  return { success: true };
}

// ─── 주문 목록 조회 (Admin) ─────────────────────────

export async function getOrders(programId: string, page = 1, pageSize = 20) {
  const auth = await requireAdmin();
  if (!auth.success) return { success: false, error: auth.error } as const;

  const [total, items] = await Promise.all([
    prisma.order.count({ where: { programId } }),
    prisma.order.findMany({
      where: { programId },
      include: {
        items: { include: { ticketTier: true } },
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

// ─── 대시보드 통계 (Admin) ──────────────────────────

export async function getTicketDashboard(programId: string) {
  const auth = await requireAdmin();
  if (!auth.success) return { success: false, error: auth.error } as const;

  const [tiers, orderStats, recentOrders] = await Promise.all([
    prisma.ticketTier.findMany({
      where: { programId },
      orderBy: { order: 'asc' },
    }),
    prisma.order.groupBy({
      by: ['status'],
      where: { programId },
      _count: true,
      _sum: { totalAmount: true },
    }),
    prisma.order.findMany({
      where: { programId, status: { in: ['paid', 'confirmed'] } },
      include: { items: { include: { ticketTier: true } } },
      orderBy: { createdAt: 'desc' },
      take: 10,
    }),
  ]);

  const totalRevenue = orderStats
    .filter((s) => s.status === 'paid' || s.status === 'confirmed')
    .reduce((sum, s) => sum + (s._sum.totalAmount ?? 0), 0);

  const totalSold = tiers.reduce((sum, t) => sum + t.soldCount, 0);
  const totalCapacity = tiers.reduce((sum, t) => sum + t.quantity, 0);

  return {
    success: true,
    data: {
      tiers,
      totalRevenue,
      totalSold,
      totalCapacity,
      salesRate:
        totalCapacity > 0 ? Math.round((totalSold / totalCapacity) * 100) : 0,
      orderStats,
      recentOrders,
    },
  } as const;
}
