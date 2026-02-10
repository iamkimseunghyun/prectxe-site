'use server';

import { Prisma } from '@prisma/client';
import { revalidatePath } from 'next/cache';
import type { z } from 'zod';
import { deleteAllImages, deleteRemovedImages } from '@/lib/cdn/cloudflare';
import { prisma } from '@/lib/db/prisma';
import { createVenueSchema, updateVenueSchema } from '@/lib/schemas';

export async function getVenueById(venueId: string) {
  const result = prisma.venue.findUnique({
    where: {
      id: venueId,
    },
    select: {
      id: true,
      name: true,
      description: true,
      address: true,
      images: true,
    },
  });
  return result;
}

export async function getAllVenues(page: number = 1, pageSize: number = 9) {
  try {
    const [items, total] = await Promise.all([
      prisma.venue.findMany({
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          images: true,
        },
        orderBy: {
          createdAt: 'desc',
        },
      }),
      prisma.venue.count(),
    ]);

    return { page, pageSize, total, items };
  } catch (error) {
    console.error('Failed to fetch venues:', error);
    throw new Error('Failed to fetch venues');
  }
}

export async function createVenue(
  data: z.infer<typeof createVenueSchema>,
  userId: string
) {
  try {
    const validatedResult = createVenueSchema.safeParse(data);
    if (!validatedResult.success) {
      console.error('Validation errors:', validatedResult.error.errors);
      return { success: false, error: '장소 정보 입력 값이 올바르지 않습니다.' };
    }

    const validatedData = validatedResult.data;

    const venue = await prisma.venue.create({
      data: {
        name: validatedData.name,
        description: validatedData.description,
        address: validatedData.address,
        userId,
      },
      select: { id: true },
    });
    if (validatedData.images.length > 0) {
      await prisma.venueImage.createMany({
        data: validatedData.images.map((image) => ({
          venueId: venue.id,
          imageUrl: image.imageUrl,
          alt: image.alt || '',
          order: image.order,
        })),
      });
    }
    revalidatePath('/venues');
    return { success: true, data: { id: venue.id } };
  } catch (error) {
    console.error('Failed to new venue:', error);
    return { success: false, error: 'Failed to new venue' };
  }
}

export async function updateVenue(
  data: z.infer<typeof updateVenueSchema>,
  venueId: string
) {
  try {
    // 1. 기존 베뉴 정보 가져오기 (이미지 삭제 처리를 위해)
    const existingVenue = await prisma.venue.findUnique({
      where: { id: venueId },
      include: { images: true },
    });

    if (!existingVenue) {
      return { success: false, error: '베뉴를 찾을 수 없습니다.' };
    }

    const validatedResult = updateVenueSchema.safeParse(data);

    if (!validatedResult.success) {
      console.error('Validation errors:', validatedResult.error);
      return {
        success: false,
        error: `입력값이 올바르지 않습니다: ${validatedResult.error.errors.map((e) => e.message).join(', ')}`,
      };
    }

    // 검증된 데이터 사용
    const validatedData = validatedResult.data;

    // Cloudflare 이미지 삭제 처리
    if (validatedData.images && existingVenue.images.length > 0) {
      const newImageUrls = validatedData.images.map((img) => img.imageUrl);
      await deleteRemovedImages(existingVenue.images, newImageUrls);
    }

    // Prisma 업데이트 데이터 준비
    const prismaUpdateData = {
      name: validatedData.name,
      description: validatedData.description,
      address: validatedData.address,
      images: {
        deleteMany: {},
        ...(validatedData.images &&
          validatedData.images.length > 0 && {
            createMany: {
              data: validatedData.images.map((image) => ({
                imageUrl: image.imageUrl,
                alt: image.alt || '',
                order: image.order,
              })),
            },
          }),
      },
    };

    // 베뉴 업데이트 실행
    const venue = await prisma.venue.update({
      where: {
        id: venueId,
      },
      data: {
        ...prismaUpdateData,
      },
      include: {
        images: true,

      },
    });

    revalidatePath('/venues');
    revalidatePath(`/venues/${venueId}`);
    return { success: true, data: venue };
  } catch (error) {
    console.error('베뉴 페이지 수정 실패:', error);

    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      return {
        success: false,
        error: '데이터베이스 작업 중 오류가 발생했습니다.',
        details: error.message,
      };
    }

    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : '베뉴 페이지 수정에 실패했습니다',
    };
  }
}

export async function deleteVenue(venueId: string) {
  try {
    // 베뉴 정보와 관련 이미지 정보 가져오기
    const venue = await prisma.venue.findUnique({
      where: { id: venueId },
      include: {
        images: true,
      },
    });

    if (!venue) {
      return { success: false, error: '베뉴를 찾을 수 없습니다.' };
    }

    // Cloudflare에서 갤러리 이미지 삭제
    await deleteAllImages(venue.images);

    await prisma.venue.delete({
      where: {
        id: venueId,
      },
    });
    revalidatePath('/venues');
    return { success: true };
  } catch (error) {
    console.error('베뉴 삭제 실패: ', error);
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : '베뉴 삭제 중 오류가 발생했습니다.',
    };
  }
}
