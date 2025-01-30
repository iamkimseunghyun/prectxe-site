'use server';

import { prisma } from '@/lib/db/prisma';
import { revalidatePath } from 'next/cache';
import { projectCreateSchema } from '@/lib/validations/project';
import { GalleryImage } from '@/lib/validations/gallery-image';

export async function getAllProjects(
  year?: string,
  category?: string,
  sort?: string,
  search?: string
) {
  const where = {
    ...(year && year !== 'all-year' && { year: parseInt(year) }),
    ...(category && category !== 'all-category' && { category }),
    ...(search && {
      OR: [{ title: { contains: search } }],
    }),
  };

  const orderBy = {
    createdAt: sort === 'oldest' ? 'asc' : 'desc',
  } as const;

  return prisma.project.findMany({
    where,
    orderBy,
  });
}

export async function getProjectById(projectId: string) {
  try {
    const projectData = await prisma.project.findUnique({
      where: { id: projectId },
      include: {
        images: {
          orderBy: { order: 'asc' },
        },
        venues: {
          include: {
            venue: true,
          },
        },
        projectArtists: {
          include: {
            artist: true,
          },
        },
        projectArtworks: {
          include: {
            artwork: true,
          },
        },
      },
    });

    if (!projectData) return null;

    // project schema 수정 후 지울 코드
    const formattedData = {
      ...projectData,
      category: projectData?.category as
        | 'exhibition'
        | 'performance'
        | 'festival'
        | 'workshop',
      startDate: projectData?.startDate.toISOString(),
      endDate: projectData?.endDate.toISOString(),
    };

    // DB 데이터를 ProjectFormData 형식으로 변환
    return formattedData;
  } catch (error) {
    console.error(error);
    throw error;
  }
}

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
      images: JSON.parse(formData.get('images')?.toString() || '[]'),
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
    if (validatedData.data.images.length > 0) {
      await prisma.projectImage.createMany({
        data: validatedData.data.images.map((image) => ({
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

interface ProjectUpdateData {
  title: string;
  year: number;
  category: string;
  description: string;
  content: string;
  startDate: Date;
  endDate: Date;
  mainImageUrl?: string;
  images: {
    deleteMany: Record<string, never>;
    createMany: {
      data: Array<{
        imageUrl: string;
        alt: string;
        order: number;
      }>;
    };
  };
}

export async function updateProject(formData: FormData, projectId: string) {
  try {
    const mainImageUrl = formData.get('mainImageUrl')?.toString();
    // 더 안전한 방식
    const galleryData = JSON.parse(formData.get('images')?.toString() || '[]');

    const updateData: ProjectUpdateData = {
      title: formData.get('title')?.toString() || '',
      year: parseInt(formData.get('year')?.toString() || '0'),
      category: formData.get('category')?.toString() || '',
      description: formData.get('description')?.toString() || '',
      content: formData.get('content')?.toString() || '',
      startDate: new Date(formData.get('startDate')?.toString() || ''),
      endDate: new Date(formData.get('endDate')?.toString() || ''),
      images: {
        deleteMany: {},
        createMany: {
          data: galleryData.map((image: GalleryImage) => ({
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

export async function deleteProject(projectId: string) {
  try {
    await prisma.project.delete({
      where: {
        id: projectId,
      },
    });
    revalidatePath('/');
    return { success: true };
  } catch (error) {
    console.error(error);
    return { success: false };
  }
}
