// app/_actions/artwork.ts
'use server';

import { prisma } from '@/lib/prisma';
import { Artwork, GalleryImageUrl } from '@prisma/client';

export type ArtworkWithImages = Artwork & {
  galleryImageUrls: GalleryImageUrl[];
};

export async function getArtworks(page: number = 1, limit: number = 12) {
  const skip = (page - 1) * limit;

  try {
    const [artworks, total] = await Promise.all([
      prisma.artwork.findMany({
        include: {
          galleryImageUrls: true,
        },
        orderBy: {
          createdAt: 'desc',
        },
        take: limit,
        skip,
      }),
      prisma.artwork.count(),
    ]);

    return {
      artworks,
      pagination: {
        total,
        totalPages: Math.ceil(total / limit),
        currentPage: page,
      },
    };
  } catch (error) {
    console.error('작품 목록 조회 에러:', error);
    throw new Error('작품 목록을 불러오는데 실패했습니다.');
  }
}
