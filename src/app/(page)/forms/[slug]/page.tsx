import { headers } from 'next/headers';
import { notFound } from 'next/navigation';
import {
  getFormBySlug,
  submitFormResponse,
} from '@/modules/forms/server/actions';
import { FormRenderer } from '@/modules/forms/ui/components/form-renderer';

interface PageProps {
  params: Promise<{ slug: string }>;
}

export default async function FormSubmitPage({ params }: PageProps) {
  const { slug } = await params;
  const result = await getFormBySlug(slug);

  if (!result.success || !result.data) {
    notFound();
  }

  const form = result.data;

  async function handleSubmit(
    formId: string,
    data: Record<string, string | string[]>
  ) {
    'use server';

    const headersList = await headers();
    const ipAddress = headersList.get('x-forwarded-for') || undefined;
    const userAgent = headersList.get('user-agent') || undefined;

    return await submitFormResponse(formId, data, {
      ipAddress,
      userAgent,
    });
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-16">
      <div className="mb-8">
        <h1 className="mb-2 text-3xl font-bold">{form.title}</h1>
        {form.description && (
          <p className="text-neutral-600">{form.description}</p>
        )}
      </div>

      <FormRenderer
        formId={form.id}
        fields={form.fields.map((field) => ({
          ...field,
          placeholder: field.placeholder ?? undefined,
          helpText: field.helpText ?? undefined,
          validation: field.validation as Record<string, unknown> | undefined,
        }))}
        onSubmit={handleSubmit}
      />
    </div>
  );
}
