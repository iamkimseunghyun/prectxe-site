'use client';

import { Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Button } from '@/components/ui/button';

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
  const [loading, setLoading] = useState(false);

  const onDelete = async () => {
    if (!confirm('정말 삭제하시겠어요? 이 작업은 되돌릴 수 없습니다.')) return;

    setLoading(true);
    try {
      const url = `${RESOURCE_API_MAP[resource]}/${id}`;
      const res = await fetch(url, { method: 'DELETE' });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || '삭제 실패');
      }

      if (onDeleted) {
        onDeleted();
      } else {
        router.refresh();
      }
    } catch (e) {
      const message =
        e instanceof Error ? e.message : '삭제 중 오류가 발생했습니다.';
      alert(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={onDelete}
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
  );
}
