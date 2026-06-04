import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/require-admin';
import { prisma } from '@/lib/db/prisma';
import {
  asciiFilename,
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

  try {
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
    // filename=에는 ASCII 폴백, filename*=에 한글 실제 이름(구형 프록시 헤더 파싱 오류 방지)
    const filename = safeFilename(`${drop.title}_주문목록`, format);
    const ascii = asciiFilename(format);
    const disposition = `attachment; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(filename)}`;

    if (format === 'csv') {
      return new Response(toCsv(aoa), {
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': disposition,
          'Cache-Control': 'no-store',
        },
      });
    }

    const buf = await toXlsx(aoa, `${drop.title} 주문`);
    return new Response(new Uint8Array(buf), {
      headers: {
        'Content-Type':
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': disposition,
        'Cache-Control': 'no-store',
      },
    });
  } catch (error) {
    console.error('주문 내보내기 오류:', error);
    return NextResponse.json(
      { success: false, error: '내보내기에 실패했습니다' },
      { status: 500 }
    );
  }
}
