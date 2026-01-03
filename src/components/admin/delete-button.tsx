'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Button } from '@/components/ui/button';

export function DeleteButton({
  resource,
  id,
  label = '삭제',
}: {
  resource: 'programs' | 'journal';
  id: string;
  label?: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const onDelete = async () => {
    if (!confirm('정말 삭제하시겠어요? 이 작업은 되돌릴 수 없습니다.')) return;
    setLoading(true);
    try {
      const url =
        resource === 'programs'
          ? `/api/admin/programs/${id}`
          : `/api/admin/journal/${id}`;
      const res = await fetch(url, { method: 'DELETE' });
      if (!res.ok) throw new Error('삭제 실패');
      router.refresh();
    } catch (e) {
      alert('삭제 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button variant="outline" size="sm" onClick={onDelete} disabled={loading}>
      {loading ? '삭제 중…' : label}
    </Button>
  );
}
