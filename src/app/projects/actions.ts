'use server';

import { prisma } from '@/lib/db/prisma';
import { revalidatePath, unstable_cache as next_cache } from 'next/cache';
import {
  createProjectSchema,
  updateProjectSchema,
  UpdateProjectType,
} from '@/app/projects/project';
import { ProjectCategory } from '@/lib/types';
import { Prisma } from '@prisma/client';

const PROJECTS_LIST_CACHE_TIME = 3600; // 1시간 (초 단위)
const PROJECTS_DETAIL_CACHE_TIME = 7200; // 2시간 (초 단위)

export const getAllProjectsWithCache = next_cache(
  async (year?: string, category?: string, sort?: string, search?: string) => {
    try {
      const where = {
        ...(year && year !== 'all-year' && { year: parseInt(year) }),
        ...(category &&
          category !== 'all-category' && {
            category: category as ProjectCategory,
          }),
        ...(search && {
          OR: [{ title: { contains: search } }],
        }),
      };

      const orderBy = {
        startDate: sort === 'oldest' ? 'asc' : 'desc',
      } as const;

      return prisma.project.findMany({
        where,
        orderBy,
      });
    } catch (error) {
      console.error('프로젝트 가져오기 오류:', error);
      return [];
    }
  },
  ['projects-list'],
  { revalidate: PROJECTS_LIST_CACHE_TIME }
);

export const getAllProjects = async (
  year?: string,
  category?: string,
  sort?: string,
  search?: string
) => {
  return getAllProjectsWithCache(year, category, sort, search);
};

// 캐시된 데이터 패칭 함수
export const getProjectWithCache = next_cache(
  async (projectId: string) => {
    try {
      const projectData = await prisma.project.findUnique({
        where: { id: projectId },
        select: {
          id: true,
          title: true,
          about: true,
          description: true,
          year: true,
          category: true,
          mainImageUrl: true,
          startDate: true,
          endDate: true,
          userId: true,

          // 필요한 이미지 필드만 선택
          images: {
            select: {
              imageUrl: true,
              alt: true,
              order: true,
            },
            orderBy: { order: 'asc' },
          },

          // 필요한 장소 정보만 선택
          venues: {
            select: {
              venue: {
                select: {
                  id: true,
                  name: true,
                  address: true,
                },
              },
            },
          },

          // 필요한 아티스트 정보만 선택
          projectArtists: {
            select: {
              artistId: true,
              artist: {
                select: {
                  id: true,
                  name: true,
                  nameKr: true,
                  mainImageUrl: true,
                },
              },
            },
          },

          // 필요한 작품 정보만 선택 (페이지에서 사용하는 경우)
          projectArtworks: {
            select: {
              artwork: {
                select: {
                  id: true,
                  title: true,
                },
              },
            },
          },
        },
      });

      if (!projectData) return null;

      // 불필요한 변환 제거, 데이터 그대로 반환
      return {
        ...projectData,
        startDate: projectData.startDate.toISOString(),
        endDate: projectData.endDate.toISOString(),
      };
    } catch (error) {
      console.error(error);
      throw error;
    }
  },
  ['project-detail'],
  { revalidate: PROJECTS_DETAIL_CACHE_TIME }
);

export async function getProjectById(projectId: string) {
  return getProjectWithCache(projectId);
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

    const validatedData = createProjectSchema.safeParse(rawData);
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
    revalidatePath('/');
    revalidatePath(`/projects`);
    return { ok: true, data: { id: project.id } };
  } catch (error) {
    console.error(error);
    return { ok: false, error: '서버 에러가 발생했습니다.' };
  }
}

export async function updateProject(formData: FormData, projectId: string) {
  try {
    // 부분 업데이트를 위한 객체 생성
    const updateData: UpdateProjectType = {};

    // 각 필드 조건부 추가 (값이 제공된 경우에만 업데이트)
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
    if (startDate) updateData.startDate = startDate;

    const endDate = formData.get('endDate')?.toString();
    if (endDate) updateData.endDate = endDate;

    const mainImageUrl = formData.get('mainImageUrl')?.toString();
    if (mainImageUrl) updateData.mainImageUrl = mainImageUrl;

    // 이미지 업데이트
    const galleryDataStr = formData.get('images')?.toString();
    if (galleryDataStr) {
      const galleryData = JSON.parse(galleryDataStr);
      if (Array.isArray(galleryData) && galleryData.length > 0) {
        updateData.images = galleryData;
      }
    }

    // 프로젝트 아티스트 업데이트
    const projectArtistsStr = formData.get('projectArtists')?.toString();
    if (projectArtistsStr) {
      const projectArtists = JSON.parse(projectArtistsStr);
      if (Array.isArray(projectArtists) && projectArtists.length > 0) {
        updateData.projectArtists = projectArtists;
      }
    }

    const validatedData = updateProjectSchema.safeParse(updateData);
    if (!validatedData.success) {
      return { ok: false, error: '입력값이 올바르지 않습니다.' };
    }

    // Prisma에서 사용할 수 있는 형식으로 변환
    const prismaUpdateData: Partial<Prisma.ProjectUpdateInput> = {
      title: updateData.title,
      year: updateData.year,
      category: updateData.category,
      description: updateData.description,
      about: updateData.about,
      mainImageUrl: updateData.mainImageUrl,
    };

    // 날짜 필드 변환
    if (updateData.startDate) {
      prismaUpdateData.startDate = new Date(updateData.startDate);
    }

    if (updateData.endDate) {
      prismaUpdateData.endDate = new Date(updateData.endDate);
    }

    // 이미지와 아티스트 관계 처리
    if (updateData.images) {
      prismaUpdateData.images = {
        deleteMany: {},
        createMany: {
          data: updateData.images.map((image) => ({
            imageUrl: image.imageUrl,
            alt: image.alt || '',
            order: image.order,
          })),
        },
      };
    }

    if (updateData.projectArtists) {
      prismaUpdateData.projectArtists = {
        deleteMany: {},
        createMany: {
          data: updateData.projectArtists
            .filter((pa) => pa.artistId)
            .map((pa) => ({
              artistId: pa.artistId,
            })),
        },
      };
    }

    // 프로젝트 업데이트
    const project = await prisma.project.update({
      where: { id: projectId },
      data: { ...prismaUpdateData, updatedAt: new Date() },
      include: {
        images: true,
        projectArtists: {
          include: {
            artist: true,
          },
        },
      },
    });

    // 캐시 무효화
    revalidatePath('/');
    revalidatePath(`/projects/${project.id}`);
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
    revalidatePath('/projects');
    return { success: true };
  } catch (error) {
    console.error(error);
    return { success: false };
  }
}
