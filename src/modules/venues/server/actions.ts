'use server';

import { revalidatePath } from 'next/cache';
import type { z } from 'zod';
import { deleteAllImages, deleteRemovedImages } from '@/lib/cdn/cloudflare';
import { prisma } from '@/lib/db/prisma';
import { createVenueSchema, updateVenueSchema } from '@/lib/schemas';

export async function getVenueById(venueId: string) {
  return prisma.venue.findUnique({
    where: { id: venueId },
    select: {
      id: true,
      name: true,
      description: true,
      address: true,
      userId: true,
      images: { orderBy: { order: 'asc' } },
    },
  });
}

export async function getAllVenues(page = 1, pageSize = 9) {
  try {
    const [items, total] = await Promise.all([
      prisma.venue.findMany({
        skip: (page - 1) * pageSize,
        take: pageSize,
        select: {
          id: true,
          name: true,
          description: true,
          address: true,
          images: {
            select: { id: true, imageUrl: true, alt: true },
            orderBy: { order: 'asc' },
            take: 1,
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.venue.count(),
    ]);

    return { page, pageSize, total, items };
  } catch (error) {
    console.error('장소 목록 조회 실패:', error);
    throw new Error('장소 목록을 불러오는데 실패했습니다.');
  }
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
        error: parsed.error.errors[0]?.message ?? '유효성 오류',
      };
    }
    const d = parsed.data;

    const venue = await prisma.venue.create({
      data: {
        name: d.name,
        description: d.description,
        address: d.address,
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
        description: d.description,
        address: d.address,
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
