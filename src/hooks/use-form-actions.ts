'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { copyForm, deleteForm } from '@/modules/forms/server/actions';

export function useFormActions(
  formId: string,
  userId: string,
  isAdmin: boolean
) {
  const router = useRouter();
  const { toast } = useToast();
  const [isCopying, setIsCopying] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleCopy = async () => {
    setIsCopying(true);
    try {
      const result = await copyForm(formId, userId, isAdmin);
      if (!result.success) throw new Error(result.error || '복사 실패');
      toast({
        title: '복사 완료',
        description:
          '폼이 성공적으로 복사되었습니다. 편집 페이지로 이동합니다.',
      });
      router.push(`/admin/forms/${result.data?.id}`);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : '복사 중 오류가 발생했습니다.';
      toast({
        title: '복사 실패',
        description: message,
        variant: 'destructive',
      });
      setIsCopying(false);
    }
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      const result = await deleteForm(formId, userId, isAdmin);
      if (!result.success) throw new Error(result.error || '삭제 실패');
      toast({
        title: '삭제 완료',
        description: '폼이 성공적으로 삭제되었습니다.',
      });
      router.refresh();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : '삭제 중 오류가 발생했습니다.';
      toast({
        title: '삭제 실패',
        description: message,
        variant: 'destructive',
      });
    } finally {
      setIsDeleting(false);
    }
  };

  return { handleCopy, handleDelete, isCopying, isDeleting };
}
