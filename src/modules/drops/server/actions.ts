'use server';

import { revalidatePath } from 'next/cache';
import { requireAdmin } from '@/lib/auth/require-admin';
import {
  deleteAllImages,
  deleteCloudflareImage,
  deleteCloudflareVideo,
  deleteRemovedImages,
} from '@/lib/cdn/cloudflare';
import { extractImageId, extractVideoId } from '@/lib/utils';
import { prisma } from '@/lib/db/prisma';

// ─── Drop CRUD (Admin) ──────────────────────────────

export async function createDrop(data: {
  title: string;
  slug: string;
  type: 'ticket' | 'goods';
  summary?: string;
  description?: string;
  heroUrl?: string;
  videoUrl?: string;
  status?: string;
  images?: { imageUrl: string; alt: string; order: number }[];
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
      heroUrl: data.heroUrl || null,
      videoUrl: data.videoUrl || null,
      status: (data.status as any) || 'draft',
      publishedAt: data.status && data.status !== 'draft' ? new Date() : null,
      images: data.images?.length
        ? { createMany: { data: data.images } }
        : undefined,
    },
  });

  revalidatePath('/admin/drops');
  revalidatePath('/drops');
  return { success: true, data: drop };
}

export async function updateDrop(
  id: string,
  data: {
    title?: string;
    slug?: string;
    summary?: string;
    description?: string;
    heroUrl?: string;
    videoUrl?: string;
    status?: string;
    publishedAt?: string | null;
    images?: { imageUrl: string; alt: string; order: number }[];
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
    include: { images: true },
  });
  if (!prev) return { success: false, error: 'Drop을 찾을 수 없습니다.' };

  // Hero 이미지 변경 시 이전 것 삭제
  if (
    data.heroUrl !== undefined &&
    prev.heroUrl &&
    data.heroUrl !== prev.heroUrl
  ) {
    const oldId = extractImageId(prev.heroUrl);
    if (oldId) await deleteCloudflareImage(oldId).catch(() => {});
  }

  // 비디오 변경 시 이전 것 삭제
  if (
    data.videoUrl !== undefined &&
    prev.videoUrl &&
    data.videoUrl !== prev.videoUrl
  ) {
    const oldVid = extractVideoId(prev.videoUrl);
    if (oldVid) await deleteCloudflareVideo(oldVid).catch(() => {});
  }

  // 갤러리 이미지 변경 시 제거된 것 삭제
  if (data.images !== undefined) {
    const newImageUrls = data.images.map((img) => img.imageUrl);
    await deleteRemovedImages(prev.images, newImageUrls);
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
      ...(data.heroUrl !== undefined && { heroUrl: data.heroUrl || null }),
      ...(data.videoUrl !== undefined && { videoUrl: data.videoUrl || null }),
      ...(data.status !== undefined && { status: data.status as any }),
      ...(data.publishedAt !== undefined
        ? { publishedAt: data.publishedAt ? new Date(data.publishedAt) : null }
        : isPublishing
          ? { publishedAt: new Date() }
          : {}),
      ...(data.images !== undefined && {
        images: {
          deleteMany: {},
          ...(data.images.length > 0
            ? { createMany: { data: data.images } }
            : {}),
        },
      }),
    },
  });

  revalidatePath('/admin/drops');
  revalidatePath(`/drops/${drop.slug}`);
  revalidatePath('/drops');
  return { success: true, data: drop };
}

export async function deleteDrop(id: string) {
  const auth = await requireAdmin();
  if (!auth.success) return { success: false, error: auth.error };

  const drop = await prisma.drop.findUnique({
    where: { id },
    include: {
      images: { select: { imageUrl: true } },
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
  if (drop.heroUrl) {
    const heroId = extractImageId(drop.heroUrl);
    if (heroId) await deleteCloudflareImage(heroId).catch(() => {});
  }
  if (drop.videoUrl) {
    const vidId = extractVideoId(drop.videoUrl);
    if (vidId) await deleteCloudflareVideo(vidId).catch(() => {});
  }
  if (drop.images.length > 0) {
    await deleteAllImages(drop.images);
  }

  await prisma.drop.delete({ where: { id } });
  revalidatePath('/admin/drops');
  revalidatePath('/drops');
  return { success: true };
}

// ─── Drop 조회 ──────────────────────────────────────

export async function getDrop(id: string) {
  const auth = await requireAdmin();
  if (!auth.success) return null;

  return prisma.drop.findUnique({
    where: { id },
    include: {
      images: { orderBy: { order: 'asc' } },
      ticketTiers: { orderBy: { order: 'asc' } },
      variants: { orderBy: { order: 'asc' } },
    },
  });
}

export async function getDropBySlug(slug: string) {
  return prisma.drop.findUnique({
    where: { slug },
    include: {
      images: { orderBy: { order: 'asc' } },
      ticketTiers: {
        where: { status: 'on_sale' },
        orderBy: { order: 'asc' },
      },
      variants: {
        orderBy: { order: 'asc' },
      },
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
        images: { orderBy: { order: 'asc' }, take: 1 },
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
