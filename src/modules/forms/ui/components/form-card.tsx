'use client';

import { Eye } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useState } from 'react';
import { CopyUrlButton } from '@/components/shared/copy-url-button';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { getImageUrl } from '@/lib/utils';

interface FormCardProps {
  form: {
    id: string;
    slug: string;
    title: string;
    description: string | null;
    body: string | null;
    coverImage: string | null;
    status: 'draft' | 'published' | 'closed';
    fields: Array<{
      id: string;
      type: string;
      label: string;
      placeholder: string | null;
      helpText: string | null;
      required: boolean;
      options: string[];
      order: number;
    }>;
    _count: {
      submissions: number;
    };
  };
}

export function FormCard({ form }: FormCardProps) {
  const [showPreview, setShowPreview] = useState(false);
  const formUrl =
    typeof window !== 'undefined'
      ? `${window.location.origin}/forms/${form.slug}`
      : '';

  return (
    <>
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
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowPreview(true)}
                className="h-8 w-8 text-neutral-400 transition-colors hover:text-neutral-600"
              >
                <Eye className="h-4 w-4" />
              </Button>
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
          <div className="flex items-center justify-between text-sm">
            <span className="text-neutral-500">/forms/{form.slug}</span>
            <Link
              href={`/admin/forms/${form.id}/submissions`}
              className="text-neutral-600 transition-colors hover:text-neutral-900 hover:underline"
            >
              {form._count.submissions}개 제출
            </Link>
          </div>
        </CardContent>
      </Card>

      {/* Preview Modal */}
      <Dialog open={showPreview} onOpenChange={setShowPreview}>
        <DialogContent className="max-h-[90vh] max-w-4xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>폼 미리보기</DialogTitle>
          </DialogHeader>

          <div className="space-y-6">
            {/* Cover Image */}
            {form.coverImage && (
              <div className="relative h-64 w-full overflow-hidden rounded-lg">
                <Image
                  src={getImageUrl(form.coverImage, 'public')}
                  alt={form.title}
                  fill
                  className="object-cover"
                />
              </div>
            )}

            {/* Title and Description */}
            <div>
              <h2 className="mb-2 text-2xl font-bold">{form.title}</h2>
              {form.description && (
                <p className="text-neutral-600">{form.description}</p>
              )}
            </div>

            {/* Body */}
            {form.body && (
              <div className="rounded-lg bg-neutral-50 p-6">
                <p className="whitespace-pre-wrap text-sm text-neutral-700">
                  {form.body}
                </p>
              </div>
            )}

            {/* Form Fields */}
            <div className="space-y-4">
              {form.fields.map((field) => (
                <div key={field.id} className="space-y-2">
                  <Label>
                    {field.label}
                    {field.required && (
                      <span className="ml-1 text-red-500">*</span>
                    )}
                  </Label>
                  {field.helpText && (
                    <p className="text-sm text-neutral-500">{field.helpText}</p>
                  )}

                  {/* Field Type Rendering */}
                  {field.type === 'textarea' ? (
                    <Textarea
                      placeholder={field.placeholder || ''}
                      disabled
                      className="resize-none"
                    />
                  ) : field.type === 'select' ? (
                    <Select disabled>
                      <SelectTrigger>
                        <SelectValue
                          placeholder={field.placeholder || '선택하세요'}
                        />
                      </SelectTrigger>
                      <SelectContent>
                        {field.options.map((option, idx) => (
                          <SelectItem key={idx} value={option}>
                            {option}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : field.type === 'multiselect' ? (
                    <div className="space-y-2">
                      {field.options.map((option, idx) => (
                        <div key={idx} className="flex items-center gap-2">
                          <input type="checkbox" disabled className="h-4 w-4" />
                          <span className="text-sm">{option}</span>
                        </div>
                      ))}
                    </div>
                  ) : field.type === 'radio' ? (
                    <div className="space-y-2">
                      {field.options.map((option, idx) => (
                        <div key={idx} className="flex items-center gap-2">
                          <input type="radio" disabled className="h-4 w-4" />
                          <span className="text-sm">{option}</span>
                        </div>
                      ))}
                    </div>
                  ) : field.type === 'checkbox' ? (
                    <div className="space-y-2">
                      {field.options.map((option, idx) => (
                        <div key={idx} className="flex items-center gap-2">
                          <input type="checkbox" disabled className="h-4 w-4" />
                          <span className="text-sm">{option}</span>
                        </div>
                      ))}
                    </div>
                  ) : field.type === 'file' ? (
                    <Input type="file" disabled />
                  ) : (
                    <Input
                      type={field.type}
                      placeholder={field.placeholder || ''}
                      disabled
                    />
                  )}
                </div>
              ))}
            </div>

            {form.fields.length === 0 && (
              <p className="text-center text-sm text-neutral-400">
                아직 필드가 추가되지 않았습니다
              </p>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
