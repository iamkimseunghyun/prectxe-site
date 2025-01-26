// actions/venue.ts
'use server';

import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/prisma';
import { venueCreateSchema } from '@/lib/validations/venues';
import { GalleryImage } from '@/lib/validations/gallery-image';

export async function getVenue(venueId: string) {
  return prisma.venue.findUnique({
    where: {
      id: venueId,
    },
    include: {
      galleryImageUrls: {
        orderBy: { order: 'asc' },
      },
    },
  });
}

export async function getVenuesAction(page: number = 1, limit: number = 9) {
  try {
    const skip = (page - 1) * limit;

    const [venues, total] = await Promise.all([
      prisma.venue.findMany({
        skip,
        take: limit,
        include: {
          galleryImageUrls: true,
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

export async function createVenue(data: FormData) {
  try {
    const formData = {
      name: data.get('name') as string,
      description: data.get('description') as string,
      address: data.get('address') as string,
      galleryImageUrls: JSON.parse(
        (data.get('galleryImageUrls') as string) || '[]'
      ),
    };
    console.log('Server received data:', data);

    const validatedData = venueCreateSchema.safeParse(formData);
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
      },
      select: { id: true },
    });

    // galleryImageUrls 별도 생성
    if (validatedData.data.galleryImageUrls.length > 0) {
      await prisma.galleryImageUrl.createMany({
        data: validatedData.data.galleryImageUrls.map((image) => ({
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

interface VenueUpdateData {
  name: string;
  description: string;
  address: string;
  galleryImageUrls: {
    deleteMany: Record<string, never>;
    createMany: {
      data: Array<{
        imageUrl: string;
        alt: string;
        order: number;
      }>;
    };
  };
}

export async function updateVenue(formData: FormData, venueId: string) {
  try {
    // 더 안전한 방식
    const galleryData = JSON.parse(
      formData.get('galleryImageUrls')?.toString() || '[]'
    );

    const updateData: VenueUpdateData = {
      name: formData.get('name') as string,
      description: formData.get('description') as string,
      address: formData.get('address') as string,
      galleryImageUrls: {
        deleteMany: {},
        createMany: {
          data: galleryData.map((image: GalleryImage) => ({
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
    });

    revalidatePath('/venues');
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
