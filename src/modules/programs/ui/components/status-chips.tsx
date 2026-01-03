'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';

const STATUS_OPTIONS = [
  { value: 'upcoming', label: '예정' },
  { value: 'this-month', label: '이번 달' },
  { value: 'next-3-months', label: '다음 3개월' },
  { value: 'completed', label: '완료' },
];

export function StatusChips({ pathname }: { pathname: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const active = searchParams.get('status') ?? 'upcoming';

  const onClick = (value: string) => {
    const params = new URLSearchParams(searchParams);
    if (value === 'upcoming') params.delete('status');
    else params.set('status', value);
    router.replace(`/${pathname}?${params.toString()}`);
  };

  return (
    <div className="flex flex-wrap gap-2">
      {STATUS_OPTIONS.map((opt) => (
        <Button
          key={opt.value}
          size="sm"
          variant={active === opt.value ? 'default' : 'outline'}
          onClick={() => onClick(opt.value)}
        >
          {opt.label}
        </Button>
      ))}
    </div>
  );
}
