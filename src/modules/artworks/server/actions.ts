'use server';

import { unstable_cache as next_cache, revalidatePath } from 'next/cache';
import { notFound } from 'next/navigation';
import type { z } from 'zod';
import { deleteAllImages, deleteRemovedImages } from '@/lib/cdn/cloudflare';
import { CACHE_TIMES, PAGINATION } from '@/lib/constants/constants';
import { prisma } from '@/lib/db/prisma';
import { createArtworkSchema, updateArtworkSchema } from '@/lib/schemas';

export const getArtworksByArtistIdWithCache = next_cache(
  async (artistId: string) => {
    return prisma.artwork.findMany({
      where: { artists: { some: { artistId } } },
      select: {
        id: true,
        title: true,
        year: true,
        images: { orderBy: { order: 'asc' } },
      },
      orderBy: { createdAt: 'desc' },
    });
  },
  ['artworks-list'],
  { revalidate: CACHE_TIMES.ARTWORKS_LIST }
);

export async function getArtworksByArtistId(artistId: string) {
  return getArtworksByArtistIdWithCache(artistId);
}

export const getArtworkByIdWithCache = next_cache(
  async (id: string) => {
    const artwork = await prisma.artwork.findUnique({
      where: { id },
      include: {
        images: { orderBy: { order: 'asc' } },
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
  },
  ['artworks-detail'],
  { revalidate: CACHE_TIMES.ARTWORK_DETAIL }
);

export async function getArtworkById(id: string) {
  return getArtworkByIdWithCache(id);
}

export const getArtworksPage = next_cache(
  async (page = 0, pageSize = PAGINATION.ARTWORKS_PAGE_SIZE) => {
    return prisma.artwork.findMany({
      select: {
        id: true,
        title: true,
        description: true,
        year: true,
        media: true,
        size: true,
        images: {
          select: { id: true, imageUrl: true, alt: true },
          orderBy: { order: 'asc' },
          take: 1,
        },
        artists: {
          select: { artist: { select: { name: true } } },
        },
      },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      skip: page * pageSize,
      take: pageSize,
    });
  },
  ['artworks-list'],
  { revalidate: CACHE_TIMES.ARTWORKS_LIST }
);

export async function getMoreArtworks(page = 0) {
  return getArtworksPage(page, PAGINATION.ARTWORKS_PAGE_SIZE);
}

export async function createArtwork(
  data: z.infer<typeof createArtworkSchema>,
  userId: string
) {
  try {
    const parsed = createArtworkSchema.safeParse(data);
    if (!parsed.success) {
      return {
        success: false,
        error: parsed.error.errors[0]?.message ?? '유효성 오류',
      };
    }
    const d = parsed.data;

    const artwork = await prisma.artwork.create({
      data: {
        title: d.title,
        size: d.size ?? null,
        media: d.media ?? null,
        year: d.year ?? null,
        description: d.description ?? null,
        style: d.style ?? null,
        userId,
        images: d.images?.length
          ? { createMany: { data: d.images } }
          : undefined,
        artists: d.artists?.length
          ? {
              createMany: {
                data: d.artists.map((a) => ({ artistId: a.artistId })),
              },
            }
          : undefined,
      },
      select: { id: true },
    });

    revalidatePath('/artworks');
    for (const a of d.artists ?? []) {
      revalidatePath(`/artists/${a.artistId}`);
    }
    return { success: true, data: artwork };
  } catch (error) {
    console.error('작품 등록 실패:', error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : '작품 등록에 실패했습니다.',
    };
  }
}

export async function updateArtwork(
  data: z.infer<typeof updateArtworkSchema>,
  artworkId: string
) {
  try {
    const parsed = updateArtworkSchema.safeParse(data);
    if (!parsed.success) {
      return { success: false, error: '입력 값이 올바르지 않습니다.' };
    }
    const d = parsed.data;

    const existing = await prisma.artwork.findUnique({
      where: { id: artworkId },
      include: { images: true },
    });
    if (!existing) {
      return { success: false, error: '작품을 찾을 수 없습니다.' };
    }

    // 갤러리: 제거된 이미지를 Cloudflare에서 삭제
    const hasNewImages = d.images && d.images.length > 0;
    if (hasNewImages) {
      const newImageUrls = d.images!.map((img) => img.imageUrl);
      await deleteRemovedImages(existing.images, newImageUrls);
    }

    const hasNewArtists = d.artists && d.artists.length > 0;

    const artwork = await prisma.artwork.update({
      where: { id: artworkId },
      data: {
        title: d.title,
        size: d.size ?? null,
        media: d.media ?? null,
        year: d.year ?? null,
        description: d.description ?? null,
        style: d.style ?? null,
        images: hasNewImages
          ? { deleteMany: {}, createMany: { data: d.images! } }
          : undefined,
        artists: hasNewArtists
          ? {
              deleteMany: {},
              createMany: {
                data: d.artists!.map((a) => ({ artistId: a.artistId })),
              },
            }
          : undefined,
      },
      select: {
        id: true,
        artists: { select: { artistId: true } },
      },
    });

    revalidatePath('/artworks');
    revalidatePath(`/artworks/${artwork.id}`);
    for (const a of artwork.artists) {
      revalidatePath(`/artists/${a.artistId}`);
    }
    return { success: true, data: artwork };
  } catch (error) {
    console.error('작품 수정 실패:', error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : '작품 수정에 실패했습니다.',
    };
  }
}

export async function deleteArtwork(id: string) {
  try {
    const artwork = await prisma.artwork.findUnique({
      where: { id },
      select: {
        images: { select: { imageUrl: true } },
        artists: { select: { artistId: true } },
      },
    });

    if (!artwork) {
      return { success: false, error: '작품을 찾을 수 없습니다.' };
    }

    // Cloudflare에서 갤러리 이미지 삭제
    if (artwork.images.length > 0) {
      await deleteAllImages(artwork.images);
    }

    await prisma.artwork.delete({ where: { id } });

    revalidatePath('/artworks');
    for (const a of artwork.artists) {
      revalidatePath(`/artists/${a.artistId}`);
    }
    return { success: true };
  } catch (error) {
    console.error('작품 삭제 실패:', error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : '작품 삭제에 실패했습니다.',
    };
  }
}

export async function listArtworksPaged(
  params: { page?: number; pageSize?: number } = {}
) {
  const { page = 1, pageSize = 10 } = params;

  try {
    const [total, items] = await Promise.all([
      prisma.artwork.count(),
      prisma.artwork.findMany({
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        skip: (page - 1) * pageSize,
        take: pageSize,
        select: {
          id: true,
          title: true,
          year: true,
          media: true,
          artists: {
            select: { artist: { select: { name: true } } },
          },
        },
      }),
    ]);

    return { page, pageSize, total, items };
  } catch (e) {
    console.error('Artworks paged list error:', e);
    return { page, pageSize, total: 0, items: [] as never[] };
  }
}
