'use server';

import { prisma } from '@/lib/prisma';
import { formatDate } from '@/lib/utils';
import { revalidatePath } from 'next/cache';
import { ProjectFormData } from '@/lib/validations/project';

export async function getProjectById(
  projectId: string
): Promise<ProjectFormData | null> {
  try {
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: {
        galleryImageUrls: {
          orderBy: { order: 'asc' },
        },
      },
    });

    if (!project) return null;

    // DB 데이터를 ProjectFormData 형식으로 변환
    return {
      title: project.title,
      year: project.year,
      category: project.category as
        | 'exhibition'
        | 'performance'
        | 'festival'
        | 'workshop',
      description: project.description,
      content: project.content,
      mainImageUrl: project.mainImageUrl,
      startDate: formatDate(project.startDate),
      endDate: formatDate(project.endDate),
      galleryImageUrls: project.galleryImageUrls.map((image, index) => ({
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
