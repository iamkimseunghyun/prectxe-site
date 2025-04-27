'use server';

import { prisma } from '@/lib/db/prisma';

import {
  revalidatePath,
  unstable_cache as next_cache,
  unstable_cacheTag,
} from 'next/cache';

import {
  CACHE_TIMES,
  PAGINATION,
  SELECT_FIELDS,
} from '@/lib/constants/constants';
import {
  artistSchema,
  SimpleArtist,
  simpleArtistSchema,
  updateArtistSchema,
} from '@/lib/schemas';
import { extractCloudflareImageId } from '@/lib/utils';
import { deleteCloudflareImage } from '@/lib/cdn/cloudflare';
import { Prisma } from '@prisma/client';
import { z } from 'zod';

export const getArtistByIdWithCache =
  // next_cache(
  async (artistId: string) => {
    try {
      const artist = await prisma.artist.findUnique({
        where: {
          id: artistId,
        },
        include: {
          images: {
            orderBy: { order: 'asc' },
          },
          artistArtworks: {
            include: {
              artwork: {
                include: {
                  images: {
                    orderBy: { order: 'asc' },
                  },
                },
              },
            },
          },
        },
      });
      if (!artist) return null;

      const formattedData = {
        ...artist,
        email: artist.email ?? undefined, // null 값을 undefined로 변환
        city: artist.city ?? undefined,
        country: artist.country ?? undefined,
        homepage: artist.homepage ?? undefined,
        biography: artist.biography ?? undefined,
        cv: artist.cv ?? undefined,
        mainImageUrl: artist.mainImageUrl ?? undefined,
        images: artist.images.map(({ id, imageUrl, alt, order }) => ({
          id,
          imageUrl,
          alt,
          order,
        })),
      };

      // DB 데이터를 ArtistFormData 형식으로 변환
      return formattedData;
    } catch (error) {
      console.error(error);
      throw error;
    }
  };
// 특정 아티스트의 캐시 키
//   ['artist-detail'],
//   { revalidate: CACHE_TIMES.ARTIST_DETAIL }
// );

export async function getArtistById(artistId: string) {
  return getArtistByIdWithCache(artistId);
}

// 통합된 아티스트 조회 함수
export const getArtistsPage = next_cache(
  async (
    page = 0,
    pageSize = PAGINATION.ARTISTS_PAGE_SIZE,
    searchQuery = ''
  ) => {
    try {
      return await prisma.artist.findMany({
        where: {
          OR: searchQuery
            ? [
                { name: { contains: searchQuery, mode: 'insensitive' } },
                { nameKr: { contains: searchQuery, mode: 'insensitive' } },
                { biography: { contains: searchQuery, mode: 'insensitive' } },
              ]
            : undefined,
        },
        include: {
          images: true,
          artistArtworks: {
            include: {
              artwork: {
                include: {
                  images: true,
                },
              },
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
  // 캐시 키 그룹 - 이 키를 사용하여 특정 캐시 항목을 무효화할 수 있습니다
  ['artists-list'],
  // 캐시 옵션: 60초 동안 캐시 유지
  { revalidate: CACHE_TIMES.ARTISTS_LIST }
);

// 이 함수는 기존 getMoreArtists를 대체합니다
export async function getMoreArtists(page = 0, searchQuery = '') {
  return getArtistsPage(page, PAGINATION.ARTISTS_PAGE_SIZE, searchQuery);
}

// 간단한 아티스트 목록 (드롭다운 등을 위한)
export const getSimpleArtistsList = next_cache(
  async () => {
    try {
      return await prisma.artist.findMany({
        select: SELECT_FIELDS.SIMPLE_ARTIST,
        orderBy: {
          name: 'asc',
        },
      });
    } catch (error) {
      console.error('간단한 아티스트 목록 조회 오류:', error);
      throw new Error('아티스트 목록을 불러오는데 실패했습니다.');
    }
  },
  ['simple-artists-list'],
  { revalidate: CACHE_TIMES.ARTISTS_LIST }
);

export async function createSimpleArtist(data: SimpleArtist, userId: string) {
  try {
    const validatedData = simpleArtistSchema.safeParse(data);

    if (!validatedData.success) {
      const errorMessage = validatedData.error.issues
        .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
        .join(', ');
      return { ok: false, error: errorMessage };
    }

    const artist = await prisma.artist.create({
      data: {
        name: validatedData.data.name,
        nameKr: validatedData.data.nameKr,
        email: validatedData.data.email,
        mainImageUrl: validatedData.data.mainImageUrl,
        city: validatedData.data.city,
        country: validatedData.data.country,
        userId,
      },
      select: {
        id: true,
        name: true,
      },
    });

    // 캐시 무효화 개선
    revalidatePath('/artists');
    revalidatePath('/events/new', 'page');
    revalidatePath('/events/[id]/edit', 'page');

    // 명시적인 캐시 키 무효화 추가
    unstable_cacheTag('artists-list');
    unstable_cacheTag('simple-artists-list');

    return { ok: true, data: artist };
  } catch (error) {
    console.error('Simple artist creation error:', error);
    return {
      ok: false,
      error:
        error instanceof Error
          ? error.message
          : '아티스트 생성 중 오류가 발생했습니다.',
    };
  }
}

export async function createArtist(
  data: z.infer<typeof artistSchema>,
  userId: string
) {
  try {
    // Zod 검증 실패 시 구체적인 에러 반환
    const validatedData = artistSchema.safeParse(data);

    if (!validatedData.success) {
      const errorMessage = validatedData.error.issues
        .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
        .join(', ');
      return { ok: false, error: errorMessage };
    }

    const artist = await prisma.artist.create({
      data: {
        name: validatedData.data.name,
        nameKr: validatedData.data.nameKr,
        mainImageUrl: validatedData.data.mainImageUrl,
        email: validatedData.data.email,
        city: validatedData.data.city,
        country: validatedData.data.country,
        homepage: validatedData.data.homepage,
        biography: validatedData.data.biography,
        cv: validatedData.data.cv,
        images: {
          create: validatedData.data.images.map((image) => ({
            imageUrl: image.imageUrl,
            alt: image.alt,
            order: image.order,
          })),
        },
        userId,
      },
      select: {
        id: true,
        name: true,
        nameKr: true,
        mainImageUrl: true,
      },
    });

    // 캐시 무효화 개선
    revalidatePath('/artists');
    revalidatePath(`/artists/${artist.id}`);
    return { ok: true, data: artist };
  } catch (error) {
    console.error(
      '아티스트 등록 중 서버 에러 발생:',
      error instanceof Error ? error.message : String(error)
    );
    return {
      ok: false,
      error:
        error instanceof Error
          ? error.message
          : '아티스트 등록에 실패했습니다.',
    };
  }
}

export async function updateArtist(
  data: z.infer<typeof artistSchema>,
  artistId: string
) {
  try {
    // 1. 기존 아티스트 정보 가져오기 (이미지 삭제 처리를 위해)
    const existingArtist = await prisma.artist.findUnique({
      where: { id: artistId },
      include: { images: true },
    });

    if (!existingArtist) {
      return { ok: false, error: '아티스트를 찾을 수 없습니다.' };
    }

    // 2. 폼 데이터에서 필요한 정보 추출
    // 3. 이미지 데이터 처리

    // 4. 데이터 유효성 검사
    const result = updateArtistSchema.safeParse(data);

    if (!result.success) {
      return { ok: false, error: '입력 값이 올바르지 않습니다.' };
    }

    const validatedData = result.data;
    // 6. Cloudflare 이미지 삭제 처리
    // 6.1. 메인 이미지 처리
    if (
      validatedData.mainImageUrl &&
      existingArtist.mainImageUrl !== validatedData.mainImageUrl
    ) {
      const imageId = extractCloudflareImageId(existingArtist.mainImageUrl!);
      if (imageId) {
        await deleteCloudflareImage(imageId);
        console.log(`메인 이미지 삭제됨: ${imageId}`);
      }
    }

    // 6.2. 갤러리 이미지 처리
    if (validatedData.images && existingArtist.images.length > 0) {
      // 새 이미지 URL 목록
      const newImageUrls = validatedData.images.map((img) => img.imageUrl);

      // 삭제해야 할 이미지 찾기
      for (const existingImage of existingArtist.images) {
        if (!newImageUrls.includes(existingImage.imageUrl)) {
          const imageId = extractCloudflareImageId(existingImage.imageUrl);
          if (imageId) {
            await deleteCloudflareImage(imageId);
            console.log(`갤러리 이미지 삭제됨: ${imageId}`);
          }
        }
      }
    }

    // 7. Prisma 업데이트 데이터 준비
    const prismaUpdateData = {
      name: validatedData.name,
      nameKr: validatedData.nameKr,
      mainImageUrl: validatedData.mainImageUrl,
      email: validatedData.email,
      city: validatedData.city,
      country: validatedData.country,
      homepage: validatedData.homepage,
      biography: validatedData.biography,
      cv: validatedData.cv,
      images: {
        ...(validatedData.images &&
          validatedData.images.length > 0 && {
            deleteMany: {},
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

    // 8. 아티스트 업데이트 실행
    const artist = await prisma.artist.update({
      where: { id: artistId },
      data: prismaUpdateData,
      include: {
        images: true,
      },
    });

    // 캐시 무효화
    revalidatePath('/');
    revalidatePath(`/artists/${artist.id}`);

    // 아티스트와 관련된 작품 페이지의 캐시도 무효화
    const artistArtworks = await prisma.artistArtwork.findMany({
      where: { artistId },
      select: { artworkId: true },
    });

    artistArtworks.forEach(({ artworkId }) => {
      revalidatePath(`/artworks/${artworkId}`);
    });

    // 이벤트 페이지의 캐시도 무효화
    revalidatePath('/events');

    return { ok: true, data: artist };
  } catch (error) {
    console.error('아티스트 페이지 수정 실패:', error);

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
          : '아티스트 페이지 수정에 실패했습니다.',
    };
  }
}

export async function deleteArtist(artistId: string) {
  try {
    // 1. 아티스트 정보와 관련 이미지 정보 가져오기
    const artist = await prisma.artist.findUnique({
      where: { id: artistId },
      include: {
        images: true,
      },
    });

    if (!artist) {
      return { success: false, error: '아티스트를 찾을 수 없습니다.' };
    }

    // 2. Cloudflare에서 이미지 삭제
    // 2.1. 메인 이미지 삭제
    if (artist.mainImageUrl) {
      const mainImageId = extractCloudflareImageId(artist.mainImageUrl);
      if (mainImageId) {
        await deleteCloudflareImage(mainImageId);
        console.log(`메인 이미지 삭제됨: ${mainImageId}`);
      }
    }

    // 2.2. 갤러리 이미지들 삭제
    if (artist.images && artist.images.length > 0) {
      for (const image of artist.images) {
        const imageId = extractCloudflareImageId(image.imageUrl);
        if (imageId) {
          await deleteCloudflareImage(imageId);
          console.log(`갤러리 이미지 삭제됨: ${imageId}`);
        }
      }
    }

    // 3. 데이터베이스에서 아티스트 삭제 (관계 데이터는 cascade 삭제됨)

    // 아티스트 삭제 전에 관련 작품 ID 가져오기
    const artistArtworks = await prisma.artistArtwork.findMany({
      where: { artistId },
      select: { artworkId: true },
    });

    await prisma.artist.delete({
      where: {
        id: artistId,
      },
    });
    // 캐시 무효화 개선
    revalidatePath('/');
    revalidatePath('/artists');

    // 아티스트와 관련된 작품 페이지의 캐시도 무효화
    artistArtworks.forEach(({ artworkId }) => {
      revalidatePath(`/artworks/${artworkId}`);
    });

    // 이벤트 페이지의 캐시도 무효화
    revalidatePath('/events');

    return {
      success: true,
    };
  } catch (error) {
    console.error('아티스트 삭제 실패', error);
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : '아티스트 삭제에 실패했습니다.',
    };
  }
}
