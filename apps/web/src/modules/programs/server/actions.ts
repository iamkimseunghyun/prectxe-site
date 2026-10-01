'use server';

import type { Prisma, ProgramType } from '@prisma/client';
import {
  unstable_cache as next_cache,
  revalidatePath,
  updateTag,
} from 'next/cache';
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
import { extractImageId, parseKstDateInput } from '@/lib/utils';

// Program은 아카이브 전용. 공개 목록은 status 값 구분 없이 draft만 제외한다.
// ('all'과 'completed'는 동일하게 non-draft를 의미 — API/호출부 호환용으로만 유지)
export type ProgramStatusFilter = 'all' | 'completed';

export interface ListProgramsParams {
  status?: ProgramStatusFilter;
  type?: string | null;
  city?: string | null;
  search?: string | null;
  includeDrafts?: boolean; // 관리자용: draft 프로그램 포함
}

const programListSelect = {
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
} satisfies Prisma.ProgramSelect;

type ProgramListItem = Prisma.ProgramGetPayload<{
  select: typeof programListSelect;
}>;

const programPagedSelect = {
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
} satisfies Prisma.ProgramSelect;

type ProgramPagedItem = Prisma.ProgramGetPayload<{
  select: typeof programPagedSelect;
}>;

export const listProgramsWithCache = next_cache(
  async (params: ListProgramsParams = {}) => {
    // 공개 목록: draft 제외(= 아카이브 전체), 최근 이벤트 먼저
    const where = buildWhere(params);
    const orderBy = { startAt: 'desc' } as const;

    try {
      return await prisma.program.findMany({
        where,
        orderBy,
        select: programListSelect,
      });
    } catch (e) {
      if (process.env.NODE_ENV === 'development') {
        console.warn('Programs list fallback (DB error):', e);
      }
      return [] as ProgramListItem[];
    }
  },
  ['programs-list'],
  { revalidate: CACHE_TIMES.PROGRAMS_LIST, tags: ['programs'] }
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
  const { type, city, search, includeDrafts = false } = params;

  // OR 키 충돌(status vs search)을 피하려 AND 배열로 결합.
  const and: Prisma.ProgramWhereInput[] = [];

  // 공개 목록은 draft 제외(= 아카이브 전체). 관리자(includeDrafts)는 draft 포함.
  if (!includeDrafts) and.push({ status: { not: 'draft' } });

  if (type && type !== 'all-type') and.push({ type: type as ProgramType });
  if (city?.trim()) and.push({ city: { contains: city, mode: 'insensitive' } });
  if (search?.trim())
    and.push({
      OR: [
        { title: { contains: search, mode: 'insensitive' } },
        { summary: { contains: search, mode: 'insensitive' } },
      ],
    });

  return and.length > 0 ? { AND: and } : {};
}

export async function listProgramsPaged(
  params: ListProgramsParams & { page?: number; pageSize?: number } = {}
) {
  const { page = 1, pageSize = 12 } = params;
  const where = buildWhere(params);

  // Admin list (no status): newest first by createdAt
  // Public archive: 최근 이벤트 먼저
  const orderBy: Prisma.ProgramOrderByWithRelationInput =
    !params.status || params.status === 'all'
      ? { createdAt: 'desc' }
      : { startAt: 'desc' };

  try {
    const [total, items] = await Promise.all([
      prisma.program.count({ where }),
      prisma.program.findMany({
        where,
        orderBy,
        skip: (page - 1) * pageSize,
        take: pageSize,
        select: programPagedSelect,
      }),
    ]);

    return { page, pageSize, total, items };
  } catch (e) {
    if (process.env.NODE_ENV === 'development') {
      console.warn('Programs paged list fallback (DB error):', e);
    }
    return { page, pageSize, total: 0, items: [] as ProgramPagedItem[] };
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

  // 켤 때 다른 program/article/drop 해제와 대상 program 설정을 한 트랜잭션으로 묶어
  // 부분 실패 시 featured 0개로 남는 일관성 깨짐을 방지한다.
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
      prisma.drop.updateMany({
        where: { isFeatured: true },
        data: { isFeatured: false },
      }),
      prisma.program.update({
        where: { id },
        data: { isFeatured: true },
      }),
    ]);
  } else {
    await prisma.program.update({
      where: { id },
      data: { isFeatured: false },
    });
  }

  updateTag('programs');
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
      error: parsed.error.issues[0]?.message ?? '유효성 오류',
    };
  }
  const data = parsed.data;

  const program = await prisma.program.create({
    data: {
      title: data.title,
      slug: data.slug,
      summary: data.summary ?? null,
      description: data.description ?? null,
      type: data.type,
      status: data.status ?? 'completed',
      startAt: parseKstDateInput(data.startAt),
      endAt: data.endAt ? parseKstDateInput(data.endAt) : null,
      city: data.city ?? null,
      heroUrl: data.heroUrl ?? null,
      venue: data.venue ?? null,
      venueId: data.venueId ?? null,
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
  updateTag('programs');
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
      error: parsed.error.issues[0]?.message ?? '유효성 오류',
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
      type: data.type,
      status: data.status ?? 'completed',
      startAt: data.startAt ? parseKstDateInput(data.startAt) : undefined,
      endAt: data.endAt ? parseKstDateInput(data.endAt) : null,
      city: data.city ?? null,
      heroUrl: data.heroUrl ?? null,
      venue: data.venue ?? null,
      venueId: data.venueId ?? null,
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
  updateTag('programs');
  revalidatePath('/programs');
  revalidatePath(`/programs/${updated.slug}`);
  revalidatePath('/');
  return { success: true, data: updated };
}

export async function deleteProgram(id: string) {
  try {
    const auth = await requireAdmin();
    if (!auth.success) return { success: false, error: '권한이 없습니다.' };

    // Cloudflare 이미지 정리 (hero + 갤러리)
    const program = await prisma.program.findUnique({
      where: { id },
      select: { heroUrl: true, images: { select: { imageUrl: true } } },
    });

    if (!program) {
      return { success: false, error: '프로그램을 찾을 수 없습니다.' };
    }

    if (program.heroUrl) {
      const heroId = extractImageId(program.heroUrl);
      if (heroId) await deleteCloudflareImage(heroId).catch(() => {});
    }
    if (program.images.length > 0) {
      await deleteAllImages(program.images);
    }

    await prisma.program.delete({ where: { id } });
    updateTag('programs');
    revalidatePath('/programs');
    revalidatePath('/');
    return { success: true };
  } catch (error) {
    console.error('프로그램 삭제 실패:', error);
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : '프로그램 삭제에 실패했습니다.',
    };
  }
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
  { revalidate: CACHE_TIMES.PROGRAM_DETAIL, tags: ['programs'] }
);

export async function getProgramBySlug(slug: string) {
  return getProgramBySlugWithCache(slug);
}
