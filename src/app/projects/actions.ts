'use server';

import { prisma } from '@/lib/db/prisma';
import { revalidatePath } from 'next/cache';
import { projectCreateSchema } from '@/app/projects/project';
import { ProjectCategory } from '@/lib/types';
import { GalleryImage } from '@/lib/validations/gallery-image';
import { Prisma } from '@prisma/client';

export async function getAllProjects(
  year?: string,
  category?: string,
  sort?: string,
  search?: string
) {
  const where = {
    ...(year && year !== 'all-year' && { year: parseInt(year) }),
    ...(category &&
      category !== 'all-category' && { category: category as ProjectCategory }),
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
  formData: FormData,
  userId: string
): Promise<CreateProjectResult> {
  try {
    const rawData = {
      title: formData.get('title'),
      year: Number(formData.get('year')),
      category: formData.get('category'),
      description: formData.get('description'),
      about: formData.get('about'),
      mainImageUrl: formData.get('mainImageUrl'),
      startDate: formData.get('startDate'),
      endDate: formData.get('endDate'),
      images: JSON.parse(formData.get('images')?.toString() || '[]'),
      projectArtists: JSON.parse(
        formData.get('projectArtists')?.toString() || '[]'
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
        about: validatedData.data.about,
        year: validatedData.data.year,
        category: validatedData.data.category,
        mainImageUrl: validatedData.data.mainImageUrl,
        startDate: new Date(validatedData.data.startDate),
        endDate: new Date(validatedData.data.endDate),
        userId,
        projectArtists: {
          create: validatedData.data.projectArtists.map(
            (pa: { artistId: string }) => ({
              artistId: pa.artistId,
            })
          ),
        },
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

export async function updateProject(formData: FormData, projectId: string) {
  try {
    const updateData: Partial<Prisma.ProjectUpdateInput> = {};

    // 각 필드 조건부 추가
    const title = formData.get('title')?.toString();
    if (title) updateData.title = title;

    const year = formData.get('year')?.toString();
    if (year) updateData.year = parseInt(year);

    const category = formData.get('category')?.toString();
    if (category) updateData.category = category as ProjectCategory;

    const description = formData.get('description')?.toString();
    if (description) updateData.description = description;

    const about = formData.get('about')?.toString();
    if (about) updateData.about = about;

    const startDate = formData.get('startDate')?.toString();
    if (startDate) updateData.startDate = new Date(startDate).toISOString();

    const endDate = formData.get('endDate')?.toString();
    if (endDate) updateData.endDate = new Date(endDate).toISOString();

    const mainImageUrl = formData.get('mainImageUrl')?.toString();
    if (mainImageUrl) updateData.mainImageUrl = mainImageUrl;

    // 이미지 업데이트
    const galleryData = JSON.parse(formData.get('images')?.toString() || '[]');
    if (galleryData.length > 0) {
      updateData.images = {
        deleteMany: {},
        createMany: {
          data: galleryData.map((image: GalleryImage) => ({
            imageUrl: image.imageUrl,
            alt: image.alt || '',
            order: image.order,
          })),
        },
      };
    }

    // 프로젝트 아티스트 업데이트
    const projectArtists = JSON.parse(
      formData.get('projectArtists')?.toString() || '[]'
    );
    if (projectArtists.length > 0) {
      updateData.projectArtists = {
        deleteMany: {},
        createMany: {
          data: projectArtists
            .filter((pa: { artistId?: string }) => pa.artistId)
            .map((pa: { artistId: string }) => ({
              artistId: pa.artistId,
            })),
        },
      };
    }

    const project = await prisma.project.update({
      where: { id: projectId },
      data: {
        ...updateData,
        updatedAt: new Date(),
      },
      include: {
        images: true,
        projectArtists: {
          include: {
            artist: true,
          },
        },
      },
    });

    return { ok: true, data: project };
  } catch (error) {
    console.error('프로젝트 페이지 수정 실패:', error);

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
        error instanceof Error ? error.message : '프로젝트 페이지 수정 실패',
    };
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

// 프로젝트에 등록가능한 아티스트 목록을 가져오는 함수
export async function getAvailableArtists(projectId: string) {
  // 이미 프로젝트에 등록된 아티스트 ID 목록
  const existingArtists = await prisma.projectArtist
    .findMany({
      where: {
        projectId,
      },
      select: { artistId: true },
    })
    .then((artists) => artists.map((artist) => artist.artistId));

  // 아직 등록되지 않은 아티스트 목록
  const availableArtists = await prisma.artist.findMany({
    where: {
      id: { notIn: existingArtists },
    },
    select: {
      id: true,
      name: true,
      mainImageUrl: true,
    },
  });

  return availableArtists;
}

// app/projects/actions.ts
export async function updateProjectWithArtist(
  formData: FormData,
  projectId: string
) {
  try {
    const projectArtists = JSON.parse(formData.get('projectArtists') as string);

    // 기존 projectArtists 관계를 모두 삭제
    await prisma.projectArtist.deleteMany({
      where: { projectId },
    });

    // 새로운 projectArtists 관계 생성
    const project = await prisma.project.update({
      where: { id: projectId },
      data: {
        // ... 다른 필드들 ...
        projectArtists: {
          create: projectArtists.map((pa: { artistId: string }) => ({
            artistId: pa.artistId,
          })),
        },
      },
      include: {
        projectArtists: {
          include: {
            artist: true,
          },
        },
      },
    });

    return { ok: true, data: project };
  } catch (error) {
    // ... 에러 처리
    console.error(error);
  }
}
