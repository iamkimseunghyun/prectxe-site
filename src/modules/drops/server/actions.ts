'use server';

import type { Prisma } from '@prisma/client';
import { revalidatePath } from 'next/cache';
import { requireAdmin } from '@/lib/auth/require-admin';
import { parseInput } from '@/lib/auth/server-action-helpers';
import {
  cleanupRemovedHtmlImages,
  deleteCloudflareImage,
  deleteCloudflareVideo,
} from '@/lib/cdn/cloudflare';
import { prisma } from '@/lib/db/prisma';
import { dropCreateSchema, dropUpdateSchema } from '@/lib/schemas/drop';
import { extractImageId, extractVideoId, parseKstDateInput } from '@/lib/utils';

// ─── Drop CRUD (Admin) ──────────────────────────────

export type DropMediaInput = {
  type: 'image' | 'video';
  url: string;
  alt: string;
  order: number;
};

export type DropCreditInput = {
  artistId: string;
  role: string;
};

export async function createDrop(data: {
  title: string;
  slug: string;
  type: 'ticket' | 'goods';
  summary?: string;
  description?: string;
  eventDate?: string;
  eventEndDate?: string;
  venue?: string;
  venueAddress?: string;
  venueId?: string;
  notice?: string;
  status?: string;
  media?: DropMediaInput[];
  credits?: DropCreditInput[];
}) {
  const auth = await requireAdmin();
  if (!auth.success) return { success: false, error: auth.error };

  const parsed = parseInput(dropCreateSchema, data);
  if (!parsed.success) return parsed;

  const existing = await prisma.drop.findUnique({
    where: { slug: data.slug },
  });
  if (existing) return { success: false, error: '이미 사용 중인 slug입니다.' };

  const drop = await prisma.drop.create({
    data: {
      title: data.title,
      slug: data.slug,
      type: data.type as any,
      summary: data.summary || null,
      description: data.description || null,
      eventDate: data.eventDate ? parseKstDateInput(data.eventDate) : null,
      eventEndDate: data.eventEndDate
        ? parseKstDateInput(data.eventEndDate)
        : null,
      venue: data.venue || null,
      venueAddress: data.venueAddress || null,
      venueId: data.venueId || null,
      notice: data.notice || null,
      status: (data.status as any) || 'draft',
      publishedAt: data.status && data.status !== 'draft' ? new Date() : null,
      media: data.media?.length
        ? { createMany: { data: data.media } }
        : undefined,
      credits: data.credits?.length
        ? { createMany: { data: data.credits } }
        : undefined,
    },
  });

  revalidatePath('/admin/drops');
  revalidatePath('/drops');
  revalidatePath('/');
  return { success: true, data: drop };
}

export async function updateDrop(
  id: string,
  data: {
    title?: string;
    slug?: string;
    summary?: string;
    description?: string;
    eventDate?: string;
    eventEndDate?: string;
    venue?: string;
    venueAddress?: string;
    venueId?: string | null;
    notice?: string;
    status?: string;
    publishedAt?: string | null;
    media?: DropMediaInput[];
    credits?: DropCreditInput[];
  }
) {
  const auth = await requireAdmin();
  if (!auth.success) return { success: false, error: auth.error };

  const parsed = parseInput(dropUpdateSchema, data);
  if (!parsed.success) return parsed;

  if (data.slug) {
    const existing = await prisma.drop.findFirst({
      where: { slug: data.slug, id: { not: id } },
    });
    if (existing)
      return { success: false, error: '이미 사용 중인 slug입니다.' };
  }

  // 기존 데이터 조회 (미디어 정리용)
  const prev = await prisma.drop.findUnique({
    where: { id },
    include: { media: true },
  });
  if (!prev) return { success: false, error: 'Drop을 찾을 수 없습니다.' };

  // 미디어 변경 시 제거된 Cloudflare 리소스 정리
  const hasNewMedia = data.media !== undefined;
  if (hasNewMedia) {
    const newUrls = new Set(data.media!.map((m) => m.url));
    const removed = prev.media.filter((m) => !newUrls.has(m.url));
    for (const m of removed) {
      if (m.type === 'image') {
        const imgId = extractImageId(m.url);
        if (imgId) await deleteCloudflareImage(imgId).catch(() => {});
      } else if (m.type === 'video') {
        const vidId = extractVideoId(m.url);
        if (vidId) await deleteCloudflareVideo(vidId).catch(() => {});
      }
    }
  }

  // description HTML 내 제거된 이미지 정리 (RichEditor 인라인 이미지)
  if (data.description !== undefined) {
    await cleanupRemovedHtmlImages(prev.description, data.description || null);
  }

  // draft → 공개 상태 전환 시 publishedAt 자동 설정
  const isPublishing =
    data.status &&
    data.status !== 'draft' &&
    prev.status === 'draft' &&
    !prev.publishedAt;

  const drop = await prisma.drop.update({
    where: { id },
    data: {
      ...(data.title !== undefined && { title: data.title }),
      ...(data.slug !== undefined && { slug: data.slug }),
      ...(data.summary !== undefined && { summary: data.summary || null }),
      ...(data.description !== undefined && {
        description: data.description || null,
      }),
      ...(data.eventDate !== undefined && {
        eventDate: data.eventDate ? parseKstDateInput(data.eventDate) : null,
      }),
      ...(data.eventEndDate !== undefined && {
        eventEndDate: data.eventEndDate
          ? parseKstDateInput(data.eventEndDate)
          : null,
      }),
      ...(data.venue !== undefined && { venue: data.venue || null }),
      ...(data.venueId !== undefined && { venueId: data.venueId || null }),
      ...(data.venueAddress !== undefined && {
        venueAddress: data.venueAddress || null,
      }),
      ...(data.notice !== undefined && { notice: data.notice || null }),
      ...(data.status !== undefined && { status: data.status as any }),
      ...(data.publishedAt !== undefined
        ? { publishedAt: data.publishedAt ? new Date(data.publishedAt) : null }
        : isPublishing
          ? { publishedAt: new Date() }
          : {}),
      ...(hasNewMedia && {
        media: {
          deleteMany: {},
          createMany: { data: data.media! },
        },
      }),
      ...(data.credits !== undefined && {
        credits: {
          deleteMany: {},
          createMany: { data: data.credits },
        },
      }),
    },
  });

  revalidatePath('/admin/drops');
  revalidatePath(`/drops/${drop.slug}`);
  revalidatePath('/drops');
  revalidatePath('/');
  return { success: true, data: drop };
}

export async function deleteDrop(id: string) {
  const auth = await requireAdmin();
  if (!auth.success) return { success: false, error: auth.error };

  const drop = await prisma.drop.findUnique({
    where: { id },
    include: {
      media: true,
      orders: { where: { status: { in: ['paid', 'confirmed'] } }, take: 1 },
    },
  });
  if (!drop) return { success: false, error: 'Drop을 찾을 수 없습니다.' };
  if (drop.orders.length > 0)
    return {
      success: false,
      error: '결제된 주문이 있어 삭제할 수 없습니다.',
    };

  // Cloudflare 미디어 정리
  for (const m of drop.media) {
    if (m.type === 'image') {
      const imgId = extractImageId(m.url);
      if (imgId) await deleteCloudflareImage(imgId).catch(() => {});
    } else if (m.type === 'video') {
      const vidId = extractVideoId(m.url);
      if (vidId) await deleteCloudflareVideo(vidId).catch(() => {});
    }
  }
  // description 내 인라인 이미지 전부 삭제
  if (drop.description) {
    await cleanupRemovedHtmlImages(drop.description, null);
  }

  await prisma.drop.delete({ where: { id } });
  revalidatePath('/admin/drops');
  revalidatePath('/drops');
  revalidatePath('/');
  return { success: true };
}

// ─── Drop 조회 ──────────────────────────────────────

export async function getDrop(id: string) {
  const auth = await requireAdmin();
  if (!auth.success) return null;

  return prisma.drop.findUnique({
    where: { id },
    include: {
      media: { orderBy: { order: 'asc' } },
      credits: { include: { artist: true } },
      ticketTiers: { orderBy: { order: 'asc' } },
      variants: { orderBy: { order: 'asc' } },
    },
  });
}

export async function getDropBySlug(slug: string) {
  return prisma.drop.findUnique({
    where: { slug },
    include: {
      media: { orderBy: { order: 'asc' } },
      credits: { include: { artist: true } },
      ticketTiers: { orderBy: { order: 'asc' } },
      variants: { orderBy: { order: 'asc' } },
    },
  });
}

export async function listDrops(
  page = 1,
  pageSize = 20,
  type?: 'ticket' | 'goods'
) {
  const where = {
    ...(type && { type: type as any }),
    status: { not: 'draft' as any },
    publishedAt: { not: null },
  };

  const [total, items] = await Promise.all([
    prisma.drop.count({ where }),
    prisma.drop.findMany({
      where,
      include: {
        media: {
          where: { type: 'image' },
          orderBy: { order: 'asc' },
          take: 1,
        },
        ticketTiers: { select: { price: true, status: true } },
        variants: { select: { price: true, stock: true, soldCount: true } },
      },
      orderBy: { publishedAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
  ]);

  return { page, pageSize, total, items };
}

// 상세 페이지용: drop 단건과 통계를 한 번에 반환.
// 기존 getDrop + getDropStats 병렬 호출 시 drop.findUnique가 중복됐던 것을
// 단일 findUnique + order 집계로 통합. 반환은 서버 액션 컨벤션({success,data}).
export async function getDropWithStats(dropId: string) {
  const auth = await requireAdmin();
  if (!auth.success) return { success: false, error: auth.error } as const;

  const [drop, agg] = await Promise.all([
    prisma.drop.findUnique({
      where: { id: dropId },
      include: {
        // media는 상세 뷰에서 사용하지 않으므로 제외
        credits: { include: { artist: true } },
        ticketTiers: { orderBy: { order: 'asc' } },
        variants: { orderBy: { order: 'asc' } },
      },
    }),
    prisma.order.aggregate({
      where: { dropId, status: { in: ['paid', 'confirmed'] } },
      _sum: { totalAmount: true },
      _count: true,
    }),
  ]);

  if (!drop) {
    return { success: false, error: 'Drop을 찾을 수 없습니다.' } as const;
  }

  // 티켓은 tier(quantity/soldCount), 굿즈는 variant(stock/soldCount) 기준.
  // stock은 총량(remaining = stock - soldCount)
  const isGoods = drop.type === 'goods';
  const totalSold = isGoods
    ? drop.variants.reduce((s, v) => s + v.soldCount, 0)
    : drop.ticketTiers.reduce((s, t) => s + t.soldCount, 0);
  const totalCapacity = isGoods
    ? drop.variants.reduce((s, v) => s + v.stock, 0)
    : drop.ticketTiers.reduce((s, t) => s + t.quantity, 0);

  return {
    success: true,
    data: {
      drop,
      stats: {
        totalRevenue: agg._sum.totalAmount ?? 0,
        totalSold,
        totalCapacity,
        salesRate:
          totalCapacity > 0 ? Math.round((totalSold / totalCapacity) * 100) : 0,
        orderCount: agg._count,
      },
    },
  } as const;
}

export async function getDropOrders(
  dropId: string,
  page = 1,
  pageSize = 20,
  filters: { status?: string; q?: string } = {}
) {
  const auth = await requireAdmin();
  if (!auth.success) return { success: false, error: auth.error } as const;

  const where: Prisma.OrderWhereInput = { dropId };
  const VALID_STATUSES = [
    'pending',
    'paid',
    'confirmed',
    'cancelled',
    'refunded',
  ];
  // 허용된 status만 적용 — 잘못된 URL 값으로 인한 Prisma 런타임 에러(500) 방지
  if (filters.status && VALID_STATUSES.includes(filters.status)) {
    where.status = filters.status as Prisma.OrderWhereInput['status'];
  }
  const q = filters.q?.trim();
  if (q) {
    // 이름·주문번호·이메일·연락처 부분일치 검색
    where.OR = [
      { orderNo: { contains: q, mode: 'insensitive' } },
      { buyerName: { contains: q, mode: 'insensitive' } },
      { buyerEmail: { contains: q, mode: 'insensitive' } },
      { buyerPhone: { contains: q } },
    ];
  }
  const [total, items] = await Promise.all([
    prisma.order.count({ where }),
    prisma.order.findMany({
      where,
      include: {
        // 뷰가 쓰는 필드만 — payment.rawData(PortOne 응답 JSON 통째),
        // tier/variant 전체 row 적재 방지
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
        payment: { select: { method: true, paidAt: true } },
        bankTransfer: true,
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

export async function listAdminDrops(page = 1, pageSize = 20) {
  const auth = await requireAdmin();
  if (!auth.success) return { success: false, error: auth.error } as const;

  const [total, drops] = await Promise.all([
    prisma.drop.count(),
    prisma.drop.findMany({
      select: {
        id: true,
        title: true,
        slug: true,
        type: true,
        status: true,
        publishedAt: true,
        createdAt: true,
        updatedAt: true,
        _count: { select: { ticketTiers: true, variants: true } },
      },
      orderBy: { updatedAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
  ]);

  // 페이지 내 drop들의 매출·주문건수를 groupBy 한 번으로 집계
  // (drop별 orders relation 통째 로드 → JS reduce 패턴 제거)
  const dropIds = drops.map((d) => d.id);
  const grouped = dropIds.length
    ? await prisma.order.groupBy({
        by: ['dropId'],
        where: {
          dropId: { in: dropIds },
          status: { in: ['paid', 'confirmed'] },
        },
        _sum: { totalAmount: true },
        _count: true,
      })
    : [];
  const statById = new Map(
    grouped.map((g) => [
      g.dropId,
      { revenue: g._sum.totalAmount ?? 0, orderCount: g._count },
    ])
  );

  const items = drops.map((d) => ({
    id: d.id,
    title: d.title,
    slug: d.slug,
    type: d.type,
    status: d.status,
    publishedAt: d.publishedAt,
    createdAt: d.createdAt,
    updatedAt: d.updatedAt,
    ticketTierCount: d._count.ticketTiers,
    variantCount: d._count.variants,
    revenue: statById.get(d.id)?.revenue ?? 0,
    orderCount: statById.get(d.id)?.orderCount ?? 0,
  }));

  return {
    success: true,
    data: { page, pageSize, total, items },
  } as const;
}
