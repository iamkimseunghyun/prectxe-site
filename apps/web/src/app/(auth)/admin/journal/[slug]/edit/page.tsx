import { redirect } from 'next/navigation';
import getSession from '@/lib/auth/session';
import { prisma } from '@/lib/db/prisma';
import {
  getArticleBySlug,
  updateArticle,
} from '@/modules/journal/server/actions';
import {
  type JournalFormPayload,
  JournalFormView,
} from '@/modules/journal/ui/admin/journal-form-view';

export default async function Page({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const [article, programs] = await Promise.all([
    getArticleBySlug(slug),
    prisma.program.findMany({
      where: { status: { not: 'draft' } },
      orderBy: { startAt: 'desc' },
      select: { id: true, title: true },
    }),
  ]);
  if (!article) redirect('/admin/journal');

  async function onSubmit(formData: JournalFormPayload) {
    'use server';
    const session = await getSession();
    if (!session.id) return { success: false, error: '인증이 필요합니다.' };
    const { intent, ...data } = formData;
    const res = await updateArticle(slug, data);
    if (res?.success) {
      let redirectTo = '/admin/journal';
      if (intent === 'continue' && res.data?.slug) {
        redirectTo = `/admin/journal/${res.data.slug}/edit`;
      } else if (intent === 'new') {
        redirectTo = '/admin/journal/new';
      }
      return { success: true, redirect: redirectTo };
    }
    return {
      success: false,
      error: res?.error ?? '저장에 실패했습니다.',
    };
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="mb-6 text-2xl font-semibold">글 편집</h1>
      <JournalFormView
        onSubmit={onSubmit}
        programs={programs}
        initial={{
          slug: article.slug,
          title: article.title,
          excerpt: article.excerpt ?? undefined,
          body: article.body,
          cover: article.cover ?? undefined,
          tags: article.tags ?? [],
          publishedAt: article.publishedAt
            ? new Date(article.publishedAt).toISOString().split('T')[0]
            : '',
          programId: article.programId ?? null,
        }}
      />
    </div>
  );
}
