import { headers } from 'next/headers';
import Image from 'next/image';
import { notFound } from 'next/navigation';
import { getImageUrl } from '@/lib/utils';
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

  // Show closed message if form is closed
  if (form.status === 'closed') {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80">
        <div className="mx-4 max-w-md rounded-lg bg-white p-8 text-center shadow-xl">
          <h1 className="mb-4 text-2xl font-bold text-neutral-900">
            응답이 마감되었습니다
          </h1>
          <p className="text-neutral-600">
            해당 양식은 더 이상 응답을 받지 않습니다.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Cover Image Banner */}
      {form.coverImage && (
        <div className="relative mb-12 h-[300px] w-full overflow-hidden md:h-[400px] lg:h-[500px]">
          <Image
            src={getImageUrl(form.coverImage, 'public')}
            alt={form.title}
            fill
            priority
            className="object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
          <div className="absolute bottom-0 left-0 right-0 p-8">
            <div className="mx-auto max-w-3xl">
              <h1 className="mb-2 text-3xl font-bold text-white md:text-4xl">
                {form.title}
              </h1>
              {form.description && (
                <p className="text-lg text-white/90">{form.description}</p>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="mx-auto max-w-3xl px-4 py-16">
        {/* Title and description if no cover image */}
        {!form.coverImage && (
          <div className="mb-8">
            <h1 className="mb-2 text-3xl font-bold">{form.title}</h1>
            {form.description && (
              <p className="text-neutral-600">{form.description}</p>
            )}
          </div>
        )}

        {/* Body (상세 안내) */}
        {form.body && (
          <div className="mb-8 rounded-lg bg-neutral-50 p-6">
            <p className="whitespace-pre-wrap text-sm text-neutral-700">
              {form.body}
            </p>
          </div>
        )}

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
    </div>
  );
}
