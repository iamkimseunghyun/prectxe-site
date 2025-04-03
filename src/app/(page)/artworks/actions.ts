// app/_actions/artwork.ts
'use server';

import { prisma } from '@/lib/db/prisma';
import { notFound } from 'next/navigation';

import { revalidatePath, unstable_cache as next_cache } from 'next/cache';

import { CACHE_TIMES, PAGINATION } from '@/lib/constants/constants';
import {
  createArtworkSchema,
  ImageData,
  updateArtworkSchema,
} from '@/lib/schemas';

export const getArtworksByArtistIdWithCache = next_cache(
  async (artistId: string) => {
    const artworks = await prisma.artwork.findMany({
      where: {
        artists: {
          some: {
            artistId: artistId,
          },
        },
      },
      select: {
        id: true,
        title: true,

        year: true,
        images: {
          orderBy: {
            order: 'asc',
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
    console.log(`Found ${artworks.length} artworks for artist ${artistId}`);
    return artworks;
  },
  ['artworks-list'],
  { revalidate: CACHE_TIMES.ARTWORKS_LIST }
);

export async function getArtworksByArtistId(artistId: string) {
  return getArtworksByArtistIdWithCache(artistId);
}

export const getArtworkByIdWithCache = next_cache(
  async (id: string) => {
    try {
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

      if (!artwork) notFound();

      return artwork;
    } catch (error) {
      console.error('Error fetching artwork:', error);
      throw error;
    }
  },
  ['artworks-detail'],
  { revalidate: CACHE_TIMES.ARTWORK_DETAIL }
);

export async function getArtworkById(id: string) {
  return getArtworkByIdWithCache(id);
}

export const getArtworksPage = next_cache(
  async (
    page = 0,
    pageSize = PAGINATION.ARTISTS_PAGE_SIZE,
    searchQuery = ''
  ) => {
    try {
      const where: any = {};

      // Search query filter
      if (searchQuery) {
        where.OR = [
          { title: { contains: searchQuery, mode: 'insensitive' } },
          { description: { contains: searchQuery, mode: 'insensitive' } },
          { style: { contains: searchQuery, mode: 'insensitive' } },
        ];
      }

      return prisma.artwork.findMany({
        where,
        include: {
          images: true,
          artists: true,
          user: true,
        },

        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        skip: page * pageSize,
        take: pageSize,
      });
    } catch (error) {
      console.error('아티스트 목록 조회 오류:', error);
      throw new Error('아티스트 목록을 불러오는데 실패했습니다.');
    }
  },
  ['artworks-list'],
  { revalidate: CACHE_TIMES.ARTWORKS_LIST }
);

export async function getMoreArtworks(page = 0, searchQuery = '') {
  return getArtworksPage(page, PAGINATION.ARTWORKS_PAGE_SIZE, searchQuery);
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

    console.log('Artists data received:', rawData.artists); // 로깅 추가

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
          create: validatedData.data.artists.map((artist: any) => ({
            artistId: artist.artistId,
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
    // artwork.artists에 있는 모든 아티스트 ID에 대해 캐시 무효화
    artwork.artists.forEach((artist) => {
      revalidatePath(`/artists/${artist.artistId}`);
    });
    console.log(
      'Created/Updated artwork with relationships:',
      JSON.stringify(artwork, null, 2)
    );
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
          create: validatedData.data.images?.map((image: ImageData) => ({
            imageUrl: image.imageUrl,
            alt: image.alt,
            order: image.order,
          })),
        },
        artists: {
          deleteMany: {},
          create: validatedData.data.artists?.map((artist) => ({
            artistId: artist.artistId,
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
    revalidatePath('/artworks');
    revalidatePath(`/artworks/${artworkId}`);
    // Add similar revalidation for artist pages:
    artwork.artists.forEach((artist) => {
      revalidatePath(`/artists/${artist.artistId}`);
    });
    console.log(
      'Created/Updated artwork with relationships:',
      JSON.stringify(artwork, null, 2)
    );
    return { ok: true, data: artwork };
  } catch (error) {
    console.error('작품 수정에 실패했습니다.:', error);
    return { ok: false, error: '작품 수정에 실패했습니다.' };
  }
}

export async function deleteArtwork(id: string) {
  await prisma.artwork.delete({ where: { id: id } });
  return { success: true };
}
