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
  ImageData,
  SimpleArtist,
  simpleArtistSchema,
} from '@/lib/schemas';

export const getArtistByIdWithCache = next_cache(
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
  },
  // 특정 아티스트의 캐시 키
  ['artist-detail'],
  { revalidate: CACHE_TIMES.ARTIST_DETAIL }
);

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

export async function createArtist(formData: FormData, userId: string) {
  try {
    const rawData = {
      name: formData.get('name'),
      nameKr: formData.get('nameKr'),
      mainImageUrl: formData.get('mainImageUrl'),
      email: formData.get('email'),
      homepage: formData.get('homepage'),
      city: formData.get('city'),
      country: formData.get('country'),
      biography: formData.get('biography'),
      cv: formData.get('cv'),
      images: JSON.parse(formData.get('images')?.toString() || '[]'),
    };

    // Zod 검증 실패 시 구체적인 에러 반환
    const validatedData = artistSchema.safeParse(rawData);

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

    // 명시적인 캐시 키 무효화 추가
    unstable_cacheTag('artists-list');
    unstable_cacheTag('artist-detail');
    unstable_cacheTag('simple-artists-list');
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

export async function updateArtist(formData: FormData, artistId: string) {
  try {
    // 부분 업데이트를 위한 객체 생성
    const updateData: Record<string, any> = {};

    // 각 필드 조건부 추가 (값이 제공된 경우에만 업데이트)
    const name = formData.get('name')?.toString();
    if (name) updateData.name = name;

    const nameKr = formData.get('nameKr')?.toString();
    if (nameKr) updateData.nameKr = nameKr;

    const email = formData.get('email')?.toString();
    if (email) updateData.email = email;

    const city = formData.get('city')?.toString();
    if (city) updateData.city = city;

    const country = formData.get('country')?.toString();
    if (country) updateData.country = country;

    const homepage = formData.get('homepage')?.toString();
    if (homepage) updateData.homepage = homepage;

    const biography = formData.get('biography')?.toString();
    if (biography) updateData.biography = biography;

    const cv = formData.get('cv')?.toString();
    if (cv) updateData.cv = cv;

    const mainImageUrl = formData.get('mainImageUrl')?.toString();
    if (mainImageUrl) updateData.mainImageUrl = mainImageUrl;

    // 이미지 업데이트 처리
    let imagesUpdate = {};
    const galleryDataStr = formData.get('images')?.toString();

    if (galleryDataStr) {
      const galleryData = JSON.parse(galleryDataStr);

      if (Array.isArray(galleryData) && galleryData.length > 0) {
        imagesUpdate = {
          deleteMany: {},
          create: galleryData.map((image: ImageData) => ({
            imageUrl: image.imageUrl,
            alt: image.alt || '',
            order: image.order,
          })),
        };
      }
    }

    // 아티스트 업데이트
    const artist = await prisma.artist.update({
      where: { id: artistId },
      data: {
        ...updateData,
        updatedAt: new Date(),
        ...(Object.keys(imagesUpdate).length > 0 && { images: imagesUpdate }),
      },
    });

    // 캐시 무효화 개선
    revalidatePath('/artists');
    revalidatePath(`/artists/${artistId}`);

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

    // 명시적인 캐시 키 무효화 추가
    unstable_cacheTag('artists-list');
    unstable_cacheTag('artist-detail');
    unstable_cacheTag('simple-artists-list');
    unstable_cacheTag('artworks-list'); // 아티스트의 작품 목록에 영향

    return { ok: true, data: artist };
  } catch (error) {
    console.error('Artist update error:', error);

    return {
      ok: false,
      error:
        error instanceof Error
          ? error.message
          : '아티스트 수정에 실패했습니다.',
    };
  }
}

export async function deleteArtist(artistId: string) {
  try {
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
    revalidatePath('/artists');
    revalidatePath(`/artists/${artistId}`);

    // 아티스트와 관련된 작품 페이지의 캐시도 무효화
    artistArtworks.forEach(({ artworkId }) => {
      revalidatePath(`/artworks/${artworkId}`);
    });

    // 이벤트 페이지의 캐시도 무효화
    revalidatePath('/events');

    // 명시적인 캐시 키 무효화 추가
    unstable_cacheTag('artists-list');
    unstable_cacheTag('artist-detail');
    unstable_cacheTag('simple-artists-list');
    unstable_cacheTag('artworks-list');

    return {
      success: true,
    };
  } catch (error) {
    console.error('Artist deletion error', error);
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : '아티스트 삭제에 실패했습니다.',
    };
  }
}
