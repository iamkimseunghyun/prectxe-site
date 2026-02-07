'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';

const STATUS_OPTIONS = [
  { value: '', label: '전체' },
  { value: 'draft', label: '임시저장' },
  { value: 'published', label: '게시됨' },
  { value: 'closed', label: '마감' },
];

export function FormStatusFilter() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const activeStatus = searchParams.get('status') ?? '';

  const handleStatusChange = (value: string) => {
    const params = new URLSearchParams(searchParams);
    if (value === '') {
      params.delete('status');
    } else {
      params.set('status', value);
    }
    router.replace(`/admin/forms?${params.toString()}`);
  };

  return (
    <div className="flex flex-wrap gap-2">
      {STATUS_OPTIONS.map((opt) => (
        <Button
          key={opt.value}
          size="sm"
          variant={activeStatus === opt.value ? 'default' : 'outline'}
          onClick={() => handleStatusChange(opt.value)}
        >
          {opt.label}
        </Button>
      ))}
    </div>
  );
}
