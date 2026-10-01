'use server';

import { revalidatePath } from 'next/cache';
import { requireAdmin } from '@/lib/auth/require-admin';
import { parseInput } from '@/lib/auth/server-action-helpers';
import { prisma } from '@/lib/db/prisma';
import { guestAddSchema } from '@/lib/schemas/ticket';
import {
  generateAccessToken,
  generateOrderNo,
  generateTicketToken,
} from '@/lib/utils/ticket-token';

/**
 * 게스트를 추가한다. 게스트는 0원·결제 없음·등급 없음 주문(`isGuest`)으로
 * 발급해 공개 판매 등급·재고·판매 상태와 섞이지 않고, 입장 처리(스캐너·게이트
 * 앱·입장 기록)는 일반 티켓과 같은 경로를 탄다. 인원만큼 티켓이 나온다.
 * 삭제는 일반 주문과 같은 `cancelOrder`를 쓴다.
 */
export async function addGuest(
  dropId: string,
  input: {
    name: string;
    count: number;
    phone?: string;
    email?: string;
    note?: string;
  }
) {
  const auth = await requireAdmin();
  if (!auth.success) return { success: false, error: auth.error } as const;

  const parsed = parseInput(guestAddSchema, input);
  if (!parsed.success) return parsed;
  const { name, count, phone, email, note } = parsed.data;

  const drop = await prisma.drop.findUnique({
    where: { id: dropId },
    select: { type: true },
  });
  if (!drop)
    return { success: false, error: 'Drop을 찾을 수 없습니다.' } as const;
  if (drop.type !== 'ticket')
    return {
      success: false,
      error: '티켓 드랍에만 게스트를 추가할 수 있습니다.',
    } as const;

  await prisma.$transaction(async (tx) => {
    const order = await tx.order.create({
      data: {
        orderNo: generateOrderNo(),
        // 게스트에게도 입장권 링크(QR)를 보낼 수 있게 발급해 둔다
        accessToken: generateAccessToken(),
        dropId,
        buyerName: name,
        // 주문 컬럼이 필수라 비어 있으면 빈 문자열로 둔다
        buyerEmail: email ?? '',
        buyerPhone: phone ?? '',
        totalAmount: 0,
        status: 'paid',
        isGuest: true,
        note: note || null,
        items: { create: { quantity: count, unitPrice: 0, subtotal: 0 } },
      },
      select: { id: true, items: { select: { id: true } } },
    });
    await tx.ticket.createMany({
      data: Array.from({ length: count }, () => ({
        token: generateTicketToken(),
        orderId: order.id,
        orderItemId: order.items[0].id,
      })),
    });
  });

  revalidatePath(`/admin/drops/${dropId}/guests`);
  return { success: true } as const;
}
