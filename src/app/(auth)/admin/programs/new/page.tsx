import { redirect } from 'next/navigation';
import getSession from '@/lib/auth/session';
import { createProgram } from '@/modules/programs/server/actions';
import { ProgramFormView } from '@/modules/programs/ui/views/program-form-view';

export default async function Page() {
  async function onSubmit(formData: any) {
    'use server';
    const session = await getSession();
    if (!session.id) redirect('/');
    const { intent, ...data } = formData || {};
    const res = await createProgram(data, session.id);
    if (res?.ok) {
      if (intent === 'continue' && res.data?.id) {
        redirect(`/admin/programs/${res.data.id}/edit`);
      }
      if (intent === 'new') {
        redirect(`/admin/programs/new`);
      }
      redirect(`/admin/programs`);
    }
    return { ok: false, error: (res as any)?.error ?? '저장에 실패했습니다.' };
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="mb-6 text-2xl font-semibold">새 프로그램</h1>
      <ProgramFormView onSubmit={onSubmit as any} />
    </div>
  );
}
