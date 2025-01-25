// app/actions/project.ts
'use server';

import { prisma } from '@/lib/prisma';
import { projectCreateSchema } from '@/lib/validations/project';

export type CreateProjectResult =
  | { ok: true; data: { id: string } }
  | { ok: false; error: string };

export async function createProject(
  formData: FormData
): Promise<CreateProjectResult> {
  try {
    const rawData = {
      title: formData.get('title'),
      year: Number(formData.get('year')),
      category: formData.get('category'),
      description: formData.get('description'),
      content: formData.get('content'),
      mainImageUrl: formData.get('mainImageUrl'),
      startDate: formData.get('startDate'),
      endDate: formData.get('endDate'),
      galleryImageUrls: JSON.parse(
        (formData.get('galleryImageUrls') as string) || '[]'
      ),
    };

    const validatedData = projectCreateSchema.safeParse(rawData);
    if (!validatedData.success) {
      return { ok: false, error: '입력값이 올바르지 않습니다.' };
    }

    const project = await prisma.project.create({
      data: {
        title: validatedData.data.title,
        description: validatedData.data.description,
        content: validatedData.data.content,
        year: validatedData.data.year,
        category: validatedData.data.category,
        mainImageUrl: validatedData.data.mainImageUrl,
        startDate: new Date(validatedData.data.startDate),
        endDate: new Date(validatedData.data.endDate),
      },
      select: { id: true },
    });

    // galleryImageUrls 별도 생성
    if (validatedData.data.galleryImageUrls.length > 0) {
      await prisma.galleryImageUrl.createMany({
        data: validatedData.data.galleryImageUrls.map((image) => ({
          projectId: project.id,
          imageUrl: image.imageUrl,
          alt: image.alt || '',
          order: image.order,
        })),
      });
    }

    return { ok: true, data: { id: project.id } };
  } catch (error) {
    console.error(error);
    return { ok: false, error: '서버 에러가 발생했습니다.' };
  }
}

export async function updateProject(formData: FormData, projectId: string) {
  try {
    const mainImageUrl = formData.get('mainImageUrl');
    const galleryData =
      JSON.parse(formData.get('galleryImageUrls') as string) || '[]';

    const updateData: any = {
      title: formData.get('title') as string,
      year: parseInt(formData.get('year') as string),
      category: formData.get('category') as string,
      description: formData.get('description') as string,
      content: formData.get('content') as string,
      mainImageUrl: formData.get('mainImageUrl') as string,
      startDate: new Date(formData.get('startDate') as string),
      endDate: new Date(formData.get('endDate') as string),
      // galleryImageUrls 관계 업데이트
      galleryImageUrls: {
        deleteMany: {}, // 기존 이미지 모두 삭제
        createMany: {
          // 새 이미지 데이터 생성
          data: galleryData.map((image: any) => ({
            imageUrl: image.imageUrl,
            alt: image.alt || '',
            order: image.order,
          })),
        },
      },
    };

    // mainImageUrl이 있을 때만 업데이트 데이터에 포함
    if (mainImageUrl) {
      updateData.mainImageUrl = mainImageUrl;
    }

    const project = await prisma.project.update({
      where: { id: projectId },
      data: {
        ...updateData,
        updatedAt: new Date(),
      },
    });

    return { ok: true, data: project };
  } catch (error) {
    console.error('Failed to update project:', error);
    return { ok: false, error: 'Failed to update project' };
  }
}
