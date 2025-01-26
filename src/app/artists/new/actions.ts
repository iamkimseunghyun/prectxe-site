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

    const artist = await prisma.artist.update({
      where: { id: artistId },
      data: {
        ...updateData,
        updatedAt: new Date(),
      },
    });
    return { ok: true, data: artist };
  } catch (error) {
    console.error('Failed to update project:', error);
    return { ok: false, error: 'Failed to update project' };
  }
}
