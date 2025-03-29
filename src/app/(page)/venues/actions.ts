'use server';

import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/db/prisma';
import { createVenueSchema } from '@/lib/schemas';

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

export async function getAllVenues(page: number = 1, limit: number = 9) {
  try {
    const skip = (page - 1) * limit;

    const [venues, total] = await Promise.all([
      prisma.venue.findMany({
        skip,
        take: limit,
        include: {
          images: true,
        },
        orderBy: {
          createdAt: 'desc',
        },
      }),
      prisma.venue.count(),
    ]);

    return {
      venues,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  } catch (error) {
    console.error('Failed to fetch venues:', error);
    throw new Error('Failed to fetch venues');
  }
}

export async function createVenue(data: FormData, userId: string) {
  try {
    const formData = {
      name: data.get('name') as string,
      description: data.get('description') as string,
      address: data.get('address') as string,
      images: JSON.parse(data.get('images') as string) || '[]',
    };
    console.log('Server received data:', data);

    const validatedData = createVenueSchema.safeParse(formData);
    if (!validatedData.success) {
      console.error('Validation errors:', validatedData.error.errors);
      return { ok: false, error: '장소 정보 입력 값이 올바르지 않습니다.' };
    }

    console.log('Validated data:', validatedData.data);
    const venue = await prisma.venue.create({
      data: {
        name: validatedData.data.name,
        description: validatedData.data.description,
        address: validatedData.data.address,
        userId,
      },
      select: { id: true },
    });
    // venueImageUrls 별도 생성
    if (validatedData.data.images.length > 0) {
      await prisma.venueImage.createMany({
        data: validatedData.data.images.map((image) => ({
          venueId: venue.id,
          imageUrl: image.imageUrl,
          alt: image.alt || '',
          order: image.order,
        })),
      });
    }
    revalidatePath('/venues');

    console.log('Created venue:', venue);

    return { ok: true, data: { id: venue.id } };
  } catch (error) {
    console.error('Failed to new venue:', error);
    return { ok: false, error: 'Failed to new venue' };
  }
}

export async function updateVenue(formData: FormData, venueId: string) {
  try {
    // 더 안전한 방식
    const galleryData = JSON.parse(formData.get('images')?.toString() || '[]');

    // Validation data
    const validationData = {
      name: formData.get('name')?.toString() || '',
      description: formData.get('description')?.toString() || '',
      address: formData.get('address')?.toString() || '',
      images: galleryData,
    };

    const validatedResult = createVenueSchema.safeParse(validationData);

    if (!validatedResult.success) {
      console.error('Validation errors:', validatedResult.error);
      return {
        ok: false,
        error: `입력값이 올바르지 않습니다: ${validatedResult.error.errors.map((e) => e.message).join(', ')}`,
      };
    }

    const updateData = {
      name: validatedResult.data.name,
      description: validatedResult.data.description,
      address: validatedResult.data.address,
      images: {
        deleteMany: {},
        createMany: {
          data: validatedResult.data.images.map((image) => ({
            imageUrl: image.imageUrl,
            alt: image.alt || '',
            order: image.order,
          })),
        },
      },
    };

    const venue = await prisma.venue.update({
      where: {
        id: venueId,
      },
      data: {
        ...updateData,
        updatedAt: new Date(),
      },
      include: {
        images: true,
      },
    });

    revalidatePath('/venues');
    revalidatePath(`/venues/${venueId}`);
    return { ok: true, data: venue };
  } catch (error) {
    console.error('Failed to update venue:', error);
    return { ok: false, error: 'Failed to update venue' };
  }
}

export async function deleteVenue(venueId: string) {
  try {
    await prisma.venue.delete({
      where: {
        id: venueId,
      },
    });
    revalidatePath('/');
    return { success: true };
  } catch (error) {
    console.error(error);
    return { success: false };
  }
}
