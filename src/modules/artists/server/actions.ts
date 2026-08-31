'use server';

import { revalidatePath, updateTag } from 'next/cache';
import type { z } from 'zod';
import { requireAdmin } from '@/lib/auth/require-admin';
import {
  deleteAllImages,
  deleteCloudflareImage,
  deleteRemovedImages,
} from '@/lib/cdn/cloudflare';
import { PAGINATION } from '@/lib/constants/constants';
import { prisma } from '@/lib/db/prisma';
import {
  artistSchema,
  type SimpleArtist,
  simpleArtistSchema,
  updateArtistSchema,
} from '@/lib/schemas';
import { extractImageId } from '@/lib/utils';
import { getArtistsPage } from './queries';

/**
 * 무한 스크롤용 — 클라이언트 컴포넌트에서 호출되므로 서버 액션으로 남긴다.
 * 나머지 읽기 쿼리는 ./queries.ts(비 'use server')로 이동했다.
 */
export async function getMoreArtists(page = 0, searchQuery = '') {
  return getArtistsPage(page, PAGINATION.ARTISTS_PAGE_SIZE, searchQuery);
}

export async function createSimpleArtist(data: SimpleArtist) {
  try {
    const auth = await requireAdmin();
    if (!auth.success) return { success: false, error: '권한이 없습니다' };

    const validatedData = simpleArtistSchema.safeParse(data);

    if (!validatedData.success) {
      const errorMessage = validatedData.error.issues
        .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
        .join(', ');
      return { success: false, error: errorMessage };
    }

    const artist = await prisma.artist.create({
      data: {
        name: validatedData.data.name,
        nameKr: validatedData.data.nameKr,
        email: validatedData.data.email,
        mainImageUrl: validatedData.data.mainImageUrl,
        city: validatedData.data.city,
        country: validatedData.data.country,
        userId: auth.userId,
      },
      select: {
        id: true,
        name: true,
      },
    });

    // 캐시 무효화
    updateTag('artists');
    revalidatePath('/artists');

    return { success: true, data: artist };
  } catch (error) {
    console.error('Simple artist creation error:', error);
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : '아티스트 생성 중 오류가 발생했습니다.',
    };
  }
}

export async function createArtist(data: z.infer<typeof artistSchema>) {
  try {
    const auth = await requireAdmin();
    if (!auth.success) return { success: false, error: '권한이 없습니다' };

    // Zod 검증 실패 시 구체적인 에러 반환
    const validatedData = artistSchema.safeParse(data);

    if (!validatedData.success) {
      const errorMessage = validatedData.error.issues
        .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
        .join(', ');
      return { success: false, error: errorMessage };
    }

    const d = validatedData.data;
    const artist = await prisma.artist.create({
      data: {
        name: d.name,
        nameKr: d.nameKr,
        mainImageUrl: d.mainImageUrl ?? null,
        email: d.email,
        city: d.city,
        country: d.country,
        homepage: d.homepage,
        instagram: d.instagram,
        soundcloud: d.soundcloud,
        bandcamp: d.bandcamp,
        youtube: d.youtube,
        spotify: d.spotify,
        tagline: d.tagline,
        tags: d.tags ?? [],
        biography: d.biography,
        cv: d.cv,
        userId: auth.userId,
        images: d.images?.length
          ? { createMany: { data: d.images } }
          : undefined,
      },
      select: { id: true, name: true, nameKr: true, mainImageUrl: true },
    });

    // 캐시 무효화 개선
    updateTag('artists');
    revalidatePath('/artists');
    revalidatePath(`/artists/${artist.id}`);
    return { success: true, data: artist };
  } catch (error) {
    console.error(
      '아티스트 등록 중 서버 에러 발생:',
      error instanceof Error ? error.message : String(error)
    );
    return {
      success: false,
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
    const auth = await requireAdmin();
    if (!auth.success) return { success: false, error: '권한이 없습니다' };

    const parsed = updateArtistSchema.safeParse(data);
    if (!parsed.success) {
      return { success: false, error: '입력 값이 올바르지 않습니다.' };
    }
    const d = parsed.data;

    const existing = await prisma.artist.findUnique({
      where: { id: artistId },
      include: { images: true },
    });
    if (!existing) {
      return { success: false, error: '아티스트를 찾을 수 없습니다.' };
    }

    // 메인 이미지가 변경된 경우 기존 이미지 Cloudflare에서 삭제
    if (
      d.mainImageUrl &&
      existing.mainImageUrl &&
      d.mainImageUrl !== existing.mainImageUrl
    ) {
      const oldId = extractImageId(existing.mainImageUrl);
      if (oldId) await deleteCloudflareImage(oldId).catch(() => {});
    }

    // 갤러리: 제거된 이미지를 Cloudflare에서 삭제
    const hasNewImages = d.images && d.images.length > 0;
    if (hasNewImages) {
      const newImageUrls = d.images!.map((img) => img.imageUrl);
      await deleteRemovedImages(existing.images, newImageUrls);
    }

    const artist = await prisma.artist.update({
      where: { id: artistId },
      data: {
        name: d.name,
        nameKr: d.nameKr,
        mainImageUrl: d.mainImageUrl ?? null,
        email: d.email,
        city: d.city,
        country: d.country,
        homepage: d.homepage,
        instagram: d.instagram,
        soundcloud: d.soundcloud,
        bandcamp: d.bandcamp,
        youtube: d.youtube,
        spotify: d.spotify,
        tagline: d.tagline,
        tags: d.tags,
        biography: d.biography,
        cv: d.cv,
        images: hasNewImages
          ? { deleteMany: {}, createMany: { data: d.images! } }
          : undefined,
      },
      select: { id: true, name: true },
    });

    // 캐시 무효화
    updateTag('artists');
    revalidatePath('/');
    revalidatePath('/artists');
    revalidatePath(`/artists/${artist.id}`);

    const relatedArtworks = await prisma.artistArtwork.findMany({
      where: { artistId },
      select: { artworkId: true },
    });
    for (const { artworkId } of relatedArtworks) {
      revalidatePath(`/artworks/${artworkId}`);
    }

    return { success: true, data: artist };
  } catch (error) {
    console.error('아티스트 수정 실패:', error);
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : '아티스트 수정에 실패했습니다.',
    };
  }
}

export async function deleteArtist(artistId: string) {
  try {
    const auth = await requireAdmin();
    if (!auth.success) return { success: false, error: '권한이 없습니다' };

    // Cloudflare 이미지 정리 (메인 + 갤러리)
    const artist = await prisma.artist.findUnique({
      where: { id: artistId },
      select: {
        mainImageUrl: true,
        images: { select: { imageUrl: true } },
      },
    });

    if (!artist) {
      return { success: false, error: '아티스트를 찾을 수 없습니다.' };
    }

    if (artist.mainImageUrl) {
      const heroId = extractImageId(artist.mainImageUrl);
      if (heroId) await deleteCloudflareImage(heroId).catch(() => {});
    }
    if (artist.images.length > 0) {
      await deleteAllImages(artist.images);
    }

    // 삭제 전 관련 작품 ID 수집
    const relatedArtworks = await prisma.artistArtwork.findMany({
      where: { artistId },
      select: { artworkId: true },
    });

    await prisma.artist.delete({ where: { id: artistId } });

    updateTag('artists');
    revalidatePath('/');
    revalidatePath('/artists');
    for (const { artworkId } of relatedArtworks) {
      revalidatePath(`/artworks/${artworkId}`);
    }

    return { success: true };
  } catch (error) {
    console.error('아티스트 삭제 실패:', error);
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : '아티스트 삭제에 실패했습니다.',
    };
  }
}
