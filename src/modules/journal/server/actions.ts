'use server';

import { prisma } from '@/lib/db/prisma';
import { revalidatePath } from 'next/cache';
import { articleCreateSchema, articleUpdateSchema } from '@/lib/schemas';
import { requireAdmin } from '@/lib/auth/require-admin';

export async function listArticles() {
  try {
    const articles = await prisma.article.findMany({
      where: { publishedAt: { not: null } },
      orderBy: { publishedAt: 'desc' },
      select: {
        slug: true,
        title: true,
        excerpt: true,
        cover: true,
        publishedAt: true,
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
  const created = await prisma.article.create({
    data: {
      slug: a.slug,
      title: a.title,
      excerpt: a.excerpt ?? null,
      body: a.body,
      cover: a.cover ?? null,
      tags: a.tags ?? [],
      publishedAt: a.publishedAt ? new Date(a.publishedAt) : null,
      authorId: auth.userId ?? authorId ?? null,
    },
    select: { slug: true },
  });
  revalidatePath('/journal');
  revalidatePath(`/journal/${created.slug}`);
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
    },
    select: { slug: true },
  });
  revalidatePath('/journal');
  revalidatePath(`/journal/${updated.slug}`);
  return { ok: true, data: updated };
}

export async function deleteArticle(slug: string) {
  const auth = await requireAdmin();
  if (!auth.ok) return { ok: false } as const;
  await prisma.article.delete({ where: { slug } });
  revalidatePath('/journal');
  return { ok: true };
}
