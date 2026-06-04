import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/require-admin';
import { prisma } from '@/lib/db/prisma';
import {
  buildOrdersAoa,
  safeFilename,
  toCsv,
  toXlsx,
} from '@/lib/drops/orders-export';

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin();
  if (!auth.success) {
    return NextResponse.json(
      { success: false, error: auth.error },
      { status: 401 }
    );
  }

  const { id } = await params;
  const url = new URL(req.url);
  const format = url.searchParams.get('format') ?? 'xlsx';

  if (format !== 'csv' && format !== 'xlsx') {
    return NextResponse.json(
      { success: false, error: 'Invalid format' },
      { status: 400 }
    );
  }

  const drop = await prisma.drop.findUnique({
    where: { id },
    select: { title: true },
  });
  if (!drop) {
    return NextResponse.json(
      { success: false, error: 'Drop을 찾을 수 없습니다' },
      { status: 404 }
    );
  }

  const orders = await prisma.order.findMany({
    where: { dropId: id },
    select: {
      orderNo: true,
      createdAt: true,
      buyerName: true,
      buyerPhone: true,
      buyerEmail: true,
      totalAmount: true,
      status: true,
      items: {
        select: {
          quantity: true,
          ticketTier: { select: { name: true } },
          goodsVariant: { select: { name: true } },
        },
      },
      payment: { select: { method: true, paidAt: true } },
      bankTransfer: {
        select: { depositorName: true, status: true, confirmedAt: true },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  const aoa = buildOrdersAoa(orders);
  const filename = safeFilename(`${drop.title}_주문목록`, format);

  if (format === 'csv') {
    const csv = toCsv(aoa);
    return new Response(csv, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"; filename*=UTF-8''${encodeURIComponent(filename)}`,
        'Cache-Control': 'no-store',
      },
    });
  }

  const buf = await toXlsx(aoa, `${drop.title} 주문`);
  return new Response(new Uint8Array(buf), {
    headers: {
      'Content-Type':
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="${filename}"; filename*=UTF-8''${encodeURIComponent(filename)}`,
      'Cache-Control': 'no-store',
    },
  });
}
