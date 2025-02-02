'use server';

import { prisma } from '@/lib/db/prisma';
import {
  artistCreateSchema,
  ArtistFormData,
  artistSimpleCreateSchema,
} from '@/lib/validations/artist';
import { revalidatePath } from 'next/cache';
import { GalleryImage } from '@/lib/validations/gallery-image';
import { z } from 'zod';

export async function getArtistById(
  artistId: string
): Promise<ArtistFormData | null> {
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

    const formattedData: ArtistFormData = {
      ...artist,
      birth: artist.birth ? artist.birth.toISOString() : '', // undefined 방지
      email: artist.email ?? undefined, // null 값을 undefined로 변환
      nationality: artist.nationality ?? undefined,
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
}

export async function deleteArtwork(id: string) {
  await prisma.artwork.delete({ where: { id: id } });
  return { success: true };
}

export async function getAllArtists(search?: string) {
  const artists = await prisma.artist.findMany({
    where: {
      OR: search
        ? [{ name: { contains: search } }, { biography: { contains: search } }]
        : undefined,
      // category: category && category !== 'all' ? category : undefined,
    },
    include: {
      _count: {
        select: { artistArtworks: true },
      },
    },
  });
  return artists;
}

export async function createSimpleArtist(
  data: z.infer<typeof artistSimpleCreateSchema>
): Promise<ActionResult<{ id: string; name: string }>> {
  try {
    const validatedData = artistSimpleCreateSchema.safeParse(data);

    if (!validatedData.success) {
      const errorMessage = validatedData.error.issues
        .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
        .join(', ');
      return { ok: false, error: errorMessage };
    }

    // 이메일이 제공된 경우 중복 체크
    if (validatedData.data.email) {
      const existingArtist = await prisma.artist.findUnique({
        where: { email: validatedData.data.email },
      });

      if (existingArtist) {
        return { ok: false, error: '이미 등록된 이메일입니다.' };
      }
    }

    const artist = await prisma.artist.create({
      data: validatedData.data,
      select: {
        id: true,
        name: true,
      },
    });

    revalidatePath('/events/new', 'page');
    revalidatePath('/events/[id]/edit', 'page');

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

export type ActionResult<T> = {
  ok: boolean;
  data?: T;
  error?: string;
};

export async function createArtist(
  formData: FormData
): Promise<ActionResult<{ id: string }>> {
  // FormData에서 galleryImageUrls를 파싱
  try {
    const rawData = {
      name: formData.get('name'), // title -> name 수정
      mainImageUrl: formData.get('mainImageUrl'),
      birth: formData.get('birth'),
      nationality: formData.get('nationality'),
      country: formData.get('country'),
      city: formData.get('city'),
      email: formData.get('email'),
      homepage: formData.get('homepage'),
      biography: formData.get('biography'),
      cv: formData.get('cv'),
      images: JSON.parse(formData.get('images') as string),
    };

    // Zod 검증 실패 시 구체적인 에러 반환
    const validatedData = artistCreateSchema.safeParse(rawData);

    if (!validatedData.success) {
      const errorMessage = validatedData.error.issues
        .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
        .join(', ');
      return { ok: false, error: errorMessage };
    }

    // 데이터베이스에 저장
    const artist = await prisma.artist.create({
      data: {
        ...validatedData.data,
        birth: validatedData.data.birth
          ? new Date(validatedData.data.birth)
          : null,
        images: {
          create: validatedData.data.images.map((image) => ({
            imageUrl: image.imageUrl,
            alt: image.alt,
            order: image.order,
          })),
        },
      },
      select: {
        id: true,
        name: true,
        mainImageUrl: true,
        // ... 필요한 필드들 선택
      },
    });

    revalidatePath('/artists');
    return { ok: true, data: { id: artist.id } };
  } catch (error) {
    console.error('Artist creation error:', error);
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
    const mainImageUrl = formData.get('mainImageUrl')?.toString() || '';
    const galleryData = JSON.parse(formData.get('images')?.toString() || '[]');

    const updateData = {
      // formEntry 객체로 들어오면 스트링 | 널 값으로 타입이 결정되기 때문에 데이터 변환을 해줘야 한다.
      name: formData.get('name')?.toString() || '',
      nationality: formData.get('nationality')?.toString() || '',
      country: formData.get('country')?.toString() || '',
      birth: formData.get('birth')?.toString() || '',
      city: formData.get('city')?.toString() || '',
      email: formData.get('email')?.toString() || '',
      homepage: formData.get('homepage')?.toString() || '',
      biography: formData.get('biography')?.toString() || '',
      cv: formData.get('cv')?.toString() || '',
      images: galleryData,
      ...(mainImageUrl && { mainImageUrl }),
    };

    const artist = await prisma.artist.update({
      where: { id: artistId },
      data: {
        ...updateData,
        birth: new Date(updateData.birth),
        updatedAt: new Date(),
        images: {
          deleteMany: {},
          create: updateData.images.map((image: GalleryImage) => ({
            imageUrl: image.imageUrl,
            alt: image.alt,
            order: image.order,
          })),
        },
      },
    });

    revalidatePath('/artists');
    revalidatePath(`/artists/${artistId}`);
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
  await prisma.artist.delete({
    where: {
      id: artistId,
    },
  });
  return {
    success: true,
  };
}
