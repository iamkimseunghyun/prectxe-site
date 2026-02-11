import { redirect } from 'next/navigation';
import getSession from '@/lib/auth/session';
import { createArticle } from '@/modules/journal/server/actions';
import { JournalFormView } from '@/modules/journal/ui/views/journal-form-view';

export default async function Page() {
  async function onSubmit(formData: any) {
    'use server';
    const session = await getSession();
    if (!session.id) redirect('/');
    const { intent, ...data } = formData || {};
    const res = await createArticle(data, session.id);
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
      <h1 className="mb-6 text-2xl font-semibold">새 글</h1>
      <JournalFormView onSubmit={onSubmit as any} />
    </div>
  );
}
