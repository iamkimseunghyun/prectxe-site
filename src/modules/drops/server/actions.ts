'use server';

import { revalidatePath } from 'next/cache';
import { requireAdmin } from '@/lib/auth/require-admin';
import {
  cleanupRemovedHtmlImages,
  deleteCloudflareImage,
  deleteCloudflareVideo,
} from '@/lib/cdn/cloudflare';
import { prisma } from '@/lib/db/prisma';
import { extractImageId, extractVideoId } from '@/lib/utils';

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
  notice?: string;
  status?: string;
  media?: DropMediaInput[];
  credits?: DropCreditInput[];
}) {
  const auth = await requireAdmin();
  if (!auth.success) return { success: false, error: auth.error };

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
      eventDate: data.eventDate ? new Date(data.eventDate) : null,
      eventEndDate: data.eventEndDate ? new Date(data.eventEndDate) : null,
      venue: data.venue || null,
      venueAddress: data.venueAddress || null,
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
    notice?: string;
    status?: string;
    publishedAt?: string | null;
    media?: DropMediaInput[];
    credits?: DropCreditInput[];
  }
) {
  const auth = await requireAdmin();
  if (!auth.success) return { success: false, error: auth.error };

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
        eventDate: data.eventDate ? new Date(data.eventDate) : null,
      }),
      ...(data.eventEndDate !== undefined && {
        eventEndDate: data.eventEndDate ? new Date(data.eventEndDate) : null,
      }),
      ...(data.venue !== undefined && { venue: data.venue || null }),
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

export async function getDropStats(dropId: string) {
  const auth = await requireAdmin();
  if (!auth.success) return null;

  const drop = await prisma.drop.findUnique({
    where: { id: dropId },
    include: {
      ticketTiers: { orderBy: { order: 'asc' } },
      variants: { orderBy: { order: 'asc' } },
      orders: {
        where: { status: { in: ['paid', 'confirmed'] } },
        select: { totalAmount: true },
      },
    },
  });

  if (!drop) return null;

  const totalRevenue = drop.orders.reduce((s, o) => s + o.totalAmount, 0);
  const totalSold = drop.ticketTiers.reduce((s, t) => s + t.soldCount, 0);
  const totalCapacity = drop.ticketTiers.reduce((s, t) => s + t.quantity, 0);

  return {
    totalRevenue,
    totalSold,
    totalCapacity,
    salesRate:
      totalCapacity > 0 ? Math.round((totalSold / totalCapacity) * 100) : 0,
    orderCount: drop.orders.length,
  };
}

export async function getDropOrders(dropId: string, page = 1, pageSize = 20) {
  const auth = await requireAdmin();
  if (!auth.success) return { success: false, error: auth.error } as const;

  const where = { dropId };
  const [total, items] = await Promise.all([
    prisma.order.count({ where }),
    prisma.order.findMany({
      where,
      include: {
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

export async function listAdminDrops(page = 1, pageSize = 20) {
  const auth = await requireAdmin();
  if (!auth.success) return { success: false, error: auth.error } as const;

  const [total, items] = await Promise.all([
    prisma.drop.count(),
    prisma.drop.findMany({
      include: {
        ticketTiers: { select: { id: true } },
        variants: { select: { id: true } },
        orders: {
          where: { status: { in: ['paid', 'confirmed'] } },
          select: { totalAmount: true },
        },
      },
      orderBy: { updatedAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
  ]);

  return {
    success: true,
    data: { page, pageSize, total, items },
  } as const;
}
