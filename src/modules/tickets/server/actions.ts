'use server';

import type { Prisma } from '@prisma/client';
import { revalidatePath } from 'next/cache';
import { getLocale } from 'next-intl/server';
import type { Locale } from '@/i18n/config';
import { requireAdmin } from '@/lib/auth/require-admin';
import { parseInput } from '@/lib/auth/server-action-helpers';
import {
  BUSINESS_INFO,
  ORDER_NOTIFICATION_EMAILS,
} from '@/lib/constants/business-info';
import { ORDERS } from '@/lib/constants/constants';
import { getSalesTerms, SALES_TERMS } from '@/lib/constants/sales-terms';
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
import { parseKstDateInput } from '@/lib/utils/date';
import { getEffectiveTierStatus } from '@/lib/utils/ticket-status';
import {
  generateAccessToken,
  generateOrderNo,
  generateTicketToken,
} from '@/lib/utils/ticket-token';
import { getOrderTicketsUrl } from '@/lib/utils/ticket-url';

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

// ─── 주문 확인 메일 발송 헬퍼 ────────────────────────

/** 메일 본문에 필요한 최소 주문 형태 (paid 시점 · 재발송 공용) */
type OrderMailSource = {
  buyerName: string;
  buyerEmail: string;
  orderNo: string;
  totalAmount: number;
  drop: { title: string } | null;
  items: {
    quantity: number;
    unitPrice: number;
    subtotal: number;
    ticketTier: { name: string } | null;
    goodsVariant: { name: string } | null;
  }[];
};

/**
 * 주문 확인 메일 발송. paid 전환 시점과 어드민 재발송이 같은 경로를 쓴다.
 *
 * **성공 여부를 반환하는 이유**: Resend SDK는 API 에러를 throw하지 않고
 * `{data, error}`로 돌려준다. try/catch만 두면 422(잘못된 주소)·429가 전부
 * 성공으로 집계돼, 어드민은 메일이 나간 줄 알고 넘어간다.
 */
async function sendOrderConfirmationMail(params: {
  order: OrderMailSource;
  subject: string;
  locale: Locale;
  accessToken: string | null;
  ticketCount: number;
}): Promise<boolean> {
  const { order, subject, locale, accessToken, ticketCount } = params;
  try {
    const result = await sendEmail({
      to: order.buyerEmail,
      subject,
      template: 'order-confirmation',
      data: {
        buyerName: order.buyerName,
        orderNo: order.orderNo,
        dropTitle: order.drop?.title ?? 'PRECTXE',
        items: order.items.map((item) => ({
          name: item.ticketTier?.name ?? item.goodsVariant?.name ?? '상품',
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          subtotal: item.subtotal,
        })),
        totalAmount: order.totalAmount,
        locale,
        ticketsUrl:
          ticketCount > 0 && accessToken
            ? getOrderTicketsUrl(accessToken)
            : undefined,
      },
    });
    if (!result.success) {
      console.error(
        '주문 확인 이메일 발송 실패:',
        order.orderNo,
        result.results[0]?.error
      );
    }
    return result.success;
  } catch (emailErr) {
    console.error('주문 확인 이메일 발송 실패:', order.orderNo, emailErr);
    return false;
  }
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
      saleStart: parsed.data.saleStart
        ? parseKstDateInput(parsed.data.saleStart)
        : null,
      saleEnd: parsed.data.saleEnd
        ? parseKstDateInput(parsed.data.saleEnd)
        : null,
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
      saleStart: parsed.data.saleStart
        ? parseKstDateInput(parsed.data.saleStart)
        : null,
      saleEnd: parsed.data.saleEnd
        ? parseKstDateInput(parsed.data.saleEnd)
        : null,
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

// ─── orphan pending 주문 재고 회수 (self-heal) ──────
// 무통장(BankTransfer) 없이 생성된 pending 주문은 자체 만료/cleanup이 없어
// 결제 없이 재고를 영구 점유할 수 있음(재고 잠금 DoS). TTL 경과분의 재고를 복구하고
// 주문을 취소 처리한다. 주문 생성 경로에서 호출되어 어드민 방문에 의존하지 않음.
async function reclaimStaleOrphanOrders() {
  const cutoff = new Date(
    Date.now() - ORDERS.ORPHAN_PENDING_TTL_MINUTES * 60 * 1000
  );
  const stale = await prisma.order.findMany({
    where: {
      status: 'pending',
      createdAt: { lt: cutoff },
      bankTransfer: { is: null }, // 무통장 흐름은 24h 만료/cleanup이 담당
    },
    include: { items: true },
    orderBy: { id: 'asc' }, // 데드락 방지: 일관된 주문 처리 순서
  });
  if (stale.length === 0) return 0;

  // 레이스 안전: pending→cancelled 전환에 성공한(=경합에서 이긴) 주문만 재고 복구.
  // 회수 직전 결제 완료된 주문은 claimed.count===0으로 건너뛰어 초과판매를 방지.
  let reclaimed = 0;
  await prisma.$transaction(async (tx) => {
    for (const order of stale) {
      const claimed = await tx.order.updateMany({
        where: { id: order.id, status: 'pending' },
        data: { status: 'cancelled' },
      });
      if (claimed.count === 0) continue;
      reclaimed++;

      const ticketItems = order.items
        .filter((i) => i.ticketTierId)
        .sort((a, b) => a.ticketTierId!.localeCompare(b.ticketTierId!));
      for (const item of ticketItems) {
        await tx.ticketTier.update({
          where: { id: item.ticketTierId! },
          data: { soldCount: { decrement: item.quantity } },
        });
      }

      const goodsItems = order.items
        .filter((i) => i.goodsVariantId)
        .sort((a, b) => a.goodsVariantId!.localeCompare(b.goodsVariantId!));
      for (const item of goodsItems) {
        await tx.goodsVariant.update({
          where: { id: item.goodsVariantId! },
          data: { soldCount: { decrement: item.quantity } },
        });
      }
    }
  });
  return reclaimed;
}

// 같은 키의 중복 라인아이템을 합산 — maxPerOrder/재고 차감 우회 방지
function mergeByKey<T extends { quantity: number }>(
  items: T[],
  key: keyof T
): { id: string; quantity: number }[] {
  const merged = new Map<string, number>();
  for (const it of items) {
    const id = it[key] as string;
    merged.set(id, (merged.get(id) ?? 0) + it.quantity);
  }
  return [...merged.entries()]
    .map(([id, quantity]) => ({ id, quantity }))
    .sort((a, b) => a.id.localeCompare(b.id));
}

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
  // 구매자 로케일 저장 — 이후 어드민이 보내는 확인 메일도 구매자 언어로
  const locale = (await getLocale()) as Locale;

  // 만료된 orphan pending 주문 재고 회수 — 실패해도(로그 후) 구매는 계속 진행
  await reclaimStaleOrphanOrders().catch((e) =>
    console.error('[reclaimStaleOrphanOrders] 재고 회수 실패:', e)
  );

  const result = await prisma.$transaction(async (tx) => {
    let totalAmount = 0;
    const orderItems: {
      ticketTierId: string;
      quantity: number;
      unitPrice: number;
      subtotal: number;
    }[] = [];

    // 중복 라인아이템 합산(maxPerOrder 우회 방지) + 일관된 락 순서로 데드락 방지
    const sortedItems = mergeByKey(items, 'ticketTierId').map((m) => ({
      ticketTierId: m.id,
      quantity: m.quantity,
    }));
    for (const item of sortedItems) {
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

      // 원자적 재고 차감 — 동시 주문 초과판매 방지(검사+증가를 한 쿼리로)
      const updated = await tx.ticketTier.updateMany({
        where: {
          id: tier.id,
          soldCount: { lte: tier.quantity - item.quantity },
        },
        data: { soldCount: { increment: item.quantity } },
      });
      if (updated.count === 0)
        throw new Error(`${tier.name} 잔여 수량이 부족합니다.`);

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
        locale,
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
  // 구매자 요청 컨텍스트의 로케일 — 에러 응답·안내 메일 언어 결정
  const locale = (await getLocale()) as Locale;
  const ST = getSalesTerms(locale);
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

      // 일관된 락 순서로 동시 주문 간 데드락 방지
      const sortedItems = [...items].sort((a, b) =>
        a.ticketTierId.localeCompare(b.ticketTierId)
      );
      for (const item of sortedItems) {
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

        // 원자적 재고 차감 — 동시 주문 초과판매 방지(검사+증가를 한 쿼리로)
        const updated = await tx.ticketTier.updateMany({
          where: {
            id: tier.id,
            soldCount: { lte: tier.quantity - item.quantity },
          },
          data: { soldCount: { increment: item.quantity } },
        });
        if (updated.count === 0)
          throw new Error(`${tier.name} 잔여 수량이 부족합니다.`);

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
          locale,
          items: { create: orderItems },
          bankTransfer: {
            create: {
              depositorName: fullDepositorName,
              amount: totalAmount,
              expiresAt,
            },
          },
        },
        include: {
          items: { include: { ticketTier: true } },
          bankTransfer: true,
          drop: true,
        },
      });
    });

    // 구매자 안내 + 운영자 알림 메일을 병렬 발송 (각각 실패해도 주문엔 영향 없음).
    // 순차 await 대비 구매자 응답 대기시간 단축.
    {
      const dropTitle = order.drop?.title ?? 'PRECTXE';
      const bank = getBankInfo();
      const itemsSummary =
        order.items
          .map((it) => `${it.ticketTier?.name ?? '티켓'} × ${it.quantity}`)
          .join(', ') || '-';

      await Promise.all([
        sendEmail({
          to: order.buyerEmail,
          subject:
            locale === 'en'
              ? `[PRECTXE] Payment instructions — ${dropTitle}`
              : `[PRECTXE] 입금 안내 — ${dropTitle}`,
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
            locale,
          },
        }).catch((err) => console.error('무통장 안내 이메일 발송 실패:', err)),
        sendEmail({
          to: [...ORDER_NOTIFICATION_EMAILS],
          subject: `[PRECTXE] 새 무통장 주문 — ${dropTitle} / ${order.buyerName}`,
          template: 'order-admin-notification',
          data: {
            dropTitle,
            orderNo: order.orderNo,
            buyerName: order.buyerName,
            buyerPhone: order.buyerPhone,
            buyerEmail: order.buyerEmail,
            depositorName: order.bankTransfer!.depositorName,
            totalAmount: order.totalAmount,
            itemsSummary,
            expiresAt: order.bankTransfer!.expiresAt,
            orderAdminUrl: `${BUSINESS_INFO.serviceUrl}/admin/drops/${dropId}/orders`,
          },
        }).catch((err) =>
          console.error('운영자 주문 알림 메일 발송 실패:', err)
        ),
      ]);
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
      error: e instanceof Error ? e.message : ST.errorCreateFailed,
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
  const locale = (await getLocale()) as Locale;

  // 만료된 orphan pending 주문 재고 회수 — 실패해도(로그 후) 구매는 계속 진행
  await reclaimStaleOrphanOrders().catch((e) =>
    console.error('[reclaimStaleOrphanOrders] 재고 회수 실패:', e)
  );

  const result = await prisma.$transaction(async (tx) => {
    let totalAmount = 0;
    const orderItems: {
      goodsVariantId: string;
      quantity: number;
      unitPrice: number;
      subtotal: number;
    }[] = [];

    // 중복 라인아이템 합산(재고 차감 우회 방지) + 일관된 락 순서로 데드락 방지
    const sortedItems = mergeByKey(items, 'goodsVariantId').map((m) => ({
      goodsVariantId: m.id,
      quantity: m.quantity,
    }));
    for (const item of sortedItems) {
      const variant = await tx.goodsVariant.findUnique({
        where: { id: item.goodsVariantId },
      });
      if (!variant) throw new Error('옵션을 찾을 수 없습니다.');

      // 원자적 재고 차감 — 동시 주문 초과판매 방지(검사+증가를 한 쿼리로)
      const updated = await tx.goodsVariant.updateMany({
        where: {
          id: variant.id,
          soldCount: { lte: variant.stock - item.quantity },
        },
        data: { soldCount: { increment: item.quantity } },
      });
      if (updated.count === 0)
        throw new Error(`${variant.name} 재고가 부족합니다.`);

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
        locale,
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
  // 구매자 요청 컨텍스트(무료/카드 즉시 결제)의 로케일
  const locale = (await getLocale()) as Locale;
  const ST = getSalesTerms(locale);
  const L = (ko: string, en: string) => (locale === 'en' ? en : ko);
  try {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        drop: { select: { title: true } },
        items: { include: { ticketTier: true, goodsVariant: true } },
      },
    });
    if (!order) return { success: false, error: ST.errorOrderNotFound };
    if (order.status !== 'pending')
      return { success: false, error: ST.errorAlreadyProcessed };

    const payment = await portone.payment.getPayment({
      paymentId: portonePaymentId,
    });

    if (payment.status !== 'PAID') {
      return {
        success: false,
        error: L('결제가 완료되지 않았습니다.', 'Payment was not completed.'),
      };
    }

    if (payment.amount.total !== order.totalAmount) {
      return {
        success: false,
        error: L(
          '결제 금액이 일치하지 않습니다.',
          'Payment amount does not match.'
        ),
      };
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

    // 주문 확인 이메일 (실패해도 결제 결과엔 영향 없음 — 어드민이 재발송)
    await sendOrderConfirmationMail({
      order,
      subject: ST.emailSubject(order.drop?.title ?? 'PRECTXE'),
      locale,
      accessToken,
      ticketCount,
    });

    return { success: true as const, data: { orderNo: order.orderNo } };
  } catch (e) {
    console.error('결제 검증 실패:', e);
    if (e instanceof PortOneError) {
      return {
        success: false,
        error: L(
          '포트원 결제 조회에 실패했습니다.',
          'Failed to look up the payment.'
        ),
      };
    }
    return { success: false, error: ST.errorProcessing };
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
    return { success: false, error: SALES_TERMS.errorOrderNotFound } as const;
  if (!order.bankTransfer)
    return {
      success: false,
      error: SALES_TERMS.errorNotBankTransfer,
    } as const;
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

  // 확정 이메일 (기존 order-confirmation 재사용).
  // 어드민 컨텍스트라 getLocale() 대신 주문 시 저장한 구매자 로케일 사용.
  // DB에는 임의 string이 들어올 수 있으므로 'en' 외엔 모두 'ko'로 명시 폴백
  const locale: Locale = order.locale === 'en' ? 'en' : 'ko';
  const emailSent = await sendOrderConfirmationMail({
    order,
    subject: bankTransferMailSubject(locale, order.drop?.title ?? 'PRECTXE'),
    locale,
    accessToken,
    ticketCount,
  });

  // 입금 확인 자체는 성공. 메일 실패는 어드민이 재발송할 수 있도록 알려만 준다.
  return { success: true, emailSent } as const;
}

/** 입금 확인·재발송 메일 제목 (두 경로가 같은 제목을 쓰도록 공유) */
function bankTransferMailSubject(locale: Locale, dropTitle: string) {
  return locale === 'en'
    ? `[PRECTXE] Payment confirmed — ${dropTitle}`
    : `[PRECTXE] 입금 확인 — ${dropTitle}`;
}

// ─── 주문 확인 메일 재발송 (Admin) ───────────────────

/**
 * 이미 발급된 입장권 정보를 그대로 다시 보낸다.
 *
 * **상태 전이·티켓 발급은 하지 않는다.** `confirmBankTransfer`를 다시 태우면
 * `issueTicketsForOrder`가 티켓을 한 번 더 만들고 accessToken을 갈아끼워
 * 먼저 보낸 링크가 죽는다. 재발송은 통지만 반복하는 연산이어야 한다.
 */
export async function resendOrderConfirmation(orderId: string) {
  const auth = await requireAdmin();
  if (!auth.success) return { success: false, error: auth.error } as const;

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      drop: { select: { title: true } },
      items: {
        select: {
          quantity: true,
          unitPrice: true,
          subtotal: true,
          ticketTier: { select: { name: true } },
          goodsVariant: { select: { name: true } },
        },
      },
      bankTransfer: { select: { status: true } },
      _count: { select: { tickets: true } },
    },
  });
  if (!order)
    return { success: false, error: SALES_TERMS.errorOrderNotFound } as const;
  if (order.status !== 'paid' && order.status !== 'confirmed')
    return {
      success: false,
      error: '결제가 완료된 주문만 재발송할 수 있습니다.',
    } as const;

  const locale: Locale = order.locale === 'en' ? 'en' : 'ko';
  const dropTitle = order.drop?.title ?? 'PRECTXE';
  const sent = await sendOrderConfirmationMail({
    order,
    // 처음 나간 메일과 같은 제목이어야 구매자가 메일함에서 같은 건으로 알아본다
    subject:
      order.bankTransfer?.status === 'confirmed'
        ? bankTransferMailSubject(locale, dropTitle)
        : getSalesTerms(locale).emailSubject(dropTitle),
    locale,
    accessToken: order.accessToken,
    ticketCount: order._count.tickets,
  });
  if (!sent)
    return {
      success: false,
      error: '메일 발송에 실패했습니다. 주소를 확인해 주세요.',
    } as const;

  return { success: true, email: order.buyerEmail } as const;
}

// ─── 만료된 무통장 주문 일괄 정리 (Admin / lazy) ───

export async function cleanupExpiredBankTransferOrders() {
  const auth = await requireAdmin();
  if (!auth.success) return { success: false, error: auth.error } as const;

  // 무통장 외 orphan pending 주문(결제 없는 재고 점유)도 함께 회수
  const orphanCount = await reclaimStaleOrphanOrders().catch((e) => {
    console.error('[reclaimStaleOrphanOrders] 재고 회수 실패:', e);
    return 0;
  });

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

  if (expired.length === 0)
    return { success: true, expiredCount: 0, orphanCount } as const;

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

  return {
    success: true,
    expiredCount: expired.length,
    orphanCount,
  } as const;
}

// ─── 주문 취소 (Admin) ──────────────────────────────

export async function cancelOrder(orderId: string) {
  const auth = await requireAdmin();
  if (!auth.success) return { success: false, error: auth.error };

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { items: true, payment: true, bankTransfer: true },
  });
  if (!order) return { success: false, error: SALES_TERMS.errorOrderNotFound };
  if (order.status === 'cancelled' || order.status === 'refunded')
    return { success: false, error: SALES_TERMS.errorAlreadyCanceled };

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

/**
 * 입장 체크인.
 *
 * `dropId`는 스캐너가 열려 있는 드랍이다. **토큰만으로 처리하면 A 공연
 * 스캐너에서 B 공연 티켓을 찍어도 조용히 입장 처리된다** — 카운터는 드랍별로
 * 집계되므로 숫자에도 안 잡힌다. 드랍 판별은 티어(삭제 시 SetNull로 끊길 수
 * 있다)가 아니라 `order.dropId`를 기준으로 한다.
 */
export async function checkInTicket(token: string, dropId: string) {
  const auth = await requireAdmin();
  if (!auth.success) return { success: false, error: auth.error } as const;

  const ticket = await prisma.ticket.findUnique({
    where: { token },
    include: {
      order: {
        select: {
          id: true,
          status: true,
          buyerName: true,
          dropId: true,
          drop: { select: { title: true } },
        },
      },
      ticketTier: { select: { name: true } },
    },
  });

  if (!ticket)
    return { success: false, error: '유효하지 않은 티켓입니다.' } as const;
  if (ticket.order.dropId !== dropId)
    return {
      success: false,
      // 어느 공연 것인지 알려줘야 입장구에서 바로 안내할 수 있다
      error: `다른 공연의 입장권입니다${
        ticket.order.drop ? ` (${ticket.order.drop.title})` : ''
      }.`,
    } as const;
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
      checkedInAt: now,
    },
  } as const;
}

/** 체크인 되돌리기. 다른 공연 스캐너에서 남의 티켓을 되돌리지 못하게 같은 스코프를 건다. */
export async function undoCheckIn(token: string, dropId: string) {
  const auth = await requireAdmin();
  if (!auth.success) return { success: false, error: auth.error } as const;

  const ticket = await prisma.ticket.findUnique({
    where: { token },
    include: { order: { select: { dropId: true } } },
  });
  if (!ticket)
    return { success: false, error: '유효하지 않은 티켓입니다.' } as const;
  if (ticket.order.dropId !== dropId)
    return { success: false, error: '다른 공연의 입장권입니다.' } as const;
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

  // 집계 기준을 체크인과 맞춘다 — 티어 기준으로 세면 티어가 삭제된(SetNull)
  // 티켓이 분모에서 빠져 "입장 12 / 11" 같은 숫자가 나올 수 있다
  const [total, checkedIn] = await Promise.all([
    prisma.ticket.count({
      where: {
        status: { in: ['active', 'checked_in'] },
        order: { dropId, status: 'paid' },
      },
    }),
    prisma.ticket.count({
      where: {
        status: 'checked_in',
        order: { dropId, status: 'paid' },
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
        items: {
          select: {
            id: true,
            quantity: true,
            unitPrice: true,
            subtotal: true,
            ticketTier: { select: { name: true } },
            goodsVariant: { select: { name: true } },
          },
        },
        // payment.rawData(PortOne 응답 JSON 통째) 제외
        payment: { select: { method: true, paidAt: true } },
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
