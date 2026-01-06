'use server';

import { Prisma } from '@prisma/client';
import { unstable_cache as next_cache, revalidatePath } from 'next/cache';
import { notFound } from 'next/navigation';
import type { z } from 'zod';
import { deleteCloudflareImage } from '@/lib/cdn/cloudflare';
import { CACHE_TIMES, PAGINATION } from '@/lib/constants/constants';
import { prisma } from '@/lib/db/prisma';
import { createArtworkSchema, updateArtworkSchema } from '@/lib/schemas';
import { extractCloudflareImageId } from '@/lib/utils';

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
  async (page = 0, pageSize = PAGINATION.ARTISTS_PAGE_SIZE) => {
    try {
      return prisma.artwork.findMany({
        select: {
          id: true,
          title: true,
          description: true,
          year: true,
          media: true,
          size: true,
          images: {
            select: {
              id: true,
              imageUrl: true,
              alt: true,
            },
          },
          artists: {
            select: {
              artist: {
                select: {
                  name: true,
                },
              },
            },
          },
          user: {
            select: {
              id: true,
            },
          },
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

export async function getMoreArtworks(page = 0) {
  return getArtworksPage(page, PAGINATION.ARTWORKS_PAGE_SIZE);
}

export async function createArtwork(
  data: z.infer<typeof createArtworkSchema>,
  userId: string
) {
  try {
    const result = createArtworkSchema.safeParse(data);

    if (!result.success) {
      const errorMessage = result.error.issues
        .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
        .join(', ');
      return { ok: false, error: errorMessage };
    }

    const validatedData = result.data;

    // Create artwork with Prisma
    const artwork = await prisma.artwork.create({
      data: {
        title: validatedData.title,
        size: validatedData.size,
        media: validatedData.media,
        year: validatedData.year,
        description: validatedData.description,
        style: validatedData.style,
        userId: userId,
        images: {
          create: validatedData.images.map((image) => ({
            imageUrl: image.imageUrl,
            alt: image.alt,
            order: image.order,
          })),
        },
        artists: {
          create: validatedData.artists.map((artist: any) => ({
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

export async function updateArtwork(
  data: z.infer<typeof updateArtworkSchema>,
  artworkId: string
) {
  try {
    // 1. 기존 프로젝트 정보 가져오기 (이미지 삭제 처리를 위해)
    const existingArtwork = await prisma.artwork.findUnique({
      where: { id: artworkId },
      include: { images: true },
    });

    if (!existingArtwork) {
      return { ok: false, error: '아트워크를 찾을 수 없습니다.' };
    }

    // 2. 폼 데이터에서 필요한 정보 추출

    // 5. 데이터 유효성 검사
    const result = updateArtworkSchema.safeParse(data);

    if (!result.success) {
      return {
        ok: false,
        error: `입력 값이 올바르지 않습니다.`,
      };
    }

    const validatedData = result.data;

    // 6. Cloudflare 이미지 삭제 처리
    // 6.1 갤러리 이미지 처리
    if (validatedData.images && existingArtwork.images.length > 0) {
      // 새 이미지 URL 목록
      const newImageUrls = validatedData.images.map((img) => img.imageUrl);

      // 삭제해야 할 이미지 찾기
      for (const existingArtworkImage of existingArtwork.images) {
        if (!newImageUrls.includes(existingArtworkImage.imageUrl)) {
          const imageId = extractCloudflareImageId(
            existingArtworkImage.imageUrl
          );
          if (imageId) {
            await deleteCloudflareImage(imageId);
            console.log(`갤러리 이미지 삭제됨: ${imageId}`);
          }
        }
      }
    }

    // 7. Prisma 업데이트 데이터 준비
    const prismaUpdateData: Prisma.ArtworkUpdateInput = {
      title: validatedData.title,
      size: validatedData.size,
      media: validatedData.media,
      year: validatedData.year,
      description: validatedData.description,
      style: validatedData.style,
      updatedAt: new Date(),
    };

    // 이미지와 아트워크 관계 처리
    if (validatedData.images) {
      prismaUpdateData.images = {
        deleteMany: {},
        createMany: {
          data: validatedData.images.map((image) => ({
            imageUrl: image.imageUrl,
            alt: image.alt || '',
            order: image.order,
          })),
        },
      };
    }

    if (validatedData.artists) {
      prismaUpdateData.artists = {
        deleteMany: {},
        createMany: {
          data: validatedData.artists
            .filter((pa) => pa.artistId)
            .map((pa) => ({
              artistId: pa.artistId,
            })),
        },
      };
    }

    // 8. 프로젝트 업데이트 실행
    const artwork = await prisma.artwork.update({
      where: { id: artworkId },
      data: prismaUpdateData,
      include: {
        images: true,
        artists: {
          include: {
            artist: true,
          },
        },
      },
    });

    // 캐시 무효화
    revalidatePath(`/artworks/${artwork.id}`);
    // 관계된 아티스트 페이지 캐시 무효화:
    artwork.artists.forEach((artist) => {
      revalidatePath(`/artists/${artist.artistId}`);
    });
    return { ok: true, data: artwork };
  } catch (error) {
    console.error('작품 페이지 수정 실패:', error);

    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      return {
        ok: false,
        error: '데이터베이스 작업 중 오류가 발생했습니다.',
        details: error.message,
      };
    }

    return {
      ok: false,
      error:
        error instanceof Error
          ? error.message
          : '작품 페이지 수정에 실패했습니다',
    };
  }
}

export async function deleteArtwork(id: string) {
  try {
    // 1. 프로젝트 정보와 관련 이미지 정보 가져오기
    const artwork = await prisma.artwork.findUnique({
      where: { id: id },
      include: { images: true },
    });

    if (!artwork) {
      return { success: false, error: '아트워크를 찾을 수 없습니다.' };
    }

    // 2. Cloudflare에서 갤러리 이미지 삭제
    if (artwork.images && artwork.images.length > 0) {
      for (const image of artwork.images) {
        const imageId = extractCloudflareImageId(image.imageUrl);
        if (imageId) {
          await deleteCloudflareImage(imageId);
          console.log(`갤러리 이미지 삭제됨: ${imageId}`);
        }
      }
    }

    // 3. 데이터베이스에서 아트워크 삭제 (관계 데이터는 cascade 삭제됨)
    await prisma.artwork.delete({
      where: { id: id },
    });

    // 4. 캐시 무효화
    revalidatePath(`/artworks`);
    return { success: true };
  } catch (error) {
    console.error('아트워크 삭제 실패: ', error);
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : '아트워크 삭제 중 오류가 발생했습니다.',
    };
  }
}

export async function listArtworksPaged(params: {
  page?: number;
  pageSize?: number;
} = {}) {
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
          description: true,
          year: true,
          media: true,
          size: true,
          images: {
            select: {
              id: true,
              imageUrl: true,
              alt: true,
            },
          },
          artists: {
            select: {
              artist: {
                select: {
                  name: true,
                },
              },
            },
          },
        },
      }),
    ]);

    return { page, pageSize, total, items };
  } catch (e) {
    console.error('Artworks paged list error:', e);
    return { page, pageSize, total: 0, items: [] as any[] };
  }
}
