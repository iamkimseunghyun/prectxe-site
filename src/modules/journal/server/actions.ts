'use server';

import { revalidatePath } from 'next/cache';
import { requireAdmin } from '@/lib/auth/require-admin';
import {
  cleanupRemovedHtmlImages,
  deleteAllHtmlImages,
} from '@/lib/cdn/cloudflare';
import { prisma } from '@/lib/db/prisma';
import { articleCreateSchema, articleUpdateSchema } from '@/lib/schemas';

export async function listArticles(options?: {
  includeUnpublished?: boolean;
  tag?: string;
}) {
  try {
    const where: any = options?.includeUnpublished
      ? {}
      : { publishedAt: { not: null } };
    if (options?.tag) {
      where.tags = { has: options.tag };
    }
    const articles = await prisma.article.findMany({
      where,
      // Admin list (includeUnpublished): newest first by createdAt
      // Public list: newest first by publishedAt
      orderBy: options?.includeUnpublished
        ? { createdAt: 'desc' }
        : { publishedAt: 'desc' },
      select: {
        slug: true,
        title: true,
        excerpt: true,
        cover: true,
        tags: true,
        publishedAt: true,
        createdAt: true,
      },
    });
    return { success: true, data: articles };
  } catch (e) {
    // Return empty list on error to avoid crashing admin screens when DB isn't ready
    if (process.env.NODE_ENV === 'development') {
      console.warn('Journal listArticles fallback (DB error):', e);
    }
    return { success: true, data: [] as any[] };
  }
}

export async function listArticlesPaged(
  params: {
    page?: number;
    pageSize?: number;
    includeUnpublished?: boolean;
  } = {}
) {
  const { page = 1, pageSize = 10, includeUnpublished = false } = params;

  try {
    const where = includeUnpublished ? {} : { publishedAt: { not: null } };
    const orderBy = includeUnpublished
      ? { createdAt: 'desc' as const }
      : { publishedAt: 'desc' as const };

    const [total, items] = await Promise.all([
      prisma.article.count({ where }),
      prisma.article.findMany({
        where,
        orderBy,
        skip: (page - 1) * pageSize,
        take: pageSize,
        select: {
          slug: true,
          title: true,
          excerpt: true,
          cover: true,
          tags: true,
          publishedAt: true,
          isFeatured: true,
          createdAt: true,
        },
      }),
    ]);

    return { page, pageSize, total, items };
  } catch (e) {
    if (process.env.NODE_ENV === 'development') {
      console.warn('Journal listArticlesPaged fallback (DB error):', e);
    }
    return { page, pageSize, total: 0, items: [] as any[] };
  }
}

export async function toggleArticleFeatured(slug: string) {
  const auth = await requireAdmin();
  if (!auth.success) return { success: false, error: auth.error } as const;

  const article = await prisma.article.findUnique({
    where: { slug },
    select: { isFeatured: true },
  });
  if (!article) return { success: false, error: '글을 찾을 수 없습니다.' };

  const newValue = !article.isFeatured;

  if (newValue) {
    await prisma.$transaction([
      prisma.program.updateMany({
        where: { isFeatured: true },
        data: { isFeatured: false },
      }),
      prisma.article.updateMany({
        where: { isFeatured: true, slug: { not: slug } },
        data: { isFeatured: false },
      }),
    ]);
  }

  await prisma.article.update({
    where: { slug },
    data: { isFeatured: newValue },
  });

  revalidatePath('/admin/journal');
  revalidatePath('/journal');
  revalidatePath('/');
  return { success: true, data: { isFeatured: newValue } };
}

export async function getArticleBySlug(slug: string) {
  try {
    const article = await prisma.article.findUnique({
      where: { slug },
      select: {
        slug: true,
        title: true,
        excerpt: true,
        body: true,
        cover: true,
        tags: true,
        publishedAt: true,
        programId: true,
        program: { select: { slug: true, title: true } },
        author: { select: { username: true } },
      },
    });
    return article;
  } catch (e) {
    console.error('Failed to get article', e);
    return null;
  }
}

export async function listArticlesByProgram(programId: string) {
  try {
    const articles = await prisma.article.findMany({
      where: { programId, publishedAt: { not: null } },
      orderBy: { publishedAt: 'desc' },
      select: {
        slug: true,
        title: true,
        cover: true,
        tags: true,
        publishedAt: true,
      },
    });
    return articles;
  } catch {
    return [];
  }
}

export async function createArticle(input: unknown, authorId?: string | null) {
  const auth = await requireAdmin();
  if (!auth.success) return { success: false, error: auth.error } as const;
  const parsed = articleCreateSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.errors[0]?.message ?? '유효성 오류',
    };
  }
  const a = parsed.data;

  // If setting as featured, unfeatured all other content
  if (a.isFeatured) {
    await prisma.$transaction([
      prisma.program.updateMany({
        where: { isFeatured: true },
        data: { isFeatured: false },
      }),
      prisma.article.updateMany({
        where: { isFeatured: true },
        data: { isFeatured: false },
      }),
    ]);
  }

  const created = await prisma.article.create({
    data: {
      slug: a.slug,
      title: a.title,
      excerpt: a.excerpt ?? null,
      body: a.body,
      cover: a.cover ?? null,
      tags: a.tags ?? [],
      publishedAt: a.publishedAt ? new Date(a.publishedAt) : null,
      isFeatured: a.isFeatured ?? false,
      programId: a.programId ?? null,
      authorId: auth.userId ?? authorId ?? null,
    },
    select: { slug: true },
  });
  revalidatePath('/journal');
  revalidatePath(`/journal/${created.slug}`);
  revalidatePath('/');
  return { success: true, data: created };
}

export async function updateArticle(slug: string, input: unknown) {
  const auth = await requireAdmin();
  if (!auth.success) return { success: false, error: auth.error } as const;
  const parsed = articleUpdateSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.errors[0]?.message ?? '유효성 오류',
    };
  }
  const a = parsed.data;

  const existing = await prisma.article.findUnique({
    where: { slug },
    select: { body: true, isFeatured: true },
  });
  if (!existing) return { success: false, error: '게시글을 찾을 수 없습니다.' };

  // 본문에서 제거된 Cloudflare 이미지 정리
  await cleanupRemovedHtmlImages(existing.body, a.body ?? null);

  // If setting as featured, unfeatured all other content
  if (a.isFeatured && !existing.isFeatured) {
    await prisma.$transaction([
      prisma.program.updateMany({
        where: { isFeatured: true },
        data: { isFeatured: false },
      }),
      prisma.article.updateMany({
        where: { isFeatured: true, slug: { not: slug } },
        data: { isFeatured: false },
      }),
    ]);
  }

  const updated = await prisma.article.update({
    where: { slug },
    data: {
      slug: a.slug ?? undefined,
      title: a.title,
      excerpt: a.excerpt ?? null,
      body: a.body,
      cover: a.cover ?? null,
      tags: a.tags ?? [],
      publishedAt: a.publishedAt ? new Date(a.publishedAt) : null,
      isFeatured: a.isFeatured ?? false,
      programId: a.programId ?? null,
    },
    select: { slug: true },
  });
  revalidatePath('/journal');
  revalidatePath(`/journal/${updated.slug}`);
  revalidatePath('/');
  return { success: true, data: updated };
}

export async function deleteArticle(slug: string) {
  const auth = await requireAdmin();
  if (!auth.success) return { success: false } as const;

  // 본문 내 Cloudflare 이미지 정리
  const article = await prisma.article.findUnique({
    where: { slug },
    select: { body: true },
  });
  if (article?.body) {
    await deleteAllHtmlImages(article.body);
  }

  await prisma.article.delete({ where: { slug } });
  revalidatePath('/journal');
  return { success: true };
}
