'use server';

import { Prisma } from '@prisma/client';
import { unstable_cache as next_cache, revalidatePath } from 'next/cache';
import type { z } from 'zod';
import { deleteCloudflareImage } from '@/lib/cdn/cloudflare';
import { CACHE_TIMES } from '@/lib/constants/constants';
import { prisma } from '@/lib/db/prisma';
import {
  createProjectSchema,
  type ProjectCategory,
  type projectSchema,
  updateProjectSchema,
} from '@/lib/schemas';
import { extractCloudflareImageId } from '@/lib/utils';

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
        select: {
          id: true,
          title: true,
          about: true,
          year: true,
          category: true,
          mainImageUrl: true,
        },
      });
    } catch (error) {
      console.error('프로젝트 가져오기 오류:', error);
      return [];
    }
  },
  ['projects-list'],
  { revalidate: CACHE_TIMES.PROJECTS_LIST }
);

export const getAllProjects = async (
  year?: string,
  category?: string,
  sort?: string,
  search?: string
) => {
  try {
    const projects = await getAllProjectsWithCache(
      year,
      category,
      sort,
      search
    );

    return {
      success: true,
      data: projects,
    };
  } catch (error) {
    console.error('Error fetching projects', error);
    return {
      success: false,
      error: '프로젝트 목록을 불러오는데 실패했습니다.',
      details: process.env.NODE_ENV === 'development' ? error : undefined,
    };
  }
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
  { revalidate: CACHE_TIMES.PROJECT_DETAIL }
);

export async function getProjectById(projectId: string) {
  return getProjectWithCache(projectId);
}

export async function createProject(
  data: z.infer<typeof projectSchema>,
  userId: string
) {
  try {
    const validatedData = createProjectSchema.safeParse(data);
    if (!validatedData.success) {
      return {
        ok: false,
        error: `입력값이 올바르지 않습니다: ${validatedData.error.message}`,
      };
    }

    const project = await prisma.project.create({
      data: {
        title: validatedData.data.title,
        description: validatedData.data.description,
        about: validatedData.data.about,
        year: validatedData.data.year,
        category: validatedData.data.category,
        mainImageUrl: validatedData.data.mainImageUrl as string,
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

export async function updateProject(
  data: z.infer<typeof updateProjectSchema>,
  projectId: string
) {
  try {
    // 1. 기존 프로젝트 정보 가져오기 (이미지 삭제 처리를 위해)
    const existingProject = await prisma.project.findUnique({
      where: { id: projectId },
      include: { images: true },
    });

    if (!existingProject) {
      return { ok: false, error: '프로젝트를 찾을 수 없습니다.' };
    }

    // 5. 데이터 유효성 검사
    const validatedResult = updateProjectSchema.safeParse(data);
    if (!validatedResult.success) {
      return { ok: false, error: '입력 값이 올바르지 않습니다.' };
    }

    // 검증된 데이터를 사용
    const validatedData = validatedResult.data;

    // 6. Cloudflare 이미지 삭제 처리
    // 6.1. 메인 이미지 처리
    if (
      validatedData.mainImageUrl &&
      existingProject.mainImageUrl !== validatedData.mainImageUrl
    ) {
      const imageId = extractCloudflareImageId(existingProject.mainImageUrl);
      if (imageId) {
        await deleteCloudflareImage(imageId);
        console.log(`메인 이미지 삭제됨: ${imageId}`);
      }
    }

    // 6.2. 갤러리 이미지 처리
    if (validatedData.images && existingProject.images.length > 0) {
      // 새 이미지 URL 목록
      const newImageUrls = validatedData.images.map((img) => img.imageUrl);

      // 삭제해야 할 이미지 찾기
      for (const existingImg of existingProject.images) {
        if (!newImageUrls.includes(existingImg.imageUrl)) {
          const imageId = extractCloudflareImageId(existingImg.imageUrl);
          if (imageId) {
            await deleteCloudflareImage(imageId);
            console.log(`갤러리 이미지 삭제됨: ${imageId}`);
          }
        }
      }
    }

    // 7. Prisma 업데이트 데이터 준비
    const prismaUpdateData: Prisma.ProjectUpdateInput = {
      title: validatedData.title,
      year: validatedData.year,
      category: validatedData.category,
      description: validatedData.description,
      about: validatedData.about,
      mainImageUrl: validatedData.mainImageUrl as string,
      updatedAt: new Date(),
    };

    // 날짜 필드 변환
    if (validatedData.startDate) {
      prismaUpdateData.startDate = new Date(validatedData.startDate!);
    }

    if (validatedData.endDate) {
      prismaUpdateData.endDate = new Date(validatedData.endDate!);
    }

    // 이미지와 아티스트 관계 처리
    if (validatedData.images) {
      prismaUpdateData.images = {
        deleteMany: {},
        createMany: {
          data: validatedData.images.map((image) => ({
            imageUrl: image.imageUrl,
            alt: image.alt || '',
            order: image.order,
          })),
        },
      };
    }

    if (validatedData.projectArtists) {
      prismaUpdateData.projectArtists = {
        deleteMany: {},
        createMany: {
          data: validatedData.projectArtists
            .filter((pa) => pa.artistId)
            .map((pa) => ({
              artistId: pa.artistId,
            })),
        },
      };
    }

    // 8. 프로젝트 업데이트 실행
    const project = await prisma.project.update({
      where: { id: projectId },
      data: prismaUpdateData,
      include: {
        images: true,
        projectArtists: { include: { artist: true } },
      },
    });

    // 캐시 무효화
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
        error instanceof Error
          ? error.message
          : '프로젝트 페이지 수정에 실패했습니다',
    };
  }
}

export async function deleteProject(projectId: string) {
  try {
    // 1. 프로젝트 정보와 관련 이미지 정보 가져오기
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: {
        images: true,
      },
    });

    if (!project) {
      return { success: false, error: '프로젝트를 찾을 수 없습니다. ' };
    }

    // 2. Cloudflare에서 이미지 삭제
    // 2.1. 메인 이미지 삭제
    if (project.mainImageUrl) {
      const mainImageId = extractCloudflareImageId(project.mainImageUrl);
      if (mainImageId) {
        await deleteCloudflareImage(mainImageId);
        console.log(`메인 이미지 삭제됨: ${mainImageId}`);
      }
    }

    // 2.2. 갤러리 이미지들 삭제
    if (project.images && project.images.length > 0) {
      for (const image of project.images) {
        const imageId = extractCloudflareImageId(image.imageUrl);
        if (imageId) {
          await deleteCloudflareImage(imageId);
          console.log(`갤러리 이미지 삭제됨: ${imageId}`);
        }
      }
    }

    // 3. 데이터베이스에서 프로젝트 삭제 (관계 데이터는 cascade 삭제됨)
    await prisma.project.delete({
      where: {
        id: projectId,
      },
    });

    // 4. 캐시 무효화
    revalidatePath('/');
    revalidatePath('/projects');
    return { success: true };
  } catch (error) {
    console.error('프로젝트 삭제 실패: ', error);
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : '프로젝트 삭제 중 오류가 발생했습니다.',
    };
  }
}
