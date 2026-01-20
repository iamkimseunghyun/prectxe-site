import { redirect } from 'next/navigation';
import getSession from '@/lib/auth/session';
import type { FormInput } from '@/lib/schemas/form';
import { getForm, updateForm } from '@/modules/forms/server/actions';
import { FormBuilderView } from '@/modules/forms/ui/views/form-builder-view';

export default async function FormEditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getSession();
  if (!session.id || !session.isAdmin) redirect('/auth/signin');

  const { id } = await params;
  const result = await getForm(id, session.id);

  if (!result.success || !result.data) {
    redirect('/admin/forms');
  }

  const form = result.data;

  async function onSubmit(data: FormInput) {
    'use server';
    const session = await getSession();
    if (!session.id) redirect('/');

    const res = await updateForm(id, session.id, data);
    if (res.success) {
      redirect('/admin/forms');
    }
    return { success: false, error: res.error ?? '저장에 실패했습니다.' };
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <h1 className="mb-6 text-2xl font-semibold">폼 편집</h1>
      <FormBuilderView
        onSubmit={onSubmit}
        initialData={{
          slug: form.slug,
          title: form.title,
          description: form.description ?? undefined,
          body: form.body ?? undefined,
          coverImage: form.coverImage ?? undefined,
          status: form.status,
          fields: form.fields.map((field, index) => ({
            id: `field-${field.id || index}`,
            type: field.type,
            label: field.label,
            placeholder: field.placeholder ?? undefined,
            helpText: field.helpText ?? undefined,
            required: field.required,
            options: field.options || [],
            order: field.order,
            validation:
              (field.validation as Record<string, unknown>) ?? undefined,
          })),
        }}
      />
    </div>
  );
}
