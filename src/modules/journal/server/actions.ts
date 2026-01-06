'use server';

import { revalidatePath } from 'next/cache';
import { requireAdmin } from '@/lib/auth/require-admin';
import { prisma } from '@/lib/db/prisma';
import { articleCreateSchema, articleUpdateSchema } from '@/lib/schemas';

export async function listArticles(options?: { includeUnpublished?: boolean }) {
  try {
    const articles = await prisma.article.findMany({
      where: options?.includeUnpublished ? {} : { publishedAt: { not: null } },
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
        author: { select: { username: true } },
      },
    });
    return article;
  } catch (e) {
    console.error('Failed to get article', e);
    return null;
  }
}

export async function createArticle(input: unknown, authorId?: string | null) {
  const auth = await requireAdmin();
  if (!auth.ok) return { ok: false, error: auth.error } as const;
  const parsed = articleCreateSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
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
      authorId: auth.userId ?? authorId ?? null,
    },
    select: { slug: true },
  });
  revalidatePath('/journal');
  revalidatePath(`/journal/${created.slug}`);
  revalidatePath('/');
  return { ok: true, data: created };
}

export async function updateArticle(slug: string, input: unknown) {
  const auth = await requireAdmin();
  if (!auth.ok) return { ok: false, error: auth.error } as const;
  const parsed = articleUpdateSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.errors[0]?.message ?? '유효성 오류',
    };
  }
  const a = parsed.data;

  const existing = await prisma.article.findUnique({ where: { slug } });
  if (!existing) return { ok: false, error: '게시글을 찾을 수 없습니다.' };

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
    },
    select: { slug: true },
  });
  revalidatePath('/journal');
  revalidatePath(`/journal/${updated.slug}`);
  revalidatePath('/');
  return { ok: true, data: updated };
}

export async function deleteArticle(slug: string) {
  const auth = await requireAdmin();
  if (!auth.ok) return { ok: false } as const;
  await prisma.article.delete({ where: { slug } });
  revalidatePath('/journal');
  return { ok: true };
}
