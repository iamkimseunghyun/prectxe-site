'use client';

import { Copy, Eye, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
import { CopyUrlButton } from '@/components/shared/copy-url-button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { useFormActions } from '@/hooks/use-form-actions';
import { FormPreviewDialog } from '@/modules/forms/ui/components/form-preview-dialog';

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
  userId: string;
  isAdmin: boolean;
}

export function FormCard({ form, userId, isAdmin }: FormCardProps) {
  const [showPreview, setShowPreview] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const { handleCopy, handleDelete, isCopying, isDeleting } = useFormActions(
    form.id,
    userId,
    isAdmin
  );
  const formUrl =
    typeof window !== 'undefined'
      ? `${window.location.origin}/forms/${form.slug}`
      : '';

  const onDeleteConfirmed = async () => {
    setShowDeleteConfirm(false);
    await handleDelete();
  };

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
              <Button
                variant="ghost"
                size="icon"
                onClick={handleCopy}
                disabled={isCopying}
                className="h-8 w-8 text-neutral-400 transition-colors hover:text-blue-600"
              >
                <Copy className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowDeleteConfirm(true)}
                disabled={isDeleting}
                className="h-8 w-8 text-neutral-400 transition-colors hover:text-red-600"
              >
                <Trash2 className="h-4 w-4" />
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

      <FormPreviewDialog
        open={showPreview}
        onOpenChange={setShowPreview}
        form={form}
      />

      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>폼 삭제 확인</AlertDialogTitle>
            <AlertDialogDescription>
              정말 이 폼을 삭제하시겠어요? 모든 제출 내역도 함께 삭제되며, 이
              작업은 되돌릴 수 없습니다.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>취소</AlertDialogCancel>
            <AlertDialogAction onClick={onDeleteConfirmed}>
              삭제
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
