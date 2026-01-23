'use client';

import Link from 'next/link';
import { CopyUrlButton } from '@/components/shared/copy-url-button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

interface FormCardProps {
  form: {
    id: string;
    slug: string;
    title: string;
    description: string | null;
    status: 'draft' | 'published' | 'closed';
    _count: {
      submissions: number;
    };
  };
}

export function FormCard({ form }: FormCardProps) {
  const formUrl =
    typeof window !== 'undefined'
      ? `${window.location.origin}/forms/${form.slug}`
      : '';

  return (
    <Card className="transition-shadow hover:shadow-md">
      <CardHeader>
        <div className="flex items-start justify-between gap-2">
          <Link href={`/admin/forms/${form.id}`} className="flex-1">
            <CardTitle className="mb-1 text-lg">{form.title}</CardTitle>
            <CardDescription className="line-clamp-2">
              {form.description || '설명 없음'}
            </CardDescription>
          </Link>
          <div className="flex items-center gap-2">
            {form.status === 'published' && (
              <CopyUrlButton
                url={formUrl}
                className="text-neutral-400 transition-colors hover:text-neutral-600"
              />
            )}
            <span
              className={`rounded-full px-2 py-1 text-xs font-medium ${
                form.status === 'published'
                  ? 'bg-green-100 text-green-800'
                  : form.status === 'closed'
                    ? 'bg-red-100 text-red-800'
                    : 'bg-gray-100 text-gray-800'
              }`}
            >
              {form.status === 'published'
                ? '게시됨'
                : form.status === 'closed'
                  ? '마감'
                  : '임시저장'}
            </span>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between text-sm text-neutral-500">
          <span>/forms/{form.slug}</span>
          <span>{form._count.submissions}개 제출</span>
        </div>
      </CardContent>
    </Card>
  );
}
