import getSession from '@/lib/auth/session';
import { prisma } from '@/lib/db/prisma';
import { createArticle } from '@/modules/journal/server/actions';
import {
  type JournalFormPayload,
  JournalFormView,
} from '@/modules/journal/ui/admin/journal-form-view';

export default async function Page() {
  const programs = await prisma.program.findMany({
    where: { status: { not: 'draft' } },
    orderBy: { startAt: 'desc' },
    select: { id: true, title: true },
  });

  async function onSubmit(formData: JournalFormPayload) {
    'use server';
    const session = await getSession();
    if (!session.id) return { success: false, error: '인증이 필요합니다.' };
    const { intent, ...data } = formData;
    const res = await createArticle(data, session.id);
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
      <h1 className="mb-6 text-2xl font-semibold">새 글</h1>
      <JournalFormView onSubmit={onSubmit} programs={programs} />
    </div>
  );
}
