import { notFound, redirect } from 'next/navigation';
import getSession from '@/lib/auth/session';
import type { FormInput } from '@/lib/schemas/form';
import { updateForm } from '@/modules/forms/server/actions';
import { getForm } from '@/modules/forms/server/queries';
import { FormEditHeader } from '@/modules/forms/ui/components/form-edit-header';
import { FormBuilderView } from '@/modules/forms/ui/views/form-builder-view';

export default async function FormEditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getSession();
  if (!session.id || !session.isAdmin) redirect('/auth/signin');

  const { id } = await params;
  const result = await getForm(id);

  // 이 지점에 오면 이미 어드민이 확인된 상태다. 조회 실패는 곧 없는 폼이므로
  // 목록으로 되돌리지 않고 404를 낸다(리다이렉트는 소프트 404가 된다).
  if (!result.success || !result.data) {
    notFound();
  }

  const form = result.data;

  async function onSubmit(data: FormInput) {
    'use server';
    const session = await getSession();
    if (!session.id) {
      return { success: false, error: '로그인이 필요합니다.' };
    }

    const res = await updateForm(id, data);
    return res.success
      ? { success: true }
      : { success: false, error: res.error ?? '저장에 실패했습니다.' };
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <FormEditHeader slug={form.slug} status={form.status} />
      <FormBuilderView
        onSubmit={onSubmit}
        initialData={{
          slug: form.slug,
          title: form.title,
          description: form.description ?? undefined,
          body: form.body ?? undefined,
          coverImage: form.coverImage ?? undefined,
          status: form.status,
          // 실제 DB id를 그대로 넘긴다. 접두사를 붙이면 빌더가 이를 신규
          // 필드의 임시 id로 오인해 id를 떼고 보내고, 서버는 매 저장마다
          // 기존 필드를 전부 archive 하고 새로 만든다(응답↔필드 관계 붕괴).
          fields: form.fields.map((field) => ({
            id: field.id,
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
