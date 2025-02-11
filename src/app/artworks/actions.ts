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
  // 1. 먼저 ArtistArtwork 테이블 확인
  // const artistArtworks = await prisma.artistArtwork.findMany({
  //   where: {
  //     artworkId: id,
  //   },
  //   include: {
  //     artist: true,
  //     artwork: true,
  //   },
  // });
  // console.log('1. ArtistArtwork relationships:', JSON.stringify(artistArtworks, null, 2));

  // 2. 직접 Artist 테이블 확인
  // const artists = await prisma.artist.findMany();
  // console.log('2. All Artists:', JSON.stringify(artists, null, 2));

  // 3. 작품 데이터와 관계 확인
  const artwork = await prisma.artwork.findUnique({
    where: { id },
    include: {
      images: {
        orderBy: {
          order: 'asc',
        },
      },
      artists: {
        include: {
          artist: {
            select: {
              id: true,
              name: true,
              nameKr: true,
              mainImageUrl: true,
            },
          },
        },
      },
    },
  });

  // console.log('3. Full artwork data:', JSON.stringify(artwork, null, 2));

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
      artists: JSON.parse(formData.get('artists')?.toString() || '[]'),
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
        artists: {
          create: validatedData.data.artists.map((artistData: any) => ({
            artist: {
              connect: { id: artistData.artistId },
            },
          })),
        },
      },
      include: {
        images: true,
        artists: {
          include: {
            artist: true,
          },
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
    const artistsData = JSON.parse(formData.get('artists')?.toString() || '[]');

    const validationData = {
      title: formData.get('title')?.toString() || '',
      size: formData.get('size')?.toString() || '',
      media: formData.get('media')?.toString() || '',
      year: Number(formData.get('year')?.toString()) || '',
      description: formData.get('description')?.toString() || '',
      style: formData.get('style')?.toString() || '',
      images: galleryData,
      artists: artistsData,
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
        title: validatedData.data.title,
        size: validatedData.data.size,
        media: validatedData.data.media,
        year: validatedData.data.year,
        description: validatedData.data.description,
        style: validatedData.data.style,
        images: {
          deleteMany: {},
          create: validatedData.data.images?.map((image: GalleryImage) => ({
            imageUrl: image.imageUrl,
            alt: image.alt,
            order: image.order,
          })),
        },
        artists: {
          deleteMany: {},
          create: validatedData.data.artists?.map((artistData) => ({
            artist: {
              connect: { id: artistData.artistId },
            },
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
