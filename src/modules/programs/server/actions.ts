'use server';

import type { Prisma } from '@prisma/client';
import { unstable_cache as next_cache, revalidatePath } from 'next/cache';
import { requireAdmin } from '@/lib/auth/require-admin';
import {
  deleteAllImages,
  deleteCloudflareImage,
  deleteRemovedImages,
} from '@/lib/cdn/cloudflare';
import { CACHE_TIMES } from '@/lib/constants/constants';
import { prisma } from '@/lib/db/prisma';
import {
  programCreateSchema,
  programUpdateSchema,
} from '@/lib/schemas/program';
import { extractImageId } from '@/lib/utils';

export type ProgramStatusFilter =
  | 'all'
  | 'upcoming'
  | 'completed'
  | 'past'
  | 'this-month'
  | 'next-3-months';

export interface ListProgramsParams {
  status?: ProgramStatusFilter;
  type?: string | null;
  city?: string | null;
  search?: string | null;
  includeDrafts?: boolean; // 관리자용: draft 프로그램 포함
}

function getDateRangeForStatus(status?: ProgramStatusFilter) {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startOfNextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  const threeMonthsAhead = new Date(now.getFullYear(), now.getMonth() + 3, 1);

  switch (status) {
    case 'this-month':
      return { gte: startOfMonth, lt: startOfNextMonth } as const;
    case 'next-3-months':
      return { gte: now, lt: threeMonthsAhead } as const;
    default:
      return null;
  }
}

export const listProgramsWithCache = next_cache(
  async (params: ListProgramsParams = {}) => {
    const { status = 'all', type, city, search } = params;

    const dateRange = getDateRangeForStatus(status);

    const where: Prisma.ProgramWhereInput = {
      // draft 상태 제외 (공개된 프로그램만 표시)
      status:
        status === 'upcoming'
          ? 'upcoming'
          : status === 'completed' || status === 'past'
            ? 'completed'
            : { not: 'draft' }, // 'all' 또는 날짜 기반 필터일 때
      ...(dateRange && { startAt: dateRange as any }),
      ...(type && type !== 'all-type' && { type: type as any }),
      ...(city?.trim() && { city: { contains: city, mode: 'insensitive' } }),
      ...(search?.trim() && {
        OR: [
          { title: { contains: search, mode: 'insensitive' } },
          { summary: { contains: search, mode: 'insensitive' } },
        ],
      }),
    };

    const orderBy: Prisma.ProgramOrderByWithRelationInput =
      status === 'completed' || status === 'past'
        ? { startAt: 'desc' }
        : { startAt: 'asc' };

    try {
      return await prisma.program.findMany({
        where,
        orderBy,
        select: {
          id: true,
          slug: true,
          title: true,
          summary: true,
          status: true,
          type: true,
          startAt: true,
          endAt: true,
          city: true,
          heroUrl: true,
          venue: true,
        },
      });
    } catch (e) {
      if (process.env.NODE_ENV === 'development') {
        console.warn('Programs list fallback (DB error):', e);
      }
      return [] as any[];
    }
  },
  ['programs-list'],
  { revalidate: CACHE_TIMES.PROGRAMS_LIST }
);

export async function listPrograms(params: ListProgramsParams = {}) {
  try {
    const data = await listProgramsWithCache(params);
    return { success: true, data };
  } catch (e) {
    console.error('Error listing programs', e);
    return {
      success: false,
      error: '프로그램 목록을 불러오는데 실패했습니다.',
    };
  }
}

function buildWhere(params: ListProgramsParams): Prisma.ProgramWhereInput {
  const { status = 'all', type, city, search, includeDrafts = false } = params;
  const dateRange = getDateRangeForStatus(status);
  return {
    // draft 상태 필터링 (includeDrafts가 false이면 draft 제외)
    ...(!includeDrafts && {
      status:
        status === 'upcoming'
          ? 'upcoming'
          : status === 'completed' || status === 'past'
            ? 'completed'
            : { not: 'draft' }, // 'all' 또는 날짜 기반 필터일 때
    }),
    ...(includeDrafts && status === 'upcoming' && { status: 'upcoming' }),
    ...(includeDrafts &&
      (status === 'completed' || status === 'past') && { status: 'completed' }),
    ...(dateRange && { startAt: dateRange as any }),
    ...(type && type !== 'all-type' && { type: type as any }),
    ...(city?.trim() && { city: { contains: city, mode: 'insensitive' } }),
    ...(search?.trim() && {
      OR: [
        { title: { contains: search, mode: 'insensitive' } },
        { summary: { contains: search, mode: 'insensitive' } },
      ],
    }),
  };
}

export async function listProgramsPaged(
  params: ListProgramsParams & { page?: number; pageSize?: number } = {}
) {
  const { page = 1, pageSize = 12 } = params;
  const where = buildWhere(params);

  // Admin list (no status): newest first by createdAt
  // Public list: sort by event date
  const orderBy: Prisma.ProgramOrderByWithRelationInput =
    !params.status || params.status === 'all'
      ? { createdAt: 'desc' }
      : params.status === 'completed' || params.status === 'past'
        ? { startAt: 'desc' }
        : { startAt: 'asc' };

  try {
    const [total, items] = await Promise.all([
      prisma.program.count({ where }),
      prisma.program.findMany({
        where,
        orderBy,
        skip: (page - 1) * pageSize,
        take: pageSize,
        select: {
          id: true,
          slug: true,
          title: true,
          summary: true,
          status: true,
          type: true,
          startAt: true,
          endAt: true,
          city: true,
          heroUrl: true,
          venue: true,
          isFeatured: true,
          createdAt: true,
        },
      }),
    ]);

    return { page, pageSize, total, items };
  } catch (e) {
    if (process.env.NODE_ENV === 'development') {
      console.warn('Programs paged list fallback (DB error):', e);
    }
    return { page, pageSize, total: 0, items: [] as any[] };
  }
}

export async function toggleProgramFeatured(id: string) {
  const auth = await requireAdmin();
  if (!auth.success) return { success: false, error: auth.error } as const;

  const program = await prisma.program.findUnique({
    where: { id },
    select: { isFeatured: true },
  });
  if (!program)
    return { success: false, error: '프로그램을 찾을 수 없습니다.' };

  const newValue = !program.isFeatured;

  if (newValue) {
    await prisma.$transaction([
      prisma.program.updateMany({
        where: { isFeatured: true, id: { not: id } },
        data: { isFeatured: false },
      }),
      prisma.article.updateMany({
        where: { isFeatured: true },
        data: { isFeatured: false },
      }),
    ]);
  }

  await prisma.program.update({
    where: { id },
    data: { isFeatured: newValue },
  });

  revalidatePath('/admin/programs');
  revalidatePath('/programs');
  revalidatePath('/');
  return { success: true, data: { isFeatured: newValue } };
}

export async function createProgram(input: unknown, _userId: string) {
  const auth = await requireAdmin();
  if (!auth.success) return { success: false, error: auth.error } as const;
  const parsed = programCreateSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.errors[0]?.message ?? '유효성 오류',
    };
  }
  const data = parsed.data;

  const program = await prisma.program.create({
    data: {
      title: data.title,
      slug: data.slug,
      summary: data.summary ?? null,
      description: data.description ?? null,
      type: data.type as any,
      status: (data.status ?? 'upcoming') as any,
      startAt: new Date(data.startAt),
      endAt: data.endAt ? new Date(data.endAt) : null,
      city: data.city ?? null,
      heroUrl: data.heroUrl ?? null,
      venue: data.venue ?? null,
      organizer: data.organizer ?? null,
      userId: auth.userId!,
      images: data.images
        ? {
            createMany: { data: data.images },
          }
        : undefined,
      credits: data.credits
        ? {
            createMany: { data: data.credits },
          }
        : undefined,
    },
    select: { id: true, slug: true },
  });
  revalidatePath('/programs');
  revalidatePath('/');
  return { success: true, data: program };
}

export async function updateProgram(id: string, input: unknown) {
  const auth = await requireAdmin();
  if (!auth.success) return { success: false, error: auth.error } as const;
  const parsed = programUpdateSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.errors[0]?.message ?? '유효성 오류',
    };
  }
  const data = parsed.data;

  const existing = await prisma.program.findUnique({
    where: { id },
    include: { images: true },
  });
  if (!existing)
    return { success: false, error: '프로그램을 찾을 수 없습니다.' };

  // delete previous hero if changed
  if (data.heroUrl && existing.heroUrl && data.heroUrl !== existing.heroUrl) {
    const idToDelete = extractImageId(existing.heroUrl);
    if (idToDelete) {
      try {
        await deleteCloudflareImage(idToDelete);
      } catch {}
    }
  }

  // 갤러리 이미지: 제거된 이미지를 Cloudflare에서 삭제
  const hasNewImages = data.images && data.images.length > 0;
  if (hasNewImages) {
    const newImageUrls = data.images!.map((img) => img.imageUrl);
    await deleteRemovedImages(existing.images, newImageUrls);
  }

  const hasNewCredits = data.credits && data.credits.length > 0;

  const updated = await prisma.program.update({
    where: { id },
    data: {
      title: data.title,
      slug: data.slug,
      summary: data.summary ?? null,
      description: data.description ?? null,
      type: data.type as any,
      status: (data.status ?? 'upcoming') as any,
      startAt: data.startAt ? new Date(data.startAt) : undefined,
      endAt: data.endAt ? new Date(data.endAt) : undefined,
      city: data.city ?? null,
      heroUrl: data.heroUrl ?? null,
      venue: data.venue ?? null,
      organizer: data.organizer ?? null,
      images: hasNewImages
        ? {
            deleteMany: {},
            createMany: { data: data.images! },
          }
        : undefined,
      credits: hasNewCredits
        ? {
            deleteMany: {},
            createMany: { data: data.credits! },
          }
        : undefined,
    },
    select: { id: true, slug: true },
  });
  revalidatePath('/programs');
  revalidatePath(`/programs/${updated.slug}`);
  revalidatePath('/');
  return { success: true, data: updated };
}

export async function deleteProgram(id: string) {
  const auth = await requireAdmin();
  if (!auth.success) return { success: false } as const;

  // Cloudflare 이미지 정리 (hero + 갤러리)
  const program = await prisma.program.findUnique({
    where: { id },
    select: { heroUrl: true, images: { select: { imageUrl: true } } },
  });
  if (program) {
    if (program.heroUrl) {
      const heroId = extractImageId(program.heroUrl);
      if (heroId) await deleteCloudflareImage(heroId).catch(() => {});
    }
    if (program.images.length > 0) {
      await deleteAllImages(program.images);
    }
  }

  await prisma.program.delete({ where: { id } });
  revalidatePath('/programs');
  return { success: true };
}

export const getProgramBySlugWithCache = next_cache(
  async (slug: string) => {
    const program = await prisma.program.findUnique({
      where: { slug },
      include: {
        images: { orderBy: { order: 'asc' } },
        credits: { include: { artist: true } },
      },
    });

    if (!program) return null;

    return {
      ...program,
      startAt: program.startAt?.toISOString() ?? null,
      endAt: program.endAt?.toISOString() ?? null,
    };
  },
  ['program-detail'],
  { revalidate: CACHE_TIMES.PROGRAM_DETAIL }
);

export async function getProgramBySlug(slug: string) {
  return getProgramBySlugWithCache(slug);
}
