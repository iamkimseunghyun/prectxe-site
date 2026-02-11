import { redirect } from 'next/navigation';
import getSession from '@/lib/auth/session';
import {
  getArticleBySlug,
  updateArticle,
} from '@/modules/journal/server/actions';
import { JournalFormView } from '@/modules/journal/ui/views/journal-form-view';

export default async function Page({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const article = await getArticleBySlug(slug);
  if (!article) redirect('/admin/journal');

  async function onSubmit(formData: any) {
    'use server';
    const session = await getSession();
    if (!session.id) redirect('/');
    const { intent, ...data } = formData || {};
    const res = await updateArticle(slug, data);
    if (res?.success) {
      if (intent === 'continue')
        redirect(`/admin/journal/${res.data?.slug}/edit`);
      if (intent === 'new') redirect(`/admin/journal/new`);
      redirect(`/admin/journal`);
    }
    return {
      success: false,
      error: (res as any)?.error ?? '저장에 실패했습니다.',
    };
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="mb-6 text-2xl font-semibold">글 편집</h1>
      <JournalFormView
        onSubmit={onSubmit}
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
        }}
      />
    </div>
  );
}
