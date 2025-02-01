'use server';

import { prisma } from '@/lib/db/prisma';
import { artistCreateSchema, ArtistFormData } from '@/lib/validations/artist';
import { revalidatePath } from 'next/cache';

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

    // DB 데이터를 ArtistFormData 형식으로 변환
    return {
      name: artist.name,
      mainImageUrl: artist.mainImageUrl,
      birth: artist.birth.toISOString(),
      nationality: artist.nationality,
      country: artist.country,
      city: artist.city,
      email: artist.email,
      homepage: artist.homepage,
      biography: artist.biography,
      cv: artist.cv,
      images: artist.images.map((image, index) => ({
        imageUrl: image.imageUrl,
        alt: image.alt || `Gallery image ${index + 1}`,
        order: image.order,
      })),
    };
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

export type CreateArtistResult =
  | { ok: true; data: { id: string } }
  | { ok: false; error: string };

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
        birth: new Date(validatedData.data.birth),
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

interface ArtistUpdateData {
  name: string;
  mainImageUrl?: string; // optional
  nationality: string;
  country: string;
  birth: Date;
  city: string;
  email: string;
  homepage: string;
  biography: string;
  cv: string;
}

export async function updateArtist(formData: FormData, artistId: string) {
  try {
    const mainImageUrl = formData.get('mainImageUrl')?.toString() || '';
    const updateData: ArtistUpdateData = {
      // formEntry 객체로 들어오면 스트링 | 널 값으로 타입이 결정되기 때문에 데이터 변환을 해줘야 한다.
      name: formData.get('name')?.toString() || '',
      // mainImageUrl: formData.get('mainImageUrl')?.toString() || '',
      nationality: formData.get('nationality')?.toString() || '',
      country: formData.get('country')?.toString() || '',
      birth: new Date(formData.get('birth')?.toString() || ''),
      city: formData.get('city')?.toString() || '',
      email: formData.get('email')?.toString() || '',
      homepage: formData.get('homepage')?.toString() || '',
      biography: formData.get('biography')?.toString() || '',
      cv: formData.get('cv')?.toString() || '',
    };
    // mainImageUrl이 있을 때만 업데이트 데이터에 포함
    if (mainImageUrl) {
      updateData.mainImageUrl = mainImageUrl;
    }

    const validatedData = artistCreateSchema.safeParse(updateData);
    if (!validatedData.success) {
      const errorMessage = validatedData.error.issues
        .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
        .join(', ');
      return { ok: false, error: errorMessage };
    }
    // 기존 이미지 삭제 후 새로 생성
    await prisma.$transaction([
      prisma.artistImage.deleteMany({
        where: { artistId },
      }),
      prisma.artist.update({
        where: { id: artistId },
        data: {
          ...validatedData.data,
          birth: new Date(validatedData.data.birth),
          images: {
            create: validatedData.data.images.map((image) => ({
              imageUrl: image.imageUrl,
              alt: image.alt,
              order: image.order,
            })),
          },
        },
      }),
    ]);
    revalidatePath('/artists');
    revalidatePath(`/artists/${artistId}`);
    return { ok: true, data: { id: artistId } };
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
