'use client';

import { Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { useToast } from '@/hooks/use-toast';

export type AdminResource =
  | 'programs'
  | 'journal'
  | 'artists'
  | 'venues'
  | 'artworks';

const RESOURCE_API_MAP: Record<AdminResource, string> = {
  programs: '/api/admin/programs',
  journal: '/api/admin/journal',
  artists: '/api/admin/artists',
  venues: '/api/admin/venues',
  artworks: '/api/admin/artworks',
};

interface DeleteButtonProps {
  resource: AdminResource;
  id: string;
  label?: string;
  onDeleted?: () => void;
}

export function DeleteButton({
  resource,
  id,
  label,
  onDeleted,
}: DeleteButtonProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const onDelete = async () => {
    setLoading(true);
    setShowConfirm(false);

    try {
      const url = `${RESOURCE_API_MAP[resource]}/${id}`;
      const res = await fetch(url, { method: 'DELETE' });
      const data = await res.json().catch(() => null);

      if (!res.ok) {
        throw new Error(data?.error || `삭제 실패 (HTTP ${res.status})`);
      }
      if (data && data.success === false) {
        throw new Error(data.error || '삭제에 실패했습니다.');
      }

      toast({
        title: '삭제 완료',
        description: '성공적으로 삭제되었습니다.',
      });

      if (onDeleted) {
        onDeleted();
      } else {
        router.refresh();
      }
    } catch (e) {
      const message =
        e instanceof Error ? e.message : '삭제 중 오류가 발생했습니다.';
      toast({
        title: '삭제 실패',
        description: message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setShowConfirm(true)}
        disabled={loading}
        className="h-auto p-1 text-muted-foreground hover:text-destructive"
      >
        {loading ? (
          <span className="text-xs">삭제 중…</span>
        ) : label ? (
          label
        ) : (
          <Trash2 className="h-4 w-4" />
        )}
      </Button>

      <ConfirmDialog
        open={showConfirm}
        onOpenChange={setShowConfirm}
        title="삭제 확인"
        description="정말 삭제하시겠어요? 이 작업은 되돌릴 수 없습니다."
        confirmText="삭제"
        cancelText="취소"
        variant="destructive"
        onConfirm={onDelete}
      />
    </>
  );
}
