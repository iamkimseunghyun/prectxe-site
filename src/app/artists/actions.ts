'use server';

import { prisma } from '@/lib/db/prisma';
import {
  baseArtistCreateSchema,
  createSimpleArtistSchema,
  SimpleArtistType,
  UpdateArtistType,
} from '@/app/artists/artist';
import { revalidatePath } from 'next/cache';
import { GalleryImage } from '@/lib/validations/gallery-image';

export async function getArtistById(artistId: string) {
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

    const formattedData: UpdateArtistType = {
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
}

export async function deleteArtwork(id: string) {
  await prisma.artwork.delete({ where: { id: id } });
  return { success: true };
}

export async function getArtists() {
  try {
    const artists = await prisma.artist.findMany({
      select: {
        id: true,
        name: true,
        mainImageUrl: true,
      },
    });
    return artists;
  } catch (error) {
    console.error(error);
    throw new Error('아티스트 목록을 불러오는데 실패했습니다.');
  }
}

export async function getAllArtists(search?: string) {
  const artists = await prisma.artist.findMany({
    where: {
      OR: search
        ? [{ name: { contains: search } }, { biography: { contains: search } }]
        : undefined,
      // category: category && category !== 'all' ? category : undefined,
    },
    select: {
      _count: {
        select: { artistArtworks: true },
      },
      id: true,
      name: true,
      mainImageUrl: true,
    },
  });
  return artists;
}

export async function createSimpleArtist(
  data: SimpleArtistType,
  userId: string
) {
  try {
    const validatedData = createSimpleArtistSchema.safeParse(data);

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
    const validatedData = baseArtistCreateSchema.safeParse(rawData);

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

    revalidatePath('/artists');
    revalidatePath(`/artists/${artist.id}`);

    return { ok: true, data: artist };
  } catch (error) {
    // 안전한 에러 로깅
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
    const mainImageUrl = formData.get('mainImageUrl')?.toString() || '';
    const galleryData = JSON.parse(formData.get('images')?.toString() || '[]');

    const updateData = {
      // formEntry 객체로 들어오면 스트링 | 널 값으로 타입이 결정되기 때문에 데이터 변환을 해줘야 한다.
      name: formData.get('name')?.toString() || '',
      nameKr: formData.get('nameKr')?.toString() || '',
      email: formData.get('email')?.toString() || '',
      city: formData.get('city')?.toString() || '',
      country: formData.get('country')?.toString() || '',
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
