'use server';

import { revalidatePath } from 'next/cache';
import { artistCreateSchema } from '@/lib/validations/artist';
import { prisma } from '@/lib/prisma';

export type CreateArtistResult =
  | { ok: true; data: { id: string } }
  | { ok: false; error: string };

export async function createArtist(
  formData: FormData
): Promise<CreateArtistResult> {
  // FormData에서 galleryImageUrls를 파싱
  const galleryImageUrls = JSON.parse(
    formData.get('galleryImageUrls') as string
  );
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
      galleryImageUrls: galleryImageUrls,
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
        /*  name: validatedData.data.name,
        photo: validatedData.data.photo,
        nationality: validatedData.data.nationality,
        country: validatedData.data.country,
        city: validatedData.data.city,
        email: validatedData.data.email,
        homepage: validatedData.data.homepage,
        biography: validatedData.data.biography,
        cv: validatedData.data.cv,*/
        ...validatedData.data,
        birth: new Date(validatedData.data.birth),
        galleryImageUrls: {
          create: validatedData.data.galleryImageUrls.map((image) => ({
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
    revalidatePath('/');
    return { ok: true, data: { id: artist.id } };
  } catch (error) {
    console.error('Artist creation error:', error);
    if (error instanceof Error) {
      return { ok: false, error: error.message };
    }
    return { ok: false, error: '서버 에러가 발생했습니다.' };
  }
}

export async function updateArtist(formData: FormData, artistId: string) {
  try {
    const mainImageUrl = formData.get('mainImageUrl');
    const updateData: any = {
      name: formData.get('name'),
      mainImageUrl: formData.get('mainImageUrl'),
      birth: formData.get('birth'),
      nationality: formData.get('nationality'),
      country: formData.get('country'),
      city: formData.get('city'),
      email: formData.get('email'),
      homepage: formData.get('homepage'),
      biography: formData.get('biography'),
      cv: formData.get('cv'),
    };
    // mainImageUrl이 있을 때만 업데이트 데이터에 포함
    if (mainImageUrl) {
      updateData.mainImageUrl = mainImageUrl;
    }

    const artist = await prisma.artist.update({
      where: { id: artistId },
      data: {
        ...updateData,
        birth: new Date(updateData.birth),
        updatedAt: new Date(),
      },
    });
    return { ok: true, data: artist };
  } catch (error) {
    console.error('Failed to update project:', error);
    return { ok: false, error: 'Failed to update project' };
  }
}
