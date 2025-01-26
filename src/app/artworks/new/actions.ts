'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { artworkCreateSchema } from '@/lib/validations/artwork';
import { GalleryImage } from '@/lib/validations/gallery-image';

export type CreateArtworkResponse =
  | { ok: true; data: { id: string } }
  | { ok: false; error: string };

export async function createArtwork(
  formData: FormData
): Promise<CreateArtworkResponse> {
  try {
    const rawData = {
      title: formData.get('title'),
      size: formData.get('size'),
      media: formData.get('media'),
      year: Number(formData.get('year')),
      description: formData.get('description'),
      style: formData.get('style'),
      galleryImageUrls: JSON.parse(
        formData.get('galleryImageUrls')?.toString() || '[]'
      ),
    };

    // Validate input
    const validatedData = artworkCreateSchema.safeParse(rawData);
    if (!validatedData.success) {
      return { ok: false, error: '입력값이 올바르지 않습니다.' };
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
      },
    });

    if (validatedData.data.galleryImageUrls.length > 0) {
      await prisma.galleryImageUrl.createMany({
        data: validatedData.data.galleryImageUrls.map((image) => ({
          artworkId: artwork.id,
          imageUrl: image.imageUrl,
          alt: image.alt || '',
          order: image.order,
        })),
      });
    }

    // Revalidate the artworks page
    revalidatePath('/artworks');
    revalidatePath(`/artworks/${artwork.id}`); // 상세 페이지도 리밸리데이트

    return { ok: true, data: { id: artwork.id } };
  } catch (error) {
    console.error(error);
    return { ok: false, error: '서버 에러가 발생했습니다.' };
  }
}

export type UpdateArtworkResponse = CreateArtworkResponse;

export async function updateArtwork(
  formData: FormData,
  artworkId: string
): Promise<UpdateArtworkResponse> {
  try {
    const galleryData = JSON.parse(formData.get('galleryImageUrls') as string);

    const updateData = {
      title: formData.get('title') as string,
      size: formData.get('size') as string,
      media: formData.get('media') as string,
      year: Number(formData.get('year')),
      description: formData.get('description') as string,
      style: formData.get('style') as string,
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

    const validatedData = artworkCreateSchema.safeParse(updateData);

    if (!validatedData.success) {
      return { ok: false, error: '입력 값이 올바르지 않습니다.' };
    }

    const artwork = await prisma.artwork.update({
      where: { id: artworkId },
      data: {
        ...updateData,
        updatedAt: new Date(),
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
