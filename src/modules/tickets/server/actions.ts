'use server';

import type { Prisma } from '@prisma/client';
import { revalidatePath } from 'next/cache';
import { requireAdmin } from '@/lib/auth/require-admin';
import { parseInput } from '@/lib/auth/server-action-helpers';
import { prisma } from '@/lib/db/prisma';
import { sendEmail } from '@/lib/email/send';
import portone, { PortOneError } from '@/lib/payment/portone';
import {
  bankTransferOrderFormSchema,
  type GoodsVariantInput,
  goodsOrderFormSchema,
  goodsVariantSchema,
  orderFormSchema,
  type TicketTierInput,
  ticketTierSchema,
} from '@/lib/schemas/ticket';
import {
  formatDepositorName,
  getBankInfo,
  getBankTransferExpiryDate,
  getBankTransferExpiryHours,
} from '@/lib/utils/bank-transfer';
import { getEffectiveTierStatus } from '@/lib/utils/ticket-status';
import {
  generateAccessToken,
  generateOrderNo,
  generateTicketToken,
  getOrderTicketsUrl,
} from '@/lib/utils/ticket-token';

// ─── 티켓 발급 헬퍼 (paid 처리 시 호출) ──────────────

async function issueTicketsForOrder(
  tx: Prisma.TransactionClient,
  order: {
    id: string;
    items: { id: string; ticketTierId: string | null; quantity: number }[];
  }
): Promise<{ accessToken: string; ticketCount: number }> {
  const accessToken = generateAccessToken();
  const ticketRows: {
    token: string;
    orderId: string;
    orderItemId: string;
    ticketTierId: string | null;
  }[] = [];

  for (const item of order.items) {
    // 티켓 등급만 입장권 발급. 굿즈 OrderItem은 skip.
    if (!item.ticketTierId) continue;
    for (let i = 0; i < item.quantity; i++) {
      ticketRows.push({
        token: generateTicketToken(),
        orderId: order.id,
        orderItemId: item.id,
        ticketTierId: item.ticketTierId,
      });
    }
  }

  await tx.order.update({
    where: { id: order.id },
    data: { accessToken },
  });

  if (ticketRows.length > 0) {
    await tx.ticket.createMany({ data: ticketRows });
  }

  return { accessToken, ticketCount: ticketRows.length };
}

// ─── TicketTier CRUD (Admin) ─────────────────────────

export async function createTicketTier(dropId: string, data: TicketTierInput) {
  const auth = await requireAdmin();
  if (!auth.success) return { success: false, error: auth.error };

  const parsed = parseInput(ticketTierSchema, data);
  if (!parsed.success) return parsed;

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

  const parsed = parseInput(ticketTierSchema, data);
  if (!parsed.success) return parsed;

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

  const parsed = parseInput(goodsVariantSchema, data);
  if (!parsed.success) return parsed;

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

  const parsed = parseInput(goodsVariantSchema, data);
  if (!parsed.success) return parsed;

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
  const parsed = parseInput(orderFormSchema, input);
  if (!parsed.success) return parsed;

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
      if (getEffectiveTierStatus(tier) !== 'on_sale')
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

  return { success: true as const, data: result };
}

// ─── 무통장 입금 주문 생성 (티켓) ───────────────────

export async function createBankTransferOrder(
  dropId: string,
  input: {
    buyerName: string;
    buyerEmail: string;
    buyerPhone: string;
    depositorName: string;
    items: { ticketTierId: string; quantity: number }[];
  }
) {
  const parsed = parseInput(bankTransferOrderFormSchema, input);
  if (!parsed.success) return parsed;

  const {
    buyerName,
    buyerEmail,
    buyerPhone,
    depositorName: depositorBaseName,
    items,
  } = parsed.data;

  try {
    const order = await prisma.$transaction(async (tx) => {
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
        if (getEffectiveTierStatus(tier) !== 'on_sale')
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

      const orderNo = generateOrderNo();
      const expiresAt = getBankTransferExpiryDate();
      const fullDepositorName = formatDepositorName(depositorBaseName, orderNo);

      return tx.order.create({
        data: {
          orderNo,
          dropId,
          buyerName,
          buyerEmail,
          buyerPhone,
          totalAmount,
          items: { create: orderItems },
          bankTransfer: {
            create: {
              depositorName: fullDepositorName,
              amount: totalAmount,
              expiresAt,
            },
          },
        },
        include: { items: true, bankTransfer: true, drop: true },
      });
    });

    // 안내 이메일 (실패해도 주문 결과에 영향 없음)
    try {
      const dropTitle = order.drop?.title ?? 'PRECTXE';
      const bank = getBankInfo();
      await sendEmail({
        to: order.buyerEmail,
        subject: `[PRECTXE] 입금 안내 — ${dropTitle}`,
        template: 'bank-transfer-pending',
        data: {
          buyerName: order.buyerName,
          orderNo: order.orderNo,
          dropTitle,
          totalAmount: order.totalAmount,
          depositorName: order.bankTransfer!.depositorName,
          expiresAt: order.bankTransfer!.expiresAt,
          expiryHours: getBankTransferExpiryHours(),
          bankName: bank.bankName,
          accountNumber: bank.accountNumber,
          accountHolder: bank.accountHolder,
        },
      });
    } catch (emailErr) {
      console.error('무통장 안내 이메일 발송 실패:', emailErr);
    }

    return {
      success: true,
      data: {
        orderNo: order.orderNo,
        orderId: order.id,
        totalAmount: order.totalAmount,
        depositorName: order.bankTransfer!.depositorName,
        expiresAt: order.bankTransfer!.expiresAt,
        expiryHours: getBankTransferExpiryHours(),
        bankInfo: getBankInfo(),
      },
    } as const;
  } catch (e) {
    console.error('무통장 주문 생성 실패:', e);
    return {
      success: false,
      error: e instanceof Error ? e.message : '주문 생성에 실패했습니다.',
    } as const;
  }
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
  const parsed = parseInput(goodsOrderFormSchema, input);
  if (!parsed.success) return parsed;

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

  return { success: true as const, data: result };
}

// ─── 결제 완료 검증 ─────────────────────────────────

export async function verifyPayment(orderId: string, portonePaymentId: string) {
  try {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        drop: { select: { title: true } },
        items: { include: { ticketTier: true, goodsVariant: true } },
      },
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

    const { accessToken, ticketCount } = await prisma.$transaction(
      async (tx) => {
        await tx.payment.create({
          data: {
            orderId: order.id,
            portonePaymentId,
            method: payment.method?.type ? String(payment.method.type) : null,
            amount: payment.amount.total,
            status: 'paid',
            paidAt: new Date(),
            rawData: JSON.parse(JSON.stringify(payment)),
          },
        });
        await tx.order.update({
          where: { id: order.id },
          data: { status: 'paid' },
        });
        return issueTicketsForOrder(tx, order);
      }
    );

    revalidatePath('/admin/drops');

    // 주문 확인 이메일 발송 (실패해도 결제 결과에 영향 없음)
    try {
      const dropTitle = order.drop?.title ?? 'PRECTXE';
      const items = order.items.map((item) => ({
        name: item.ticketTier?.name ?? item.goodsVariant?.name ?? '상품',
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        subtotal: item.subtotal,
      }));

      await sendEmail({
        to: order.buyerEmail,
        subject: `[PRECTXE] 주문 확인 — ${dropTitle}`,
        template: 'order-confirmation',
        data: {
          buyerName: order.buyerName,
          orderNo: order.orderNo,
          dropTitle,
          items,
          totalAmount: order.totalAmount,
          ticketsUrl:
            ticketCount > 0 ? getOrderTicketsUrl(accessToken) : undefined,
        },
      });
    } catch (emailErr) {
      console.error('주문 확인 이메일 발송 실패:', emailErr);
    }

    return { success: true as const, data: { orderNo: order.orderNo } };
  } catch (e) {
    console.error('결제 검증 실패:', e);
    if (e instanceof PortOneError) {
      return { success: false, error: '포트원 결제 조회에 실패했습니다.' };
    }
    return { success: false, error: '결제 검증 중 오류가 발생했습니다.' };
  }
}

// ─── 무통장 입금 확인 (Admin) ───────────────────────

export async function confirmBankTransfer(orderId: string) {
  const auth = await requireAdmin();
  if (!auth.success) return { success: false, error: auth.error } as const;

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      drop: { select: { title: true } },
      items: { include: { ticketTier: true, goodsVariant: true } },
      bankTransfer: true,
    },
  });
  if (!order)
    return { success: false, error: '주문을 찾을 수 없습니다.' } as const;
  if (!order.bankTransfer)
    return { success: false, error: '무통장 주문이 아닙니다.' } as const;
  if (order.bankTransfer.status !== 'pending')
    return {
      success: false,
      error: '입금 대기 상태가 아닙니다.',
    } as const;

  const now = new Date();
  const { accessToken, ticketCount } = await prisma.$transaction(async (tx) => {
    await tx.bankTransfer.update({
      where: { orderId: order.id },
      data: {
        status: 'confirmed',
        confirmedAt: now,
        confirmedBy: auth.userId,
      },
    });
    await tx.order.update({
      where: { id: order.id },
      data: { status: 'paid' },
    });
    return issueTicketsForOrder(tx, order);
  });

  revalidatePath('/admin/drops');
  revalidatePath('/admin/tickets/orders');

  // 확정 이메일 (기존 order-confirmation 재사용)
  try {
    const dropTitle = order.drop?.title ?? 'PRECTXE';
    const items = order.items.map((item) => ({
      name: item.ticketTier?.name ?? item.goodsVariant?.name ?? '상품',
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      subtotal: item.subtotal,
    }));

    await sendEmail({
      to: order.buyerEmail,
      subject: `[PRECTXE] 입금 확인 — ${dropTitle}`,
      template: 'order-confirmation',
      data: {
        buyerName: order.buyerName,
        orderNo: order.orderNo,
        dropTitle,
        items,
        totalAmount: order.totalAmount,
        ticketsUrl:
          ticketCount > 0 ? getOrderTicketsUrl(accessToken) : undefined,
      },
    });
  } catch (emailErr) {
    console.error('입금 확인 이메일 발송 실패:', emailErr);
  }

  return { success: true } as const;
}

// ─── 만료된 무통장 주문 일괄 정리 (Admin / lazy) ───

export async function cleanupExpiredBankTransferOrders() {
  const auth = await requireAdmin();
  if (!auth.success) return { success: false, error: auth.error } as const;

  const now = new Date();
  const expired = await prisma.bankTransfer.findMany({
    where: {
      status: 'pending',
      expiresAt: { lt: now },
    },
    include: {
      order: { include: { items: true } },
    },
  });

  if (expired.length === 0) return { success: true, expiredCount: 0 } as const;

  await prisma.$transaction([
    // 재고 복구 (티켓)
    ...expired.flatMap((bt) =>
      bt.order.items
        .filter((item) => item.ticketTierId)
        .map((item) =>
          prisma.ticketTier.update({
            where: { id: item.ticketTierId! },
            data: { soldCount: { decrement: item.quantity } },
          })
        )
    ),
    // 재고 복구 (굿즈 — 현재 무통장 미지원이지만 안전망)
    ...expired.flatMap((bt) =>
      bt.order.items
        .filter((item) => item.goodsVariantId)
        .map((item) =>
          prisma.goodsVariant.update({
            where: { id: item.goodsVariantId! },
            data: { soldCount: { decrement: item.quantity } },
          })
        )
    ),
    prisma.bankTransfer.updateMany({
      where: { id: { in: expired.map((bt) => bt.id) } },
      data: {
        status: 'expired',
        cancelledAt: now,
        cancelReason: 'auto_expired',
      },
    }),
    prisma.order.updateMany({
      where: { id: { in: expired.map((bt) => bt.orderId) } },
      data: { status: 'cancelled' },
    }),
  ]);

  revalidatePath('/admin/drops');
  revalidatePath('/admin/tickets/orders');

  return { success: true, expiredCount: expired.length } as const;
}

// ─── 주문 취소 (Admin) ──────────────────────────────

export async function cancelOrder(orderId: string) {
  const auth = await requireAdmin();
  if (!auth.success) return { success: false, error: auth.error };

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { items: true, payment: true, bankTransfer: true },
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

  const now = new Date();
  await prisma.$transaction(async (tx) => {
    // 재고 복구 (티켓·굿즈)
    for (const item of order.items) {
      if (item.ticketTierId) {
        await tx.ticketTier.update({
          where: { id: item.ticketTierId },
          data: { soldCount: { decrement: item.quantity } },
        });
      } else if (item.goodsVariantId) {
        await tx.goodsVariant.update({
          where: { id: item.goodsVariantId },
          data: { soldCount: { decrement: item.quantity } },
        });
      }
    }

    // 주문 + 결제 + 무통장 + 발급 티켓 cascade cancel
    await tx.order.update({
      where: { id: orderId },
      data: { status: 'cancelled' },
    });

    if (order.payment) {
      await tx.payment.update({
        where: { id: order.payment.id },
        data: { status: 'cancelled', cancelledAt: now },
      });
    }

    if (order.bankTransfer && order.bankTransfer.status === 'pending') {
      await tx.bankTransfer.update({
        where: { id: order.bankTransfer.id },
        data: {
          status: 'cancelled',
          cancelledAt: now,
          cancelReason: '관리자 취소',
        },
      });
    }

    await tx.ticket.updateMany({
      where: { orderId, status: { not: 'cancelled' } },
      data: { status: 'cancelled' },
    });
  });

  revalidatePath('/admin/drops');
  return { success: true };
}

// ─── 체크인 (입장 검증) ────────────────────────────

export async function checkInTicket(token: string) {
  const auth = await requireAdmin();
  if (!auth.success) return { success: false, error: auth.error } as const;

  const ticket = await prisma.ticket.findUnique({
    where: { token },
    include: {
      order: { select: { id: true, status: true, buyerName: true } },
      ticketTier: { select: { name: true, dropId: true } },
    },
  });

  if (!ticket)
    return { success: false, error: '유효하지 않은 티켓입니다.' } as const;
  if (ticket.status === 'cancelled')
    return { success: false, error: '취소된 티켓입니다.' } as const;
  if (ticket.order.status !== 'paid')
    return {
      success: false,
      error: '결제가 완료되지 않은 티켓입니다.',
    } as const;

  if (ticket.status === 'checked_in') {
    return {
      success: true,
      alreadyCheckedIn: true,
      data: {
        buyerName: ticket.order.buyerName,
        tierName: ticket.ticketTier?.name ?? '티켓',
        dropId: ticket.ticketTier?.dropId ?? null,
        checkedInAt: ticket.checkedInAt,
      },
    } as const;
  }

  const now = new Date();
  await prisma.ticket.update({
    where: { id: ticket.id },
    data: {
      status: 'checked_in',
      checkedInAt: now,
      checkedInBy: auth.userId,
    },
  });

  return {
    success: true,
    alreadyCheckedIn: false,
    data: {
      buyerName: ticket.order.buyerName,
      tierName: ticket.ticketTier?.name ?? '티켓',
      dropId: ticket.ticketTier?.dropId ?? null,
      checkedInAt: now,
    },
  } as const;
}

export async function undoCheckIn(token: string) {
  const auth = await requireAdmin();
  if (!auth.success) return { success: false, error: auth.error } as const;

  const ticket = await prisma.ticket.findUnique({ where: { token } });
  if (!ticket)
    return { success: false, error: '유효하지 않은 티켓입니다.' } as const;
  if (ticket.status !== 'checked_in')
    return {
      success: false,
      error: '체크인된 티켓이 아닙니다.',
    } as const;

  await prisma.ticket.update({
    where: { id: ticket.id },
    data: {
      status: 'active',
      checkedInAt: null,
      checkedInBy: null,
    },
  });

  return { success: true } as const;
}

export async function getCheckInStats(dropId: string) {
  const auth = await requireAdmin();
  if (!auth.success) return { success: false, error: auth.error } as const;

  const [total, checkedIn] = await Promise.all([
    prisma.ticket.count({
      where: {
        ticketTier: { dropId },
        status: { in: ['active', 'checked_in'] },
        order: { status: 'paid' },
      },
    }),
    prisma.ticket.count({
      where: {
        ticketTier: { dropId },
        status: 'checked_in',
        order: { status: 'paid' },
      },
    }),
  ]);

  return { success: true, data: { total, checkedIn } } as const;
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
