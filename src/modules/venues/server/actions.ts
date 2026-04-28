'use server';

import { revalidatePath } from 'next/cache';
import type { z } from 'zod';
import { deleteAllImages, deleteRemovedImages } from '@/lib/cdn/cloudflare';
import { prisma } from '@/lib/db/prisma';
import { createVenueSchema, updateVenueSchema } from '@/lib/schemas';

export async function getVenueById(venueId: string) {
  return prisma.venue.findUnique({
    where: { id: venueId },
    include: {
      images: { orderBy: { order: 'asc' } },
    },
  });
}

/**
 * Venue 상세에 표시할 연관 이벤트 조회.
 * venueId FK 매칭 + legacy `venue` 문자열(이름) 매칭 — OR.
 */
export async function getVenueEvents(venueId: string, venueName: string) {
  const [programs, drops] = await Promise.all([
    prisma.program.findMany({
      where: {
        OR: [{ venueId }, { venue: venueName }],
      },
      select: {
        id: true,
        slug: true,
        title: true,
        status: true,
        startAt: true,
        endAt: true,
        heroUrl: true,
        city: true,
      },
      orderBy: { startAt: 'desc' },
    }),
    prisma.drop.findMany({
      where: {
        OR: [{ venueId }, { venue: venueName }],
        status: { not: 'draft' },
        publishedAt: { not: null },
      },
      select: {
        id: true,
        slug: true,
        title: true,
        status: true,
        eventDate: true,
        eventEndDate: true,
        media: {
          where: { type: 'image' },
          orderBy: { order: 'asc' },
          take: 1,
          select: { url: true },
        },
      },
      orderBy: { eventDate: 'desc' },
    }),
  ]);
  return { programs, drops };
}

export async function getAllVenues(page = 1, pageSize = 9, searchQuery = '') {
  try {
    const where = searchQuery
      ? {
          OR: [
            { name: { contains: searchQuery, mode: 'insensitive' as const } },
            { city: { contains: searchQuery, mode: 'insensitive' as const } },
          ],
        }
      : {};
    const [items, total] = await Promise.all([
      prisma.venue.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        select: {
          id: true,
          name: true,
          tagline: true,
          address: true,
          city: true,
          country: true,
          tags: true,
          images: {
            select: { id: true, imageUrl: true, alt: true },
            orderBy: { order: 'asc' },
            take: 1,
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.venue.count({ where }),
    ]);

    return { page, pageSize, total, items };
  } catch (error) {
    console.error('장소 목록 조회 실패:', error);
    throw new Error('장소 목록을 불러오는데 실패했습니다.');
  }
}

/**
 * Drop·Program 폼의 Venue 선택 UI용 — id/name/address 경량 리스트.
 */
export async function getVenueOptions() {
  return prisma.venue.findMany({
    select: { id: true, name: true, address: true, city: true },
    orderBy: { name: 'asc' },
  });
}

export async function createVenue(
  data: z.infer<typeof createVenueSchema>,
  userId: string
) {
  try {
    const parsed = createVenueSchema.safeParse(data);
    if (!parsed.success) {
      return {
        success: false,
        error: parsed.error.issues[0]?.message ?? '유효성 오류',
      };
    }
    const d = parsed.data;

    const venue = await prisma.venue.create({
      data: {
        name: d.name,
        tagline: d.tagline,
        description: d.description,
        address: d.address,
        city: d.city,
        country: d.country,
        website: d.website,
        instagram: d.instagram,
        tags: d.tags ?? [],
        userId,
        images: d.images?.length
          ? { createMany: { data: d.images } }
          : undefined,
      },
      select: { id: true },
    });

    revalidatePath('/venues');
    return { success: true, data: { id: venue.id } };
  } catch (error) {
    console.error('장소 등록 실패:', error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : '장소 등록에 실패했습니다.',
    };
  }
}

export async function updateVenue(
  data: z.infer<typeof updateVenueSchema>,
  venueId: string
) {
  try {
    const parsed = updateVenueSchema.safeParse(data);
    if (!parsed.success) {
      return { success: false, error: '입력 값이 올바르지 않습니다.' };
    }
    const d = parsed.data;

    const existing = await prisma.venue.findUnique({
      where: { id: venueId },
      include: { images: true },
    });
    if (!existing) {
      return { success: false, error: '장소를 찾을 수 없습니다.' };
    }

    // 갤러리: 제거된 이미지를 Cloudflare에서 삭제
    const hasNewImages = d.images && d.images.length > 0;
    if (hasNewImages) {
      const newImageUrls = d.images!.map((img) => img.imageUrl);
      await deleteRemovedImages(existing.images, newImageUrls);
    }

    const venue = await prisma.venue.update({
      where: { id: venueId },
      data: {
        name: d.name,
        tagline: d.tagline,
        description: d.description,
        address: d.address,
        city: d.city,
        country: d.country,
        website: d.website,
        instagram: d.instagram,
        tags: d.tags,
        images: hasNewImages
          ? { deleteMany: {}, createMany: { data: d.images! } }
          : undefined,
      },
      select: { id: true },
    });

    revalidatePath('/venues');
    revalidatePath(`/venues/${venue.id}`);
    return { success: true, data: { id: venue.id } };
  } catch (error) {
    console.error('장소 수정 실패:', error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : '장소 수정에 실패했습니다.',
    };
  }
}

export async function deleteVenue(venueId: string) {
  try {
    const venue = await prisma.venue.findUnique({
      where: { id: venueId },
      select: { images: { select: { imageUrl: true } } },
    });

    if (!venue) {
      return { success: false, error: '장소를 찾을 수 없습니다.' };
    }

    if (venue.images.length > 0) {
      await deleteAllImages(venue.images);
    }

    await prisma.venue.delete({ where: { id: venueId } });
    revalidatePath('/venues');
    return { success: true };
  } catch (error) {
    console.error('장소 삭제 실패:', error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : '장소 삭제에 실패했습니다.',
    };
  }
}
