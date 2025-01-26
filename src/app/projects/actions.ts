'use server';
import { prisma } from '@/lib/prisma';

export async function getProjects(
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
