// app/_actions/artwork.ts
'use server';

import { prisma } from '@/lib/db/prisma';
import { notFound } from 'next/navigation';
import {
  createArtworkSchema,
  updateArtworkSchema,
} from '@/app/artworks/artwork';
import { revalidatePath } from 'next/cache';
import { GalleryImage } from '@/lib/validations/gallery-image';

export async function getArtworkById(id: string) {
  const artwork = await prisma.artwork.findUnique({
    where: { id },
    include: {
      images: {
        orderBy: {
          order: 'asc',
        },
      },
    },
  });

  if (!artwork) notFound();

  return artwork;
}

export async function getAllArtworks() {
  const artworks = prisma.artwork.findMany({
    include: {
      images: true,
    },
    orderBy: {
      createdAt: 'desc',
    },
  });

  return artworks;
}

export async function createArtwork(formData: FormData, userId: string) {
  try {
    const rawData = {
      title: formData.get('title'),
      size: formData.get('size'),
      media: formData.get('media'),
      year: Number(formData.get('year')),
      description: formData.get('description'),
      style: formData.get('style'),
      images: JSON.parse(formData.get('images')?.toString() || '[]'),
    };

    const validatedData = createArtworkSchema.safeParse(rawData);

    if (!validatedData.success) {
      const errorMessage = validatedData.error.issues
        .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
        .join(', ');
      return { ok: false, error: errorMessage };
    }

    // Create artwork with Prisma
    const artwork = await prisma.artwork.create({
      data: {
        title: validatedData.data.title,
        size: validatedData.data.size,
        media: validatedData.data.media,
        year: validatedData.data.year,
        description: validatedData.data.description,
        style: validatedData.data.style,
        userId: userId,
        images: {
          create: validatedData.data.images.map((image) => ({
            imageUrl: image.imageUrl,
            alt: image.alt,
            order: image.order,
          })),
        },
      },
    });

    // Revalidate the artworks page
    revalidatePath('/artworks');
    revalidatePath(`/artworks/${artwork.id}`);

    return { ok: true, data: artwork };
  } catch (error) {
    console.error('아트워크 등록 중 서버 에러 발생.', error);
    return {
      ok: false,
      error:
        error instanceof Error
          ? error.message
          : '아트워크 등록 중 서버 에러 발생.',
    };
  }
}

export async function updateArtwork(formData: FormData, artworkId: string) {
  try {
    const galleryData = JSON.parse(formData.get('images')?.toString() || '[]');

    const validationData = {
      title: formData.get('title')?.toString() || '',
      size: formData.get('size')?.toString() || '',
      media: formData.get('media')?.toString() || '',
      year: Number(formData.get('year')?.toString()) || '',
      description: formData.get('description')?.toString() || '',
      style: formData.get('style')?.toString() || '',
      images: galleryData, // 이미지 배열 직접 전달
    };

    const validatedData = updateArtworkSchema.safeParse(validationData);

    if (!validatedData.success) {
      console.error(
        'Validation errors:',
        JSON.stringify(validatedData.error, null, 2)
      );
      const errorMessages = validatedData.error.errors
        .map((e) => e.message)
        .join(', ');
      return {
        ok: false,
        error: `입력 값이 올바르지 않습니다: ${errorMessages}`,
      };
    }
    // Prisma 업데이트를 위한 데이터 구조

    const artwork = await prisma.artwork.update({
      where: { id: artworkId },
      data: {
        ...validatedData,
        images: {
          deleteMany: {},
          create: validatedData.data.images?.map((image: GalleryImage) => ({
            imageUrl: image.imageUrl,
            alt: image.alt,
            order: image.order,
          })),
        },
      },
    });
    revalidatePath('/artworks');
    revalidatePath(`/artworks/${artworkId}`);
    return { ok: true, data: artwork };
  } catch (error) {
    console.error('작품 수정에 실패했습니다.:', error);
    return { ok: false, error: '작품 수정에 실패했습니다.' };
  }
}

export async function deleteArtworkById(id: string) {
  await prisma.artwork.delete({ where: { id: id } });
}
