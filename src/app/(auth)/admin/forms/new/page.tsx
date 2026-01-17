import { redirect } from 'next/navigation';
import getSession from '@/lib/auth/session';
import type { FormInput } from '@/lib/schemas/form';
import { createForm } from '@/modules/forms/server/actions';
import { FormBuilderView } from '@/modules/forms/ui/views/form-builder-view';

export default async function NewFormPage() {
  const session = await getSession();
  if (!session.id || !session.isAdmin) redirect('/auth/signin');

  async function handleSubmit(data: FormInput) {
    'use server';
    return await createForm(session.id!, data);
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold">새 폼 만들기</h1>
        <p className="text-sm text-neutral-500">
          참가 신청서, 설문조사 등을 위한 동적 폼을 만들어보세요
        </p>
      </div>
      <FormBuilderView onSubmit={handleSubmit} submitLabel="폼 생성" />
    </div>
  );
}
