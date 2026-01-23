'use client';

import { CopyUrlButton } from '@/components/shared/copy-url-button';

interface FormEditHeaderProps {
  slug: string;
  status: 'draft' | 'published' | 'closed';
}

export function FormEditHeader({ slug, status }: FormEditHeaderProps) {
  const formUrl =
    typeof window !== 'undefined'
      ? `${window.location.origin}/forms/${slug}`
      : '';

  return (
    <div className="mb-6 flex items-center justify-between">
      <h1 className="text-2xl font-semibold">폼 편집</h1>
      {status === 'published' && (
        <div className="flex items-center gap-2 rounded-md border bg-neutral-50 px-3 py-2">
          <span className="text-sm text-neutral-600">공개 URL:</span>
          <code className="text-sm text-neutral-900">/forms/{slug}</code>
          <CopyUrlButton url={formUrl} />
        </div>
      )}
    </div>
  );
}
